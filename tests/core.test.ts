import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseStatement, withIds } from '../src/core/parsers';
import { parseAmount, parseDate } from '../src/core/parsers/util';
import { categorize, DEFAULT_CATEGORIES, DEFAULT_RULES, merchantKey } from '../src/core/categories';
import { analyze, DEFAULT_SETTINGS, findRecurring, futureValue } from '../src/core/analysis';
import { buildInsights, claudeSummary } from '../src/core/advice';
import { demoRows } from '../src/core/demo';
import type { Transaction } from '../src/core/types';

// Extracto inventado con la estructura del real (cabecera en fila 5/7, fila vacía,
// fechas como texto, conceptos con relleno). Se genera en memoria: no se sube ningún .xls.
const fixture = () => {
  const rows = [
    ['22/10/2026', 'TRASPASO AHORRA LAS VUELTAS       ', '22/10/2026', -3.2, 613.94],
    ['22/10/2026', 'RECIBO BIDEGI                   ', '22/10/2026', -2.24, 611.7],
    ['23/10/2026', 'COMPRA T.C. BAR AGIRRE           ', '23/10/2026', -17.3, 594.4],
    ['23/10/2026', 'COMPRA T.C. ALIMENTACION GOIKOA  ', '23/10/2026', -8.98, 585.42],
    ['24/10/2026', 'COMPRA T.C. BAR AGIRRE           ', '24/10/2026', -5.8, 579.62],
    ['24/10/2026', 'COMPRA T.C. BAR AGIRRE           ', '24/10/2026', -5.8, 573.82],
    ['26/10/2026', 'TRANSF. 0182 PERSONA DEMO        ', '26/10/2026', -266, 307.82],
    ['26/10/2026', 'OP.NET                           ', '26/10/2026', 80, 387.82],
    ['01/11/2026', 'NOMINA EMPRESA DEMO SL           ', '01/11/2026', 2000, 2387.82],
  ];
  const aoa = [[null], [null], [null], ['kutxabank'], ['Movimientos de cuenta'], [null], ['fecha', 'concepto', 'fecha valor', 'importe', 'saldo'], [null], ...rows];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Listado');
  return XLSX.write(wb, { bookType: 'biff8', type: 'array' }) as ArrayBuffer;
};

const toTx = (rows: ReturnType<typeof demoRows>): Transaction[] =>
  withIds('kutxabank', rows).map((r) => ({ ...r, account: 'kutxabank', categoryId: categorize(r.concept, r.amount, DEFAULT_RULES) }));

describe('utilidades', () => {
  it('fechas', () => {
    expect(parseDate('22/10/2026')).toBe('2026-10-22');
    expect(parseDate('1/2/26')).toBe('2026-02-01');
    expect(parseDate(46317)).toBe('2026-10-22');
    expect(parseDate('fecha')).toBeNull();
  });
  it('importes', () => {
    expect(parseAmount(-3.2)).toBe(-3.2);
    expect(parseAmount('-1.234,56 €')).toBe(-1234.56);
    expect(parseAmount('')).toBeNull();
  });
});

describe('parser Kutxabank', () => {
  it('lee el .xls con cabecera, filas vacías y conceptos con relleno', () => {
    const r = parseStatement(fixture());
    expect(r.bank).toBe('kutxabank');
    expect(r.rows).toHaveLength(9);
    expect(r.rows[0]).toEqual({ date: '2026-10-22', valueDate: '2026-10-22', concept: 'TRASPASO AHORRA LAS VUELTAS', amount: -3.2, balance: 613.94 });
  });
  it('ids estables y distintos para movimientos idénticos', () => {
    const rows = parseStatement(fixture()).rows;
    const a = withIds('kutxabank', rows);
    const b = withIds('kutxabank', rows);
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
    expect(new Set(a.map((x) => x.id)).size).toBe(rows.length);
  });
  it('formato desconocido avisa', () => {
    const r = parseStatement(new TextEncoder().encode('a,b\n1,2').buffer as ArrayBuffer);
    expect(r.rows).toHaveLength(0);
    expect(r.warnings[0]).toMatch(/no reconocido/);
  });
});

describe('categorías', () => {
  const c = (s: string, a = -1) => categorize(s, a, DEFAULT_RULES);
  it('reglas por defecto', () => {
    expect(c('TRASPASO AHORRA LAS VUELTAS')).toBe('ahorro');
    expect(c('RECIBO BIDEGI')).toBe('transporte');
    expect(c('COMPRA T.C. BAR AGIRRE')).toBe('hosteleria');
    expect(c('COMPRA T.C. ALIMENTACION GOIKOA')).toBe('supermercado');
    expect(c('TRANSF. 0182 PERSONA DEMO')).toBe('transferencias');
    expect(c('NOMINA EMPRESA', 2000)).toBe('nomina');
    expect(c('OP.NET', 80)).toBe('otros-ingresos');
    expect(c('COSA RARA')).toBe('sin-categoria');
  });
  it('préstamos y créditos', () => {
    expect(c('RECIBO CETELEM')).toBe('prestamos');
    expect(c('CUOTA PRESTAMO PERSONAL')).toBe('prestamos');
    expect(c('AMORTIZACION PRESTAMO HIPOTECARIO')).toBe('vivienda'); // la hipoteca sigue en vivienda
    expect(DEFAULT_CATEGORIES.some((k) => k.id === 'prestamos')).toBe(true);
  });
  it('coincide al inicio de palabra', () => {
    expect(c('COMPRA T.C. BARRACUDA SHOP')).toBe('sin-categoria'); // "BAR " no casa con BARRACUDA
  });
  it('reglas de usuario ganan', () => {
    const rules = [...DEFAULT_RULES, { id: 'u1', pattern: 'BAR AGIRRE', categoryId: 'ocio', source: 'user' as const }];
    expect(categorize('COMPRA T.C. BAR AGIRRE', -5, rules)).toBe('ocio');
  });
  it('clave de comercio', () => {
    expect(merchantKey('COMPRA T.C. BAR AGIRRE')).toBe('BAR AGIRRE');
    expect(merchantKey('RECIBO BIDEGI')).toBe('BIDEGI');
  });
});

describe('análisis', () => {
  const txs = toTx(demoRows());
  const a = analyze(txs, DEFAULT_CATEGORIES, DEFAULT_SETTINGS);
  it('totales coherentes', () => {
    const sumCats = a.byCategory.reduce((s, c) => s + c.total, 0);
    expect(sumCats).toBeCloseTo(a.expense, 1);
    expect(a.needs + a.wants).toBeCloseTo(a.expense, 1);
    expect(a.income).toBeGreaterThan(0);
    expect(a.savings).toBeGreaterThan(0); // traspasos a ahorro no son gasto
    expect(a.byCategory.find((c) => c.category.id === 'ahorro')).toBeUndefined();
  });
  it('detecta recurrentes', () => {
    const names = a.recurring.map((r) => r.merchant);
    expect(names).toContain('NETFLIX.COM');
    expect(names).toContain('EUSKALTEL SA');
    expect(names).not.toContain('BIDEGI'); // demasiado frecuente
  });
  it('recurrente necesita 2 meses', () => {
    expect(findRecurring(txs.filter((t) => t.date.startsWith('2026-09')))).toHaveLength(0);
  });
  it('insights y resumen', () => {
    const ins = buildInsights(a, DEFAULT_SETTINGS);
    expect(ins.length).toBeGreaterThan(2);
    const s = claudeSummary(a, DEFAULT_SETTINGS);
    expect(s).toContain('Gasto por categoría');
    expect(s).not.toMatch(/AGIRRE|AMAIA|NETFLIX/); // anónimo: sin conceptos
  });
  it('valor futuro', () => {
    expect(futureValue(100, 1, 0)).toBe(1200);
    expect(futureValue(100, 10, 0.05)).toBeCloseTo(15528.23, 0);
  });
});

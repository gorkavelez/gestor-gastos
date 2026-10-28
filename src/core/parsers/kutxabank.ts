import type { BankParser, ParsedRow } from '../types';
import { norm, parseAmount, parseDate } from './util';

/**
 * Extracto "Movimientos de cuenta" de Kutxabank (.xls / .xlsx).
 * Estructura: unas filas de cabecera, una fila con
 *   fecha | concepto | fecha valor | importe | saldo
 * y a continuación los movimientos (puede haber filas vacías intercaladas).
 */
function findHeader(grid: unknown[][]): { row: number; cols: Record<string, number> } | null {
  for (let r = 0; r < Math.min(grid.length, 40); r++) {
    const cells = (grid[r] ?? []).map(norm);
    const iFecha = cells.indexOf('FECHA');
    const iImporte = cells.indexOf('IMPORTE');
    const iConcepto = cells.indexOf('CONCEPTO');
    if (iFecha >= 0 && iImporte >= 0 && iConcepto >= 0) {
      return {
        row: r,
        cols: {
          fecha: iFecha,
          concepto: iConcepto,
          fechaValor: cells.indexOf('FECHA VALOR'),
          importe: iImporte,
          saldo: cells.indexOf('SALDO'),
        },
      };
    }
  }
  return null;
}

export const kutxabank: BankParser = {
  id: 'kutxabank',
  name: 'Kutxabank',
  detect(grid) {
    return findHeader(grid) !== null;
  },
  parse(grid) {
    const warnings: string[] = [];
    const h = findHeader(grid);
    if (!h) return { bank: 'kutxabank', rows: [], warnings: ['No encuentro la fila de cabecera (fecha, concepto, importe…).'] };
    const { cols } = h;
    const rows: ParsedRow[] = [];
    for (let r = h.row + 1; r < grid.length; r++) {
      const line = grid[r] ?? [];
      if (line.every((c) => c == null || String(c).trim() === '')) continue;
      const date = parseDate(line[cols.fecha]);
      const amount = parseAmount(line[cols.importe]);
      const concept = String(line[cols.concepto] ?? '').replace(/\s+/g, ' ').trim();
      if (!date || amount == null) {
        // Pies de página, totales, etc.
        if (concept || line[cols.fecha]) warnings.push(`Fila ${r + 1} ignorada: "${concept || line[cols.fecha]}"`);
        continue;
      }
      rows.push({
        date,
        valueDate: cols.fechaValor >= 0 ? parseDate(line[cols.fechaValor]) ?? undefined : undefined,
        concept,
        amount,
        balance: cols.saldo >= 0 ? parseAmount(line[cols.saldo]) ?? undefined : undefined,
      });
    }
    if (rows.length === 0) warnings.push('El fichero no contiene movimientos.');
    return { bank: 'kutxabank', rows, warnings };
  },
};

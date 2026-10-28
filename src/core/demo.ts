import type { ParsedRow } from './types';

/** Datos ficticios (3 meses) para probar la app sin subir un extracto real. */
export function demoRows(endIso = '2026-10-27'): ParsedRow[] {
  let seed = 42;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const end = new Date(endIso + 'T00:00:00Z');
  const start = new Date(end);
  start.setUTCMonth(start.getUTCMonth() - 3);
  const rows: ParsedRow[] = [];
  const add = (d: Date, concept: string, amount: number) =>
    rows.push({ date: d.toISOString().slice(0, 10), valueDate: d.toISOString().slice(0, 10), concept, amount: Math.round(amount * 100) / 100 });
  const bars = ['BAR AGIRRE', 'BAR DAKAR', 'CAFETERIA ARRIAGA', 'SIDRERIA ZAPIAIN', 'TABERNA TXOKO'];
  const shops = ['ALIMENTACION GOIKOA', 'EROSKI CITY', 'MERCADONA BILBAO', 'BM SUPERMERCADOS'];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.getUTCDate();
    const dow = d.getUTCDay();
    if (day === 1) add(d, 'NOMINA EMPRESA DEMO SL', 2450);
    if (day === 2) add(d, 'RECIBO PRESTAMO HIPOTECARIO', -620);
    if (day === 5) add(d, 'RECIBO IBERDROLA CLIENTES', -58 - rnd() * 20);
    if (day === 6) add(d, 'RECIBO EUSKALTEL SA', -45.9);
    if (day === 8) add(d, 'RECIBO NETFLIX.COM', -13.99);
    if (day === 10) add(d, 'RECIBO LAGUN ARO SEGUROS', -38.5);
    if (day === 12) add(d, 'RECIBO KIROLDEGI ABONO', -32);
    if (day === 15) add(d, 'TRASPASO A CUENTA AHORRO', -150);
    if (day === 20) add(d, 'COMPRA T.C. FARMACIA ZUBIRI', -8 - rnd() * 15);
    if (rnd() < 0.55) add(d, `COMPRA T.C. ${shops[Math.floor(rnd() * shops.length)]}`, -(8 + rnd() * 55));
    if (rnd() < (dow === 5 || dow === 6 ? 0.9 : 0.35)) add(d, `COMPRA T.C. ${bars[Math.floor(rnd() * bars.length)]}`, -(2.5 + rnd() * (dow >= 5 ? 30 : 8)));
    if (rnd() < 0.25) add(d, 'RECIBO BIDEGI', -(2.24 + Math.floor(rnd() * 3) * 1.53));
    if (rnd() < 0.12) add(d, 'COMPRA T.C. PETRONOR E.S. DEUSTO', -(45 + rnd() * 25));
    if (rnd() < 0.08) add(d, 'COMPRA T.C. AMAZON EU SARL', -(12 + rnd() * 60));
    if (rnd() < 0.5) add(d, 'TRASPASO AHORRA LAS VUELTAS', -(0.5 + rnd() * 5));
    if (rnd() < 0.05) add(d, 'BIZUM ENVIADO A AMAIA', -(10 + Math.floor(rnd() * 4) * 5));
  }
  // saldo corrido
  let bal = 1800;
  for (const r of rows) {
    bal = Math.round((bal + r.amount) * 100) / 100;
    r.balance = bal;
  }
  return rows;
}

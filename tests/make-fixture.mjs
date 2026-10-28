// Genera tests/fixtures/kutxabank-ejemplo.xls con la misma estructura que el extracto real
// (cabecera en fila 5/7, fila vacía, fechas como texto, conceptos con espacios de relleno).
import * as XLSX from 'xlsx';
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
const ws = XLSX.utils.aoa_to_sheet(aoa);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Listado');
XLSX.writeFile(wb, new URL('./fixtures/kutxabank-ejemplo.xls', import.meta.url).pathname, { bookType: 'biff8' });
console.log('ok');

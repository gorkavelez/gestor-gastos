import * as XLSX from 'xlsx';
import type { BankParser, ParseResult } from '../types';
import { kutxabank } from './kutxabank';
export { withIds } from './ids';

/** Registro de bancos soportados. Para añadir uno: crea su parser y añádelo aquí. */
export const parsers: BankParser[] = [kutxabank];

/** Lee un .xls/.xlsx/.csv a una rejilla de celdas (primera hoja con datos). */
export function readGrids(data: ArrayBuffer): unknown[][][] {
  const wb = XLSX.read(data, { type: 'array', cellDates: false, raw: false });
  return wb.SheetNames.map((name) =>
    XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: true, defval: null }),
  );
}

export function parseStatement(data: ArrayBuffer): ParseResult {
  const grids = readGrids(data);
  for (const grid of grids) {
    const p = parsers.find((x) => x.detect(grid));
    if (p) return p.parse(grid);
  }
  return {
    bank: 'desconocido',
    rows: [],
    warnings: [`Formato no reconocido. Bancos soportados: ${parsers.map((p) => p.name).join(', ')}.`],
  };
}


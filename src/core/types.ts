/** Tipo de categoría: decide cómo cuenta un movimiento en el análisis. */
export type CategoryKind =
  | 'expense' // gasto real
  | 'income' // ingreso
  | 'savings' // dinero que mueves a tu ahorro/inversión (no es gasto)
  | 'transfer'; // movimientos entre personas/cuentas que no son ni gasto ni ingreso claro

/** Necesidad (fijo/imprescindible) o deseo (discrecional): para la regla 50/30/20. */
export type Need = 'need' | 'want';

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  need?: Need; // solo para gastos
  icon: string;
}

/** Movimiento ya normalizado, independiente del banco. */
export interface Transaction {
  /** Huella estable para deduplicar entre importaciones. */
  id: string;
  date: string; // ISO yyyy-mm-dd
  valueDate?: string;
  concept: string; // tal cual viene del banco (limpio de espacios)
  amount: number; // negativo = cargo, positivo = abono
  balance?: number;
  account: string; // p. ej. "kutxabank"
  categoryId: string;
  /** true si el usuario la fijó a mano: las reglas no la tocan. */
  manual?: boolean;
  note?: string;
  importId?: string;
}

export interface Rule {
  id: string;
  /** Texto a buscar en el concepto (sin distinguir mayúsculas/acentos). */
  pattern: string;
  categoryId: string;
  /** 'user' gana siempre a 'default'. */
  source: 'default' | 'user';
}

export interface ParsedRow {
  date: string;
  valueDate?: string;
  concept: string;
  amount: number;
  balance?: number;
}

export interface ParseResult {
  bank: string;
  rows: ParsedRow[];
  warnings: string[];
}

/** Un parser por banco: así se añaden otros bancos sin tocar el resto. */
export interface BankParser {
  id: string;
  name: string;
  /** Devuelve true si la hoja tiene pinta de ser de este banco. */
  detect(grid: unknown[][]): boolean;
  parse(grid: unknown[][]): ParseResult;
}

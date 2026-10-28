import type { Category, Rule, Transaction } from './types';
import { norm } from './parsers/util';

export const UNCATEGORIZED_EXPENSE = 'sin-categoria';
export const UNCATEGORIZED_INCOME = 'otros-ingresos';

export const DEFAULT_CATEGORIES: Category[] = [
  // Gastos imprescindibles
  { id: 'supermercado', name: 'Supermercado', kind: 'expense', need: 'need', icon: '🛒' },
  { id: 'vivienda', name: 'Vivienda', kind: 'expense', need: 'need', icon: '🏠' },
  { id: 'suministros', name: 'Suministros y telefonía', kind: 'expense', need: 'need', icon: '💡' },
  { id: 'transporte', name: 'Transporte y peajes', kind: 'expense', need: 'need', icon: '🚗' },
  { id: 'salud', name: 'Salud', kind: 'expense', need: 'need', icon: '💊' },
  { id: 'educacion', name: 'Educación e hijos', kind: 'expense', need: 'need', icon: '🎒' },
  { id: 'seguros', name: 'Seguros', kind: 'expense', need: 'need', icon: '🛡️' },
  { id: 'impuestos', name: 'Impuestos y tasas', kind: 'expense', need: 'need', icon: '🏛️' },
  // Gastos discrecionales
  { id: 'hosteleria', name: 'Bares y restaurantes', kind: 'expense', need: 'want', icon: '🍻' },
  { id: 'ocio', name: 'Ocio y suscripciones', kind: 'expense', need: 'want', icon: '🎬' },
  { id: 'compras', name: 'Compras', kind: 'expense', need: 'want', icon: '🛍️' },
  { id: 'deporte', name: 'Deporte', kind: 'expense', need: 'want', icon: '🏃' },
  { id: 'viajes', name: 'Viajes', kind: 'expense', need: 'want', icon: '✈️' },
  { id: 'efectivo', name: 'Efectivo', kind: 'expense', need: 'want', icon: '💶' },
  { id: 'comisiones', name: 'Comisiones bancarias', kind: 'expense', need: 'need', icon: '🏦' },
  { id: UNCATEGORIZED_EXPENSE, name: 'Sin categoría', kind: 'expense', need: 'want', icon: '❔' },
  // No son gasto
  { id: 'ahorro', name: 'Ahorro e inversión', kind: 'savings', icon: '🐷' },
  { id: 'transferencias', name: 'Transferencias y Bizum', kind: 'transfer', icon: '🔁' },
  // Ingresos
  { id: 'nomina', name: 'Nómina', kind: 'income', icon: '💼' },
  { id: UNCATEGORIZED_INCOME, name: 'Otros ingresos', kind: 'income', icon: '➕' },
];

/** Reglas por defecto pensadas para extractos de Kutxabank / comercios de Euskadi. */
const DEFAULT_PATTERNS: Record<string, string[]> = {
  ahorro: ['TRASPASO AHORRA', 'AHORRA LAS VUELTAS', 'TRASPASO A CUENTA AHORRO', 'APORTACION PLAN', 'FONDO INVERSION', 'SUSCRIPCION FONDO'],
  supermercado: ['ALIMENT', 'EROSKI', 'MERCADONA', 'LIDL', 'CARREFOUR', 'BM SUPER', 'SUPERMERCADO', 'ALDI', 'SIMPLY', 'CAPRABO', 'FRUTERIA', 'CARNICERIA', 'PESCADERIA', 'PANADERIA', 'HIPER'],
  hosteleria: ['BAR ', 'BAR-', 'CAFE', 'CAFETERIA', 'RESTAURANTE', 'SIDRERIA', 'TABERNA', 'BODEG', 'ASADOR', 'PIZZ', 'BURGER', 'TXOKO', 'JATETXEA', 'GLOVO', 'JUST EAT', 'UBER EATS', 'MCDONALD', 'TELEPIZZA', 'GOIKO'],
  transporte: ['BIDEGI', 'PEAJE', 'AUTOPISTA', 'GASOLIN', 'REPSOL', 'CEPSA', 'PETRONOR', 'GALP', 'SHELL', 'E.S. ', 'ESTACION SERVICIO', 'BIZKAIBUS', 'METRO BILBAO', 'BILBOBUS', 'EUSKOTREN', 'RENFE', 'DBUS', 'LURRALDEBUS', 'BARIK', 'MUGI', 'PARKING', 'APARCAMIENTO', 'OTA ', 'TAXI', 'ITV', 'TALLER'],
  suministros: ['IBERDROLA', 'NATURGY', 'ENDESA', 'EUSKALTEL', 'MOVISTAR', 'ORANGE', 'VODAFONE', 'DIGI', 'LOWI', 'SIMYO', 'CONSORCIO DE AGUAS', 'AGUAS', 'GAS NATURAL', 'TOTALENERGIES'],
  vivienda: ['ALQUILER', 'HIPOTECA', 'PRESTAMO HIPOT', 'COMUNIDAD PROP', 'CDAD PROP'],
  salud: ['FARMACIA', 'CLINICA', 'DENTAL', 'DENTISTA', 'OPTICA', 'FISIO', 'HOSPITAL', 'SANITAS', 'IMQ'],
  educacion: ['COLEGIO', 'IKASTOLA', 'ESCUELA', 'ACADEMIA', 'LIBRERIA', 'GUARDERIA', 'HAURRESKOLA', 'AMPA', 'EXTRAESCOLAR'],
  seguros: ['SEGURO', 'MAPFRE', 'LAGUN ARO', 'MUTUA', 'ALLIANZ', 'AXA', 'LINEA DIRECTA', 'GENERALI', 'KUTXABANK SEGUROS'],
  impuestos: ['HACIENDA', 'IBI', 'AYUNTAMIENTO', 'UDALA', 'DIPUTACION', 'DGT', 'IMPUESTO', 'TASA '],
  ocio: ['NETFLIX', 'SPOTIFY', 'HBO', 'MAX ', 'DISNEY', 'PRIME VIDEO', 'APPLE.COM', 'GOOGLE PLAY', 'STEAM', 'PLAYSTATION', 'CINE', 'TEATRO', 'TICKETMASTER', 'KULTUR', 'MUSEO', 'DAZN', 'MOVISTAR PLUS'],
  compras: ['AMAZON', 'ZARA', 'DECATHLON', 'CORTE INGLES', 'PRIMARK', 'IKEA', 'LEROY', 'MEDIA MARKT', 'MEDIAMARKT', 'ALIEXPRESS', 'SHEIN', 'PCCOMPONENTES', 'FNAC', 'BERSHKA', 'PULL&BEAR', 'BRICO', 'KIABI', 'CARREFOUR ONLINE'],
  deporte: ['GIMNASIO', 'POLIDEPORTIVO', 'KIROLDEGI', 'FEDERACION', 'STRAVA', 'GARMIN', 'CLUB DEPORTIVO', 'BILBAOKIROLAK'],
  viajes: ['HOTEL', 'BOOKING', 'AIRBNB', 'VUELING', 'IBERIA', 'RYANAIR', 'EASYJET', 'RENT A CAR', 'ALSA'],
  efectivo: ['CAJERO', 'REINTEGRO', 'DISPOSICION EFECTIVO'],
  comisiones: ['COMISION', 'CUOTA TARJETA', 'MANTENIMIENTO CUENTA', 'INTERESES DEUDORES'],
  nomina: ['NOMINA', 'NÓMINA', 'SALARIO', 'PENSION'],
  transferencias: ['BIZUM', 'TRANSF', 'TRANSFERENCIA', 'TRASPASO'],
};

export const DEFAULT_RULES: Rule[] = Object.entries(DEFAULT_PATTERNS).flatMap(([categoryId, pats]) =>
  pats.map((pattern) => ({ id: `d:${categoryId}:${pattern}`, pattern, categoryId, source: 'default' as const })),
);

/** Quita prefijos genéricos del banco para quedarse con el comercio. */
export function merchantKey(concept: string): string {
  return norm(concept)
    .replace(/^(COMPRA|PAGO)\s+(T\.?C\.?|TARJ(ETA)?\.?)\s*/, '')
    .replace(/^(RECIBO|ADEUDO|CARGO)\s+/, '')
    .replace(/^(COMPRA|PAGO)\s+/, '')
    .replace(/\s+\d{4,}.*$/, '') // números de operación al final
    .trim();
}

/**
 * Elige la categoría de un concepto. Reglas de usuario primero; dentro de cada
 * grupo gana el patrón más largo (más específico). El orden del objeto de
 * patrones por defecto desempata (p. ej. "TRASPASO AHORRA" antes que "TRASPASO").
 */
export function categorize(concept: string, amount: number, rules: Rule[]): string {
  const text = ' ' + norm(concept) + ' ';
  const pick = (src: Rule['source']) => {
    let best: Rule | null = null;
    let bestLen = 0;
    for (const r of rules) {
      if (r.source !== src) continue;
      const p = normPattern(r.pattern);
      if (p.trim().length < 2) continue;
      if (matchesWordStart(text, p) && p.length > bestLen) {
        best = r;
        bestLen = p.length;
      }
    }
    return best;
  };
  const hit = pick('user') ?? pick('default');
  // Un abono en una categoría de gasto se trata como devolución (resta gasto).
  if (hit) return hit.categoryId;
  return amount >= 0 ? UNCATEGORIZED_INCOME : UNCATEGORIZED_EXPENSE;
}

/** Como norm() pero conserva un espacio final significativo ("BAR " ≠ "BARRA"). */
function normPattern(p: string): string {
  const trailing = /\s$/.test(p);
  return norm(p) + (trailing ? ' ' : '');
}

/** El patrón debe empezar al inicio de una palabra (evita "IBI" dentro de "BIDEGI"). */
function matchesWordStart(text: string, p: string): boolean {
  let i = text.indexOf(p);
  while (i >= 0) {
    if (i === 0 || !/[A-Z0-9]/.test(text[i - 1])) return true;
    i = text.indexOf(p, i + 1);
  }
  return false;
}

/** Recategoriza todo salvo lo fijado a mano. Devuelve solo los que cambian. */
export function recategorizeAll(txs: Transaction[], rules: Rule[]): Transaction[] {
  const changed: Transaction[] = [];
  for (const t of txs) {
    if (t.manual) continue;
    const c = categorize(t.concept, t.amount, rules);
    if (c !== t.categoryId) changed.push({ ...t, categoryId: c });
  }
  return changed;
}

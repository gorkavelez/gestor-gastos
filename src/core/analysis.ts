import type { Category, Transaction } from './types';
import { merchantKey } from './categories';

export interface Settings {
  /** Lo que ya tienes ahorrado (colchón). Solo se guarda en tu navegador. */
  emergencyFund: number;
  /** Meses de gastos que quieres cubrir con el colchón. */
  emergencyMonths: number;
  /** Ingreso mensual neto si la nómina no entra en esta cuenta (0 = calcular). */
  monthlyIncomeOverride: number;
  /** Importe por debajo del cual un gasto discrecional cuenta como "hormiga". */
  smallExpenseThreshold: number;
}

export const DEFAULT_SETTINGS: Settings = {
  emergencyFund: 0,
  emergencyMonths: 6,
  monthlyIncomeOverride: 0,
  smallExpenseThreshold: 10,
};

export interface CategoryTotal {
  category: Category;
  total: number; // en positivo
  count: number;
  share: number; // sobre el gasto total
}

export interface MonthTotal {
  month: string; // yyyy-mm
  income: number;
  expense: number;
  savings: number;
}

export interface Recurring {
  merchant: string;
  categoryId: string;
  avgAmount: number;
  months: number;
  occurrences: number;
  monthlyCost: number;
}

export interface Analysis {
  from: string;
  to: string;
  days: number;
  months: number; // duración del periodo en meses (decimal)
  count: number;
  income: number;
  expense: number;
  savings: number; // dinero movido a ahorro
  transfersNet: number;
  net: number; // income - expense
  monthlyIncome: number;
  monthlyExpense: number;
  monthlySavings: number;
  savingsRate: number | null; // (ingresos - gastos) / ingresos
  needs: number;
  wants: number;
  byCategory: CategoryTotal[];
  byMonth: MonthTotal[];
  byDay: { day: string; expense: number }[];
  byWeekday: number[]; // gasto por día de la semana, L..D
  topMerchants: { merchant: string; total: number; count: number }[];
  recurring: Recurring[];
  small: { count: number; total: number; monthly: number; threshold: number };
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const dayMs = 86400000;
const toDate = (iso: string) => new Date(iso + 'T00:00:00Z');

export function analyze(txs: Transaction[], categories: Category[], settings: Settings = DEFAULT_SETTINGS): Analysis {
  const cats = new Map(categories.map((c) => [c.id, c]));
  const kindOf = (t: Transaction) => cats.get(t.categoryId)?.kind ?? (t.amount < 0 ? 'expense' : 'income');

  const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
  const from = sorted[0]?.date ?? '';
  const to = sorted[sorted.length - 1]?.date ?? '';
  const days = from ? Math.round((toDate(to).getTime() - toDate(from).getTime()) / dayMs) + 1 : 0;
  const months = Math.max(days / 30.44, days ? 1 / 30.44 : 0);

  let income = 0, expense = 0, savings = 0, transfersNet = 0, needs = 0, wants = 0;
  const catTotals = new Map<string, { total: number; count: number }>();
  const monthMap = new Map<string, MonthTotal>();
  const byWeekday = [0, 0, 0, 0, 0, 0, 0];
  const merchants = new Map<string, { total: number; count: number }>();
  const dayMap = new Map<string, number>();

  for (const t of sorted) {
    const kind = kindOf(t);
    const m = t.date.slice(0, 7);
    const mt = monthMap.get(m) ?? { month: m, income: 0, expense: 0, savings: 0 };
    monthMap.set(m, mt);
    if (kind === 'expense') {
      const v = -t.amount; // devoluciones restan
      expense += v;
      mt.expense += v;
      const ct = catTotals.get(t.categoryId) ?? { total: 0, count: 0 };
      ct.total += v;
      ct.count++;
      catTotals.set(t.categoryId, ct);
      if (cats.get(t.categoryId)?.need === 'need') needs += v;
      else wants += v;
      dayMap.set(t.date, (dayMap.get(t.date) ?? 0) + v);
      byWeekday[(toDate(t.date).getUTCDay() + 6) % 7] += v;
      const mk = merchantKey(t.concept);
      const me = merchants.get(mk) ?? { total: 0, count: 0 };
      me.total += v;
      me.count++;
      merchants.set(mk, me);
    } else if (kind === 'income') {
      income += t.amount;
      mt.income += t.amount;
    } else if (kind === 'savings') {
      savings += -t.amount;
      mt.savings += -t.amount;
    } else {
      transfersNet += t.amount;
    }
  }

  const byCategory: CategoryTotal[] = [...catTotals.entries()]
    .map(([id, v]) => ({
      category: cats.get(id) ?? { id, name: id, kind: 'expense' as const, icon: '•' },
      total: r2(v.total),
      count: v.count,
      share: expense > 0 ? v.total / expense : 0,
    }))
    .filter((c) => c.total > 0.005)
    .sort((a, b) => b.total - a.total);

  const monthlyIncome = settings.monthlyIncomeOverride > 0 ? settings.monthlyIncomeOverride : months ? income / months : 0;
  const monthlyExpense = months ? expense / months : 0;
  const smallTxs = sorted.filter(
    (t) => kindOf(t) === 'expense' && cats.get(t.categoryId)?.need !== 'need' && t.amount < 0 && -t.amount < settings.smallExpenseThreshold,
  );
  const smallTotal = smallTxs.reduce((s, t) => s - t.amount, 0);

  return {
    from,
    to,
    days,
    months,
    count: sorted.length,
    income: r2(income),
    expense: r2(expense),
    savings: r2(savings),
    transfersNet: r2(transfersNet),
    net: r2(income - expense),
    monthlyIncome: r2(monthlyIncome),
    monthlyExpense: r2(monthlyExpense),
    monthlySavings: r2(months ? savings / months : 0),
    savingsRate: monthlyIncome > 0 ? (monthlyIncome - monthlyExpense) / monthlyIncome : null,
    needs: r2(needs),
    wants: r2(wants),
    byCategory,
    byMonth: [...monthMap.values()]
      .map((m) => ({ ...m, income: r2(m.income), expense: r2(m.expense), savings: r2(m.savings) }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    byDay: days && days <= 62
      ? Array.from({ length: days }, (_, i) => {
          const d = new Date(toDate(from).getTime() + i * dayMs).toISOString().slice(0, 10);
          return { day: d, expense: r2(dayMap.get(d) ?? 0) };
        })
      : [],
    byWeekday: byWeekday.map(r2),
    topMerchants: [...merchants.entries()]
      .map(([merchant, v]) => ({ merchant, total: r2(v.total), count: v.count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10),
    recurring: findRecurring(sorted.filter((t) => kindOf(t) === 'expense')),
    small: {
      count: smallTxs.length,
      total: r2(smallTotal),
      monthly: r2(months ? smallTotal / Math.max(months, 1) : 0),
      threshold: settings.smallExpenseThreshold,
    },
  };
}

/**
 * Gastos recurrentes: mismo comercio en ≥2 meses distintos, ~1 cargo al mes
 * e importe estable (variación < 25 %). Típico de recibos y suscripciones.
 */
export function findRecurring(expenses: Transaction[]): Recurring[] {
  const groups = new Map<string, Transaction[]>();
  for (const t of expenses) {
    if (t.amount >= 0) continue;
    const k = merchantKey(t.concept);
    if (!k) continue;
    const g = groups.get(k) ?? [];
    g.push(t);
    groups.set(k, g);
  }
  const out: Recurring[] = [];
  for (const [merchant, g] of groups) {
    const months = new Set(g.map((t) => t.date.slice(0, 7))).size;
    if (months < 2) continue;
    if (g.length / months > 1.5) continue; // demasiado frecuente: no es un recibo
    const amounts = g.map((t) => -t.amount);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const sd = Math.sqrt(amounts.reduce((a, b) => a + (b - avg) ** 2, 0) / amounts.length);
    if (avg <= 0 || sd / avg > 0.25) continue;
    out.push({
      merchant,
      categoryId: g[g.length - 1].categoryId,
      avgAmount: r2(avg),
      months,
      occurrences: g.length,
      monthlyCost: r2((avg * g.length) / months),
    });
  }
  return out.sort((a, b) => b.monthlyCost - a.monthlyCost);
}

/** Valor futuro de aportar `monthly` €/mes durante `years` a una rentabilidad anual `rate`. */
export function futureValue(monthly: number, years: number, rate: number, initial = 0): number {
  const n = Math.round(years * 12);
  const i = rate / 12;
  if (i === 0) return r2(initial + monthly * n);
  return r2(initial * (1 + i) ** n + monthly * (((1 + i) ** n - 1) / i));
}

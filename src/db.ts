import Dexie, { type EntityTable, type Transaction as DexieTx } from 'dexie';
import type { Category, Rule, Transaction } from './core/types';
import { DEFAULT_CATEGORIES, DEFAULT_RULES, categorize, recategorizeAll } from './core/categories';
import { DEFAULT_SETTINGS, type Settings } from './core/analysis';
import type { ParsedRow } from './core/types';
import { withIds } from './core/parsers/ids';

interface ImportLog {
  id: string;
  at: string;
  fileName: string;
  bank: string;
  total: number;
  added: number;
}

interface KV {
  key: string;
  value: unknown;
}

const SCHEMA = {
  transactions: 'id, date, categoryId, account, importId',
  rules: 'id, categoryId, source',
  categories: 'id',
  imports: 'id, at',
  kv: 'key',
};

/** Añade las categorías por defecto que falten y solo sus reglas (no repone reglas borradas). */
async function addMissingDefaults(tx: DexieTx) {
  const have = new Set((await tx.table('categories').toCollection().primaryKeys()) as string[]);
  const added = DEFAULT_CATEGORIES.filter((c) => !have.has(c.id));
  if (!added.length) return;
  const ids = new Set(added.map((c) => c.id));
  await tx.table('categories').bulkAdd(added);
  await tx.table('rules').bulkPut(DEFAULT_RULES.filter((r) => ids.has(r.categoryId)));
}

/** Todo vive en IndexedDB de tu navegador. Nada sale del dispositivo. */
class GastosDB extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>;
  rules!: EntityTable<Rule, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  imports!: EntityTable<ImportLog, 'id'>;
  kv!: EntityTable<KV, 'key'>;

  constructor() {
    super('gestor-gastos');
    this.version(1).stores(SCHEMA);
    // Cada versión nueva añade a bases ya creadas las categorías por defecto que falten.
    this.version(2).stores(SCHEMA).upgrade(addMissingDefaults); // préstamos y créditos
    this.version(3).stores(SCHEMA).upgrade(addMissingDefaults); // altruismo y donaciones
    this.on('populate', async (tx) => {
      await tx.table('categories').bulkAdd(DEFAULT_CATEGORIES);
      await tx.table('rules').bulkAdd(DEFAULT_RULES);
    });
  }
}

export const db = new GastosDB();

export async function getSettings(): Promise<Settings> {
  const row = await db.kv.get('settings');
  return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<Settings>) ?? {}) };
}

export async function saveSettings(s: Settings) {
  await db.kv.put({ key: 'settings', value: s });
}

/** Importa filas ya parseadas. Devuelve cuántas eran nuevas. */
export async function importRows(fileName: string, bank: string, rows: ParsedRow[]) {
  const rules = await db.rules.toArray();
  const importId = crypto.randomUUID();
  const withId = withIds(bank, rows);
  const existing = new Set((await db.transactions.bulkGet(withId.map((r) => r.id))).filter(Boolean).map((t) => t!.id));
  const fresh: Transaction[] = withId
    .filter((r) => !existing.has(r.id))
    .map((r) => ({ ...r, account: bank, importId, categoryId: categorize(r.concept, r.amount, rules) }));
  await db.transaction('rw', db.transactions, db.imports, async () => {
    await db.transactions.bulkAdd(fresh);
    await db.imports.add({ id: importId, at: new Date().toISOString(), fileName, bank, total: rows.length, added: fresh.length });
  });
  return { total: rows.length, added: fresh.length };
}

/** Aplica las reglas actuales a todo lo no fijado a mano. */
export async function reapplyRules() {
  const [txs, rules] = await Promise.all([db.transactions.toArray(), db.rules.toArray()]);
  const changed = recategorizeAll(txs, rules);
  if (changed.length) await db.transactions.bulkPut(changed);
  return changed.length;
}

/** Copia de seguridad completa (para pasar a otro navegador/dispositivo). */
export async function exportBackup(): Promise<string> {
  const [transactions, rules, categories, imports, kv] = await Promise.all([
    db.transactions.toArray(),
    db.rules.toArray(),
    db.categories.toArray(),
    db.imports.toArray(),
    db.kv.toArray(),
  ]);
  return JSON.stringify({ app: 'gestor-gastos', version: 1, exportedAt: new Date().toISOString(), transactions, rules, categories, imports, kv });
}

export async function importBackup(json: string) {
  const data = JSON.parse(json);
  if (data?.app !== 'gestor-gastos') throw new Error('No es una copia de seguridad de esta app.');
  await db.transaction('rw', [db.transactions, db.rules, db.categories, db.imports, db.kv], async () => {
    await Promise.all([db.transactions.clear(), db.rules.clear(), db.categories.clear(), db.imports.clear(), db.kv.clear()]);
    await db.transactions.bulkAdd(data.transactions ?? []);
    await db.rules.bulkAdd(data.rules ?? []);
    await db.categories.bulkAdd(data.categories ?? []);
    await db.imports.bulkAdd(data.imports ?? []);
    await db.kv.bulkAdd(data.kv ?? []);
  });
}

export async function wipeAll() {
  await db.delete();
  location.reload();
}

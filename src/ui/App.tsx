import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSettings } from '../db';
import { analyze, DEFAULT_SETTINGS } from '../core/analysis';
import { monthLabel } from '../core/format';
import type { Transaction } from '../core/types';
import { Importer } from './Importer';
import { Dashboard } from './Dashboard';
import { Movements } from './Movements';
import { Advice } from './Advice';
import { Invest } from './Invest';
import { SettingsView } from './SettingsView';

type Tab = 'resumen' | 'movimientos' | 'consejos' | 'invertir' | 'ajustes';
const TABS: { id: Tab; label: string; ico: string }[] = [
  { id: 'resumen', label: 'Resumen', ico: '📊' },
  { id: 'movimientos', label: 'Movimientos', ico: '📄' },
  { id: 'consejos', label: 'Consejos', ico: '💡' },
  { id: 'invertir', label: 'Invertir', ico: '📈' },
  { id: 'ajustes', label: 'Ajustes', ico: '⚙️' },
];

export type Period = 'all' | 'last1' | 'last3' | 'last6' | 'last12' | `m:${string}`;

function filterPeriod(txs: Transaction[], p: Period): Transaction[] {
  if (p === 'all' || txs.length === 0) return txs;
  if (p.startsWith('m:')) return txs.filter((t) => t.date.startsWith(p.slice(2)));
  const last = txs.reduce((m, t) => (t.date > m ? t.date : m), '');
  const n = Number(p.replace('last', ''));
  const d = new Date(last + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() - n);
  const from = d.toISOString().slice(0, 10);
  return txs.filter((t) => t.date > from);
}

export function App() {
  const [tab, setTab] = useState<Tab>('resumen');
  const [period, setPeriod] = useState<Period>('all');
  const [catFilter, setCatFilter] = useState<string>('');

  const txs = useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray(), []);
  const categories = useLiveQuery(() => db.categories.toArray(), []);
  const rules = useLiveQuery(() => db.rules.toArray(), []);
  const settings = useLiveQuery(() => getSettings(), []) ?? DEFAULT_SETTINGS;

  const months = useMemo(() => [...new Set((txs ?? []).map((t) => t.date.slice(0, 7)))].sort().reverse(), [txs]);
  const filtered = useMemo(() => filterPeriod(txs ?? [], period), [txs, period]);
  const analysis = useMemo(() => analyze(filtered, categories ?? [], settings), [filtered, categories, settings]);

  if (!txs || !categories || !rules) return <div className="app" />;

  const goToCategory = (id: string) => {
    setCatFilter(id);
    setTab('movimientos');
  };

  const nav = (cls: string) => (
    <nav className={`tabs ${cls}`} aria-label="Secciones">
      {TABS.map((t) => (
        <button key={t.id} className="tab" aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
          <span className="ico" aria-hidden>{t.ico}</span>
          {t.label}
        </button>
      ))}
    </nav>
  );

  const empty = txs.length === 0;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
          Gastos
        </div>
        {nav('tabs-desktop')}
      </header>
      {nav('tabs-mobile')}

      {!empty && tab !== 'ajustes' && (
        <div className="periods" role="group" aria-label="Periodo">
          {(
            [
              ['all', 'Todo'],
              ['last1', 'Último mes'],
              ['last3', '3 meses'],
              ['last6', '6 meses'],
              ['last12', '12 meses'],
            ] as [Period, string][]
          ).map(([p, l]) => (
            <button key={p} className="chip" aria-pressed={period === p} onClick={() => setPeriod(p)}>
              {l}
            </button>
          ))}
          {months.map((m) => (
            <button key={m} className="chip" aria-pressed={period === `m:${m}`} onClick={() => setPeriod(`m:${m}`)}>
              {monthLabel(m)}
            </button>
          ))}
        </div>
      )}

      <main>
        {empty && tab !== 'ajustes' ? (
          <Importer first />
        ) : tab === 'resumen' ? (
          <Dashboard a={analysis} onCategory={goToCategory} />
        ) : tab === 'movimientos' ? (
          <Movements txs={filtered} categories={categories} catFilter={catFilter} setCatFilter={setCatFilter} />
        ) : tab === 'consejos' ? (
          <Advice a={analysis} settings={settings} />
        ) : tab === 'invertir' ? (
          <Invest a={analysis} settings={settings} />
        ) : (
          <SettingsView settings={settings} rules={rules} categories={categories} />
        )}
      </main>
    </div>
  );
}

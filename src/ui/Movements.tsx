import { useEffect, useMemo, useState } from 'react';
import type { Category, Transaction } from '../core/types';
import { merchantKey } from '../core/categories';
import { eur, dateLabel } from '../core/format';
import { db, reapplyRules } from '../db';
import { norm } from '../core/parsers/util';

interface Props {
  txs: Transaction[];
  categories: Category[];
  catFilter: string;
  setCatFilter: (id: string) => void;
}

const PAGE = 150;

export function Movements({ txs, categories, catFilter, setCatFilter }: Props) {
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [toast, setToast] = useState<{ merchant: string; categoryId: string } | null>(null);

  useEffect(() => setLimit(PAGE), [q, catFilter]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 9000);
    return () => clearTimeout(id);
  }, [toast]);

  const rows = useMemo(() => {
    const nq = norm(q);
    return txs.filter((t) => (!catFilter || t.categoryId === catFilter) && (!nq || norm(t.concept).includes(nq)));
  }, [txs, q, catFilter]);
  const total = rows.reduce((s, t) => s + t.amount, 0);
  const catName = new Map(categories.map((c) => [c.id, c]));

  async function change(t: Transaction, categoryId: string) {
    await db.transactions.update(t.id, { categoryId, manual: true });
    const merchant = merchantKey(t.concept);
    if (merchant.length >= 3) setToast({ merchant, categoryId });
  }

  async function makeRule() {
    if (!toast) return;
    await db.rules.put({ id: `u:${toast.merchant}`, pattern: toast.merchant, categoryId: toast.categoryId, source: 'user' });
    const n = await reapplyRules();
    setToast(null);
    if (n) console.info(`Regla aplicada a ${n} movimientos`);
  }

  return (
    <section className="card">
      <div className="filters">
        <input type="search" placeholder="Buscar concepto…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </div>
      <p className="sub num" style={{ marginTop: 0 }}>
        {rows.length} movimientos · saldo neto {eur(total)}
      </p>
      <div>
        {rows.slice(0, limit).map((t) => (
          <div className="tx" key={t.id}>
            <span className="d num">{dateLabel(t.date).slice(0, 5)}</span>
            <span className="c" title={t.concept}>
              {t.concept}
            </span>
            <span className={`a num ${t.amount > 0 ? 'pos' : ''}`}>{eur(t.amount)}</span>
            <span />
            <select value={t.categoryId} onChange={(e) => change(t, e.target.value)} aria-label={`Categoría de ${t.concept}`}>
              {!catName.has(t.categoryId) && <option value={t.categoryId}>{t.categoryId}</option>}
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                  {t.manual && c.id === t.categoryId ? ' ✎' : ''}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {rows.length > limit && (
        <button className="btn" style={{ marginTop: 12 }} onClick={() => setLimit(limit + PAGE)}>
          Ver más ({rows.length - limit})
        </button>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>¿Aplicar a todos los de «{toast.merchant}»?</span>
          <button className="btn small" onClick={makeRule}>
            Crear regla
          </button>
          <button className="btn small" onClick={() => setToast(null)} aria-label="Cerrar">
            ✕
          </button>
        </div>
      )}
    </section>
  );
}

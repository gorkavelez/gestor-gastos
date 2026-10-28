import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Analysis } from '../core/analysis';
import { eur, eur0, monthLabel, pct } from '../core/format';
import { Importer } from './Importer';

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card kpi">
      <div className="label">{label}</div>
      <div className="value num">{value}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

type TipProps = { active?: boolean; label?: string | number; payload?: { name?: string; value?: number; color?: string }[] };
function ChartTip({ active, payload, label, fmtLabel }: TipProps & { fmtLabel: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <b>{fmtLabel(String(label))}</b>
      {payload.map((p) => (
        <div key={p.name} className="num">
          <i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: p.color, marginRight: 6 }} />
          {p.name}: {eur(p.value ?? 0)}
        </div>
      ))}
    </div>
  );
}

const money = (n: number) => (Math.abs(n) < 1000 ? eur(n) : eur0(n));
const axis = { fontSize: 12, fill: 'var(--muted)' };

export function Dashboard({ a, onCategory }: { a: Analysis; onCategory: (id: string) => void }) {
  if (a.count === 0) return <p className="sub">No hay movimientos en este periodo.</p>;
  const multiMonth = a.byMonth.length > 1;
  const maxCat = a.byCategory[0]?.total ?? 1;

  return (
    <div className="stack">
      <div className="grid kpis">
        <Kpi label="Gastos" value={money(a.expense)} hint={a.days >= 28 ? `${eur0(a.monthlyExpense)}/mes` : `${a.days} ${a.days === 1 ? 'día' : 'días'}`} />
        <Kpi label="Ingresos" value={money(a.income)} hint={a.income ? `${eur0(a.monthlyIncome)}/mes` : 'sin ingresos en el periodo'} />
        <Kpi label="A ahorro" value={money(a.savings)} hint="traspasos a ahorro, no cuentan como gasto" />
        <Kpi
          label="Tasa de ahorro"
          value={a.savingsRate == null ? '—' : pct(a.savingsRate)}
          hint={a.savingsRate == null ? 'indica tus ingresos en Ajustes' : '(ingresos − gastos) / ingresos'}
        />
      </div>

      <div className="grid two">
        <div className="stack">
          <section className="card">
            <div className="card-head">
              <h2>{multiMonth ? 'Evolución mensual' : 'Gasto por día'}</h2>
              {multiMonth && (
                <div className="legend">
                  <span><i style={{ background: 'var(--s-income)' }} />Ingresos</span>
                  <span><i style={{ background: 'var(--s-expense)' }} />Gastos</span>
                  <span><i style={{ background: 'var(--s-savings)' }} />Ahorro</span>
                </div>
              )}
            </div>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                {multiMonth ? (
                  <BarChart data={a.byMonth} barGap={2} margin={{ left: -8, right: 4 }}>
                    <CartesianGrid vertical={false} stroke="var(--line)" />
                    <XAxis dataKey="month" tickFormatter={monthLabel} tick={axis} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => eur0(v)} tick={axis} axisLine={false} tickLine={false} width={70} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={<ChartTip fmtLabel={monthLabel} />} />
                    <Bar dataKey="income" name="Ingresos" fill="var(--s-income)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                    <Bar dataKey="expense" name="Gastos" fill="var(--s-expense)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                    <Bar dataKey="savings" name="Ahorro" fill="var(--s-savings)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                  </BarChart>
                ) : (
                  <BarChart data={a.byDay} margin={{ left: -8, right: 4 }}>
                    <CartesianGrid vertical={false} stroke="var(--line)" />
                    <XAxis dataKey="day" tickFormatter={(d) => d.slice(8)} tick={axis} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v) => eur0(v)} tick={axis} axisLine={false} tickLine={false} width={70} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={<ChartTip fmtLabel={(d) => d.split('-').reverse().join('/')} />} />
                    <Bar dataKey="expense" name="Gasto" fill="var(--s-expense)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Dónde se va el dinero</h2>
              <span className="sub">toca una categoría para ver sus movimientos</span>
            </div>
            <ul className="catbars">
              {a.byCategory.map((c) => (
                <li key={c.category.id} onClick={() => onCategory(c.category.id)} title={`${c.count} movimientos`}>
                  <span className="name">
                    {c.category.icon} {c.category.name}
                  </span>
                  <span className="amt num">{eur(c.total)}</span>
                  <span className="track">
                    <span style={{ width: `${Math.max(1, (c.total / maxCat) * 100)}%` }} />
                  </span>
                  <span className="meta num">
                    {pct(c.share)} · {c.count} mov. · {c.category.need === 'need' ? 'necesidad' : 'discrecional'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="stack">
          <section className="card">
            <div className="card-head">
              <h2>Necesidades vs. deseos</h2>
            </div>
            <NeedsWants needs={a.needs} wants={a.wants} />
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Comercios con más gasto</h2>
            </div>
            <ul className="list">
              {a.topMerchants.slice(0, 7).map((m) => (
                <li key={m.merchant}>
                  <span className="l">
                    {m.merchant} <span className="sub">×{m.count}</span>
                  </span>
                  <span className="num">{eur(m.total)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Cargos recurrentes</h2>
              <span className="sub">{a.recurring.length ? `~${eur(a.recurring.reduce((s, r) => s + r.monthlyCost, 0))}/mes` : ''}</span>
            </div>
            {a.recurring.length ? (
              <ul className="list">
                {a.recurring.slice(0, 8).map((r) => (
                  <li key={r.merchant}>
                    <span className="l">{r.merchant}</span>
                    <span className="num">{eur(r.avgAmount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="note">Se detectan con al menos 2 meses de datos.</p>
            )}
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Importar más</h2>
            </div>
            <Importer />
          </section>
        </div>
      </div>
    </div>
  );
}

function NeedsWants({ needs, wants }: { needs: number; wants: number }) {
  const total = needs + wants || 1;
  return (
    <div>
      <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2, background: 'var(--surface)' }}>
        <span style={{ width: `${(needs / total) * 100}%`, background: 'var(--s-income)' }} />
        <span style={{ width: `${(wants / total) * 100}%`, background: 'var(--s-expense)' }} />
      </div>
      <div className="legend" style={{ marginTop: 10, justifyContent: 'space-between' }}>
        <span className="num"><i style={{ background: 'var(--s-income)' }} />Necesidades {eur0(needs)} ({pct(needs / total)})</span>
        <span className="num"><i style={{ background: 'var(--s-expense)' }} />Deseos {eur0(wants)} ({pct(wants / total)})</span>
      </div>
    </div>
  );
}


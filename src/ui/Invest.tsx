import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { futureValue, type Analysis, type Settings } from '../core/analysis';
import { eur0 } from '../core/format';

const SCEN = [
  { rate: 0.02, name: '2 % anual', color: 'var(--s-income)' },
  { rate: 0.04, name: '4 % anual', color: 'var(--s-savings)' },
  { rate: 0.06, name: '6 % anual', color: 'var(--s-expense)' },
];

export function Invest({ a, settings }: { a: Analysis; settings: Settings }) {
  const surplus = Math.max(0, a.monthlyIncome - a.monthlyExpense);
  const suggested = Math.max(50, Math.round((surplus * 0.5) / 10) * 10 || Math.round(a.monthlySavings / 10) * 10);
  const [monthly, setMonthly] = useState(suggested);
  const [years, setYears] = useState(15);
  const [initial, setInitial] = useState(0);

  const target = a.monthlyExpense * settings.emergencyMonths;
  const fundOk = settings.emergencyFund >= target && target > 0;

  const data = Array.from({ length: years + 1 }, (_, y) => {
    const row: Record<string, number> = { year: y, Aportado: initial + monthly * 12 * y };
    for (const s of SCEN) row[s.name] = futureValue(monthly, y, s.rate, initial);
    return row;
  });
  const last = data[data.length - 1];

  return (
    <div className="grid two">
      <section className="card">
        <div className="card-head">
          <h2>¿Cuánto podría crecer?</h2>
          <span className="sub">interés compuesto, escenarios hipotéticos</span>
        </div>
        <div className="form">
          <div className="field">
            <label htmlFor="m">Aportación mensual (€)</label>
            <input id="m" type="number" min={0} step={10} value={monthly} onChange={(e) => setMonthly(Number(e.target.value) || 0)} />
          </div>
          <div className="field">
            <label htmlFor="y">Años</label>
            <input id="y" type="number" min={1} max={40} value={years} onChange={(e) => setYears(Math.min(40, Math.max(1, Number(e.target.value) || 1)))} />
          </div>
          <div className="field">
            <label htmlFor="i">Capital inicial (€)</label>
            <input id="i" type="number" min={0} step={100} value={initial} onChange={(e) => setInitial(Number(e.target.value) || 0)} />
          </div>
        </div>
        <div className="legend" style={{ margin: '14px 0 6px' }}>
          <span><i style={{ background: 'var(--muted)' }} />Aportado {eur0(last.Aportado)}</span>
          {SCEN.map((s) => (
            <span key={s.name} className="num">
              <i style={{ background: s.color }} />
              {s.name}: {eur0(last[s.name])}
            </span>
          ))}
        </div>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ left: -8, right: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: 'var(--muted)' }} axisLine={false} tickLine={false} tickFormatter={(y) => `${y}a`} />
              <YAxis tickFormatter={(v) => eur0(v)} tick={{ fontSize: 12, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip
                formatter={(v) => eur0(Number(v))}
                labelFormatter={(y) => `Año ${y}`}
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 13 }}
              />
              <Line dataKey="Aportado" stroke="var(--muted)" strokeDasharray="4 4" strokeWidth={2} dot={false} isAnimationActive={false} />
              {SCEN.map((s) => (
                <Line key={s.name} dataKey={s.name} stroke={s.color} strokeWidth={2} dot={false} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="note">
          Las rentabilidades son supuestos para comparar, no previsiones. La inversión en bolsa puede perder valor, sobre todo a corto plazo, y no se
          descuentan comisiones ni impuestos.
        </p>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Por dónde empezar</h2>
        </div>
        <ol style={{ paddingLeft: 20, margin: 0, display: 'grid', gap: 10 }}>
          <li>
            <strong>Controla el gasto.</strong> Excedente medio actual: <span className="num">{eur0(surplus)}/mes</span>
            {a.monthlyIncome === 0 && ' (indica tus ingresos en Ajustes para calcularlo)'}.
          </li>
          <li>
            <strong>Colchón de emergencia</strong> de {settings.emergencyMonths} meses de gasto (~{eur0(target)}) en cuenta remunerada o depósito con
            liquidez. {fundOk ? '✅ Cubierto.' : `Tienes ${eur0(settings.emergencyFund)} indicado.`}
          </li>
          <li>
            <strong>Liquida deudas caras</strong> (tarjetas revolving, préstamos al consumo) antes de invertir.
          </li>
          <li>
            <strong>Aportación periódica automática</strong> a algo diversificado y de bajo coste para el largo plazo (≥ 5–10 años). Las opciones
            habituales en España son fondos indexados, planes de pensiones/EPSV (con ventaja fiscal en Euskadi) o letras/depósitos para plazos cortos.
          </li>
          <li>
            <strong>Revisa una vez al año</strong>, no a diario. Para decidir producto concreto, contrasta con un asesor financiero independiente.
          </li>
        </ol>
      </section>
    </div>
  );
}

import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Settings } from '../core/analysis';
import type { Category, Rule } from '../core/types';
import { db, exportBackup, importBackup, reapplyRules, saveSettings, wipeAll } from '../db';

interface Props {
  settings: Settings;
  rules: Rule[];
  categories: Category[];
}

export function SettingsView({ settings, rules, categories }: Props) {
  const [s, setS] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [pattern, setPattern] = useState('');
  const [cat, setCat] = useState(categories[0]?.id ?? '');
  const [info, setInfo] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const imports = useLiveQuery(() => db.imports.orderBy('at').reverse().toArray(), []) ?? [];
  const catName = new Map(categories.map((c) => [c.id, `${c.icon} ${c.name}`]));
  const userRules = rules.filter((r) => r.source === 'user');

  const num = (k: keyof Settings) => ({
    value: s[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Number(e.target.value) || 0 }),
  });

  async function addRule() {
    const p = pattern.trim().toUpperCase();
    if (p.length < 2) return;
    await db.rules.put({ id: `u:${p}`, pattern: p, categoryId: cat, source: 'user' });
    const n = await reapplyRules();
    setPattern('');
    setInfo(`Regla creada. ${n} movimientos recategorizados.`);
  }

  async function download() {
    const blob = new Blob([await exportBackup()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gastos-copia-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="grid two">
      <div className="stack">
        <section className="card">
          <div className="card-head">
            <h2>Tu situación</h2>
            <span className="sub">solo se guarda en este navegador</span>
          </div>
          <div className="form">
            <div className="field">
              <label htmlFor="ef">Ahorro ya disponible (colchón) €</label>
              <input id="ef" type="number" min={0} step={100} {...num('emergencyFund')} />
            </div>
            <div className="field">
              <label htmlFor="em">Meses de colchón objetivo</label>
              <input id="em" type="number" min={1} max={24} {...num('emergencyMonths')} />
            </div>
            <div className="field">
              <label htmlFor="inc">Ingreso mensual neto € (0 = calcular de los movimientos)</label>
              <input id="inc" type="number" min={0} step={50} {...num('monthlyIncomeOverride')} />
            </div>
            <div className="field">
              <label htmlFor="th">Umbral «gasto hormiga» €</label>
              <input id="th" type="number" min={1} max={50} {...num('smallExpenseThreshold')} />
            </div>
          </div>
          <button
            className="btn primary"
            style={{ marginTop: 12 }}
            onClick={async () => {
              await saveSettings(s);
              setSaved(true);
              setTimeout(() => setSaved(false), 2000);
            }}
          >
            {saved ? 'Guardado ✓' : 'Guardar'}
          </button>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Tus reglas de categorías</h2>
            <span className="sub">ganan a las reglas por defecto</span>
          </div>
          <div className="filters">
            <input placeholder="Texto del concepto, p. ej. BAR AGIRRE" value={pattern} onChange={(e) => setPattern(e.target.value)} />
            <select value={cat} onChange={(e) => setCat(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
            <button className="btn" onClick={addRule}>
              Añadir
            </button>
          </div>
          {info && <p className="note">{info}</p>}
          {userRules.length === 0 ? (
            <p className="note">Aún no tienes reglas propias. Se crean también al cambiar la categoría de un movimiento.</p>
          ) : (
            <ul className="list">
              {userRules.map((r) => (
                <li key={r.id}>
                  <span className="l">
                    «{r.pattern}» → {catName.get(r.categoryId) ?? r.categoryId}
                  </span>
                  <button
                    className="btn small danger"
                    onClick={async () => {
                      await db.rules.delete(r.id);
                      await reapplyRules();
                    }}
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
          <details style={{ marginTop: 10 }}>
            <summary className="sub">Ver {rules.length - userRules.length} reglas por defecto</summary>
            <p className="note">
              {categories
                .map((c) => {
                  const pats = rules.filter((r) => r.source === 'default' && r.categoryId === c.id).map((r) => r.pattern.trim());
                  return pats.length ? `${c.icon} ${c.name}: ${pats.join(', ')}` : '';
                })
                .filter(Boolean)
                .join(' · ')}
            </p>
          </details>
        </section>
      </div>

      <div className="stack">
        <section className="card">
          <div className="card-head">
            <h2>Copia de seguridad</h2>
          </div>
          <p className="sub" style={{ marginTop: 0 }}>
            Tus datos viven solo en este navegador. Descarga una copia para pasarlos a otro dispositivo o no perderlos si borras el navegador.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" onClick={download}>
              Descargar copia
            </button>
            <button className="btn" onClick={() => fileRef.current?.click()}>
              Restaurar copia
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  await importBackup(await f.text());
                  setInfo('Copia restaurada.');
                } catch (err) {
                  setInfo((err as Error).message);
                }
              }}
            />
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Importaciones</h2>
          </div>
          {imports.length === 0 ? (
            <p className="note">Ninguna todavía.</p>
          ) : (
            <ul className="list">
              {imports.map((i) => (
                <li key={i.id}>
                  <span className="l">
                    {i.fileName} <span className="sub">{new Date(i.at).toLocaleDateString('es-ES')}</span>
                  </span>
                  <span className="num sub">
                    {i.added}/{i.total}
                  </span>
                  <button
                    className="btn small danger"
                    title="Borra los movimientos que entraron en esta importación"
                    onClick={async () => {
                      await db.transactions.where('importId').equals(i.id).delete();
                      await db.imports.delete(i.id);
                    }}
                  >
                    Deshacer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Borrar todo</h2>
          </div>
          <p className="sub" style={{ marginTop: 0 }}>
            Elimina movimientos, reglas y ajustes de este navegador.
          </p>
          <ConfirmWipe />
        </section>
      </div>
    </div>
  );
}

function ConfirmWipe() {
  const [armed, setArmed] = useState(false);
  return armed ? (
    <div style={{ display: 'flex', gap: 8 }}>
      <button className="btn danger" onClick={wipeAll}>
        Sí, borrar todo
      </button>
      <button className="btn" onClick={() => setArmed(false)}>
        Cancelar
      </button>
    </div>
  ) : (
    <button className="btn danger" onClick={() => setArmed(true)}>
      Borrar todos los datos
    </button>
  );
}

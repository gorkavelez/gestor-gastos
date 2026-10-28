import { useState } from 'react';
import type { Analysis, Settings } from '../core/analysis';
import { buildInsights, claudeSummary } from '../core/advice';

const LABEL = { good: 'Bien', info: 'Dato', tip: 'Mejora', warning: 'Atención' } as const;

export function Advice({ a, settings }: { a: Analysis; settings: Settings }) {
  const insights = buildInsights(a, settings);
  const summary = claudeSummary(a, settings);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* el usuario puede copiar del cuadro de texto */
    }
  }

  return (
    <div className="grid two">
      <section>
        {insights.length === 0 && <p className="sub">Importa movimientos para ver recomendaciones.</p>}
        {insights.map((i, k) => (
          <article className="insight" key={k}>
            <h3>
              <span className={`badge ${i.level}`}>{LABEL[i.level]}</span>
              {i.title}
            </h3>
            <p>{i.text}</p>
          </article>
        ))}
        <p className="note" style={{ marginTop: 14 }}>
          Son señales calculadas con reglas sencillas sobre tus datos, no asesoramiento financiero profesional.
        </p>
      </section>
      <section className="card">
        <div className="card-head">
          <h2>Pide una segunda opinión a Claude</h2>
        </div>
        <p className="sub" style={{ marginTop: 0 }}>
          Resumen <strong>agregado y anónimo</strong>: totales por categoría y mes, sin conceptos, comercios ni nombres. Cópialo y pégalo en
          una conversación con Claude.
        </p>
        <textarea readOnly value={summary} aria-label="Resumen para Claude" />
        <button className="btn primary" style={{ marginTop: 10 }} onClick={copy}>
          {copied ? '¡Copiado!' : 'Copiar resumen'}
        </button>
      </section>
    </div>
  );
}

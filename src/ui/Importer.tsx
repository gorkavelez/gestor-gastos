import { useRef, useState } from 'react';
import { demoRows } from '../core/demo';
import { importRows } from '../db';

/** Zona para soltar/elegir extractos. Todo se procesa en el navegador. */
export function Importer({ first = false }: { first?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string[]>([]);

  async function handle(files: FileList | File[]) {
    setBusy(true);
    const out: string[] = [];
    // SheetJS es pesado: se carga solo al importar
    const { parseStatement } = await import('../core/parsers');
    for (const f of Array.from(files)) {
      try {
        const r = parseStatement(await f.arrayBuffer());
        if (r.rows.length) {
          const { total, added } = await importRows(f.name, r.bank, r.rows);
          out.push(`✅ ${f.name}: ${total} movimientos, ${added} nuevos${total - added ? ` (${total - added} ya estaban)` : ''}.`);
        }
        out.push(...r.warnings.slice(0, 3).map((w) => `⚠️ ${f.name}: ${w}`));
      } catch (e) {
        out.push(`❌ ${f.name}: ${(e as Error).message}`);
      }
    }
    if (!out.length) out.push('No se ha importado nada.');
    setMsg(out);
    setBusy(false);
  }

  async function demo() {
    setBusy(true);
    const { added } = await importRows('datos-de-ejemplo', 'demo', demoRows(new Date().toISOString().slice(0, 10)));
    setMsg([`✅ Cargados ${added} movimientos ficticios. Puedes borrarlos en Ajustes.`]);
    setBusy(false);
  }

  return (
    <section className={first ? 'empty' : ''}>
      {first && (
        <div style={{ maxWidth: 520, margin: '0 auto 20px' }}>
          <h1 style={{ fontSize: '1.6rem', marginBottom: 8 }}>Tus gastos, claros</h1>
          <p className="sub" style={{ fontSize: '0.95rem' }}>
            Importa el extracto de movimientos de Kutxabank (.xls). Se procesa en tu dispositivo: no se sube a ningún servidor.
          </p>
        </div>
      )}
      <div
        className={`drop ${over ? 'over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          handle(e.dataTransfer.files);
        }}
      >
        <p style={{ marginTop: 0 }}>Arrastra aquí uno o varios extractos</p>
        <button className="btn primary" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? 'Importando…' : 'Elegir fichero'}
        </button>
        {first && (
          <button className="btn" style={{ marginLeft: 8 }} disabled={busy} onClick={demo}>
            Probar con datos de ejemplo
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept=".xls,.xlsx,.csv"
          multiple
          hidden
          onChange={(e) => {
            // Copiar antes de limpiar: FileList es "viva" y se vacía al resetear el input
            const files = Array.from(e.target.files ?? []);
            e.target.value = '';
            if (files.length) handle(files);
          }}
        />
        <p className="note" style={{ marginBottom: 0 }}>
          Puedes importar extractos que se solapan: los movimientos repetidos se detectan y no se duplican.
        </p>
      </div>
      {msg.length > 0 && (
        <ul className="list" style={{ marginTop: 12, textAlign: 'left' }} aria-live="polite">
          {msg.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

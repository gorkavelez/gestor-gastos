# Gestor de gastos

App web personal para **importar extractos bancarios, categorizar los movimientos, analizar el gasto y recibir consejos** para ahorrar e invertir.

**Abrir la app (móvil u ordenador):** <https://gorkavelez.github.io/gestor-gastos/>

- **100 % en el navegador.** El extracto se lee en tu dispositivo y los datos se guardan en IndexedDB. No hay servidor ni base de datos. Nada sale de tu móvil u ordenador.
- **El repositorio solo contiene código.** Puede ser público sin exponer tus finanzas. `.gitignore` bloquea `*.xls`/`*.xlsx` para que no subas un extracto por error.
- **Instalable en el móvil (PWA).** En Chrome o Safari, usa «Añadir a pantalla de inicio». Funciona sin conexión.

## Funciones

| Sección | Qué hace |
|---|---|
| **Resumen** | Gastos, ingresos, ahorro y tasa de ahorro; evolución mensual (o diaria si solo hay un mes); gasto por categoría; necesidades frente a deseos; comercios con más gasto; cargos recurrentes. |
| **Movimientos** | Búsqueda y filtro. Al cambiar la categoría de un movimiento, ofrece **crear una regla** para todos los del mismo comercio. |
| **Consejos** | Avisos calculados con reglas: tasa de ahorro, gasto hormiga, categoría discrecional dominante, 50/30/20 y colchón de emergencia. Incluye un **resumen anónimo para pegar en Claude** (solo totales, sin conceptos ni nombres). |
| **Invertir** | Simulador de interés compuesto con escenarios hipotéticos del 2, 4 y 6 %, y orden recomendado: colchón → deudas → aportación periódica. |
| **Ajustes** | Colchón actual, ingreso mensual (si la nómina entra en otra cuenta), reglas propias, deshacer importaciones, copia de seguridad JSON y borrar todo. |

Los **traspasos a ahorro** (p. ej. «Ahorra las vueltas» de Kutxabank) se cuentan como ahorro, no como gasto. Las **transferencias y Bizum** van aparte.

## Bancos soportados

- **Kutxabank**: «Movimientos de cuenta» exportado en .xls/.xlsx (columnas `fecha | concepto | fecha valor | importe | saldo`).

Puedes importar extractos que se solapan. Cada movimiento tiene una huella (fecha + concepto + importe + saldo) y los repetidos se ignoran.

### Añadir otro banco

1. Crea `src/core/parsers/<banco>.ts` que implemente `BankParser` (`detect` + `parse`), tomando `kutxabank.ts` como modelo.
2. Regístralo en `src/core/parsers/index.ts`.
3. Añade un fichero de ejemplo **ficticio** en `tests/fixtures/` y su test.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests del núcleo (parser, categorías, análisis)
npm run build      # genera dist/
```

Estructura:

```
src/
  core/            lógica pura, sin React (testeable)
    parsers/       lectura de extractos por banco
    categories.ts  categorías y reglas por defecto
    analysis.ts    totales, meses, recurrentes, gasto hormiga, interés compuesto
    advice.ts      consejos y resumen anónimo para Claude
  db.ts            IndexedDB (Dexie)
  ui/              pantallas React
tests/             Vitest + fixture sintético
```

## Publicar en GitHub Pages

1. Sube el repositorio a GitHub (rama `main`).
2. En **Settings → Pages → Build and deployment**, elige **Source: GitHub Actions**.
3. Cada push a `main` ejecuta los tests, compila y publica en `https://<usuario>.github.io/<repo>/`.

> La URL de la app es pública, pero los datos no: cada navegador tiene los suyos. Para pasarlos a otro dispositivo, usa **Ajustes → Copia de seguridad**.

## Nota sobre SheetJS

En npm, `xlsx` se quedó en la versión 0.18.5. SheetJS publica las versiones nuevas en su propio CDN. Para actualizar:

```bash
npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

## Aviso

Los consejos son orientativos, se calculan con reglas sencillas y no constituyen asesoramiento financiero.

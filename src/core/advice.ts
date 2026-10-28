import type { Analysis, Settings } from './analysis';
import { futureValue } from './analysis';
import { eur, pct } from './format';

export type InsightLevel = 'good' | 'info' | 'tip' | 'warning';

export interface Insight {
  level: InsightLevel;
  title: string;
  text: string;
}

/**
 * Consejos basados en reglas sencillas y transparentes. No es asesoramiento
 * financiero: son señales para que decidas tú (o lo contrastes con un profesional).
 */
export function buildInsights(a: Analysis, s: Settings): Insight[] {
  const out: Insight[] = [];
  if (a.count === 0) return out;

  if (a.days < 28) {
    out.push({
      level: 'info',
      title: 'Pocos datos todavía',
      text: `El periodo cubre ${a.days} días. Las medias mensuales son estimaciones; importa al menos 2–3 meses para que el análisis sea fiable.`,
    });
  }

  if (a.monthlyIncome === 0) {
    out.push({
      level: 'info',
      title: 'No veo ingresos',
      text: 'No hay nómina en este periodo (o entra en otra cuenta). Indica tu ingreso mensual en Ajustes para calcular tasa de ahorro y capacidad de inversión.',
    });
  }

  // Tasa de ahorro
  if (a.savingsRate != null) {
    const r = a.savingsRate;
    if (r < 0) {
      out.push({ level: 'warning', title: 'Gastas más de lo que ingresas', text: `Gasto medio ${eur(a.monthlyExpense)}/mes frente a ingresos de ${eur(a.monthlyIncome)}/mes. Antes de invertir, toca recortar o revisar ingresos.` });
    } else if (r < 0.1) {
      out.push({ level: 'tip', title: `Tasa de ahorro baja (${pct(r)})`, text: 'Una referencia habitual es ahorrar al menos un 10–20 % de los ingresos. Empieza automatizando una transferencia fija a ahorro el día de cobro.' });
    } else if (r >= 0.2) {
      out.push({ level: 'good', title: `Buena tasa de ahorro (${pct(r)})`, text: `Te quedan unos ${eur(a.monthlyIncome - a.monthlyExpense)}/mes libres. Asegúrate de que ese dinero se mueve a ahorro/inversión y no se queda en la cuenta corriente.` });
    } else {
      out.push({ level: 'info', title: `Tasa de ahorro ${pct(r)}`, text: 'Estás en zona razonable. Subir al 20 % suele depender de 1–2 categorías discrecionales.' });
    }
  }

  // Ahorro automático detectado (p. ej. "Ahorra las vueltas")
  if (a.savings > 0) {
    out.push({
      level: 'good',
      title: 'Ya ahorras de forma automática',
      text: `Has movido ${eur(a.savings)} a ahorro en el periodo (~${eur(a.monthlySavings)}/mes). Lo cuento aparte: no es gasto. Si es un redondeo, plantéate complementarlo con una aportación fija mensual.`,
    });
  }

  // Categoría dominante discrecional
  const topWant = a.byCategory.find((c) => c.category.need === 'want' && c.category.id !== 'sin-categoria');
  if (topWant && topWant.share > 0.15) {
    const monthly = a.months ? topWant.total / Math.max(a.months, 1) : topWant.total;
    const cut = monthly * 0.3;
    out.push({
      level: 'tip',
      title: `${topWant.category.icon} ${topWant.category.name}: ${pct(topWant.share)} de tu gasto`,
      text: `Es tu mayor gasto discrecional (${topWant.count} movimientos, ${eur(topWant.total)}). Recortarlo un 30 % liberaría ~${eur(cut)}/mes; invertido 10 años a un 4 % anual hipotético serían ~${eur(futureValue(cut, 10, 0.04))}.`,
    });
  }

  // Gasto hormiga
  if (a.small.count >= 5) {
    out.push({
      level: 'tip',
      title: `Gasto hormiga: ${a.small.count} pagos < ${eur(a.small.threshold)}`,
      text: `Suman ${eur(a.small.total)} en el periodo. Son los que menos se notan y más se repiten (cafés, pintxos, caprichos). Ponerles un tope semanal funciona mejor que prohibirlos.`,
    });
  }

  // Recurrentes
  if (a.recurring.length) {
    const sum = a.recurring.reduce((x, r) => x + r.monthlyCost, 0);
    out.push({
      level: 'info',
      title: `${a.recurring.length} cargos recurrentes (~${eur(sum)}/mes)`,
      text: `Revisa una vez al año suscripciones, seguros y tarifas (luz, móvil): ${a.recurring.slice(0, 4).map((r) => r.merchant).join(', ')}…`,
    });
  }

  // Sin categorizar
  const unc = a.byCategory.find((c) => c.category.id === 'sin-categoria');
  if (unc && unc.share > 0.1) {
    out.push({ level: 'info', title: `${pct(unc.share)} del gasto sin categoría`, text: 'Asígnales categoría en «Movimientos»: la app aprende la regla y el análisis mejora.' });
  }

  // 50/30/20
  if (a.monthlyIncome > 0 && a.months > 0) {
    const m = Math.max(a.months, 1);
    const needsR = a.needs / m / a.monthlyIncome;
    const wantsR = a.wants / m / a.monthlyIncome;
    if (needsR > 0.5 || wantsR > 0.3) {
      out.push({
        level: 'tip',
        title: 'Regla 50/30/20',
        text: `Necesidades ${pct(needsR)} (ref. 50 %), deseos ${pct(wantsR)} (ref. 30 %). ${wantsR > 0.3 ? 'El margen de mejora está en los gastos discrecionales.' : 'Los gastos fijos pesan mucho: revisa vivienda, seguros y suministros.'}`,
      });
    }
  }

  // Colchón → inversión
  const target = a.monthlyExpense * s.emergencyMonths;
  if (a.monthlyExpense > 0) {
    if (s.emergencyFund < target) {
      out.push({
        level: 'tip',
        title: 'Primero, el colchón de emergencia',
        text: `Con tu gasto medio, ${s.emergencyMonths} meses son ~${eur(target)}. Tienes ${eur(s.emergencyFund)} indicado en Ajustes. Hasta completarlo, prioriza una cuenta remunerada o depósito con liquidez antes que inversión en bolsa.`,
      });
    } else {
      out.push({
        level: 'good',
        title: 'Colchón cubierto',
        text: 'Con el fondo de emergencia completo, el excedente mensual puede ir a inversión a largo plazo y diversificada (p. ej. fondos indexados o planes de bajo coste). Revisa la pestaña «Invertir».',
      });
    }
  }

  return out;
}

/**
 * Resumen agregado y anónimo (sin conceptos ni nombres) para pegarlo en Claude
 * y pedir recomendaciones.
 */
export function claudeSummary(a: Analysis, s: Settings): string {
  const L: string[] = [];
  L.push('Actúa como asesor de finanzas personales. Analiza este resumen de mis gastos y dame recomendaciones concretas y priorizadas para gastar mejor y empezar a invertir. No hace falta que seas exhaustivo: dime las 3–5 acciones con más impacto.');
  L.push('');
  L.push(`Periodo: ${a.from} a ${a.to} (${a.days} días, ${a.count} movimientos).`);
  L.push(`Ingresos medios/mes: ${eur(a.monthlyIncome)}${s.monthlyIncomeOverride ? ' (indicado manualmente)' : ''}.`);
  L.push(`Gasto medio/mes: ${eur(a.monthlyExpense)}. Ahorro automático/mes: ${eur(a.monthlySavings)}.`);
  if (a.savingsRate != null) L.push(`Tasa de ahorro: ${pct(a.savingsRate)}.`);
  L.push(`Colchón actual: ${eur(s.emergencyFund)} (objetivo ${s.emergencyMonths} meses de gasto).`);
  L.push('');
  L.push('Gasto por categoría (periodo completo):');
  for (const c of a.byCategory) L.push(`- ${c.category.name} [${c.category.need === 'need' ? 'necesidad' : 'deseo'}]: ${eur(c.total)} (${pct(c.share)}, ${c.count} mov.)`);
  if (a.byMonth.length > 1) {
    L.push('');
    L.push('Por mes (ingresos / gastos / ahorro):');
    for (const m of a.byMonth) L.push(`- ${m.month}: ${eur(m.income)} / ${eur(m.expense)} / ${eur(m.savings)}`);
  }
  if (a.recurring.length) {
    L.push('');
    L.push(`Cargos recurrentes detectados: ${a.recurring.length}, ~${eur(a.recurring.reduce((x, r) => x + r.monthlyCost, 0))}/mes.`);
  }
  L.push(`Pagos pequeños (< ${eur(a.small.threshold)}) discrecionales: ${a.small.count}, total ${eur(a.small.total)}.`);
  return L.join('\n');
}

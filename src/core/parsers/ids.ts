import type { ParsedRow } from '../types';
import { hash, norm } from './util';

/**
 * Id determinista por movimiento: fecha + concepto + importe + saldo
 * (+ nº de ocurrencia si hay dos idénticos el mismo día). Al reimportar
 * un extracto que se solapa con otro, los ids coinciden y no se duplica.
 */
export function withIds(account: string, rows: ParsedRow[]): (ParsedRow & { id: string })[] {
  const seen = new Map<string, number>();
  return rows.map((r) => {
    const key = [account, r.date, norm(r.concept), r.amount.toFixed(2), r.balance?.toFixed(2) ?? ''].join('|');
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    return { ...r, id: hash(`${key}#${n}`) + '-' + r.date.replace(/-/g, '') };
  });
}

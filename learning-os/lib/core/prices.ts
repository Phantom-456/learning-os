import path from 'node:path';
import crypto from 'node:crypto';
import { pricesDir, ensureDirs } from './paths';
import { writeMd, readMd, listIds } from './markdown';
import type { PriceRecord, PriceObservation, PriceAlternative, Market } from './types';

function slug(item: string): string {
  return item
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || crypto.createHash('md5').update(item).digest('hex').slice(0, 8);
}

export function priceFile(item: string): string {
  return path.join(pricesDir(), `${slug(item)}.md`);
}

function normalize(item: string, data: Record<string, unknown>): PriceRecord {
  return {
    id: (data.id as string) ?? slug(item),
    item: (data.item as string) ?? item,
    observations: (data.observations as PriceObservation[]) ?? [],
    alternatives: (data.alternatives as PriceAlternative[]) ?? [],
  };
}

export function getPriceRecord(item: string): PriceRecord | null {
  const found = readMd(priceFile(item));
  return found ? normalize(item, found.data) : null;
}

export function savePriceRecord(r: PriceRecord): PriceRecord {
  ensureDirs();
  writeMd(priceFile(r.item), { id: r.id, item: r.item, observations: r.observations, alternatives: r.alternatives }, '');
  return r;
}

export function appendObservation(item: string, obs: PriceObservation): PriceRecord {
  const existing = getPriceRecord(item) ?? { id: slug(item), item, observations: [], alternatives: [] };
  existing.observations.push(obs); // append-only — never overwrite a prior observation
  return savePriceRecord(existing);
}

export function latestObservation(record: PriceRecord, market: Market): PriceObservation | undefined {
  return record.observations
    .filter((o) => o.market === market)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

export function isStale(obs: PriceObservation | undefined, staleDays = 60): boolean {
  if (!obs) return true;
  const ageMs = Date.now() - new Date(obs.date).getTime();
  return ageMs > staleDays * 24 * 60 * 60 * 1000;
}

/**
 * The pricing TOOL (spec §6): a deterministic cache read, no LLM. Returns
 * needsSkill: true when the pricing SKILL must run a fresh, market-scoped
 * search — either because this market has no data at all, or the latest
 * observation for it is past the staleness window.
 */
export function checkPrice(
  item: string,
  market: Market,
  staleDays = 60
): { needsSkill: boolean; observation?: PriceObservation } {
  const record = getPriceRecord(item);
  const obs = record ? latestObservation(record, market) : undefined;
  if (!obs) return { needsSkill: true };
  return { needsSkill: isStale(obs, staleDays), observation: obs };
}

import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-prices-'));
  process.env.YTS_CONTENT_DIR = dir;
});

describe('prices', () => {
  it('needs the skill when no record exists for the item', async () => {
    const { checkPrice } = await import('./prices');
    expect(checkPrice('Raspberry Pi 4 8GB', 'IN').needsSkill).toBe(true);
  });

  it('needs the skill when the item has data for a different market only', async () => {
    const { appendObservation, checkPrice } = await import('./prices');
    appendObservation('Raspberry Pi 4 8GB', {
      market: 'US',
      currency: 'USD',
      date: new Date().toISOString().slice(0, 10),
      price: 75,
      available: true,
      source: 'https://example.com',
    });
    expect(checkPrice('Raspberry Pi 4 8GB', 'IN').needsSkill).toBe(true);
  });

  it('reuses a fresh observation for the requested market without needing the skill', async () => {
    const { appendObservation, checkPrice } = await import('./prices');
    appendObservation('Raspberry Pi 4 8GB', {
      market: 'IN',
      currency: 'INR',
      date: new Date().toISOString().slice(0, 10),
      price: 8500,
      available: true,
      source: 'https://robu.in',
    });
    const result = checkPrice('Raspberry Pi 4 8GB', 'IN');
    expect(result.needsSkill).toBe(false);
    expect(result.observation?.price).toBe(8500);
  });

  it('needs the skill again once the observation is stale', async () => {
    const { appendObservation, checkPrice } = await import('./prices');
    const old = new Date();
    old.setDate(old.getDate() - 100);
    appendObservation('Raspberry Pi 4 8GB', {
      market: 'IN',
      currency: 'INR',
      date: old.toISOString().slice(0, 10),
      price: 8500,
      available: true,
      source: 'https://robu.in',
    });
    expect(checkPrice('Raspberry Pi 4 8GB', 'IN', 60).needsSkill).toBe(true);
  });

  it('never overwrites a prior observation, only appends', async () => {
    const { appendObservation, getPriceRecord } = await import('./prices');
    appendObservation('Item', { market: 'IN', currency: 'INR', date: '2026-06-01', price: 100, available: true, source: 'a' });
    appendObservation('Item', { market: 'IN', currency: 'INR', date: '2026-09-21', price: 120, available: true, source: 'b' });
    expect(getPriceRecord('Item')?.observations).toHaveLength(2);
  });
});

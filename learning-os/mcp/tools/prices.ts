import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { checkPrice, appendObservation, getPriceRecord } from '../../lib/core/prices';

function text(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

export function registerPriceTools(server: McpServer): void {
  server.tool('check_price', 'Deterministic cache read: is there fresh-enough price data for this item and market? If needsSkill is true, the caller must do a fresh market-scoped search and then call append_price_observation — this tool never searches itself.', {
    item: z.string(), market: z.string(), staleDays: z.number().optional(),
  }, async ({ item, market, staleDays }) => text(checkPrice(item, market, staleDays)));

  server.tool('append_price_observation', 'Append a fresh price observation for an item+market (never overwrites prior observations).', {
    item: z.string(), market: z.string(), currency: z.string(), date: z.string(),
    price: z.number(), available: z.boolean(), source: z.string(), seller: z.string().optional(),
  }, async ({ item, ...obs }) => text(appendObservation(item, obs)));

  server.tool('get_price_record', 'Get the full observation/alternative history for an item.', { item: z.string() },
    async ({ item }) => text(getPriceRecord(item)));
}

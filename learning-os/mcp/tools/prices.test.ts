import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-mcp-prices-'));
  process.env.YTS_CONTENT_DIR = dir;
});

async function callTool(server: McpServer, name: string, args: Record<string, unknown>) {
  const registered = (server as unknown as { _registeredTools: Record<string, { handler: (a: unknown) => Promise<unknown> }> })._registeredTools;
  return registered[name].handler(args);
}

describe('price tools', () => {
  it('signals needsSkill for a market with no data, then false once appended', async () => {
    const { registerPriceTools } = await import('./prices');
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerPriceTools(server);

    const before = await callTool(server, 'check_price', { item: 'Raspberry Pi 4 8GB', market: 'IN' });
    expect((before as { content: { text: string }[] }).content[0].text).toContain('"needsSkill": true');

    await callTool(server, 'append_price_observation', {
      item: 'Raspberry Pi 4 8GB', market: 'IN', currency: 'INR',
      date: new Date().toISOString().slice(0, 10), price: 8500, available: true, source: 'https://robu.in',
    });
    const after = await callTool(server, 'check_price', { item: 'Raspberry Pi 4 8GB', market: 'IN' });
    expect((after as { content: { text: string }[] }).content[0].text).toContain('"needsSkill": false');
  });
});

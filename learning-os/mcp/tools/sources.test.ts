import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-mcp-sources-'));
  process.env.YTS_CONTENT_DIR = dir;
});

async function callTool(server: McpServer, name: string, args: Record<string, unknown>) {
  const registered = (server as unknown as {
    _registeredTools: Record<string, { handler: (a: unknown) => Promise<unknown> }>;
  })._registeredTools;
  return registered[name].handler(args);
}

describe('source tools', () => {
  it('creates a source tagging multiple concepts and lists it', async () => {
    const { registerSourceTools } = await import('./sources');
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerSourceTools(server);

    await callTool(server, 'create_source', {
      id: 'kalman-video', type: 'video', title: 'Kalman filters explained',
      url: 'https://example.com/kalman', concepts: ['kalman-filter', 'ekf'],
    });
    const result = await callTool(server, 'sources_for_concept', { conceptId: 'kalman-filter' });
    const text = (result as { content: { text: string }[] }).content[0].text;
    expect(text).toContain('kalman-video');
  });
});

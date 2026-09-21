import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-mcp-global-'));
  process.env.YTS_CONTENT_DIR = dir;
});

async function callTool(server: McpServer, name: string, args: Record<string, unknown>) {
  const registered = (server as unknown as {
    _registeredTools: Record<string, { handler: (a: unknown) => Promise<unknown> }>;
  })._registeredTools;
  return registered[name].handler(args);
}

describe('global knowledge tools', () => {
  it('appends and reads back a global watch_for item', async () => {
    const { registerGlobalKnowledgeTools } = await import('./globalKnowledge');
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerGlobalKnowledgeTools(server);

    await callTool(server, 'append_global_watch_for', { item: 'Underestimating shipping time.' });
    const result = await callTool(server, 'get_global_knowledge', {});
    const text = (result as { content: { text: string }[] }).content[0].text;
    expect(text).toContain('Underestimating shipping time.');
  });
});

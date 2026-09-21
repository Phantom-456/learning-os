import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-mcp-templates-'));
  process.env.YTS_CONTENT_DIR = dir;
});

async function callTool(server: McpServer, name: string, args: Record<string, unknown>) {
  const registered = (server as unknown as {
    _registeredTools: Record<string, { handler: (a: unknown) => Promise<unknown> }>;
  })._registeredTools;
  return registered[name].handler(args);
}

describe('template tools', () => {
  it('creates a template and appends a lesson learned', async () => {
    const { registerTemplateTools } = await import('./templates');
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerTemplateTools(server);

    await callTool(server, 'create_template', { id: 't1', title: 'T', courses: [], concepts: [] });
    const result = await callTool(server, 'append_lesson_learned', { id: 't1', note: 'Order parts early.' });
    const text = (result as { content: { text: string }[] }).content[0].text;
    expect(text).toContain('Order parts early.');
  });
});

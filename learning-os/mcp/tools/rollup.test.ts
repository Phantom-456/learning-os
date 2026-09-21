import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-mcp-rollup-'));
  process.env.YTS_CONTENT_DIR = dir;
});

async function callTool(server: McpServer, name: string, args: Record<string, unknown>) {
  const registered = (server as unknown as { _registeredTools: Record<string, { handler: (a: unknown) => Promise<unknown> }> })._registeredTools;
  return registered[name].handler(args);
}

describe('rollup tools', () => {
  it('aggregates a project\'s notes via the MCP tool', async () => {
    const { createConcept, saveConcept, getConcept } = await import('../../lib/core/concepts');
    createConcept({ id: 'x', title: 'X', parent: 'P' });
    const x = getConcept('x')!;
    x.notes.push({ id: 'n1', date: '2026-09-21', text: 'note on X' });
    saveConcept(x);

    const { createProject } = await import('../../lib/core/projects');
    createProject({
      id: 'proj', title: 'Proj',
      checkpoints: [{ id: 'cp1', title: 'CP1', depends_on: [], courses: [], concepts: ['x'], status: 'not_started' }],
    });

    const { registerRollupTools } = await import('./rollup');
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerRollupTools(server);

    const result = await callTool(server, 'aggregated_notes_for_project', { projectId: 'proj' });
    const text = (result as { content: { text: string }[] }).content[0].text;
    expect(text).toContain('note on X');
  });
});

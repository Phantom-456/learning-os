import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-mcp-explode-'));
  process.env.YTS_CONTENT_DIR = dir;
});

async function callTool(server: McpServer, name: string, args: Record<string, unknown>) {
  const registered = (server as unknown as {
    _registeredTools: Record<string, { handler: (a: unknown) => Promise<unknown> }>;
  })._registeredTools;
  return registered[name].handler(args);
}

describe('explode tool', () => {
  it('explodes a concept into a nested course via the MCP tool', async () => {
    const { createConcept } = await import('../../lib/core/concepts');
    createConcept({ id: 'kalman-filter', title: 'Kalman filter', parent: 'State estimation' });
    const { createCourse } = await import('../../lib/core/courses');
    createCourse({ id: 'estimation-basics', title: 'Estimation basics', kind: 'authored', concepts: ['kalman-filter'] });

    const { registerExplodeTools } = await import('./explode');
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerExplodeTools(server);

    const result = await callTool(server, 'explode_concept', {
      conceptId: 'kalman-filter', parentCourseId: 'estimation-basics', reason: 'the update step loses me',
    });
    const text = (result as { content: { text: string }[] }).content[0].text;
    expect(text).toContain('Kalman filter');
  });
});

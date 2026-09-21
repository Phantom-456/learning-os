import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-mcp-courses-'));
  process.env.YTS_CONTENT_DIR = dir;
});

async function callTool(server: McpServer, name: string, args: Record<string, unknown>) {
  const registered = (server as unknown as {
    _registeredTools: Record<string, { handler: (a: unknown) => Promise<unknown> }>;
  })._registeredTools;
  return registered[name].handler(args);
}

describe('course tools', () => {
  it('creates a course and reports completion', async () => {
    const { registerCourseTools } = await import('./courses');
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerCourseTools(server);

    await callTool(server, 'create_course', { id: 'basics', title: 'Basics', kind: 'authored', concepts: ['a', 'b'] });
    const result = await callTool(server, 'course_completion', { id: 'basics' });
    const text = (result as { content: { text: string }[] }).content[0].text;
    expect(text).toContain('"total"');
  });
});

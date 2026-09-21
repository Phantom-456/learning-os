import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-mcp-projects-'));
  process.env.YTS_CONTENT_DIR = dir;
});

async function callTool(server: McpServer, name: string, args: Record<string, unknown>) {
  const registered = (server as unknown as { _registeredTools: Record<string, { handler: (a: unknown) => Promise<unknown> }> })._registeredTools;
  return registered[name].handler(args);
}

const cp = (id: string, dependsOn: string[] = []) => ({ id, title: id, depends_on: dependsOn, courses: [], concepts: [], status: 'not_started' as const });

describe('project tools', () => {
  it('creates a project and reports unblocked checkpoints', async () => {
    const { registerProjectTools } = await import('./projects');
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerProjectTools(server);

    await callTool(server, 'create_project', { id: 'p1', title: 'P1', checkpoints: [cp('a'), cp('b', ['a'])] });
    const result = await callTool(server, 'unblocked_checkpoints', { id: 'p1' });
    const text = (result as { content: { text: string }[] }).content[0].text;
    expect(text).toContain('"a"');
    expect(text).not.toContain('"b"');
  });

  it('rejects a checkpoint dependency edge that would create a cycle', async () => {
    const { registerProjectTools } = await import('./projects');
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerProjectTools(server);

    await callTool(server, 'create_project', { id: 'p1', title: 'P1', checkpoints: [cp('a', ['b']), cp('b')] });
    const result = await callTool(server, 'set_checkpoint_depends_on', { projectId: 'p1', checkpointId: 'b', dependsOn: ['a'] });
    expect((result as { isError?: boolean }).isError).toBe(true);
  });
});

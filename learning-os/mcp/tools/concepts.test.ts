import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-mcp-concepts-'));
  process.env.YTS_CONTENT_DIR = dir;
});

// NOTE: verified against the installed @modelcontextprotocol/sdk (v1.30.0).
// McpServer's internal per-tool record is keyed `handler` (not `callback` as
// an earlier draft of this helper assumed) — see RegisteredTool in
// node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.d.ts and the
// `_createRegisteredTool` implementation in mcp.js, which does
// `registeredTool.handler = handler` where `handler` is exactly the callback
// passed to `server.tool(...)`. For a plain (non-task) tool, `handler` is
// called as `handler(args, extra)`; extra is unused by our tools, so calling
// with just `args` is fine.
async function callTool(server: McpServer, name: string, args: Record<string, unknown>) {
  const registered = (server as unknown as {
    _registeredTools: Record<string, { handler: (a: unknown) => Promise<unknown> }>;
  })._registeredTools;
  return registered[name].handler(args);
}

describe('concept tools', () => {
  it('creates and lists concepts', async () => {
    const { registerConceptTools } = await import('./concepts');
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerConceptTools(server);

    await callTool(server, 'create_concept', { id: 'pid', title: 'PID', parent: 'Classical control' });
    const result = await callTool(server, 'list_concepts', {});
    const text = (result as { content: { text: string }[] }).content[0].text;
    expect(text).toContain('PID');
  });

  it('advances status through set_concept_status', async () => {
    const { registerConceptTools } = await import('./concepts');
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerConceptTools(server);

    await callTool(server, 'create_concept', { id: 'pid', title: 'PID', parent: 'Classical control' });
    const result = await callTool(server, 'set_concept_status', { id: 'pid', action: 'advance' });
    const text = (result as { content: { text: string }[] }).content[0].text;
    expect(text).toContain('learning');
  });

  it('appends a note via append_concept_note and it is visible via get_concept', async () => {
    const { registerConceptTools } = await import('./concepts');
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerConceptTools(server);

    await callTool(server, 'create_concept', { id: 'pid', title: 'PID', parent: 'Classical control' });
    const appendResult = await callTool(server, 'append_concept_note', {
      id: 'pid',
      text: 'Tuned gains empirically',
      attachments: [{ type: 'link', url: 'https://example.com/pid-notes' }],
    });
    const appendText = (appendResult as { content: { text: string }[] }).content[0].text;
    expect(appendText).toContain('Tuned gains empirically');

    const getResult = await callTool(server, 'get_concept', { id: 'pid' });
    const getText = (getResult as { content: { text: string }[] }).content[0].text;
    expect(getText).toContain('Tuned gains empirically');
    expect(getText).toContain('https://example.com/pid-notes');

    const parsed = JSON.parse(getText);
    expect(parsed.notes).toHaveLength(1);
    expect(parsed.notes[0].text).toBe('Tuned gains empirically');
  });
});

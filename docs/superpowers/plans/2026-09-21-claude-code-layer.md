# Claude Code Layer (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Claude Code layer named in the design spec's Phase 2: an MCP server exposing `lib/core/*` as tools, four skills (explode-concept generation, syllabus draft, resource-finder, pricing), and two hooks (memory-inject, auto-checkpoint) — all importing `lib/core` directly, per the spec's skill-vs-tool principle (§4): deterministic operations are plain MCP tools, LLM judgment lives in skills.

**Architecture:** The MCP server (`mcp/server.ts`) runs as a separate Node process (started via `npx tsx mcp/server.ts`, registered with Claude Code via `.mcp.json`) in the SAME npm package as the Next.js app — it imports `lib/core/*` by relative path, no new package boundary (consistent with Phase 1a's YAGNI ruling: a separate installable package is added only if something actually needs it as one; a same-repo Node script doesn't). Tools use the `@modelcontextprotocol/sdk`'s `McpServer` + Zod schema pattern. Skills are `SKILL.md` files under `.claude/skills/<name>/SKILL.md`, invoked by name in a Claude Code conversation — they are instructions for Claude to follow using the MCP server's tools plus its own WebSearch/WebFetch, not standalone programs. Hooks are Node scripts under `.claude/hooks/`, registered in `.claude/settings.json`, reading Claude Code's hook JSON contract on stdin and printing additional context to stdout.

**Tech Stack:** `@modelcontextprotocol/sdk`, `zod` (new dependencies), Node/TypeScript via `tsx` (new dev dependency), reusing `lib/core/*` and Vitest unchanged.

**Spec:** [docs/superpowers/specs/2026-09-21-learning-os-platform-design.md](../specs/2026-09-21-learning-os-platform-design.md) — implements §10 Phase 2 in full: the MCP server, the four named skills, the two named hooks, and §4's steerable-rerun requirement for every generation skill.

## Global Constraints

- **Skill-vs-tool principle (spec §4):** every MCP tool is deterministic — a thin wrapper over an existing `lib/core/*` function, no LLM calls inside the server process. All LLM judgment (syllabus drafting, resource evaluation, fresh price search, concept-explosion generation) happens in the calling Claude Code session via a skill's instructions, using the MCP tools plus WebSearch/WebFetch — never inside `mcp/server.ts` itself.
- Every MCP tool name is `snake_case` and maps 1:1 to one `lib/core` operation (or a small, obviously-related group, e.g. `list_concepts`/`get_concept`) — no tool bundles unrelated operations.
- Every generation skill (explode-concept, syllabus-draft, resource-finder, pricing) documents, in its own `SKILL.md`, how to accept a free-text steering prompt and re-run against an existing entity — this is the spec §4 "independent, steerable skill reruns" requirement, and it is checked per-skill in this plan's tasks, not bolted on afterward.
- Hooks never call an LLM and never make a network call — `memory-inject` is a deterministic keyword match (spec §4's "cheap pre-check, no LLM call"), `auto-checkpoint` is a deterministic DAG query. Both exit 0 with no output when there's nothing to say (this is the common case and must cost nothing).
- The MCP server and hooks read content via `YTS_CONTENT_DIR` exactly like the Next.js app and the test suite (`lib/core/paths.ts`'s existing lazy `contentDir()`) — no separate content-location config is introduced.
- **Live-session limitation, stated up front:** hook behavior (does Claude Code actually inject the printed context; does the `PostToolUse` matcher actually fire on this MCP tool name) cannot be fully verified inside this plan's execution — it requires a live Claude Code session with the MCP server registered and a hook-triggering turn actually run. Task 10 does everything that CAN be verified without that (unit tests on the underlying pure logic, manual invocation of the hook script with a synthetic stdin payload) and explicitly flags what still needs a live check.

---

### Task 1: MCP server scaffold + Concept tools

**Files:**
- Modify: `package.json` (add `@modelcontextprotocol/sdk`, `zod` deps; `tsx` devDep; add `"mcp": "tsx mcp/server.ts"` script)
- Create: `mcp/server.ts`
- Create: `mcp/tools/concepts.ts`
- Test: `mcp/tools/concepts.test.ts`

**Interfaces:**
- Consumes: `getAllConcepts`, `getConcept`, `createConcept`, `saveConcept`, `archiveConcept`, `restoreConcept` from `../../lib/core/concepts` (path relative to `mcp/tools/`); `nextStatus`, `applyStatus`, `setReview` from `../../lib/core/status`.
- Produces: `registerConceptTools(server: McpServer): void` (in `mcp/tools/concepts.ts`), registering `list_concepts`, `get_concept`, `create_concept`, `update_concept`, `set_concept_status`, `archive_concept` on the given server. `mcp/server.ts` exports nothing (it's the process entry point) but wires every tool-registration module together and starts a `StdioServerTransport`.

- [ ] **Step 1: Install dependencies**

```bash
npm install @modelcontextprotocol/sdk zod
npm install -D tsx
```

- [ ] **Step 2: Add the `mcp` script to `package.json`**

Add `"mcp": "tsx mcp/server.ts"` to the `scripts` block.

- [ ] **Step 3: Write the failing tests**

```typescript
// mcp/tools/concepts.test.ts
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

async function callTool(server: McpServer, name: string, args: Record<string, unknown>) {
  const registered = (server as unknown as { _registeredTools: Record<string, { callback: (a: unknown) => Promise<unknown> }> })._registeredTools;
  return registered[name].callback(args);
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
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npm test -- mcp/tools/concepts.test.ts`
Expected: FAIL — `Cannot find module './concepts'`

- [ ] **Step 5: Write `mcp/tools/concepts.ts`**

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAllConcepts, getConcept, createConcept, saveConcept, archiveConcept, restoreConcept } from '../../lib/core/concepts';
import { nextStatus, applyStatus, setReview } from '../../lib/core/status';

function text(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

export function registerConceptTools(server: McpServer): void {
  server.tool(
    'list_concepts',
    'List all non-archived concepts, optionally including archived ones.',
    { includeArchived: z.boolean().optional() },
    async ({ includeArchived }) => text(getAllConcepts(includeArchived ?? false))
  );

  server.tool(
    'get_concept',
    'Get one concept by id, including its notes and body.',
    { id: z.string() },
    async ({ id }) => {
      const c = getConcept(id);
      if (!c) return { content: [{ type: 'text' as const, text: `Concept not found: ${id}` }], isError: true };
      return text(c);
    }
  );

  server.tool(
    'create_concept',
    'Create a new concept under a parent area.',
    { id: z.string(), title: z.string(), parent: z.string() },
    async ({ id, title, parent }) => text(createConcept({ id, title, parent }))
  );

  server.tool(
    'update_concept',
    'Update editable fields on an existing concept (title, parent, body, prereqs, notes).',
    {
      id: z.string(),
      title: z.string().optional(),
      parent: z.string().optional(),
      body: z.string().optional(),
      prereqs: z.array(z.string()).optional(),
    },
    async ({ id, ...patch }) => {
      const c = getConcept(id);
      if (!c) return { content: [{ type: 'text' as const, text: `Concept not found: ${id}` }], isError: true };
      Object.assign(c, patch);
      return text(saveConcept(c));
    }
  );

  server.tool(
    'set_concept_status',
    'Advance, set, or flag-for-review a concept\'s status.',
    {
      id: z.string(),
      action: z.enum(['advance', 'set', 'review']),
      status: z.enum(['not_started', 'learning', 'complete']).optional(),
      review: z.boolean().optional(),
    },
    async ({ id, action, status, review }) => {
      let c = getConcept(id);
      if (!c) return { content: [{ type: 'text' as const, text: `Concept not found: ${id}` }], isError: true };
      if (action === 'advance') c = applyStatus(c, nextStatus(c.status));
      else if (action === 'set' && status) c = applyStatus(c, status);
      else if (action === 'review') c = setReview(c, Boolean(review));
      return text(saveConcept(c));
    }
  );

  server.tool(
    'archive_concept',
    'Archive (soft-delete, recoverable) a concept.',
    { id: z.string(), restore: z.boolean().optional() },
    async ({ id, restore }) => {
      const c = restore ? restoreConcept(id) : archiveConcept(id);
      if (!c) return { content: [{ type: 'text' as const, text: `Concept not found: ${id}` }], isError: true };
      return text(c);
    }
  );
}
```

- [ ] **Step 6: Write `mcp/server.ts`**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerConceptTools } from './tools/concepts';

const server = new McpServer({ name: 'learning-os', version: '0.1.0' });
registerConceptTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('learning-os MCP server failed to start:', err);
  process.exit(1);
});
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test -- mcp/tools/concepts.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json mcp/server.ts mcp/tools/concepts.ts mcp/tools/concepts.test.ts
git commit -m "Add MCP server scaffold + Concept tools"
```

---

### Task 2: Source, Course, Template, Global Knowledge tools

**Files:**
- Create: `mcp/tools/sources.ts`, `mcp/tools/courses.ts`, `mcp/tools/templates.ts`, `mcp/tools/globalKnowledge.ts`
- Test: `mcp/tools/sources.test.ts`, `mcp/tools/courses.test.ts`, `mcp/tools/templates.test.ts`, `mcp/tools/globalKnowledge.test.ts`
- Modify: `mcp/server.ts` (register the four new tool sets)

**Interfaces:**
- Consumes: `lib/core/sources.ts`, `lib/core/courses.ts`, `lib/core/templates.ts`, `lib/core/globalKnowledge.ts` (all from Phase 1a, unchanged).
- Produces: `registerSourceTools`, `registerCourseTools`, `registerTemplateTools`, `registerGlobalKnowledgeTools`, each `(server: McpServer) => void`, following Task 1's exact pattern (one tool per CRUD operation, `text()` helper, Zod schemas matching each function's parameters).

- [ ] **Step 1: Write the failing tests** (one file per entity, same shape as Task 1's `concepts.test.ts` — create two concepts/entities, verify a list/get tool sees them, verify one mutation round-trips)

```typescript
// mcp/tools/sources.test.ts
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
  const registered = (server as unknown as { _registeredTools: Record<string, { callback: (a: unknown) => Promise<unknown> }> })._registeredTools;
  return registered[name].callback(args);
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
```

```typescript
// mcp/tools/courses.test.ts
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
  const registered = (server as unknown as { _registeredTools: Record<string, { callback: (a: unknown) => Promise<unknown> }> })._registeredTools;
  return registered[name].callback(args);
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
```

```typescript
// mcp/tools/templates.test.ts
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
  const registered = (server as unknown as { _registeredTools: Record<string, { callback: (a: unknown) => Promise<unknown> }> })._registeredTools;
  return registered[name].callback(args);
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
```

```typescript
// mcp/tools/globalKnowledge.test.ts
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
  const registered = (server as unknown as { _registeredTools: Record<string, { callback: (a: unknown) => Promise<unknown> }> })._registeredTools;
  return registered[name].callback(args);
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- mcp/tools/sources.test.ts mcp/tools/courses.test.ts mcp/tools/templates.test.ts mcp/tools/globalKnowledge.test.ts`
Expected: FAIL — modules don't exist yet

- [ ] **Step 3: Write `mcp/tools/sources.ts`**

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAllSources, getSource, createSource, saveSource, archiveSource, sourcesForConcept } from '../../lib/core/sources';

function text(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

export function registerSourceTools(server: McpServer): void {
  server.tool('list_sources', 'List all non-archived sources.', { includeArchived: z.boolean().optional() },
    async ({ includeArchived }) => text(getAllSources(includeArchived ?? false)));

  server.tool('sources_for_concept', 'List every source that tags a given concept.', { conceptId: z.string() },
    async ({ conceptId }) => text(sourcesForConcept(conceptId)));

  server.tool('create_source', 'Create a source tagging one or more concepts.', {
    id: z.string(),
    type: z.enum(['video', 'article', 'paper', 'link', 'pdf', 'podcast', 'other']),
    title: z.string(),
    url: z.string(),
    concepts: z.array(z.string()),
  }, async (input) => text(createSource(input)));

  server.tool('update_source', 'Update a source\'s fields (e.g. its concepts tag list).', {
    id: z.string(),
    title: z.string().optional(),
    url: z.string().optional(),
    concepts: z.array(z.string()).optional(),
  }, async ({ id, ...patch }) => {
    const s = getSource(id);
    if (!s) return { content: [{ type: 'text' as const, text: `Source not found: ${id}` }], isError: true };
    Object.assign(s, patch);
    return text(saveSource(s));
  });

  server.tool('archive_source', 'Archive (soft-delete, recoverable) a source.', { id: z.string() },
    async ({ id }) => {
      const s = archiveSource(id);
      if (!s) return { content: [{ type: 'text' as const, text: `Source not found: ${id}` }], isError: true };
      return text(s);
    });
}
```

- [ ] **Step 4: Write `mcp/tools/courses.ts`**

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAllCourses, getCourse, createCourse, saveCourse, softDeleteCourse, courseCompletion } from '../../lib/core/courses';

function text(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

export function registerCourseTools(server: McpServer): void {
  server.tool('list_courses', 'List all non-deleted courses.', { includeDeleted: z.boolean().optional() },
    async ({ includeDeleted }) => text(getAllCourses(includeDeleted ?? false)));

  server.tool('get_course', 'Get one course by id, including its subcourses.', { id: z.string() },
    async ({ id }) => {
      const c = getCourse(id);
      if (!c) return { content: [{ type: 'text' as const, text: `Course not found: ${id}` }], isError: true };
      return text(c);
    });

  server.tool('create_course', 'Create a course (external reference or authored) with concepts and/or subcourses.', {
    id: z.string(), title: z.string(), kind: z.enum(['external', 'authored']),
    concepts: z.array(z.string()), provider: z.string().optional(), url: z.string().optional(),
  }, async (input) => text(createCourse(input)));

  server.tool('update_course', 'Update a course\'s fields.', {
    id: z.string(), title: z.string().optional(), concepts: z.array(z.string()).optional(),
    subcourses: z.array(z.string()).optional(),
  }, async ({ id, ...patch }) => {
    const c = getCourse(id);
    if (!c) return { content: [{ type: 'text' as const, text: `Course not found: ${id}` }], isError: true };
    Object.assign(c, patch);
    return text(saveCourse(c));
  });

  server.tool('course_completion', 'Recursively compute a course\'s concept completion (total/complete) through subcourses.', { id: z.string() },
    async ({ id }) => text(courseCompletion(id)));

  server.tool('delete_course', 'Soft-delete a course.', { id: z.string() },
    async ({ id }) => {
      const c = softDeleteCourse(id);
      if (!c) return { content: [{ type: 'text' as const, text: `Course not found: ${id}` }], isError: true };
      return text(c);
    });
}
```

- [ ] **Step 5: Write `mcp/tools/templates.ts`**

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAllTemplates, getTemplate, createTemplate, softDeleteTemplate, appendLessonLearned, appendKnownPitfall } from '../../lib/core/templates';

function text(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

export function registerTemplateTools(server: McpServer): void {
  server.tool('list_templates', 'List all non-deleted templates. Below ~15-20 templates, list all directly; above that, filter client-side by title/tag rather than dumping the whole library into context.', { includeDeleted: z.boolean().optional() },
    async ({ includeDeleted }) => text(getAllTemplates(includeDeleted ?? false)));

  server.tool('get_template', 'Get one template by id, including accumulated lessons_learned/known_pitfalls/watch_for.', { id: z.string() },
    async ({ id }) => {
      const t = getTemplate(id);
      if (!t) return { content: [{ type: 'text' as const, text: `Template not found: ${id}` }], isError: true };
      return text(t);
    });

  server.tool('create_template', 'Create a new project template.', {
    id: z.string(), title: z.string(), courses: z.array(z.string()), concepts: z.array(z.string()),
  }, async (input) => text(createTemplate(input)));

  server.tool('append_lesson_learned', 'Append a lesson-learned entry to a template (never overwrites prior entries).', { id: z.string(), note: z.string() },
    async ({ id, note }) => {
      const t = appendLessonLearned(id, note);
      if (!t) return { content: [{ type: 'text' as const, text: `Template not found: ${id}` }], isError: true };
      return text(t);
    });

  server.tool('append_known_pitfall', 'Append a known-pitfall entry to a template (never overwrites prior entries).', { id: z.string(), note: z.string() },
    async ({ id, note }) => {
      const t = appendKnownPitfall(id, note);
      if (!t) return { content: [{ type: 'text' as const, text: `Template not found: ${id}` }], isError: true };
      return text(t);
    });

  server.tool('delete_template', 'Soft-delete a template.', { id: z.string() },
    async ({ id }) => {
      const t = softDeleteTemplate(id);
      if (!t) return { content: [{ type: 'text' as const, text: `Template not found: ${id}` }], isError: true };
      return text(t);
    });
}
```

- [ ] **Step 6: Write `mcp/tools/globalKnowledge.ts`**

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getGlobalKnowledge, appendGlobalLesson, appendGlobalPitfall, appendGlobalWatchFor } from '../../lib/core/globalKnowledge';

function text(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

export function registerGlobalKnowledgeTools(server: McpServer): void {
  server.tool('get_global_knowledge', 'Get the instance-wide global knowledge (lessons_learned, known_pitfalls, watch_for) shared across all templates/projects.', {},
    async () => text(getGlobalKnowledge()));

  server.tool('append_global_lesson', 'Append a lesson learned to the global (instance-wide) knowledge.', { note: z.string() },
    async ({ note }) => text(appendGlobalLesson(note)));

  server.tool('append_global_pitfall', 'Append a known pitfall to the global (instance-wide) knowledge.', { note: z.string() },
    async ({ note }) => text(appendGlobalPitfall(note)));

  server.tool('append_global_watch_for', 'Append a watch-for item to the global (instance-wide) knowledge.', { item: z.string() },
    async ({ item }) => text(appendGlobalWatchFor(item)));
}
```

- [ ] **Step 7: Wire the four new tool sets into `mcp/server.ts`**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerConceptTools } from './tools/concepts';
import { registerSourceTools } from './tools/sources';
import { registerCourseTools } from './tools/courses';
import { registerTemplateTools } from './tools/templates';
import { registerGlobalKnowledgeTools } from './tools/globalKnowledge';

const server = new McpServer({ name: 'learning-os', version: '0.1.0' });
registerConceptTools(server);
registerSourceTools(server);
registerCourseTools(server);
registerTemplateTools(server);
registerGlobalKnowledgeTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('learning-os MCP server failed to start:', err);
  process.exit(1);
});
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm test -- mcp/tools/sources.test.ts mcp/tools/courses.test.ts mcp/tools/templates.test.ts mcp/tools/globalKnowledge.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 9: Commit**

```bash
git add mcp/tools/sources.ts mcp/tools/sources.test.ts mcp/tools/courses.ts mcp/tools/courses.test.ts mcp/tools/templates.ts mcp/tools/templates.test.ts mcp/tools/globalKnowledge.ts mcp/tools/globalKnowledge.test.ts mcp/server.ts
git commit -m "Add Source, Course, Template, and global-knowledge MCP tools"
```

---

### Task 3: Project tools (CRUD, DAG queries, dependency writes)

**Files:**
- Create: `mcp/tools/projects.ts`
- Test: `mcp/tools/projects.test.ts`
- Modify: `mcp/server.ts` (register)

**Interfaces:**
- Consumes: `getAllProjects`, `getProject`, `createProject`, `saveProject`, `softDeleteProject`, `unblockedCheckpoints`, `setCheckpointDependsOn` from `../../lib/core/projects`.
- Produces: `registerProjectTools(server: McpServer): void` — `list_projects`, `get_project`, `create_project`, `update_project` (accepts a full `checkpoints` array, relies on `saveProject`'s existing cycle validation), `unblocked_checkpoints` (query), `set_checkpoint_depends_on` (single-edge write with explicit cycle rejection), `delete_project`.
- A cycle-rejecting write returns `isError: true` with the thrown message as the tool's text content — MCP tool errors are reported this way, not as thrown exceptions across the protocol boundary.

- [ ] **Step 1: Write the failing tests**

```typescript
// mcp/tools/projects.test.ts
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
  const registered = (server as unknown as { _registeredTools: Record<string, { callback: (a: unknown) => Promise<unknown> }> })._registeredTools;
  return registered[name].callback(args);
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- mcp/tools/projects.test.ts`
Expected: FAIL — `Cannot find module './projects'`

- [ ] **Step 3: Write `mcp/tools/projects.ts`**

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAllProjects, getProject, createProject, saveProject, softDeleteProject, unblockedCheckpoints, setCheckpointDependsOn } from '../../lib/core/projects';

function text(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}
function errorText(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true as const };
}

const checkpointSchema = z.object({
  id: z.string(), title: z.string(), depends_on: z.array(z.string()),
  courses: z.array(z.string()), concepts: z.array(z.string()),
  status: z.enum(['not_started', 'building', 'done']),
  build: z.string().optional(), done_test: z.string().optional(),
});

export function registerProjectTools(server: McpServer): void {
  server.tool('list_projects', 'List all non-deleted projects.', { includeDeleted: z.boolean().optional() },
    async ({ includeDeleted }) => text(getAllProjects(includeDeleted ?? false)));

  server.tool('get_project', 'Get one project by id, including its full checkpoint DAG.', { id: z.string() },
    async ({ id }) => {
      const p = getProject(id);
      if (!p) return errorText(`Project not found: ${id}`);
      return text(p);
    });

  server.tool('create_project', 'Create a project, optionally with an initial checkpoint DAG.', {
    id: z.string(), title: z.string(), template: z.string().optional(),
    metadata: z.record(z.string()).optional(), checkpoints: z.array(checkpointSchema).optional(),
  }, async (input) => {
    try {
      return text(createProject(input));
    } catch (e) {
      return errorText((e as Error).message);
    }
  });

  server.tool('update_project', 'Update a project, including its full checkpoints array — cycle-validated on write.', {
    id: z.string(), title: z.string().optional(), status: z.enum(['in_progress', 'done', 'abandoned']).optional(),
    metadata: z.record(z.string()).optional(), checkpoints: z.array(checkpointSchema).optional(),
  }, async ({ id, ...patch }) => {
    const p = getProject(id);
    if (!p) return errorText(`Project not found: ${id}`);
    Object.assign(p, patch);
    try {
      return text(saveProject(p));
    } catch (e) {
      return errorText((e as Error).message);
    }
  });

  server.tool('unblocked_checkpoints', 'List checkpoints whose dependencies are all done and which are not themselves done — "what can I work on now."', { id: z.string() },
    async ({ id }) => {
      const p = getProject(id);
      if (!p) return errorText(`Project not found: ${id}`);
      return text(unblockedCheckpoints(p.checkpoints));
    });

  server.tool('set_checkpoint_depends_on', 'Set a single checkpoint\'s dependencies, rejected if it would create a cycle.', {
    projectId: z.string(), checkpointId: z.string(), dependsOn: z.array(z.string()),
  }, async ({ projectId, checkpointId, dependsOn }) => {
    try {
      return text(setCheckpointDependsOn(projectId, checkpointId, dependsOn));
    } catch (e) {
      return errorText((e as Error).message);
    }
  });

  server.tool('delete_project', 'Soft-delete a project.', { id: z.string() },
    async ({ id }) => {
      const p = softDeleteProject(id);
      if (!p) return errorText(`Project not found: ${id}`);
      return text(p);
    });
}
```

- [ ] **Step 4: Register in `mcp/server.ts`**

Add `import { registerProjectTools } from './tools/projects';` and `registerProjectTools(server);`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- mcp/tools/projects.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add mcp/tools/projects.ts mcp/tools/projects.test.ts mcp/server.ts
git commit -m "Add Project MCP tools: CRUD, unblocked-checkpoints, cycle-safe dependency writes"
```

---

### Task 4: Price Record and notes-rollup tools

**Files:**
- Create: `mcp/tools/prices.ts`, `mcp/tools/rollup.ts`
- Test: `mcp/tools/prices.test.ts`, `mcp/tools/rollup.test.ts`
- Modify: `mcp/server.ts` (register)

**Interfaces:**
- Consumes: `checkPrice`, `appendObservation`, `getPriceRecord` from `../../lib/core/prices`; `getAggregatedNotesForCourse`, `getAggregatedNotesForProject` from `../../lib/core/rollup`.
- Produces: `registerPriceTools`, `registerRollupTools`, each `(server: McpServer) => void`. `check_price` is the deterministic tool from spec §6 — it returns `needsSkill: true/false`; when `true`, the calling Claude Code session (via the pricing skill, Task 8) is expected to do a fresh market-scoped search and then call `append_price_observation` itself. This tool file never performs a search.

- [ ] **Step 1: Write the failing tests**

```typescript
// mcp/tools/prices.test.ts
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
  const registered = (server as unknown as { _registeredTools: Record<string, { callback: (a: unknown) => Promise<unknown> }> })._registeredTools;
  return registered[name].callback(args);
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
```

```typescript
// mcp/tools/rollup.test.ts
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
  const registered = (server as unknown as { _registeredTools: Record<string, { callback: (a: unknown) => Promise<unknown> }> })._registeredTools;
  return registered[name].callback(args);
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- mcp/tools/prices.test.ts mcp/tools/rollup.test.ts`
Expected: FAIL — modules don't exist yet

- [ ] **Step 3: Write `mcp/tools/prices.ts`**

```typescript
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
```

- [ ] **Step 4: Write `mcp/tools/rollup.ts`**

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAggregatedNotesForCourse, getAggregatedNotesForProject } from '../../lib/core/rollup';

function text(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

export function registerRollupTools(server: McpServer): void {
  server.tool('aggregated_notes_for_course', 'Get a course\'s own notes plus every concept\'s notes plus every subcourse\'s, recursively, each labeled by source.', { courseId: z.string() },
    async ({ courseId }) => text(getAggregatedNotesForCourse(courseId)));

  server.tool('aggregated_notes_for_project', 'Get a project\'s own notes plus everything reachable from its checkpoints, labeled by source.', { projectId: z.string() },
    async ({ projectId }) => text(getAggregatedNotesForProject(projectId)));
}
```

- [ ] **Step 5: Register both in `mcp/server.ts`**

Add the two imports and `registerPriceTools(server); registerRollupTools(server);`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test -- mcp/tools/prices.test.ts mcp/tools/rollup.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 7: Commit**

```bash
git add mcp/tools/prices.ts mcp/tools/prices.test.ts mcp/tools/rollup.ts mcp/tools/rollup.test.ts mcp/server.ts
git commit -m "Add Price Record and notes-rollup MCP tools"
```

---

### Task 5: Explode Concept generation tool + register the MCP server with Claude Code

**Files:**
- Create: `mcp/tools/explode.ts`
- Test: `mcp/tools/explode.test.ts`
- Create: `.mcp.json` (at the repo root of the app, `learning-os/.mcp.json`)
- Modify: `mcp/server.ts` (register)

**Interfaces:**
- Consumes: `explodeConcept` from `../../lib/core/explode` (the Phase 1b structural-move stub — this task exposes it as a tool; it does NOT add LLM generation to the server itself, per the skill-vs-tool principle — LLM generation of the actual breakdown happens in the calling Claude Code session via the explode-concept-generate skill, Task 6, which calls this tool once it has generated the content).
- Produces: `registerExplodeTools(server: McpServer): void` — `explode_concept` (the exact same structural operation as the Phase 1b API route, callable from an MCP client instead of HTTP), plus `.mcp.json` so Claude Code auto-discovers this server when the project is opened.

- [ ] **Step 1: Write the failing test**

```typescript
// mcp/tools/explode.test.ts
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
  const registered = (server as unknown as { _registeredTools: Record<string, { callback: (a: unknown) => Promise<unknown> }> })._registeredTools;
  return registered[name].callback(args);
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- mcp/tools/explode.test.ts`
Expected: FAIL — `Cannot find module './explode'`

- [ ] **Step 3: Write `mcp/tools/explode.ts`**

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { explodeConcept } from '../../lib/core/explode';

function text(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}
function errorText(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true as const };
}

export function registerExplodeTools(server: McpServer): void {
  server.tool(
    'explode_concept',
    'Structural move only: nest a new (empty) course under the given parent course, tagged with why the concept was confusing. Does NOT generate content — the caller is expected to have already drafted (or to next draft) the finer-grained breakdown and write it via update_course/create_concept before or after this call.',
    { conceptId: z.string(), parentCourseId: z.string(), reason: z.string() },
    async ({ conceptId, parentCourseId, reason }) => {
      try {
        return text(explodeConcept(conceptId, parentCourseId, reason));
      } catch (e) {
        return errorText((e as Error).message);
      }
    }
  );
}
```

- [ ] **Step 4: Register in `mcp/server.ts`**

Add `import { registerExplodeTools } from './tools/explode';` and `registerExplodeTools(server);`.

- [ ] **Step 5: Write `.mcp.json`**

```json
{
  "mcpServers": {
    "learning-os": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"]
    }
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- mcp/tools/explode.test.ts`
Expected: PASS (1 test)

- [ ] **Step 7: Commit**

```bash
git add mcp/tools/explode.ts mcp/tools/explode.test.ts mcp/server.ts .mcp.json
git commit -m "Add Explode Concept MCP tool and register the server with Claude Code"
```

---

### Task 6: Explode Concept generation skill

**Files:**
- Create: `.claude/skills/explode-concept/SKILL.md`

**Interfaces:** None — a skill is a Markdown instruction file, not code. It directs Claude to use the `get_concept`, `explode_concept`, `create_concept`, and `update_course` MCP tools (from Tasks 1, 5, 2) plus its own reasoning.

- [ ] **Step 1: Write `.claude/skills/explode-concept/SKILL.md`**

```markdown
---
name: explode-concept
description: Break a confusing Concept into a finer-grained nested Course, using the reason the user gave for why it's confusing. Use when the user invokes /explode-concept, asks to "explode" a concept, or says a specific concept is too hard to understand as a single unit. Supports steerable reruns: pass extra instructions to refine a previous explosion.
---

# Explode Concept

Given a Concept id, a parent Course id (or a title for a new one), and a reason
the user found it confusing, produce a finer-grained breakdown as a new nested
Course under the parent — then write that breakdown into real Concept/Course
records via the MCP tools. This is the LLM-generation half of Explode Concept;
the structural nesting (creating the course, linking it under the parent) is
already handled by the `explode_concept` tool — this skill's job is to fill
that course with content.

## Steps

1. Call `get_concept` for the target concept id to read its current title,
   body, and any existing notes.
2. If a `parentCourseId` was given, use it directly. If instead a
   `newParentCourseTitle` was given (no existing course to nest under yet),
   first call `create_course` with that title (`kind: "authored"`,
   `concepts: [conceptId]`), then use its id as `parentCourseId`.
3. Call `explode_concept` with `conceptId`, `parentCourseId`, and the user's
   stated `reason`. This creates the empty nested course
   (`<parentCourseId>--<conceptId>-explode`) and returns it.
4. Using the concept's body/notes and the stated reason, draft 2-5
   sub-concepts that break the original concept into smaller, more digestible
   pieces — each one should target the SPECIFIC confusion in the reason, not
   just restate the original concept in smaller chunks. For a reason like "the
   derivation loses me at the update step," a good breakdown separates
   "why we need an update step at all" from "the algebra of the update step
   itself" from "a fully worked numeric example," rather than three generic
   sub-topics.
5. For each sub-concept, call `create_concept` (id: a slug, title, parent:
   same parent header as the original concept — this keeps it visible in the
   normal Concept view too) with a `body` that actually explains that
   sub-piece in the user's likely level of understanding, not a placeholder.
6. Call `update_course` on the exploded course (from step 3) to set its
   `concepts` field to the list of new sub-concept ids.
7. Tell the user what you created: the course id, its sub-concepts, and a
   one-line summary of how the breakdown addresses their stated confusion.

## Steerable reruns

If the user provides additional steering (e.g. "redo this, but focus more on
the geometric intuition" or "that course was too shallow, add a worked
example"), treat it as an addendum to step 4's drafting instructions for an
EXISTING exploded course rather than starting over: call `get_course` on the
existing exploded course id, read its current sub-concepts, then use
`update_concept`/`create_concept` to revise or add sub-concepts per the new
steering — do not call `explode_concept` again (it would create a second,
differently-named exploded course under the same parent).

## Notes

- This is a "testing and comfort" phase skill (design spec §10) — if the
  generated breakdown quality is off, tell the user directly rather than
  guessing; it's fine to ask one clarifying question about the confusion
  before drafting if the reason given is vague.
- Never fabricate a citation or source for a sub-concept's content unless the
  user's existing notes or the original concept's body actually contains one.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/explode-concept/SKILL.md
git commit -m "Add explode-concept skill (LLM generation, wraps the structural MCP tool)"
```

---

### Task 7: Syllabus-draft and resource-finder skills

**Files:**
- Create: `.claude/skills/syllabus-draft/SKILL.md`
- Create: `.claude/skills/resource-finder/SKILL.md`

**Interfaces:** None — Markdown instruction files, using `list_templates`, `get_template`, `create_project`, `create_course`, `create_concept`, `get_global_knowledge` (syllabus-draft) and `create_source`, `sources_for_concept` (resource-finder) plus the agent's own WebSearch/WebFetch.

- [ ] **Step 1: Write `.claude/skills/syllabus-draft/SKILL.md`**

```markdown
---
name: syllabus-draft
description: Draft a syllabus (checkpoint DAG) for a new project, starting from the closest matching Template if one exists. Use when the user wants to start a new project/robot/skill area and needs an initial roadmap. Supports steerable reruns to refine an existing project's syllabus.
---

# Syllabus Draft

Given a one-line project goal from the user, produce a first-draft Project
with a checkpoint dependency graph, seeded from the closest Template if one
exists, and from web research if not.

## Steps

1. Call `list_templates`. If any exist, judge which (if any) is close enough
   to the stated goal to use as a starting point. If the library is large
   (see the tool's own description for the size threshold), do a targeted
   read via `get_template` on the 2-3 most promising candidates rather than
   reading all of them.
2. If a close Template exists: call `get_template` on it, read its
   `courses`/`concepts`/`lessons_learned`/`known_pitfalls`/`watch_for`. Call
   `get_global_knowledge` too — merge relevant entries from both into your
   planning, not just the template's own.
3. If no close Template exists: use WebSearch/WebFetch to research what a
   reasonable curriculum for this goal looks like (established courses,
   standard prerequisite chains, what practitioners in the field say is
   foundational vs. advanced). Do not fabricate a syllabus from assumed
   knowledge alone when the domain is unfamiliar — verify against real
   sources.
4. Draft an ordered list of checkpoints (5-15 is typical; use judgment for
   the actual scope) as a dependency graph, not necessarily a straight line —
   only add a `depends_on` edge where the dependency is real (you need X
   before Y makes sense), not just for every checkpoint on the one before it.
5. For each checkpoint, identify the Concepts it needs. Reuse existing
   Concepts by id where they already exist (search by title first — don't
   create a duplicate "PID control" concept if one exists); create new ones
   via `create_concept` only for genuinely new topics.
6. Call `create_project` with the full checkpoint array. If `update_project`
   is rejected for a dependency cycle, you made an edge mistake — fix the
   `depends_on` and retry, don't just remove the checkpoint.
7. Present the drafted checkpoint list to the user before considering this
   done — a syllabus is a starting point they should react to, not a
   finished artifact you silently commit to without their eyes on it.

## Steerable reruns

If the user says "redo this, but weight it more toward X" or "add a
checkpoint for Y" against an EXISTING project, do not call `create_project`
again. Call `get_project`, apply the steering to the existing checkpoint
array (add/reorder/re-scope checkpoints), and call `update_project` with the
revised array.

## Notes

- Prefer fewer, well-scoped checkpoints over many granular ones — a syllabus
  the user has to click through 30 times to review is worse than one with 8
  clear stages, even if the 8-stage one is coarser.
- If you draw from a Template, and the project later completes or is
  abandoned, remind the user (or do it yourself if asked) to call
  `append_lesson_learned`/`append_known_pitfall` on that Template so the next
  syllabus draft starts smarter.
```

- [ ] **Step 2: Write `.claude/skills/resource-finder/SKILL.md`**

```markdown
---
name: resource-finder
description: Find free study material (videos, articles, papers, courses) for a Concept and attach them as Sources. Use when the user asks for resources/materials/sources on a topic, or as part of drafting a new project's syllabus. Supports steerable reruns (e.g. "free only", "more advanced", "search again").
---

# Resource Finder

Given a Concept (or a list of them from a fresh syllabus draft), find real,
current, freely-accessible study material and attach it via `create_source`.

## Steps

1. Call `get_concept` (or `sources_for_concept`) to see what's already
   attached — don't duplicate an existing source.
2. Use WebSearch to find candidate material: prefer official documentation,
   well-regarded course lecture notes/videos (e.g. university OCW, known
   creators in the field), and papers with genuinely free access (not a
   paywalled abstract). Use WebFetch to verify a candidate link actually
   works and is about the right topic before attaching it — a search result
   title is not proof the page is any good.
3. For each vetted resource, call `create_source` with an accurate `type`
   (`video`/`article`/`paper`/`link`/`pdf`/`podcast`), the real `title`, the
   verified `url`, and `concepts: [conceptId]` (or multiple concept ids if
   the one resource genuinely covers several — that's the point of Source's
   many-to-many tagging, spec §2).
4. Report back a short list of what you attached and why each one is worth
   the user's time — not just a link dump.

## Steerable reruns

- "Free only" / "no paywalls": re-run step 2 with that constraint explicit in
  the search, and re-verify (step 2's WebFetch check) that nothing already
  attached from a prior run violates it — if it does, tell the user rather
  than silently removing it (a Source is never hard-deleted; removing a tag
  is a deliberate action, not a side effect of a rerun).
- "More advanced" / "more beginner": adjust the search terms and source
  selection criteria accordingly; don't just attach more of the same level.
- "Search again": treat prior attached sources as context (don't re-find the
  same ones) but do a genuinely fresh search rather than reusing cached
  search results from earlier in the conversation.

## Notes

- 2-4 well-vetted resources per concept is usually enough — resist the urge
  to attach every plausible search result.
- If nothing genuinely free and good exists for a niche topic, say so rather
  than attaching a mediocre resource just to have attached something.
```

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/syllabus-draft/SKILL.md .claude/skills/resource-finder/SKILL.md
git commit -m "Add syllabus-draft and resource-finder skills"
```

---

### Task 8: Pricing skill

**Files:**
- Create: `.claude/skills/pricing/SKILL.md`

**Interfaces:** None — uses `check_price` (Task 4, deterministic) plus `append_price_observation` (Task 4) plus WebSearch, per spec §6's cache-first behavior.

- [ ] **Step 1: Write `.claude/skills/pricing/SKILL.md`**

```markdown
---
name: pricing
description: Price the tools/hardware a checkpoint or project needs, scoped to a market (location+currency). Cache-first — only searches when the deterministic check_price tool signals stale/missing data. Use when the user asks what something costs, or as part of drafting a syllabus that calls for physical hardware. Supports steerable reruns for a different market or a refresh.
---

# Pricing

Given an item (or a list of items from a checkpoint/project) and a market,
return a price using cached data when it's fresh, and only search when it
genuinely needs refreshing.

## Steps

1. **Market is required, not assumed.** If the user (or the calling context —
   e.g. a syllabus-draft skill run) hasn't specified a market (e.g. `IN`
   for India/INR, `US` for USA/USD), ask before proceeding. Do not default
   silently to any market.
2. For each item, call `check_price` with the item name and market.
   - If `needsSkill: false`: use the returned `observation` directly — no
     search needed. This is the common case and should be fast/cheap.
   - If `needsSkill: true`: this item has no fresh-enough data for this
     market. Proceed to step 3.
3. Use WebSearch scoped to the market (e.g. include the country/site in the
   query, or use market-appropriate retailer names) to find current listings.
   Prefer 2-3 real, currently-live listings over one. Note the seller and a
   direct product URL for each.
4. Call `append_price_observation` with the item, market, currency, today's
   date, the price you found (pick the most representative one if listings
   vary — usually the median or the most reputable seller, not the cheapest
   outlier), `available: true/false`, and the source URL. This is
   append-only — it never overwrites a prior observation, so don't worry
   about "losing" old data.
5. If a paid item has a genuine free alternative or workaround (a free tier,
   an open-source substitute, a DIY approach), note it explicitly — with its
   downside — rather than only reporting the paid price.
6. Report: item, price, currency, availability, source link(s), and any
   free alternative, for every item asked about — not just the ones that
   needed a fresh search.

## Steerable reruns

- A different market for the same item: just re-run from step 2 with the new
  market — `check_price` naturally reports `needsSkill: true` for a market
  with no prior data, so this "just works" without special-casing.
- "Refresh this" / "that price seems old": call `check_price` with a small
  `staleDays` override (e.g. `0`) to force `needsSkill: true` regardless of
  the normal staleness window, then proceed from step 3.

## Notes

- Never fabricate a price. If you cannot find a real current listing, say so
  rather than estimating one and presenting it as researched.
- This skill never gives the underlying `check_price` tool network access —
  `check_price` is a pure cache read (spec §4's skill-vs-tool principle). All
  searching happens in this skill's own steps, using the agent's own
  WebSearch/WebFetch.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/pricing/SKILL.md
git commit -m "Add pricing skill (cache-first via check_price, market required)"
```

---

### Task 9: Hooks — memory-inject and auto-checkpoint

**Files:**
- Create: `.claude/hooks/memory-inject.mjs`
- Create: `.claude/hooks/auto-checkpoint.mjs`
- Create: `.claude/hooks/lib.mjs` (shared helpers, framework-free, imports `lib/core/*` by relative path)
- Test: `.claude/hooks/lib.test.ts`
- Modify: `.claude/settings.json` (create if absent, register both hooks)

**Interfaces:**
- Consumes: `getAllConcepts`, `getAllCourses`, `getAllProjects`, `getAllTemplates` from `lib/core/*` (via `.claude/hooks/lib.mjs`'s relative imports — `../../lib/core/...` from `.claude/hooks/`); `unblockedCheckpoints` from `lib/core/projects`.
- Produces: `matchEntityTitles(prompt: string): {kind, id, title}[]` and `summarizeUnblocked(projectId: string): string` in `.claude/hooks/lib.mjs`, tested directly; the two hook scripts are thin stdin/stdout wrappers around those functions, verified by manual invocation (Step 7) rather than a Vitest test, since they need to match Claude Code's actual hook JSON contract which isn't running inside this test process.

- [ ] **Step 1: Write the failing test for the pure logic**

```typescript
// .claude/hooks/lib.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-hooks-'));
  process.env.YTS_CONTENT_DIR = dir;
});

describe('hooks lib', () => {
  it('matches a prompt against known concept titles, case-insensitively, and finds nothing for an unrelated prompt', async () => {
    const { createConcept } = await import('../../lib/core/concepts');
    createConcept({ id: 'kalman-filter', title: 'Kalman filter', parent: 'State estimation' });

    const { matchEntityTitles } = await import('./lib.mjs');
    const hits = matchEntityTitles('can you explain the kalman filter update step to me');
    expect(hits.some((h) => h.id === 'kalman-filter' && h.kind === 'concept')).toBe(true);

    const noHits = matchEntityTitles('what is the weather like today');
    expect(noHits).toHaveLength(0);
  });

  it('summarizes newly-unblocked checkpoints for a project', async () => {
    const { createProject } = await import('../../lib/core/projects');
    createProject({
      id: 'p1', title: 'P1',
      checkpoints: [
        { id: 'a', title: 'A', depends_on: [], courses: [], concepts: [], status: 'done' },
        { id: 'b', title: 'B', depends_on: ['a'], courses: [], concepts: [], status: 'not_started' },
      ],
    });

    const { summarizeUnblocked } = await import('./lib.mjs');
    const summary = summarizeUnblocked('p1');
    expect(summary).toContain('B');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- .claude/hooks/lib.test.ts`
Expected: FAIL — `Cannot find module './lib.mjs'`

- [ ] **Step 3: Write `.claude/hooks/lib.mjs`**

```javascript
import { getAllConcepts } from '../../lib/core/concepts.js';
import { getAllCourses } from '../../lib/core/courses.js';
import { getAllProjects, unblockedCheckpoints } from '../../lib/core/projects.js';
import { getAllTemplates } from '../../lib/core/templates.js';

// Cheap, deterministic keyword match against known entity titles — no LLM
// call, per spec §4's memory-inject gating principle. Runs on every
// UserPromptSubmit; must stay fast and cost nothing when there's no match.
export function matchEntityTitles(prompt) {
  const lower = prompt.toLowerCase();
  const hits = [];
  for (const c of getAllConcepts()) {
    if (lower.includes(c.title.toLowerCase())) hits.push({ kind: 'concept', id: c.id, title: c.title });
  }
  for (const c of getAllCourses()) {
    if (lower.includes(c.title.toLowerCase())) hits.push({ kind: 'course', id: c.id, title: c.title });
  }
  for (const p of getAllProjects()) {
    if (lower.includes(p.title.toLowerCase())) hits.push({ kind: 'project', id: p.id, title: p.title });
  }
  for (const t of getAllTemplates()) {
    if (lower.includes(t.title.toLowerCase())) hits.push({ kind: 'template', id: t.id, title: t.title });
  }
  return hits;
}

// One-line summary + which tool to call for more — status and id only,
// never full note bodies or full rollups (spec §3's token-consumption
// principle).
export function summarizeMatches(hits) {
  return hits
    .map((h) => `- [${h.kind}] ${h.title} (id: ${h.id}) — use get_${h.kind} to see more`)
    .join('\n');
}

export function summarizeUnblocked(projectId) {
  const project = getAllProjects().find((p) => p.id === projectId);
  if (!project) return '';
  const unblocked = unblockedCheckpoints(project.checkpoints);
  if (unblocked.length === 0) return '';
  return `Newly workable on "${project.title}": ${unblocked.map((c) => c.title).join(', ')}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- .claude/hooks/lib.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the two hook scripts**

```javascript
// .claude/hooks/memory-inject.mjs
#!/usr/bin/env node
// UserPromptSubmit hook. Reads the hook JSON on stdin, and if the prompt
// text matches a known Concept/Course/Project/Template title, prints a
// short summary to stdout — Claude Code adds stdout text as additional
// context for this turn. Prints nothing and exits 0 on no match (the
// common case), so this costs nothing when it doesn't apply.
import { matchEntityTitles, summarizeMatches } from './lib.mjs';

let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(input);
    const prompt = payload.prompt ?? '';
    const hits = matchEntityTitles(prompt);
    if (hits.length > 0) {
      process.stdout.write(`Learning OS context — this prompt mentions:\n${summarizeMatches(hits)}\n`);
    }
  } catch {
    // Malformed input or no matching content — fail silently, never block the prompt.
  }
  process.exit(0);
});
```

```javascript
// .claude/hooks/auto-checkpoint.mjs
#!/usr/bin/env node
// PostToolUse hook, matched against the learning-os MCP server's checkpoint-
// mutating tools (set_checkpoint_depends_on, update_project). Reads the hook
// JSON on stdin, extracts the project id from the tool call's input, and if
// any checkpoint just became unblocked, prints that to stdout.
import { summarizeUnblocked } from './lib.mjs';

let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(input);
    const toolInput = payload.tool_input ?? {};
    const projectId = toolInput.projectId ?? toolInput.id;
    if (projectId) {
      const summary = summarizeUnblocked(projectId);
      if (summary) process.stdout.write(`${summary}\n`);
    }
  } catch {
    // Malformed input — fail silently, never block the tool call.
  }
  process.exit(0);
});
```

- [ ] **Step 6: Register both hooks in `.claude/settings.json`**

If the file doesn't exist, create it with exactly this content. If it exists, merge the `hooks` key in without disturbing any other existing settings.

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          { "type": "command", "command": "node .claude/hooks/memory-inject.mjs" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "mcp__learning-os__(set_checkpoint_depends_on|update_project)",
        "hooks": [
          { "type": "command", "command": "node .claude/hooks/auto-checkpoint.mjs" }
        ]
      }
    ]
  }
}
```

- [ ] **Step 7: Manually invoke both hook scripts with a synthetic payload to confirm they don't crash**

```bash
echo '{"prompt":"tell me about the kalman filter"}' | node .claude/hooks/memory-inject.mjs
echo '{"tool_input":{"projectId":"diffdrive-mobile-manipulator"}}' | node .claude/hooks/auto-checkpoint.mjs
```
Expected: both print something reasonable (or nothing, if no match) and exit 0 without a stack trace. This confirms the scripts are syntactically correct and their stdin/stdout contract works — it does NOT confirm Claude Code's hook matcher/injection behavior itself, which needs a live session (Task 10).

- [ ] **Step 8: Commit**

```bash
git add .claude/hooks/lib.mjs .claude/hooks/lib.test.ts .claude/hooks/memory-inject.mjs .claude/hooks/auto-checkpoint.mjs .claude/settings.json
git commit -m "Add memory-inject and auto-checkpoint hooks"
```

---

### Task 10: Manual verification (MCP server + skills + hooks, with live-session caveats)

**Files:** None.

**Interfaces:** None.

- [ ] **Step 1: Run the full test suite and confirm everything is green**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: all clean.

- [ ] **Step 2: Manually start the MCP server and confirm it starts without throwing**

```bash
npx tsx mcp/server.ts
```
This starts and waits on stdio — it won't print anything visible on its own (that's correct MCP server behavior; it's not a human-facing CLI). Confirm it starts without throwing, then stop it (Ctrl-C). This confirms the process itself is viable; actual tool-calling verification over a real MCP client connection happens in Step 3, which needs a live Claude Code session.

- [ ] **Step 3: What still needs a live Claude Code session (cannot be automated in this plan's execution)**

Document these explicitly rather than claiming false confidence:
- That Claude Code actually discovers and connects to the server via `.mcp.json` when this project is opened (requires restarting/reopening a Claude Code session in this directory).
- That each skill (`explode-concept`, `syllabus-draft`, `resource-finder`, `pricing`) is invokable by name and produces a sensible result when actually run against real content — the skills were written by design/spec reasoning, not tested against a live model.
- That the `memory-inject` hook's stdout is genuinely surfaced as additional context on a real `UserPromptSubmit` event, and that `auto-checkpoint`'s matcher string actually matches the MCP tool names Claude Code sees at runtime (the exact matcher syntax/matching semantics should be double-checked against whatever Claude Code version is running when this is tested live).

Leave this task's final state as: everything that COULD be verified without a live session (tests, build, process startup, hook script stdin/stdout contract) is green; the live-session items are named explicitly so the user can check them in their next interactive session rather than being told this "works" on unverified confidence.

- [ ] **Step 4: Commit** (only if Step 1-2 surfaced a fix; otherwise nothing to commit)

## Self-review notes

- **Spec coverage:** §10 Phase 2's four named deliverables are all present — MCP server (Tasks 1-5), the four skills (Tasks 6-8), the two hooks (Task 9). §4's skill-vs-tool principle is enforced structurally: every `mcp/tools/*.ts` file wraps exactly one `lib/core` operation with no LLM/network code inside it; every skill's `SKILL.md` explicitly delegates search/generation to the calling agent, never to the server. §4's steerable-reruns requirement has its own subsection in every generation skill (Tasks 6, 7, 8).
- **Known limitation, stated rather than hidden:** hook and skill *behavior* (as opposed to their code/logic) cannot be fully verified without a live Claude Code session — Task 10 says this plainly instead of claiming an untested confidence level.
- **Out of scope for this plan:** multi-LLM routing (Ollama/OpenRouter) is explicitly Phase 3 per the spec, not touched here. The visual/theming redesign flagged during Phase 1b's review is also out of scope — a separate plan, not yet written.
- **Type consistency check:** every `mcp/tools/*.ts` file's Zod schema field names match the corresponding `lib/core` function's parameter names exactly (e.g. `projects.ts`'s `checkpointSchema` mirrors `lib/core/types.ts`'s `Checkpoint` interface field-for-field). `.claude/hooks/lib.mjs` imports the same `lib/core/*` functions by the same relative-path convention `mcp/tools/*.ts` uses (both are two `..` segments up to `learning-os/`, then into `lib/core/`).

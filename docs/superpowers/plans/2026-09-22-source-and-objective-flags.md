# Source/Objective Flags + Rich Editor + Cross-Agent Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Concept detail page's "Run Source Search" and "Fill Concept Objectives" buttons to real flags on the Concept, add two new Claude Code skills (`gather-sources`, `set-objectives`) that batch-process every flagged concept, replace the plain-text Markdown body editor with a WYSIWYG rich-text editor (select-and-format, serializing to/from the same Markdown string), and publish a tool-agnostic `AGENTS.md` documenting the MCP server/skills/hooks so any coding agent — not just Claude Code — can discover and use them. Also fixes a live bug found while scoping this: the Concept API route's `EDITABLE` whitelist silently drops `goal`/`success_condition`/`failure_condition`, so the existing "Concept Objectives" panel currently can't save at all.

**Architecture:**
- **Flags are plain Concept fields**, not a separate entity — `sourceFlag?: 'need_sources' | 'need_better_sources' | 'need_new_sources'` and `needsObjectives?: boolean`, following the exact pattern `goal`/`success_condition`/`failure_condition` already established in `lib/core/concepts.ts`'s `normalize()`/`frontmatter()`.
- **"Sources" includes prerequisites**, per explicit instruction: the `gather-sources` skill doesn't only attach external `Source` records — for each flagged concept it also identifies genuinely missing foundational Concepts and links them via `prereqs`, creating them (with real content, not stubs, per the `syllabus-draft` skill's already-established content-quality rule) if they don't exist yet.
- **Rich editor** uses TipTap (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`, `@tiptap/extension-highlight`, `@tiptap/extension-color`, `@tiptap/extension-text-style`) plus `tiptap-markdown` for bidirectional Markdown⇄TipTap-document serialization, so `body` stays a plain Markdown string on disk (no format change to existing concept files) while the UI presents a toolbar (Bold/Italic/Underline/Strikethrough/Headings/Highlight/Color) instead of raw syntax. The "editable ⇄ readable" toggle sets TipTap's own `editable` prop on ONE editor instance (toolbar hidden when not editable) rather than switching between two different renderers — avoids any Markdown round-trip mismatch between an edit view and a separate preview view.
- **AGENTS.md** (not the literal `.agent`/`agent.agent` filenames mentioned verbally — `AGENTS.md` is the real, recognized cross-agent-tool convention several coding agents already look for, so that's what this plan writes; flagged explicitly in case a different literal name was intended) lives at `learning-os/AGENTS.md` and is a tool-agnostic summary: what the MCP server is and how to start it, every tool it exposes with a one-line description, every skill's name/trigger/purpose, and every hook's trigger/purpose — enough for a non-Claude-Code agent to understand and use the same capabilities, with pointers into the detailed `.claude/skills/*/SKILL.md` files for the full step-by-step process.

**Tech Stack:** `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-underline`, `@tiptap/extension-highlight`, `@tiptap/extension-color`, `@tiptap/extension-text-style`, `tiptap-markdown` (new dependencies), everything else reuses the existing `lib/core`/`mcp`/Next.js stack unchanged.

**Spec:** [docs/superpowers/specs/2026-09-21-learning-os-platform-design.md](../specs/2026-09-21-learning-os-platform-design.md) — extends §4's skill-vs-tool principle (flag set/clear/list are deterministic tools; the actual research/generation is skill-side) and §3's Notes/rollup philosophy (the rich editor changes presentation only, never the underlying Markdown-is-source-of-truth storage model).

## Global Constraints

- Flags are set by deterministic MCP tools (or direct UI button clicks going through the same API route); only the two new skills' actual research/generation work is LLM-driven, per the established skill-vs-tool principle.
- The rich editor never changes what's stored on disk — `body` remains a plain Markdown string in the concept's frontmatter-fenced file, exactly as today. TipTap's Markdown extension is the only thing that changes; the file format doesn't.
- `gather-sources` must actually create/link real prerequisite Concepts when genuinely missing (not just external Sources) — per explicit instruction that "sources" includes prerequisites in this context.
- Every new Concept body written by either new skill must be substantive prose, not a placeholder — same rule already established in the `syllabus-draft` skill fix.
- Fixing the `EDITABLE` whitelist bug is in scope for Task 1 since the objectives UI is otherwise dead on arrival for this plan's own "Fill Concept Objectives" feature.

---

### Task 1: Concept flag fields + fix the EDITABLE whitelist bug

**Files:**
- Modify: `lib/core/types.ts` (add `sourceFlag`, `needsObjectives` to `Concept`)
- Modify: `lib/core/concepts.ts` (`normalize()`/`frontmatter()`/`createConcept()` read/write the two new fields, following the exact pattern already used for `goal`/`success_condition`/`failure_condition`)
- Modify: `app/api/concepts/[id]/route.ts` (`EDITABLE` gains `goal`, `success_condition`, `failure_condition`, `sourceFlag`, `needsObjectives`)
- Test: `lib/core/concepts.test.ts` (extend)

**Interfaces:**
- Produces: `Concept.sourceFlag?: 'need_sources' | 'need_better_sources' | 'need_new_sources'`, `Concept.needsObjectives?: boolean`.

- [ ] **Step 1: Write the failing tests**

Add to `lib/core/concepts.test.ts`:
```typescript
it('round-trips sourceFlag and needsObjectives through save/read', async () => {
  const { createConcept, saveConcept, getConcept } = await import('./concepts');
  createConcept({ id: 'flagged', title: 'Flagged', parent: 'P' });
  const c = getConcept('flagged')!;
  c.sourceFlag = 'need_better_sources';
  c.needsObjectives = true;
  saveConcept(c);
  const reread = getConcept('flagged')!;
  expect(reread.sourceFlag).toBe('need_better_sources');
  expect(reread.needsObjectives).toBe(true);
});

it('defaults sourceFlag/needsObjectives to unset on a fresh concept', async () => {
  const { createConcept } = await import('./concepts');
  const c = createConcept({ id: 'fresh', title: 'Fresh', parent: 'P' });
  expect(c.sourceFlag).toBeUndefined();
  expect(c.needsObjectives).toBeFalsy();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- lib/core/concepts.test.ts`
Expected: FAIL — `sourceFlag`/`needsObjectives` don't exist on `Concept` yet, `tsc` (and likely the test itself, since `saveConcept`/`frontmatter` won't persist unknown fields) fails.

- [ ] **Step 3: Add the fields to `lib/core/types.ts`**

In the `Concept` interface, add (near `review`/`prereqs`, keep alphabetically-loose grouping consistent with the file's existing style):
```typescript
  sourceFlag?: 'need_sources' | 'need_better_sources' | 'need_new_sources';
  needsObjectives?: boolean;
```

- [ ] **Step 4: Update `lib/core/concepts.ts`'s `normalize()`, `frontmatter()`, `createConcept()`**

In `normalize()`, add (alongside the existing `goal`/`success_condition`/`failure_condition` reads):
```typescript
    sourceFlag: data.sourceFlag as Concept['sourceFlag'],
    needsObjectives: Boolean(data.needsObjectives ?? false),
```
In `frontmatter()`, add (only emit when set, matching the `archived`/`deleted` optional-field convention already used elsewhere in this file):
```typescript
  if (c.sourceFlag) fm.sourceFlag = c.sourceFlag;
  if (c.needsObjectives) fm.needsObjectives = true;
```
`createConcept()` needs no change — these fields are optional/falsy-default, consistent with how `archived` is handled (never set on creation).

- [ ] **Step 5: Fix `app/api/concepts/[id]/route.ts`'s `EDITABLE` whitelist**

```typescript
const EDITABLE: (keyof Concept)[] = [
  'title', 'parent', 'order', 'body', 'prereqs', 'notes', 'archived',
  'goal', 'success_condition', 'failure_condition', 'sourceFlag', 'needsObjectives',
];
```

- [ ] **Step 6: Run the tests to verify they pass, and confirm the whole suite + tsc + build are clean**

Run: `npm test -- lib/core/concepts.test.ts && npx tsc --noEmit && npm test`
Expected: PASS, tsc clean, full suite clean.

- [ ] **Step 7: Commit**

```bash
git add lib/core/types.ts lib/core/concepts.ts lib/core/concepts.test.ts app/api/concepts/\[id\]/route.ts
git commit -m "Add sourceFlag/needsObjectives Concept fields; fix EDITABLE whitelist dropping objectives fields"
```

---

### Task 2: MCP tools for flag set/list/clear + objectives write

**Files:**
- Modify: `mcp/tools/concepts.ts` (add 6 new tools)
- Modify: `mcp/tools/concepts.test.ts` (extend)

**Interfaces:**
- Consumes: `getAllConcepts`, `getConcept`, `saveConcept` from `../../lib/core/concepts` (already imported).
- Produces (new tools registered inside the existing `registerConceptTools`): `flag_concept_sources`, `list_concepts_needing_sources`, `clear_concept_sources_flag`, `flag_concept_objectives`, `list_concepts_needing_objectives`, `set_concept_objectives`.

- [ ] **Step 1: Write the failing tests**

Add to `mcp/tools/concepts.test.ts` (using the established `.handler` invocation pattern from Task 1 of the prior Claude Code layer plan):
```typescript
it('flags a concept for sources, lists it, then clears the flag', async () => {
  const { registerConceptTools } = await import('./concepts');
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerConceptTools(server);

  await callTool(server, 'create_concept', { id: 'needs-src', title: 'Needs Src', parent: 'P' });
  await callTool(server, 'flag_concept_sources', { id: 'needs-src', flag: 'need_sources' });

  const listed = await callTool(server, 'list_concepts_needing_sources', {});
  const listedText = (listed as { content: { text: string }[] }).content[0].text;
  expect(listedText).toContain('needs-src');

  await callTool(server, 'clear_concept_sources_flag', { id: 'needs-src' });
  const listedAfter = await callTool(server, 'list_concepts_needing_sources', {});
  const listedAfterText = (listedAfter as { content: { text: string }[] }).content[0].text;
  expect(listedAfterText).not.toContain('needs-src');
});

it('flags a concept for objectives, lists it, sets objectives, and the flag clears', async () => {
  const { registerConceptTools } = await import('./concepts');
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerConceptTools(server);

  await callTool(server, 'create_concept', { id: 'needs-obj', title: 'Needs Obj', parent: 'P' });
  await callTool(server, 'flag_concept_objectives', { id: 'needs-obj' });

  const listed = await callTool(server, 'list_concepts_needing_objectives', {});
  expect((listed as { content: { text: string }[] }).content[0].text).toContain('needs-obj');

  await callTool(server, 'set_concept_objectives', {
    id: 'needs-obj', goal: 'Understand X', success_condition: 'Can explain X unaided', failure_condition: 'Still confuses X with Y',
  });

  const after = await callTool(server, 'get_concept', { id: 'needs-obj' });
  const afterText = (after as { content: { text: string }[] }).content[0].text;
  expect(afterText).toContain('Understand X');
  expect(afterText).not.toContain('"needsObjectives": true');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- mcp/tools/concepts.test.ts`
Expected: FAIL — the six new tools don't exist yet.

- [ ] **Step 3: Add the six tools to `registerConceptTools` in `mcp/tools/concepts.ts`**

```typescript
  server.tool(
    'flag_concept_sources',
    'Flag a concept as needing source-gathering attention (need_sources: none attached yet; need_better_sources: existing ones are weak; need_new_sources: existing ones are stale). Cleared by clear_concept_sources_flag, typically after the gather-sources skill runs.',
    { id: z.string(), flag: z.enum(['need_sources', 'need_better_sources', 'need_new_sources']) },
    async ({ id, flag }) => {
      const c = getConcept(id);
      if (!c) return { content: [{ type: 'text' as const, text: `Concept not found: ${id}` }], isError: true };
      c.sourceFlag = flag;
      return text(saveConcept(c));
    }
  );

  server.tool(
    'list_concepts_needing_sources',
    'List every concept with a sourceFlag currently set — the work queue for the gather-sources skill.',
    {},
    async () => text(getAllConcepts().filter((c) => c.sourceFlag))
  );

  server.tool(
    'clear_concept_sources_flag',
    'Clear a concept\'s sourceFlag once it has been addressed.',
    { id: z.string() },
    async ({ id }) => {
      const c = getConcept(id);
      if (!c) return { content: [{ type: 'text' as const, text: `Concept not found: ${id}` }], isError: true };
      c.sourceFlag = undefined;
      return text(saveConcept(c));
    }
  );

  server.tool(
    'flag_concept_objectives',
    'Flag a concept as needing its Goal/Success Condition/Failure Condition auto-filled. Cleared automatically by set_concept_objectives.',
    { id: z.string() },
    async ({ id }) => {
      const c = getConcept(id);
      if (!c) return { content: [{ type: 'text' as const, text: `Concept not found: ${id}` }], isError: true };
      c.needsObjectives = true;
      return text(saveConcept(c));
    }
  );

  server.tool(
    'list_concepts_needing_objectives',
    'List every concept with needsObjectives set — the work queue for the set-objectives skill.',
    {},
    async () => text(getAllConcepts().filter((c) => c.needsObjectives))
  );

  server.tool(
    'set_concept_objectives',
    'Write a concept\'s Goal/Success Condition/Failure Condition and clear its needsObjectives flag in one call.',
    { id: z.string(), goal: z.string(), success_condition: z.string(), failure_condition: z.string() },
    async ({ id, goal, success_condition, failure_condition }) => {
      const c = getConcept(id);
      if (!c) return { content: [{ type: 'text' as const, text: `Concept not found: ${id}` }], isError: true };
      c.goal = goal;
      c.success_condition = success_condition;
      c.failure_condition = failure_condition;
      c.needsObjectives = false;
      return text(saveConcept(c));
    }
  );
```

- [ ] **Step 4: Run the tests to verify they pass, full suite/tsc/build clean**

Run: `npm test -- mcp/tools/concepts.test.ts && npx tsc --noEmit && npm test && npm run build`
Expected: all clean.

- [ ] **Step 5: Commit**

```bash
git add mcp/tools/concepts.ts mcp/tools/concepts.test.ts
git commit -m "Add MCP tools for source/objectives flags and objectives writing"
```

---

### Task 3: Wire the "Run Source Search" and "Fill Concept Objectives" buttons

**Files:**
- Modify: `components/ConceptDetail.tsx`

**Interfaces:** None new — uses the existing `PATCH /api/concepts/[id]` route (now accepting `sourceFlag`/`needsObjectives` per Task 1).

- [ ] **Step 1: Replace the placeholder "Run Source Search" button and add a flag badge**

Replace the current placeholder button (the one that does `alert('Source Skill Runner Triggered! (Placeholder)')`) with a real flag-setting flow. Since there are three possible flag values, use a small inline `<select>` next to the button rather than a single click with no way to pick which flag — the button becomes "flag" the currently-selected reason:

```typescript
  const [sourceFlagChoice, setSourceFlagChoice] = useState<'need_sources' | 'need_better_sources' | 'need_new_sources'>(
    srcs.length === 0 ? 'need_sources' : 'need_better_sources'
  );

  async function flagForSources() {
    await api(`/api/concepts/${c.id}`, 'PATCH', { sourceFlag: sourceFlagChoice });
    setC({ ...c, sourceFlag: sourceFlagChoice });
    router.refresh();
  }

  async function flagForObjectives() {
    await api(`/api/concepts/${c.id}`, 'PATCH', { needsObjectives: true });
    setC({ ...c, needsObjectives: true });
    router.refresh();
  }
```

Replace the existing placeholder button block:
```typescript
            <button className="btn sm" onClick={addSource}>＋ Add source</button>
            <button className="btn solid" style={{ background: 'var(--accent)', color: '#000', border: 'none', boxShadow: '0 0 10px var(--accent)' }} onClick={() => alert('Source Skill Runner Triggered! (Placeholder)')}>⚡ Run Source Search</button>
```
with:
```typescript
            <button className="btn sm" onClick={addSource}>＋ Add source</button>
            <select value={sourceFlagChoice} onChange={(e) => setSourceFlagChoice(e.target.value as typeof sourceFlagChoice)} style={{ width: 'auto' }}>
              <option value="need_sources">Need sources</option>
              <option value="need_better_sources">Need better sources</option>
              <option value="need_new_sources">Need new sources</option>
            </select>
            <button className="btn solid" style={{ background: 'var(--accent)', color: '#000', border: 'none', boxShadow: '0 0 10px var(--accent)' }} onClick={flagForSources}>
              {c.sourceFlag ? `⚡ Flagged: ${c.sourceFlag.replace(/_/g, ' ')}` : '⚡ Run Source Search'}
            </button>
```

- [ ] **Step 2: Add the "Fill Concept Objectives" button in the Concept Objectives block**

Inside the existing `<div className="quest-step" ...>` block, right after the `Concept Objectives` title `<div>`, add:
```typescript
             <button className="btn sm" onClick={flagForObjectives} style={{ marginTop: 8 }}>
               {c.needsObjectives ? '⏳ Flagged — run Set Objectives skill' : '✨ Fill Concept Objectives'}
             </button>
```

- [ ] **Step 3: Verify it compiles and manually check in the dev server**

Run: `npx tsc --noEmit && npm run build`
If a dev server can be started (per this project's `run` skill or `preview_start`), visit a concept detail page and confirm: clicking "Run Source Search" with a chosen reason updates the button label to show the flag; clicking "Fill Concept Objectives" updates its label; both survive a page refresh (confirming the PATCH actually persisted, closing out Task 1's bug fix).

- [ ] **Step 4: Commit**

```bash
git add components/ConceptDetail.tsx
git commit -m "Wire Run Source Search and Fill Concept Objectives buttons to real flags"
```

---

### Task 4: WYSIWYG rich-text editor for the Concept body (edit ⇄ readable toggle)

**Files:**
- Modify: `package.json` (add TipTap + `tiptap-markdown` dependencies)
- Create: `components/RichMarkdownEditor.tsx`
- Modify: `components/ConceptDetail.tsx` (replace the plain `<textarea>` for `body` with `RichMarkdownEditor`)

**Interfaces:**
- Produces: `RichMarkdownEditor({ value, onChange, editable }: { value: string; onChange: (markdown: string) => void; editable: boolean })` — a client component wrapping a single TipTap editor instance. `value`/`onChange` are plain Markdown strings in and out (via the `tiptap-markdown` extension's `getMarkdown()`), so nothing else in the app needs to know a rich editor is involved — `Concept.body` stays a plain string exactly as before.

- [ ] **Step 1: Install dependencies**

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-underline @tiptap/extension-highlight @tiptap/extension-color @tiptap/extension-text-style tiptap-markdown
```

- [ ] **Step 2: Write `components/RichMarkdownEditor.tsx`**

```typescript
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import { Markdown } from 'tiptap-markdown';
import { useEffect } from 'react';

export default function RichMarkdownEditor({ value, onChange, editable }: { value: string; onChange: (markdown: string) => void; editable: boolean }) {
  const editor = useEditor({
    extensions: [StarterKit, Underline, Highlight, TextStyle, Color, Markdown.configure({ html: false })],
    content: value,
    editable,
    onUpdate: ({ editor: e }) => {
      // @ts-expect-error — tiptap-markdown augments the editor with storage.markdown.getMarkdown()
      onChange(e.storage.markdown.getMarkdown());
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editable, editor]);

  useEffect(() => {
    if (!editor) return;
    // @ts-expect-error — same augmentation as above
    const current = editor.storage.markdown.getMarkdown();
    if (current !== value) editor.commands.setContent(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  return (
    <div className="rich-editor">
      {editable && (
        <div className="rich-editor-toolbar">
          <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'active' : ''}>B</button>
          <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'active' : ''}><i>I</i></button>
          <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive('underline') ? 'active' : ''}><u>U</u></button>
          <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'active' : ''}><s>S</s></button>
          <button type="button" onClick={() => editor.chain().focus().toggleHighlight().run()} className={editor.isActive('highlight') ? 'active' : ''}>Highlight</button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'active' : ''}>H1</button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'active' : ''}>H2</button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive('heading', { level: 3 }) ? 'active' : ''}>H3</button>
          <input type="color" onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} title="Text color" />
        </div>
      )}
      <EditorContent editor={editor} className="rich-editor-content" />
    </div>
  );
}
```

- [ ] **Step 3: Add minimal CSS for the toolbar/content in `app/globals.css`**

Append:
```css

/* ---- Rich Markdown editor (TipTap) ---- */
.rich-editor { border: 1px solid var(--border-2); border-radius: var(--radius-sm); background: var(--panel-2); }
.rich-editor-toolbar { display: flex; gap: 4px; padding: 6px 8px; border-bottom: 1px solid var(--border-2); flex-wrap: wrap; }
.rich-editor-toolbar button { background: transparent; border: 1px solid var(--border-2); color: var(--text); border-radius: 6px; padding: 3px 8px; font-size: 12px; cursor: pointer; }
.rich-editor-toolbar button.active { background: var(--accent); color: #000; border-color: var(--accent); }
.rich-editor-content { padding: 10px 12px; min-height: 260px; line-height: 1.6; }
.rich-editor-content .ProseMirror { outline: none; }
```

- [ ] **Step 4: Replace the plain textarea in `components/ConceptDetail.tsx`**

Add an `editable`/toggle state and swap the textarea:
```typescript
  const [bodyEditable, setBodyEditable] = useState(false);
```
Replace:
```typescript
          <div className="field">
            <label>Notes (Markdown — your own words)</label>
            <textarea value={c.body} onChange={(e) => set('body', e.target.value)} />
          </div>
```
with:
```typescript
          <div className="field">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ marginBottom: 0 }}>Notes</label>
              <button className="btn ghost sm" onClick={() => setBodyEditable(!bodyEditable)}>
                {bodyEditable ? '👁 Switch to readable' : '✏️ Switch to editable'}
              </button>
            </div>
            <RichMarkdownEditor value={c.body} onChange={(md) => set('body', md)} editable={bodyEditable} />
          </div>
```
Add the import: `import RichMarkdownEditor from './RichMarkdownEditor';`

- [ ] **Step 5: Verify it compiles and manually check in the dev server**

Run: `npx tsc --noEmit && npm run build`
If a dev server is available, visit a concept detail page, toggle to editable, select some text, click Bold/Italic/H2, confirm the formatting applies visually and that clicking Save persists it (reload and confirm the Markdown round-tripped correctly — e.g. selecting text and bolding it should produce `**text**` in the saved file).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json components/RichMarkdownEditor.tsx components/ConceptDetail.tsx app/globals.css
git commit -m "Add WYSIWYG rich-text editor for Concept body with edit/readable toggle"
```

---

### Task 5: `gather-sources` skill

**Files:**
- Create: `.claude/skills/gather-sources/SKILL.md`

**Interfaces:** None — Markdown instruction file. Uses `list_concepts_needing_sources`, `get_concept`, `create_source`, `sources_for_concept` (existing), `create_concept`, `update_concept`, `clear_concept_sources_flag` (new from Task 2).

- [ ] **Step 1: Write `.claude/skills/gather-sources/SKILL.md`**

```markdown
---
name: gather-sources
description: Batch-process every concept flagged as needing sources — find real external study material AND identify/link missing prerequisite concepts. Use when the user asks to run "Gather Sources", or says they've flagged concepts and want sources gathered. Triggered by concepts with a sourceFlag set (via the app's "Run Source Search" button or flag_concept_sources).
---

# Gather Sources

For every concept flagged as needing source attention, do two things: find real
external study material (the resource-finder process), AND identify whether
the concept is missing a foundational prerequisite concept it should be
linked to — "sources" here means both external material and internal
prerequisite links, not just external links.

## Steps

1. Call `list_concepts_needing_sources`. This is your work queue. If it's
   empty, tell the user there's nothing flagged and stop.
2. For each flagged concept, call `get_concept` to read its current body,
   existing `prereqs`, and note the specific `sourceFlag` value
   (`need_sources` / `need_better_sources` / `need_new_sources`) — it tells
   you the starting point:
   - `need_sources`: nothing attached yet, so `sources_for_concept` will
     likely return empty. Do a full resource-finder pass from scratch.
   - `need_better_sources`: something is attached but the user judged it
     weak. Read the existing sources via `sources_for_concept` first — don't
     just pile more on; decide whether to unlink the weak one (via
     `update_source` on it, removing this concept from its `concepts` list)
     once you have a stronger replacement.
   - `need_new_sources`: existing sources are stale/outdated. Same as above
     but the bar is currency, not quality.
3. Run the resource-finder skill's process for this concept: real
   WebSearch/WebFetch, verify links before attaching, `create_source` with
   accurate `type`/`title`/`url`/`concepts`.
4. **Prerequisites are sources too.** Based on the concept's body and the
   material you just found, judge whether the concept assumes foundational
   knowledge that isn't yet captured as a linked prerequisite Concept. If a
   genuine prerequisite is missing:
   - Search first (`list_concepts` or a targeted look) for whether it
     already exists under a different id — reuse it, don't duplicate.
   - If it doesn't exist, create it via `create_concept` with a real,
     substantive body (not a stub — same rule as syllabus-draft).
   - Link it by calling `update_concept` on the ORIGINAL flagged concept,
     adding the prerequisite's id to its `prereqs` array (don't overwrite
     existing prereqs — append).
   - Do not invent a prerequisite that isn't genuinely needed just to have
     something to link — most concepts won't need a new one.
5. Once you've attached what you found (or determined nothing more is
   findable — see Notes below), call `clear_concept_sources_flag` for this
   concept.
6. After processing the whole queue, report to the user: which concepts
   were processed, what was attached to each, which prerequisite concepts
   (if any) were created or linked, and which concepts (if any) you
   couldn't find good material for.

## Steerable reruns

If the user gives extra steering ("free only", "focus on video content",
"skip the ones about X") while invoking this skill, apply it as a filter/
preference across the whole queue processed in step 1-4, same as the
resource-finder skill's own steerable-rerun guidance.

## Notes

- If you genuinely can't find good material for a concept after a real
  search, don't attach something mediocre just to clear the flag — leave
  the flag set, note it in your final report, and move on. A flag staying
  set honestly is better than false completion.
- Don't process the whole queue silently and report only at the end if the
  queue is large (10+) — give the user a brief progress note partway
  through so they're not staring at silence.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/gather-sources/SKILL.md
git commit -m "Add gather-sources skill (external sources + prerequisite linking)"
```

---

### Task 6: `set-objectives` skill

**Files:**
- Create: `.claude/skills/set-objectives/SKILL.md`

**Interfaces:** None — Markdown instruction file. Uses `list_concepts_needing_objectives`, `get_concept`, `set_concept_objectives` (new from Task 2).

- [ ] **Step 1: Write `.claude/skills/set-objectives/SKILL.md`**

```markdown
---
name: set-objectives
description: Batch-fill Goal/Success Condition/Failure Condition for every concept flagged via "Fill Concept Objectives". Use when the user asks to run "Set Objectives", or says they've flagged concepts and want objectives filled. Triggered by concepts with needsObjectives set (via the app's button or flag_concept_objectives).
---

# Set Objectives

For every concept flagged as needing its self-assessment objectives filled,
write a genuine Goal, Success Condition, and Failure Condition grounded in
that specific concept's actual content — not generic boilerplate that could
apply to any topic.

## Steps

1. Call `list_concepts_needing_objectives`. This is your work queue. If
   empty, tell the user and stop.
2. For each flagged concept, call `get_concept` to read its `body` and
   `notes` — the objectives must reflect what THIS concept actually covers,
   not a generic template.
3. Draft three fields:
   - **Goal**: one or two sentences, phrased as what the learner is trying
     to understand or be able to do — specific to this concept's actual
     content, not "understand [title]" restated.
   - **Success Condition**: a concrete, checkable statement of what "you've
     got it" looks like — ideally something the learner could self-test
     (e.g. "can derive X from first principles without looking it up," "can
     explain why Y fails under Z condition").
   - **Failure Condition**: the specific, common misunderstanding or gap
     that indicates the learner hasn't grasped it yet — the actual trap
     people fall into with this topic, not a vague "doesn't understand it."
4. If a concept's `body` is still an empty placeholder template (no real
   content to ground objectives in), don't fabricate objectives from the
   title alone — skip it, leave its flag set, and note in your final report
   that it needs real content filled in before objectives can be written
   meaningfully.
5. Call `set_concept_objectives` with the three fields — this also clears
   the flag automatically.
6. After processing the queue, report which concepts got objectives filled
   and which were skipped (and why).

## Steerable reruns

If the user says "redo the objectives for X, they're too generic" or
similar against an already-filled concept, re-run steps 2-5 for that
specific concept with the steering incorporated into your drafting (e.g.
"more specific," "shorter," "focus on the math not the intuition") — you
don't need `flag_concept_objectives` first if the user names the concept
directly, but do flag it first if you're asked to revisit a whole category.

## Notes

- Keep each field to 1-3 sentences — these are meant to be glanced at, not
  read as another essay. If you're writing a paragraph, you're writing the
  Goal for the wrong altitude.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/set-objectives/SKILL.md
git commit -m "Add set-objectives skill"
```

---

### Task 7: `AGENTS.md` — tool-agnostic cross-agent documentation

**Files:**
- Create: `learning-os/AGENTS.md`

**Interfaces:** None — documentation file.

- [ ] **Step 1: Write `AGENTS.md`**

```markdown
# Agents Guide — Learning OS

This file is for any coding agent working in this repository — not just
Claude Code. It documents the MCP server, the skills, and the hooks this
project ships, in a tool-agnostic way, so any agent that reads this file
can discover and use the same capabilities Claude Code's `.claude/`
directory wires up natively.

> Note: Claude Code specifically also reads `.claude/skills/*/SKILL.md`
> (the full step-by-step instructions for each skill below) and
> `.mcp.json`/`.claude/settings.json` (auto-discovery config) directly —
> this file is the summary/entry point; those are the detailed source.

## MCP server

Start it: `npx tsx mcp/server.ts` (stdio transport). Registered with Claude
Code automatically via `.mcp.json` when this project is opened. It wraps
`lib/core/*` — a plain TypeScript data layer with no framework
dependencies — as a set of deterministic tools (no LLM calls, no network
calls, inside the server itself; see the design spec's skill-vs-tool
principle). Content lives as Markdown files under `content/`.

### Tools by entity

**Concepts** (`mcp/tools/concepts.ts`): `list_concepts`, `get_concept`,
`create_concept`, `update_concept`, `set_concept_status`, `archive_concept`,
`append_concept_note`, `flag_concept_sources`, `list_concepts_needing_sources`,
`clear_concept_sources_flag`, `flag_concept_objectives`,
`list_concepts_needing_objectives`, `set_concept_objectives`.

**Sources** (`mcp/tools/sources.ts`): `list_sources`, `sources_for_concept`,
`create_source`, `update_source`, `archive_source`.

**Courses** (`mcp/tools/courses.ts`): `list_courses`, `get_course`,
`create_course`, `update_course`, `course_completion`, `delete_course`.

**Templates** (`mcp/tools/templates.ts`): `list_templates`, `get_template`,
`create_template`, `append_lesson_learned`, `append_known_pitfall`,
`delete_template`.

**Projects** (`mcp/tools/projects.ts`): `list_projects`, `get_project`,
`create_project`, `update_project`, `unblocked_checkpoints`,
`set_checkpoint_depends_on`, `delete_project`.

**Prices** (`mcp/tools/prices.ts`): `check_price` (deterministic cache read
— never searches itself), `append_price_observation`, `get_price_record`.

**Global knowledge** (`mcp/tools/globalKnowledge.ts`): `get_global_knowledge`,
`append_global_lesson`, `append_global_pitfall`, `append_global_watch_for`.

**Rollup** (`mcp/tools/rollup.ts`): `aggregated_notes_for_course`,
`aggregated_notes_for_project`.

**Explode** (`mcp/tools/explode.ts`): `explode_concept` (structural move
only — see the `explode-concept` skill for the generation half).

## Skills

Skills are instructions for an LLM session to follow, using the MCP tools
above plus web research (WebSearch/WebFetch) — they are not standalone
programs. The full step-by-step process for each lives in
`.claude/skills/<name>/SKILL.md`; summarized here:

- **`explode-concept`** — breaks a confusing Concept into a finer-grained
  nested Course, given the user's stated reason for the confusion.
- **`syllabus-draft`** — drafts a Project's checkpoint dependency graph for
  a new goal, seeded from the closest Template if one exists or from real
  web research if not. Requires every new Concept to have a substantive
  body (never a placeholder) and requires attaching real Sources before the
  draft is considered done.
- **`resource-finder`** — finds and attaches real, free, verified study
  material (Sources) for a Concept.
- **`pricing`** — prices tools/hardware a checkpoint needs, scoped to a
  market, cache-first via `check_price`.
- **`gather-sources`** — batch-processes every concept with a `sourceFlag`
  set: attaches external Sources AND links/creates missing prerequisite
  Concepts (prerequisites count as "sources" in this project's usage).
- **`set-objectives`** — batch-fills Goal/Success Condition/Failure
  Condition for every concept with `needsObjectives` set, grounded in that
  concept's actual content.

## Hooks

Both live in `.claude/hooks/`, run via `npx tsx` (they import TypeScript
source directly, so plain `node` won't work), registered in
`.claude/settings.json`:

- **`memory-inject`** (`UserPromptSubmit`) — deterministic keyword match
  against known Concept/Course/Project/Template titles (via
  `lib/core/indexDb.ts`'s summary index, not a full content scan); if the
  prompt mentions a tracked entity, injects a short summary as context.
  Costs nothing on the common no-match case.
- **`auto-checkpoint`** (`PostToolUse`, matched to checkpoint-mutating
  tools) — after a checkpoint status/dependency change, surfaces any
  newly-unblocked checkpoints.

## Data model

Five entities plus two singletons, all Markdown files under `content/`,
indexed by a rebuildable SQLite mirror (`lib/core/indexDb.ts`) — see the
design spec (`docs/superpowers/specs/2026-09-21-learning-os-platform-design.md`)
for the full schema. In short: Concept (atomic, shared, mastered once),
Source (tags one or more Concepts), Course (bundle of Concepts/subcourses),
Template (reusable project blueprint with accumulated experience), Project
(a checkpoint dependency graph), Price Record (append-only, market-scoped),
Global Knowledge (instance-wide singleton).
```

- [ ] **Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "Add AGENTS.md: tool-agnostic MCP/skills/hooks documentation for any coding agent"
```

---

### Task 8: Manual verification

**Files:** None.

**Interfaces:** None.

- [ ] **Step 1: Full automated verification**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: all clean.

- [ ] **Step 2: Manual UI check**

Start the dev server, open a concept detail page:
- Confirm "Run Source Search" lets you pick a reason and flags the concept (label updates, survives reload).
- Confirm "Fill Concept Objectives" flags the concept (label updates, survives reload).
- Confirm the Concept Objectives panel's Goal/Success Condition/Failure Condition fields now actually save (this was the Task 1 bug fix) — edit one, click Save, reload, confirm it persisted.
- Confirm the rich editor: toggle to editable, select text, apply Bold/Italic/H2/Highlight, toggle back to readable, confirm it renders correctly; click Save, reload, confirm the underlying Markdown round-tripped (spot check the raw file on disk shows real Markdown syntax like `**bold**`, not HTML).

- [ ] **Step 3: What still needs a live Claude Code session**

Document explicitly, same pattern as the prior Claude Code layer plan: whether `gather-sources` and `set-objectives` actually produce good results when invoked by a real model against real flagged concepts cannot be verified without a live session — this plan wires the mechanism (flags, tools, skill instructions) correctly and verifiably, but the skills' output quality is untested here.

- [ ] **Step 4: Commit** (only if Step 1-2 surfaced a fix)

## Self-review notes

- **Spec coverage:** flags (Task 1-2), UI wiring (Task 3), rich editor (Task 4), both new skills (Tasks 5-6), cross-agent doc (Task 7) — all of the user's explicit requests are covered. The `EDITABLE` whitelist bug fix (Task 1) was found while scoping, not requested, but is necessary for the objectives feature to work at all.
- **Out of scope, by design:** actually running `gather-sources`/`set-objectives` against real content (that's a live-session action the user takes later, not something this plan executes); the literal filename "`agent.agent`"/"`.agent`" — used `AGENTS.md` instead, the real cross-agent convention, flagged explicitly for correction if a different literal name was intended.
- **Type consistency check:** `sourceFlag`'s three string literals match exactly across `lib/core/types.ts`, `mcp/tools/concepts.ts`'s Zod enum, and `components/ConceptDetail.tsx`'s `<select>` options. `RichMarkdownEditor`'s `value`/`onChange` contract (plain Markdown string in/out) matches exactly what `ConceptDetail.tsx`'s existing `set('body', ...)` pattern already expects — no change needed anywhere else that touches `body`.

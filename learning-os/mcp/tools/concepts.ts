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
      notes: z.array(z.object({
        id: z.string(),
        date: z.string(),
        text: z.string().optional(),
        attachments: z.array(z.object({
          type: z.enum(['image', 'audio', 'video', 'link', 'file']),
          path: z.string().optional(),
          url: z.string().optional(),
        })).optional(),
      })).optional(),
    },
    async ({ id, ...patch }) => {
      const c = getConcept(id);
      if (!c) return { content: [{ type: 'text' as const, text: `Concept not found: ${id}` }], isError: true };
      Object.assign(c, patch);
      return text(saveConcept(c));
    }
  );

  server.tool(
    'append_concept_note',
    'Append a single note (text and/or link/image/etc. attachments) to a concept, without needing to resend the whole notes array.',
    {
      id: z.string(),
      text: z.string().optional(),
      attachments: z.array(z.object({
        type: z.enum(['image', 'audio', 'video', 'link', 'file']),
        path: z.string().optional(),
        url: z.string().optional(),
      })).optional(),
    },
    async ({ id, text: noteText, attachments }) => {
      const c = getConcept(id);
      if (!c) return { content: [{ type: 'text' as const, text: `Concept not found: ${id}` }], isError: true };
      c.notes.push({ id: `n-${Date.now()}`, date: new Date().toISOString().slice(0, 10), text: noteText, attachments });
      return text(saveConcept(c));
    }
  );

  server.tool(
    'set_concept_status',
    "Advance, set, or flag-for-review a concept's status.",
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
}

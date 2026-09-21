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
}

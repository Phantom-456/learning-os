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

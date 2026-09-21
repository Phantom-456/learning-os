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

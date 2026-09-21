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

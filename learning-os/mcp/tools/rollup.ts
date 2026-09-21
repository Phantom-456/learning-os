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

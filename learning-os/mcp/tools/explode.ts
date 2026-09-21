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

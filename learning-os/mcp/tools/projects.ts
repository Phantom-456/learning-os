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

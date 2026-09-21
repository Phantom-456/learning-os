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

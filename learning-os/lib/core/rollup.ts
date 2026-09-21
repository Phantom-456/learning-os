import type { Note } from './types';
import { getConcept } from './concepts';
import { getCourse } from './courses';
import { getProject } from './projects';

export interface AggregatedNote extends Note {
  source: { kind: 'concept' | 'course' | 'project' | 'source'; id: string; title: string };
}

function conceptNotes(conceptId: string): AggregatedNote[] {
  const c = getConcept(conceptId);
  if (!c) return [];
  return c.notes.map((n) => ({ ...n, source: { kind: 'concept' as const, id: c.id, title: c.title } }));
}

/** A course's own notes + every concept's notes + every subcourse's, recursively. */
export function getAggregatedNotesForCourse(courseId: string, seen = new Set<string>()): AggregatedNote[] {
  if (seen.has(courseId)) return [];
  seen.add(courseId);
  const course = getCourse(courseId);
  if (!course) return [];

  const own: AggregatedNote[] = course.notes.map((n) => ({
    ...n,
    source: { kind: 'course' as const, id: course.id, title: course.title },
  }));
  const fromConcepts = course.concepts.flatMap(conceptNotes);
  const fromSubcourses = course.subcourses.flatMap((id) => getAggregatedNotesForCourse(id, seen));
  return [...own, ...fromConcepts, ...fromSubcourses];
}

/** A project's own notes + every course/concept reachable from its checkpoints. */
export function getAggregatedNotesForProject(projectId: string): AggregatedNote[] {
  const project = getProject(projectId);
  if (!project) return [];

  const own: AggregatedNote[] = project.notes.map((n) => ({
    ...n,
    source: { kind: 'project' as const, id: project.id, title: project.title },
  }));
  const seen = new Set<string>();
  const fromCheckpoints = project.checkpoints.flatMap((cp) => [
    ...cp.concepts.flatMap(conceptNotes),
    ...cp.courses.flatMap((id) => getAggregatedNotesForCourse(id, seen)),
  ]);
  return [...own, ...fromCheckpoints];
}

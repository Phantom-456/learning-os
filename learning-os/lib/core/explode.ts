import type { Course } from './types';
import { getConcept } from './concepts';
import { getCourse, createCourse, saveCourse } from './courses';

/**
 * Manual stub (spec §10, Phase 1): converts a Concept the user found
 * confusing into a new, empty Course nested under the parent Course, with
 * the stated reason recorded in its body. LLM-backed generation of the
 * actual breakdown is Phase 2 work — this task only wires the structural
 * move (create + nest) so the UI action has something real to call.
 */
export function explodeConcept(conceptId: string, parentCourseId: string, reason: string): Course {
  const concept = getConcept(conceptId);
  if (!concept) throw new Error(`Concept not found: ${conceptId}`);
  const parent = getCourse(parentCourseId);
  if (!parent) throw new Error(`Course not found: ${parentCourseId}`);

  const course = createCourse({
    id: `${parentCourseId}--${conceptId}-explode`,
    title: `${concept.title} (exploded)`,
    kind: 'authored',
    concepts: [],
    body: `Exploded from concept "${concept.title}".\n\nReason: ${reason}\n`,
  });
  parent.subcourses.push(course.id);
  saveCourse(parent);
  return course;
}

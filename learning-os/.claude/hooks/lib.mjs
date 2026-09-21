import { conceptSummaries, courseSummaries, projectSummaries } from '../../lib/core/indexDb';
import { getAllProjects, unblockedCheckpoints } from '../../lib/core/projects';
import { getAllTemplates } from '../../lib/core/templates';

// Word-boundary-aware substring check — plain `String#includes` would
// false-positive on short/common titles (e.g. a concept titled "ROS" would
// fire on the word "across"). Uses lookaround instead of `\b`: `\b` requires
// a word/non-word transition, which never fires at a match edge that is
// itself a non-word character (e.g. "Extended Kalman filter (EKF)" ends in
// ")", so a trailing `\b` can never match there even on an exact quote).
// Lookaround only checks the single adjacent character (or string
// boundary, which always satisfies it), so it handles punctuation-edged
// titles correctly too.
function titleAppearsIn(lowerPrompt, title) {
  const lowerTitle = title.toLowerCase();
  const escaped = lowerTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![a-z0-9_])${escaped}(?![a-z0-9_])`).test(lowerPrompt);
}

// Cheap, deterministic keyword match against known entity titles — no LLM
// call, per spec §4's memory-inject gating principle. Runs on every
// UserPromptSubmit; must stay fast and cost nothing when there's no match.
//
// Concepts/Courses/Projects are matched against `lib/core/indexDb.ts`'s
// SQLite-backed summary index (built specifically for cheap title/status
// lookups) instead of the full `getAllConcepts()`/`getAllCourses()`/
// `getAllProjects()` entity loaders, which each do a full directory listing
// plus a gray-matter parse of every content file. Templates have no summary
// function in indexDb.ts yet (only Concepts/Courses/Projects were indexed by
// the prior merged plan), so we keep using `getAllTemplates()` for them —
// templates are typically few, so the full load is an acceptable exception.
export function matchEntityTitles(prompt) {
  const lower = prompt.toLowerCase();
  const hits = [];
  for (const c of conceptSummaries()) {
    if (titleAppearsIn(lower, c.title)) hits.push({ kind: 'concept', id: c.id, title: c.title });
  }
  for (const c of courseSummaries()) {
    if (titleAppearsIn(lower, c.title)) hits.push({ kind: 'course', id: c.id, title: c.title });
  }
  for (const p of projectSummaries()) {
    if (titleAppearsIn(lower, p.title)) hits.push({ kind: 'project', id: p.id, title: p.title });
  }
  for (const t of getAllTemplates()) {
    if (titleAppearsIn(lower, t.title)) hits.push({ kind: 'template', id: t.id, title: t.title });
  }
  return hits;
}

// One-line summary + which tool to call for more — status and id only,
// never full note bodies or full rollups (spec §3's token-consumption
// principle).
export function summarizeMatches(hits) {
  return hits
    .map((h) => `- [${h.kind}] ${h.title} (id: ${h.id}) — use get_${h.kind} to see more`)
    .join('\n');
}

export function summarizeUnblocked(projectId) {
  const project = getAllProjects().find((p) => p.id === projectId);
  if (!project) return '';
  const unblocked = unblockedCheckpoints(project.checkpoints);
  if (unblocked.length === 0) return '';
  return `Newly workable on "${project.title}": ${unblocked.map((c) => c.title).join(', ')}`;
}

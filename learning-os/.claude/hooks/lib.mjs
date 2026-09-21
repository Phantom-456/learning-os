import { getAllConcepts } from '../../lib/core/concepts';
import { getAllCourses } from '../../lib/core/courses';
import { getAllProjects, unblockedCheckpoints } from '../../lib/core/projects';
import { getAllTemplates } from '../../lib/core/templates';

// Cheap, deterministic keyword match against known entity titles — no LLM
// call, per spec §4's memory-inject gating principle. Runs on every
// UserPromptSubmit; must stay fast and cost nothing when there's no match.
export function matchEntityTitles(prompt) {
  const lower = prompt.toLowerCase();
  const hits = [];
  for (const c of getAllConcepts()) {
    if (lower.includes(c.title.toLowerCase())) hits.push({ kind: 'concept', id: c.id, title: c.title });
  }
  for (const c of getAllCourses()) {
    if (lower.includes(c.title.toLowerCase())) hits.push({ kind: 'course', id: c.id, title: c.title });
  }
  for (const p of getAllProjects()) {
    if (lower.includes(p.title.toLowerCase())) hits.push({ kind: 'project', id: p.id, title: p.title });
  }
  for (const t of getAllTemplates()) {
    if (lower.includes(t.title.toLowerCase())) hits.push({ kind: 'template', id: t.id, title: t.title });
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

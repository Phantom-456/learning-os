// Shared domain types for the two-axis model (see ARCHITECTURE.md).
// Concepts are the shared unit (mastered once, green everywhere);
// Projects reference concepts through ordered milestones.

export type Status = 'not_started' | 'learning' | 'complete';
export type MilestoneStatus = 'not_started' | 'building' | 'done';
export type VideoKind = 'short' | 'long';

export interface VideoRef {
  url: string;
  kind: VideoKind;
  label?: string;
}

export interface LinkRef {
  label: string;
  url: string;
}

/** A single concept = one Markdown file. Frontmatter is mirrored into the index. */
export interface Concept {
  id: string;
  title: string;
  parent: string; // parent header it groups under
  order: number; // position within that header (learning order)
  status: Status;
  review: boolean; // overlay flag, independent of the lifecycle
  prereqs: string[]; // concept ids
  videos: VideoRef[];
  links: LinkRef[];
  template_done: string[]; // §2 template slots completed
  updated: string; // ISO-8601 date
  deleted?: boolean; // soft-delete flag
  body: string; // Markdown body (source of truth; not stored in index rows)
}

/** One roadmap step. References concepts; adds robot-specific application + a video. */
export interface Milestone {
  id: string;
  title: string;
  order: number;
  concepts: string[]; // referenced concept ids (shared, not copied)
  app_notes?: string; // path to notes/<project>/<milestone>.md
  build: string; // the sim build step
  done_test?: string; // pass/fail test
  videos: VideoRef[];
  status: MilestoneStatus;
}

/** A project = a robot + its ordered roadmap. */
export interface Project {
  id: string;
  title: string;
  robot: string;
  status: string; // e.g. in_progress
  definition_of_done: string;
  toolchain?: string;
  milestones: Milestone[];
  updated: string; // ISO-8601 date
  deleted?: boolean;
  body: string;
}

/** A parent header groups concepts in the Concept view. Derived from concept frontmatter. */
export interface ParentGroup {
  parent: string;
  concepts: Concept[];
}

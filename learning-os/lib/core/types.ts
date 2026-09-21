// Domain types for the five-entity model (design spec §2-§6).
// Concept/Source are archive-only (never hard-deleted, spec §5); Course/
// Template/Project keep the existing soft-delete flag.

export type Status = 'not_started' | 'learning' | 'complete';

export interface NoteAttachment {
  type: 'image' | 'audio' | 'video' | 'link' | 'file';
  path?: string; // relative to content/assets, for local files
  url?: string; // for links
}

/** One journal-style entry: free text and/or attachments, mixed freely. */
export interface Note {
  id: string;
  date: string; // ISO-8601 date
  text?: string;
  attachments?: NoteAttachment[];
}

export interface Concept {
  id: string;
  title: string;
  parent: string;
  order: number;
  status: Status;
  review: boolean;
  prereqs: string[];
  notes: Note[];
  updated: string;
  archived?: boolean;
  body: string;
  /** Frontmatter keys this layer doesn't model (e.g. the old layer's `videos`/`links`/`template_done`), preserved verbatim across read-modify-write so they aren't silently dropped. */
  extra?: Record<string, unknown>;
}

export interface Source {
  id: string;
  type: 'video' | 'article' | 'paper' | 'link' | 'pdf' | 'podcast' | 'other';
  title: string;
  url: string;
  concepts: string[]; // ownership lives here — a source tags every concept it covers
  added: string;
  notes: Note[];
  archived?: boolean;
  body: string;
}

export interface Course {
  id: string;
  title: string;
  kind: 'external' | 'authored';
  provider?: string;
  url?: string;
  concepts: string[];
  subcourses: string[]; // nested Courses, e.g. from Explode Concept
  notes: Note[];
  updated: string;
  deleted?: boolean;
  body: string;
}

export interface KnowledgeEntry {
  date: string;
  note: string;
}

export interface Template {
  id: string;
  title: string;
  courses: string[];
  concepts: string[];
  lessons_learned: KnowledgeEntry[];
  known_pitfalls: KnowledgeEntry[];
  watch_for: string[];
  updated: string;
  deleted?: boolean;
  body: string;
}

/** The instance-wide singleton (spec §2) — same shape as a Template's experience fields. */
export interface GlobalKnowledge {
  lessons_learned: KnowledgeEntry[];
  known_pitfalls: KnowledgeEntry[];
  watch_for: string[];
}

export type CheckpointStatus = 'not_started' | 'building' | 'done';

export interface Checkpoint {
  id: string;
  title: string;
  depends_on: string[];
  courses: string[];
  concepts: string[];
  status: CheckpointStatus;
  build?: string; // free-form build/execution notes
  done_test?: string; // pass/fail criterion
}

export interface Project {
  id: string;
  title: string;
  template?: string; // originating Template id, if instantiated from one
  status: 'in_progress' | 'done' | 'abandoned';
  metadata: Record<string, string>; // domain-specific info (e.g. robot, toolchain) — generic, not hardcoded
  checkpoints: Checkpoint[];
  notes: Note[];
  updated: string;
  deleted?: boolean;
  body: string;
}

export type Market = string; // e.g. "IN", "US" — location code paired with a currency

export interface PriceObservation {
  market: Market;
  currency: string;
  date: string;
  price: number;
  available: boolean;
  source: string;
  seller?: string;
}

export interface PriceAlternative {
  name: string;
  market: Market;
  currency: string;
  price: number;
  downsides: string;
}

export interface PriceRecord {
  id: string;
  item: string;
  observations: PriceObservation[]; // append-only
  alternatives: PriceAlternative[];
}

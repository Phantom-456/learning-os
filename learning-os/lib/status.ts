import type { Status, Concept } from './types';

// The concept lifecycle is a simple 3-step ladder; the `review` flag is a
// SEPARATE overlay so a `complete` concept can be pulled back for a pass
// without losing its lifecycle history (ARCHITECTURE.md §4).

export const STATUS_ORDER: Status[] = ['not_started', 'learning', 'complete'];

export function nextStatus(s: Status): Status {
  const i = STATUS_ORDER.indexOf(s);
  return STATUS_ORDER[Math.min(i + 1, STATUS_ORDER.length - 1)];
}

export function prevStatus(s: Status): Status {
  const i = STATUS_ORDER.indexOf(s);
  return STATUS_ORDER[Math.max(i - 1, 0)];
}

/**
 * Apply a lifecycle transition. Moving OFF complete (back to learning) implies
 * you are re-opening the topic, so any stale review flag is cleared. Moving TO
 * complete preserves review (you may have completed it but still want a pass).
 */
export function applyStatus(c: Concept, status: Status): Concept {
  const review = status === 'complete' ? c.review : false;
  return { ...c, status, review };
}

/** Set/clear the review flag independently of the lifecycle. */
export function setReview(c: Concept, review: boolean): Concept {
  return { ...c, review };
}

export const STATUS_LABEL: Record<Status, string> = {
  not_started: 'Not started',
  learning: 'Learning',
  complete: 'Complete',
};

// Accent colors (dark-friendly) used as the left chip in the card list.
export const STATUS_COLOR: Record<Status, string> = {
  not_started: '#8b8b9e', // muted
  learning: '#e0b341', // amber
  complete: '#43c59e', // green
};

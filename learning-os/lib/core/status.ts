import type { Status, Concept } from './types';

export const STATUS_ORDER: Status[] = ['not_started', 'learning', 'complete'];

export function nextStatus(s: Status): Status {
  const i = STATUS_ORDER.indexOf(s);
  return STATUS_ORDER[Math.min(i + 1, STATUS_ORDER.length - 1)];
}

/**
 * Moving OFF complete implies re-opening the topic, so a stale review flag
 * is cleared. Moving TO complete preserves review (you may have finished it
 * but still want a pass).
 */
export function applyStatus(c: Concept, status: Status): Concept {
  const review = status === 'complete' ? c.review : false;
  return { ...c, status, review };
}

export function setReview(c: Concept, review: boolean): Concept {
  return { ...c, review };
}

export const STATUS_LABEL: Record<Status, string> = {
  not_started: 'Not started',
  learning: 'Learning',
  complete: 'Complete',
};

export const STATUS_COLOR: Record<Status, string> = {
  not_started: '#8b8b9e',
  learning: '#e0b341',
  complete: '#43c59e',
};

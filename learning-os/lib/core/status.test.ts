import { describe, it, expect } from 'vitest';
import { nextStatus, applyStatus, setReview } from './status';
import type { Concept } from './types';

const baseConcept: Concept = {
  id: 'a', title: 'A', parent: 'P', order: 0, status: 'not_started',
  review: false, prereqs: [], notes: [], updated: '2026-01-01', body: '',
};

describe('status', () => {
  it('advances through the lifecycle and clamps at complete', () => {
    expect(nextStatus('not_started')).toBe('learning');
    expect(nextStatus('learning')).toBe('complete');
    expect(nextStatus('complete')).toBe('complete');
  });

  it('clears a stale review flag when moving off complete', () => {
    const reviewing: Concept = { ...baseConcept, status: 'complete', review: true };
    const reopened = applyStatus(reviewing, 'learning');
    expect(reopened.review).toBe(false);
  });

  it('preserves review when moving to complete', () => {
    const c = applyStatus({ ...baseConcept, review: true }, 'complete');
    expect(c.review).toBe(true);
  });

  it('setReview toggles independently of lifecycle', () => {
    expect(setReview(baseConcept, true).status).toBe('not_started');
    expect(setReview(baseConcept, true).review).toBe(true);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-explode-route-'));
  process.env.YTS_CONTENT_DIR = dir;
});

function req(body: unknown) {
  return new Request('http://localhost/api/concepts/x/explode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/concepts/[id]/explode', () => {
  it('404s on a missing concept, and does not create the requested new parent course', async () => {
    const { POST } = await import('./route');
    const res = await POST(req({ reason: 'confusing', newParentCourseTitle: 'Orphan course' }), {
      params: Promise.resolve({ id: 'does-not-exist' }),
    });

    expect(res.status).toBe(404);

    const { getCourse } = await import('@/lib/core/courses');
    expect(getCourse('orphan-course')).toBeNull();
  });

  it('creates the new parent course and the exploded course when the concept exists', async () => {
    const { createConcept } = await import('@/lib/core/concepts');
    createConcept({ id: 'kalman-filter', title: 'Kalman filter', parent: 'State estimation' });

    const { POST } = await import('./route');
    const res = await POST(
      req({ reason: 'the derivation loses me', newParentCourseTitle: 'Estimation basics' }),
      { params: Promise.resolve({ id: 'kalman-filter' }) }
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.course.title).toContain('Kalman filter');

    const { getCourse } = await import('@/lib/core/courses');
    expect(getCourse('estimation-basics')).not.toBeNull();
  });

  it('400s when reason is missing, before touching the concept or course', async () => {
    const { POST } = await import('./route');
    const res = await POST(req({ newParentCourseTitle: 'X' }), { params: Promise.resolve({ id: 'anything' }) });
    expect(res.status).toBe(400);
  });
});

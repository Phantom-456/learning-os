import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lom-concepts-route-'));
  process.env.YTS_CONTENT_DIR = dir;
});

function req(body: unknown) {
  return new Request('http://localhost/api/concepts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/concepts', () => {
  it('derives order as max(existing siblings order) + 1 when the client omits it', async () => {
    const { createConcept } = await import('@/lib/core/concepts');
    const { rebuildIndex } = await import('@/lib/core/indexDb');
    createConcept({ id: 'a', title: 'A', parent: 'Classical control', order: 0 });
    createConcept({ id: 'b', title: 'B', parent: 'Classical control', order: 3 });
    rebuildIndex();

    const { POST } = await import('./route');
    const res = await POST(req({ title: 'C', parent: 'Classical control' }));
    const json = await res.json();

    expect(json.concept.order).toBe(4);
  });

  it('starts a new (empty) parent group at order 0', async () => {
    const { POST } = await import('./route');
    const res = await POST(req({ title: 'First', parent: 'Brand new group' }));
    const json = await res.json();

    expect(json.concept.order).toBe(0);
  });

  it('does not let two concepts in the same group collide at order 0, so reorder swaps actually move them', async () => {
    const { POST } = await import('./route');
    const r1 = await POST(req({ title: 'One', parent: 'G' }));
    const c1 = (await r1.json()).concept;
    const r2 = await POST(req({ title: 'Two', parent: 'G' }));
    const c2 = (await r2.json()).concept;

    expect(c1.order).not.toBe(c2.order);
  });

  it('still honors an explicit client-supplied order', async () => {
    const { POST } = await import('./route');
    const res = await POST(req({ title: 'Explicit', parent: 'G', order: 7 }));
    const json = await res.json();
    expect(json.concept.order).toBe(7);
  });
});

import { NextResponse } from 'next/server';
import { rebuildIndex } from '@/lib/core/indexDb';

export const dynamic = 'force-dynamic';

export async function POST() {
  rebuildIndex();
  return NextResponse.json({ ok: true });
}

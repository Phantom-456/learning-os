import { NextResponse } from 'next/server';
import { rebuildIndex, stats } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  rebuildIndex();
  return NextResponse.json({ ok: true, stats: stats() });
}

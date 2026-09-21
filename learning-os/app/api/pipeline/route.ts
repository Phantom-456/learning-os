import { NextResponse } from 'next/server';
import { getProvider } from '@/lib/pipeline';

export const dynamic = 'force-dynamic';

// POST { action: 'make-readable', notes, title }
//   -> { readable }
// POST { action: 'hooks', readable, title, kind }
//   -> { hooks, structure }
export async function POST(req: Request) {
  const b = await req.json();
  const provider = getProvider();
  const title: string = b.title ?? 'this concept';

  if (b.action === 'make-readable') {
    const readable = await provider.makeReadable(b.notes ?? '', title);
    return NextResponse.json({ readable, provider: provider.name });
  }
  if (b.action === 'hooks') {
    const kind = b.kind === 'long' ? 'long' : 'short';
    const out = await provider.hooks(b.readable ?? '', title, kind);
    return NextResponse.json({ ...out, provider: provider.name });
  }
  return NextResponse.json({ error: 'bad action' }, { status: 400 });
}

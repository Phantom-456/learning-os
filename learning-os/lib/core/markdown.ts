import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export function writeMd(file: string, data: Record<string, unknown>, body: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, matter.stringify(body ?? '', data), 'utf8');
}

export function readMd(file: string): { data: Record<string, unknown>; body: string } | null {
  if (!fs.existsSync(file)) return null;
  const { data, content } = matter(fs.readFileSync(file, 'utf8'));
  return { data, body: content };
}

export function listIds(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.slice(0, -3));
}

export const today = (): string => new Date().toISOString().slice(0, 10);

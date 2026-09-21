import { globalKnowledgeFile, ensureDirs } from './paths';
import { writeMd, readMd, today } from './markdown';
import type { GlobalKnowledge } from './types';

function normalize(data: Record<string, unknown>): GlobalKnowledge {
  return {
    lessons_learned: (data.lessons_learned as GlobalKnowledge['lessons_learned']) ?? [],
    known_pitfalls: (data.known_pitfalls as GlobalKnowledge['known_pitfalls']) ?? [],
    watch_for: (data.watch_for as string[]) ?? [],
  };
}

export function getGlobalKnowledge(): GlobalKnowledge {
  const found = readMd(globalKnowledgeFile());
  return found ? normalize(found.data) : { lessons_learned: [], known_pitfalls: [], watch_for: [] };
}

function save(g: GlobalKnowledge): GlobalKnowledge {
  ensureDirs();
  writeMd(globalKnowledgeFile(), { ...g, updated: today() }, '');
  return g;
}

export function appendGlobalLesson(note: string): GlobalKnowledge {
  const g = getGlobalKnowledge();
  g.lessons_learned.push({ date: today(), note });
  return save(g);
}

export function appendGlobalPitfall(note: string): GlobalKnowledge {
  const g = getGlobalKnowledge();
  g.known_pitfalls.push({ date: today(), note });
  return save(g);
}

export function appendGlobalWatchFor(item: string): GlobalKnowledge {
  const g = getGlobalKnowledge();
  g.watch_for.push(item);
  return save(g);
}

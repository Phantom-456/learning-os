#!/usr/bin/env node
// One-off migration: old two-axis content (content/concepts, content/projects,
// content/notes) -> the new five-entity schema (design spec §2). Run once,
// per-instance. No data is deleted — everything old ends up in the new shape.
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const dryRun = process.argv.includes('--dry-run');
const contentDir = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'content';

function migrateConcepts() {
  const dir = path.join(contentDir, 'concepts');
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const file = path.join(dir, f);
    const { data, content } = matter(fs.readFileSync(file, 'utf8'));
    if (data.notes) continue; // already migrated
    data.notes = [];
    if (!dryRun) fs.writeFileSync(file, matter.stringify(content, data), 'utf8');
    n += 1;
  }
  return n;
}

function readNoteBody(relPath) {
  if (!relPath) return null;
  const file = path.join(contentDir, relPath.replace(/^notes\//, 'notes/'));
  if (!fs.existsSync(file)) return null;
  const { content } = matter(fs.readFileSync(file, 'utf8'));
  return content.trim() || null;
}

function migrateProjects() {
  const dir = path.join(contentDir, 'projects');
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const file = path.join(dir, f);
    const { data, content } = matter(fs.readFileSync(file, 'utf8'));
    if (data.checkpoints) continue; // already migrated

    const milestones = Array.isArray(data.milestones) ? data.milestones : [];
    const ordered = [...milestones].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const notes = [];
    const checkpoints = ordered.map((m, i) => {
      const noteBody = readNoteBody(m.app_notes);
      if (noteBody) {
        notes.push({
          id: `note-${m.id}`,
          date: data.updated ?? new Date().toISOString().slice(0, 10),
          text: `[${m.title}]\n${noteBody}`,
        });
      }
      return {
        id: m.id,
        title: m.title,
        depends_on: i === 0 ? [] : [ordered[i - 1].id],
        courses: [],
        concepts: m.concepts ?? [],
        status: m.status ?? 'not_started',
        build: m.build || undefined,
        done_test: m.done_test || undefined,
      };
    });

    const metadata = {};
    if (data.robot) metadata.robot = data.robot;
    if (data.toolchain) metadata.toolchain = data.toolchain;
    if (data.definition_of_done) metadata.definition_of_done = data.definition_of_done;

    const newData = {
      id: data.id,
      title: data.title,
      status: data.status ?? 'in_progress',
      metadata,
      checkpoints,
      notes,
      updated: data.updated ?? new Date().toISOString().slice(0, 10),
    };

    if (!dryRun) fs.writeFileSync(file, matter.stringify(content, newData), 'utf8');
    n += 1;
  }
  return n;
}

const conceptsChanged = migrateConcepts();
const projectsChanged = migrateProjects();
console.log(`${dryRun ? '[dry run] ' : ''}Migrated ${conceptsChanged} concept(s), ${projectsChanged} project(s).`);

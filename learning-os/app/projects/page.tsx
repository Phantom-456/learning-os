import { projectSummaries } from '@/lib/core/indexDb';
import ProjectList from '@/components/ProjectList';

export const dynamic = 'force-dynamic';

export default function ProjectsPage() {
  const projects = projectSummaries();
  return (
    <>
      <div className="page-head">
        <h1>Projects</h1>
        <p>Each roadmap is a dependency graph of checkpoints referencing shared concepts — it never copies them.</p>
      </div>
      <ProjectList projects={projects} />
    </>
  );
}

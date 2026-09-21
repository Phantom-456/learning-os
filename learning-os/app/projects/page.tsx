import { projectSummaries } from '@/lib/db';
import ProjectList from '@/components/ProjectList';

export const dynamic = 'force-dynamic';

export default function ProjectsPage() {
  const projects = projectSummaries();
  return (
    <>
      <div className="page-head">
        <h1>Projects</h1>
        <p>Robots you build. Each roadmap references shared concepts — it never copies them.</p>
      </div>
      <ProjectList projects={projects} />
    </>
  );
}

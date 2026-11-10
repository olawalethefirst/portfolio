import { ProjectEditor } from "@/src/components/cms/ProjectEditor";
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectEditor key={id} id={id} />;
}

import { ProjectEditor } from "@/src/components/cms/ProjectEditor";
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ProjectEditor
      key={id}
      id={id}
      uploadConfig={{
        url: process.env.SUPABASE_URL?.trim() ?? "",
        publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ?? "",
      }}
    />
  );
}

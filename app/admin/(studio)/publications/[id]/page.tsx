import { PublicationEditor } from "@/src/components/cms/PublicationEditor";

export default async function PublicationEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PublicationEditor
      key={id}
      id={id}
      uploadConfig={{
        url: process.env.SUPABASE_URL?.trim() ?? "",
        publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ?? "",
      }}
    />
  );
}

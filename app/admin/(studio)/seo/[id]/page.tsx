import { SeoEditor } from "@/src/components/cms/SeoEditor";

export default async function SeoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SeoEditor key={id} id={id} />;
}

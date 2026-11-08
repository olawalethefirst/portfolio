import { ContactEditor } from "@/src/components/cms/ContactEditor";

export default async function ContactProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContactEditor key={id} id={id} />;
}

import { ErrorPage } from "@/src/components/error-page/ErrorPage";

export default function PublicationNotFound() {
  return (
    <ErrorPage
      title="Publication not found"
      message="This article isn’t available. It may have been unpublished or the link may be wrong."
    />
  );
}

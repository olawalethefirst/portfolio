import { ErrorPage } from "@/src/components/error-page/ErrorPage";

export default function NotFound() {
  return (
    <ErrorPage
      title="Page not found"
      message="The page you’re looking for doesn’t exist or may have moved."
    />
  );
}

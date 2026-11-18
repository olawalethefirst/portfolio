"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

import { ErrorPage } from "@/src/components/error-page/ErrorPage";

export default function Error({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorPage
      title="Something went wrong"
      message="An unexpected problem interrupted this page. Head back home and try again."
    />
  );
}

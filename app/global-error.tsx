"use client"; // Error boundaries must be Client Components

import "./globals.css";

import { useEffect } from "react";

import { ErrorPage } from "@/src/components/error-page/ErrorPage";
import { AppearanceProvider } from "@/src/theme/AppearanceProvider";

// Replaces the root layout, so it brings its own document and styles. Saved
// choices come from cookies the server reads, which this boundary cannot, so
// the provider follows the device here.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" data-theme="chartreuse" data-mode="dark" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <title>Something went wrong</title>
      </head>
      <body className="flex min-h-full flex-col">
        <AppearanceProvider>
          <ErrorPage
            title="The site hit a problem"
            message="Something went wrong while loading the site. Please try again in a moment."
          />
        </AppearanceProvider>
      </body>
    </html>
  );
}

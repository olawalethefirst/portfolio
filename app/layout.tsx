import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { AppearanceProvider } from "@/src/theme/AppearanceProvider";
import { parseAppearance } from "@/src/theme/appearance";
import { DEFAULT_THEME } from "@/src/theme/theme";
import { ToastProvider } from "@/src/components/ui/ToastProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Interactive portfolio and publication previews.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The visitor's explicit choices; the same values seed the client store and
  // render the <html> attributes, so server and client agree on first paint.
  const cookieStore = await cookies();
  const choice = parseAppearance((name) => cookieStore.get(name)?.value);
  return (
    <html
      lang="en"
      data-theme={choice.theme ?? DEFAULT_THEME.theme}
      data-mode={choice.mode ?? DEFAULT_THEME.mode}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppearanceProvider initial={choice}>
          <ToastProvider />
          {children}
        </AppearanceProvider>
      </body>
    </html>
  );
}

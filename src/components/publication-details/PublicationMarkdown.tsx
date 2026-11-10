import { Typography } from "@heroui/react/typography";
import Markdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { remarkPublicationHeadings } from "./publication-headings";

/** Article rendering is shared by the public page and the writing preview. */
export function PublicationMarkdown({ children }: { children: string }) {
  return <Typography.Prose className="flex min-w-0 w-full max-w-none flex-col gap-5 wrap-anywhere [&_img]:h-auto [&_img]:max-w-full [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_h2]:scroll-mt-8 [&_h3]:scroll-mt-8">
    <Markdown skipHtml remarkPlugins={[remarkGfm, remarkPublicationHeadings]}
      urlTransform={(url, key, node) => {
        // The local CMS picker uses raster data URLs until upload integration.
        // Do not allow data URLs in links or executable image formats such as SVG.
        if (node.tagName === "img" && key === "src" && /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(url)) return url;
        return defaultUrlTransform(url) || undefined;
      }}>
      {children}
    </Markdown>
  </Typography.Prose>;
}

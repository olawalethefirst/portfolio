"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MailPen } from "lucide-react";
import { useId, useRef, useSyncExternalStore } from "react";

import { Button } from "@/src/components/ui/Button";
import { PerspectiveGridSection } from "@/src/components/ui/PerspectiveGridSection";
import { SectionContainer } from "@/src/components/ui/SectionContainer";

import { createSummaryReveal } from "./reveal";
import { ABOUT_DEFAULT_CONTENT } from "./about-content";

gsap.registerPlugin(useGSAP);

const motionQuery = "(prefers-reduced-motion: reduce)";

// Server output stays intact; subscribe to live preference changes after hydration.
function subscribeToMotionPreference(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function canAnimate() {
  return typeof window.matchMedia === "function" && !window.matchMedia(motionQuery).matches;
}

function serverCanAnimate() {
  return false;
}

interface AboutCtaSectionProps {
  heading?: string;
  summary?: string;
}

export function AboutCtaSection({
  heading = ABOUT_DEFAULT_CONTENT.heading,
  summary = ABOUT_DEFAULT_CONTENT.biography,
}: AboutCtaSectionProps) {
  const titleId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const animate = useSyncExternalStore(
    subscribeToMotionPreference,
    canAnimate,
    serverCanAnimate,
  );
  useGSAP((context) => {
    if (!animate || !summaryRef.current) return;
    let cancelled = false;
    const setup = context.add("setupReveal", () => {
      if (cancelled || !summaryRef.current) return;
      gsap.registerPlugin(ScrollTrigger);
      const { animation } = createSummaryReveal(summaryRef.current);
      ScrollTrigger.create({
        trigger: summaryRef.current,
        animation,
        start: "clamp(top 85%)",
        end: "clamp(bottom 55%)",
        scrub: true,
        invalidateOnRefresh: true,
      });
    });
    if (document.fonts?.status === "loading") {
      void document.fonts.ready.then(() => setup());
    } else {
      setup();
    }
    return () => { cancelled = true; };
  }, { scope: sectionRef, dependencies: [animate, summary], revertOnUpdate: true });

  return (
    <PerspectiveGridSection ref={sectionRef} gridOpacity={0.2} aria-labelledby={titleId} className="relative flex min-h-dvh items-center bg-surface pt-16 pb-[var(--navigation-bottom-clearance)] lg:pt-28">
      <SectionContainer>
        <h2 id={titleId} className="mb-2 text-center text-sm font-medium text-muted lg:mb-3">
          {heading}
        </h2>
        <div className="mx-auto max-w-[36ch] text-[clamp(1.25rem,1.5vw,1.5rem)]">
          <p ref={summaryRef} className="text-justify leading-[1.35] font-medium tracking-tight whitespace-pre-wrap [overflow-wrap:anywhere]">
            {summary}
          </p>
          <div className="mt-5 flex justify-center">
            <Button
              href="/contact"
              startContent={<MailPen aria-hidden="true" className="size-5 shrink-0" />}
              size="md"
              variant="outline"
            >
              Start a conversation
            </Button>
          </div>
        </div>
      </SectionContainer>
    </PerspectiveGridSection>
  );
}

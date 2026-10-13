"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MailPen } from "lucide-react";
import { useId, useRef, useSyncExternalStore } from "react";

import { Button } from "@/src/components/ui/Button";
import { SectionContainer } from "@/src/components/ui/SectionContainer";

import { createSummaryReveal } from "./reveal";

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
  summary?: string;
}

export function AboutCtaSection({
  summary = "I bring ideas to life through thoughtful design and careful engineering. My work connects what people need with what technology can make possible. From early exploration to finished experiences, I turn complex problems into clear, useful interfaces. I care about the details that make digital products feel intuitive, accessible, and a pleasure to use.",
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
    <section ref={sectionRef} aria-labelledby={titleId} className="bg-surface py-16 lg:py-28">
      <SectionContainer>
        <h2 id={titleId} className="mb-8 text-center text-sm font-medium text-muted lg:mb-10">
          About me
        </h2>
        <div className="mx-auto max-w-[36ch] text-[clamp(1.25rem,2.5vw,2.25rem)]">
          <p ref={summaryRef} className="text-center leading-[1.35] font-medium tracking-tight whitespace-pre-wrap [overflow-wrap:anywhere]">
            {summary}
          </p>
          <div className="mt-8 flex justify-center lg:mt-12">
            <Button
              startContent={<MailPen aria-hidden="true" className="size-5 shrink-0" />}
              size="lg"
              variant="outline"
            >
              Start a conversation
            </Button>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}

import type { Metadata } from "next";
import { PublicationComments } from "@/src/components/publication-comments/PublicationComments";

import {
  PublicationDetails,
  type PublicationDetailsData,
} from "@/src/components/publication-details";

import { LabThemeShell } from "../LabThemeShell";
import { PublicationDetailsLabActionBar } from "./PublicationDetailsLabActionBar";
import { sampleComments } from "./sample-comments";

export const metadata: Metadata = {
  description:
    "A publication details layout lab for long-form, Markdown-authored writing.",
  title: "Publication Details Lab",
};

const bodyMarkdown = [
  "The most difficult product decisions are rarely the ones people can see. They live in ranking rules, defaults, thresholds, permissions, and handoffs—the quiet machinery that shapes what a person can do without ever appearing in the interface.",
  "",
  "When that machinery is invisible, trust becomes fragile. A surprising result feels arbitrary, a denied action feels personal, and a changing recommendation feels impossible to question. The answer is not to expose every implementation detail. It is to make the decisions that affect people legible enough to understand and contest.",
  "",
  "## Trust begins with legibility",
  "",
  "Legibility means a person can form a useful explanation of what happened. They do not need the complete model, but they should be able to answer three practical questions:",
  "",
  "1. What influenced this outcome?",
  "2. What can I do next?",
  "3. Where can I challenge or correct it?",
  "",
  "A system that answers only the first question is informative but passive. A system that answers only the second can feel procedural and evasive. Trust grows when explanation and agency arrive together.",
  "",
  "> Transparency is useful only when the information is understandable and connected to a meaningful next action.",
  "",
  "### Show the decision boundary",
  "",
  "Teams often begin by explaining the algorithm. That is usually the wrong level. People care less about the internal machinery than the boundary around the decision: which information mattered, which information did not, and whether the outcome can change.",
  "",
  "A concise decision record might describe the current `decisionState`, the evidence that informed it, and the next available review point.",
  "",
  "```ts",
  "const decisionState = {",
  '  status: "reviewable",',
  '  reason: "Two required signals are still missing",',
  '  nextAction: "Add evidence or request a review",',
  "};",
  "```",
  "",
  "The object is simple on purpose. The interface should communicate the same clarity without requiring someone to read code.",
  "",
  "![A wireframe showing information grouped into clear decision stages](/prism-assets/wireframe.svg)",
  "",
  "## Design explanations around moments of doubt",
  "",
  "Not every decision needs the same amount of explanation. Persistent guidance around obvious actions creates noise, while a silent system at a consequential moment creates anxiety. The useful question is: *where is uncertainty expensive?*",
  "",
  "Those moments commonly include:",
  "",
  "- an automated recommendation that changes unexpectedly;",
  "- a permission or eligibility decision;",
  "- a handoff where ownership becomes unclear;",
  "- a destructive action that cannot be easily reversed; and",
  "- a result assembled from several sources with different confidence levels.",
  "",
  "The interface can remain quiet elsewhere. Concentrating explanation at these boundaries gives people support without turning every screen into documentation.",
  "",
  "## Match evidence to consequence",
  "",
  "The depth of explanation should rise with the consequence of the decision. A lightweight suggestion may need only a short rationale. A decision that affects access, money, reputation, or safety needs traceable evidence and a clear path to review.",
  "",
  "| Consequence | Useful explanation | Required action |",
  "| --- | --- | --- |",
  "| Low | Brief reason | Dismiss or adjust |",
  "| Medium | Key signals and confidence | Correct inputs |",
  "| High | Evidence, ownership, and history | Request human review |",
  "",
  "This proportional approach prevents two common failures: overwhelming people with detail when little is at stake, and offering polished but empty reassurance when the outcome genuinely matters.",
  "",
  "## Make accountability visible",
  "",
  "A trustworthy system makes ownership discoverable. People should know whether an outcome came from a policy, an automated rule, a team decision, or their own configuration. That distinction changes how they interpret the result and where they go for help.",
  "",
  "This does not require exposing individual employees or internal conversations. It requires naming the responsible layer clearly and linking to the appropriate correction path. The [DEV editor guide](https://dev.to/p/editor_guide/) follows a similar principle for authored content: the structure stays predictable while the writer controls the substance.",
  "",
  "### Preserve the path back",
  "",
  "Decisions become easier to trust when they are not presented as irreversible facts. Preserve the inputs, the rationale, and the next review point. When circumstances change, people can understand whether the system should change with them.",
  "",
  "## A practical review",
  "",
  "Before shipping an invisible decision, review the experience from the affected person's point of view:",
  "",
  "- [x] The outcome is stated plainly.",
  "- [x] The important evidence is visible.",
  "- [x] Uncertainty is acknowledged where it matters.",
  "- [ ] The correction or appeal path has been tested with real users.",
  "",
  "The goal is not perfect transparency. It is dependable orientation: enough context to understand the present decision, enough agency to respond, and enough continuity to trust what happens next.",
].join("\n");

const publication = {
  bodyMarkdown,
  cover: {
    alt: "Layered green geometric forms crossed by a chartreuse beam",
    src: "/publication-cover.svg",
  },
  publishedAt: "2026-09-18",
  readingTimeMinutes: 8,
  tags: ["Product strategy", "Systems thinking", "Research"],
  title: "Designing for trust in invisible systems",
} satisfies PublicationDetailsData;

export default function PublicationDetailsLabPage() {
  return (
    <LabThemeShell>
      <main className="relative min-h-screen pb-32">
        <div className="absolute inset-x-0 top-0 z-10 mx-auto w-full max-w-6xl px-5  sm:px-8 lg:px-12">
          <PublicationDetailsLabActionBar />
        </div>
        <PublicationDetails publication={publication} />
        <PublicationComments initialThreads={sampleComments} />
      </main>
    </LabThemeShell>
  );
}

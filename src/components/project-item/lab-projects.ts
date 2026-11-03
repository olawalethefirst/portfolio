import type { ProjectItemProps } from "./ProjectItem";

export const labProjects: ReadonlyArray<
  Omit<ProjectItemProps, "className" | "stackIndex">
> = [
  {
    id: "field-notes",
    liveHref: "https://example.com/field-notes",
    modelEntryRotation: {
      initial: [0, Math.PI / 2, 0],
      visible: [0, 0, 0],
    },
    name: "Field Notes",
    platform: "mobile",
    screenTextureSrc: "/dummy_project_mobile.webp",
    what:
      "A mobile workspace for distributed teams to capture decisions, retain their context, and share updates while work is in motion. It gives teammates a shared record they can return to when they need to understand what was decided.",
    how:
      "Demo architecture: a mobile client would connect to an API for storing notes and team access. A shared data service would keep decisions available across devices, while notifications would bring relevant updates back to teammates. These technical details are illustrative, pending confirmation.",
    summary:
      "A calmer way for distributed teams to capture decisions while work is still in motion.",
  },
  {
    id: "relay",
    liveHref: "https://example.com/relay",
    modelEntryRotation: {
      initial: [0, 0, 0],
      visible: [0, -Math.PI / 2, 0],
    },
    name: "Relay",
    platform: "web",
    screenTextureSrc: "/dummy_project.webp",
    what:
      "An operations workspace that helps teams coordinate handoffs and track work across shared processes. It brings responsibilities and progress into one view so people can see what needs attention and who takes the next step.",
    how:
      "Demo architecture: a web dashboard would connect to backend services that manage workflows, assignments, and progress. Shared storage would retain the operational record, while background jobs would deliver updates. These technical details are illustrative, pending confirmation.",
    summary:
      "A shared operations workspace that turns complex handoffs into visible, dependable progress.",
  },
];

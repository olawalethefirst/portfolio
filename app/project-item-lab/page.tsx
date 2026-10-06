import type { Metadata } from "next";

import {
  ProjectItem,
  type ProjectItemProps,
} from "@/src/components/project-item";

import { LabThemeShell } from "../LabThemeShell";
import { ProjectItemLabPreloads } from "./ProjectItemLabPreloads";

export const metadata: Metadata = {
  title: "Project Item Lab",
};

const projects: ReadonlyArray<
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
    solutions: ["Product strategy", "Mobile UX"],
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
    solutions: ["Design systems", "Frontend engineering"],
    summary:
      "A shared operations workspace that turns complex handoffs into visible, dependable progress.",
  },
];

export default function ProjectItemLabPage() {
  return (
    <>
      <ProjectItemLabPreloads />
      <LabThemeShell initialMode="dark" initialTheme="forest">
        <main>
          {projects.map((project, index) => (
            <ProjectItem
              {...project}
              key={project.id}
              stackIndex={index + 1}
            />
          ))}
        </main>
      </LabThemeShell>
    </>
  );
}

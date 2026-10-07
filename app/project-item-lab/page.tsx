import type { Metadata } from "next";

import { ProjectItem } from "@/src/components/project-item";
import { labProjects } from "@/src/components/project-item/lab-projects";

import { LabThemeShell } from "../LabThemeShell";
import { ProjectItemLabPreloads } from "./ProjectItemLabPreloads";

export const metadata: Metadata = {
  title: "Project Item Lab",
};

export default function ProjectItemLabPage() {
  return (
    <>
      <ProjectItemLabPreloads />
      <LabThemeShell initialTheme="forest" initialMode="dark">
        <main>
          {labProjects.map((project, index) => (
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

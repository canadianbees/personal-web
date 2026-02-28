import React from "react";
import ProjectCard from "./ProjectCard";
import { HyperText } from "@/components/ui/hyper-text";

const Projects = () => {
  return (
    <div
      className="flex flex-col items-center justify-center py-20"
      id="projects"
    >
      <HyperText duration={2500} textCase="lower" className=" z-21 text-[60px] font-bold  text-yellow-300 py-20">
        My Projects
      </HyperText>
      <div className="h-full w-full flex flex-col md:flex-row gap-10 px-10 z-21">
        {/* <ProjectCard
          src="/NextWebsite.png"
          title="Modern Next.js Portfolio"
          description="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
        /> */}
        <ProjectCard
          src="/ls/curve_editor.gif"
          title="Curve in Materials and VFX in Lens Studio"
          description="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
        />
        
         <ProjectCard
          src="/acr/github_logo.png"
          title="Automated Code Review Bot"
          description="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
        />
         <ProjectCard
          src="/anthem/anthem_login.png"
          title="Anthem - a music sharing social media app"
          description="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
        />
        <ProjectCard
          src="/paradise pages/pp_home.png"
          title="Paradise Pages - a tropical themed contact book"
          description="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
        />
      </div>
    </div>
  );
};

export default Projects;
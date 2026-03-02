import React from "react";
import ProjectCard from "./ProjectCard";
import { HyperText } from "@/components/ui/hyper-text";

const Projects = () => {
  return (
       <div id="projects" className="flex flex-col items-center py-20 w-full">
      <HyperText
        duration={2500}
        textCase="lower"
        className="
          z-21
          py-20
          text-[60px] font-bold text-yellow-300
        "
      >
        My Projects
      </HyperText>
      <div className="flex flex-row flex-wrap justify-center gap-6 px-10 w-full">
        <ProjectCard
          src="/ls/curve_editor.gif"
          title="Curve in Materials and VFX in Lens Studio"
          link="https://developers.snap.com/lens-studio/features/graphics/curves-in-materials-and-vfx"
          description="One of my first projects at Snap, I built backend infrastructure to support curve-driven parameter evaluation across Lens Studio's rendering systems. I extended Lens Studio's internal data models and configuration pipelines so that the Materials and VFX systems could evaluate curves consistently, enabling time-based parameter interpolation to propagate across rendering components in real time. Lens Studio is an application used by 375,000+ creators  and I am so proud of myself for shipping such a highly requested feature with the minimal experience and knowledge I had on game engines."
        />

        <ProjectCard
          src="/acr/github_logo.png"
          title="Automated Code Review Bot"
          description="At Trellix, I built a GitHub-based code review bot triggered by pull requests using GitHub Workflows. 
                      Powered by Gemini 1.5 Pro with a 1M-token context window, the bot analyzes dependent files across head and base branches to assess change impact and detect potential breaking issues.
                      It supports multi-language repositories (Python, LookML) and dynamically enforces best practices—running additional DAG-specific checks when applicable. 
                      The bot also flags unused variables, evaluates comment quality, suggests readability improvements, and automatically tags branches upon merge."
        />

        <ProjectCard
          src="/acr/github_logo.png"
          title="Artificial Cognitive Entity for Enterprise (ACEE)"
          link="https://github.com/Artificial-Cognitive-Entity/acee-api"
          description="ACEE was a cloud-native, event-driven ETL platform. I worked on this project during my senior year of college along with 4 other students. ACEE was built to solve a problem every large organization faces: important documents and knowledge scattered across dozens of platforms like Confluence, Google Drive, and Jira with no unified way to find them. ACEE ingested unstructured data from these sources, normalized it, extracted metadata, and generated vector embeddings . This enabled semantic search through RAG (Retrieval-Augmented Generation) so users can find what they need by meaning, not just keywords. The system is fully serverless, orchestrated through Google Cloud services including Cloud Scheduler, Cloud Functions, Cloud Storage, and Pub/Sub, with structured data and embeddings persisted in a relational schema. A RESTful API layer exposed search, retrieval, and allowed user to chat with their documents through the use of OpenAI's GPT-3.5."
        />
        <ProjectCard
          src="/anthem/anthem_login.png"
          title="Anthem - a music sharing social media app"
          link="https://github.com/npro1001/cop4331-large-project"
          description="Anthem was a music-sharing social media platform I built as a junior in college as part of a 9 person team. We developed a full-stack web and mobile application where users could discover and share music powered by the Spotify API, with features including account creation, email verification, and password reset. The web app was built with React and Node.js/Express backed by MongoDB, while the mobile app was developed cross-platform using Flutter and Dart. I worked on the frontend for this probject and while my focus has since shifted to backend engineering, this project reflects my early full-stack experience and ability to collaborate on large team projects."
        />
      </div>
    </div>
  );
};

export default Projects;

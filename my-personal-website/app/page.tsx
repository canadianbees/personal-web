"use client"
import Hero from "@/components/main/hero/Hero"
import VideoContainer from "@/components/main/background/VideoContainer"
import Projects from "@/components/main/projects/Projects"
import Resume from "@/components/main/resume/Resume"
import Navbar from "@/components/main/navigation/Navbar"
import SpotifySection from "@/components/main/music/SpotifySection"
import PhotoGallery from "@/components/main/photography/Photos"



export default function Home() {
  return (
    <main className="relative w-screen h-screen overflow-x-hidden overflow-y-scroll snap-y snap-mandatory">
      <VideoContainer />
      <Navbar />
      <div id="home" className="snap-start min-h-screen">
        <Hero />
      </div>
      <div id="experience" className="snap-start min-h-screen flex flex-col items-center">
        <Resume />
      </div>
      <div id="projects" className="snap-start min-h-screen">
        <Projects />
      </div>
      <div id="music" className="snap-start min-h-screen z-30">
        <SpotifySection/>
      </div>
      <div id="photo" className="snap-start min-h-screen z-30">
        <PhotoGallery />
      </div>
    </main>
  )
}
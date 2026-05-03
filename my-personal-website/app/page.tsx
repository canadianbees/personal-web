import Hero from "@/components/main/hero/Hero"
import VideoContainer from "@/components/main/background/VideoContainer"
import Projects from "@/components/main/projects/Projects"
import Resume from "@/components/main/resume/Resume"
import Navbar from "@/components/main/navigation/Navbar"
import SpotifySection from "@/components/main/music/SpotifySection"
import PhotoGallery from "@/components/main/photography/Photos"
import EventsPreview from "@/components/EventsPreview"



export default function Home() {
  return (
    <main className="relative w-screen h-dvh overflow-x-hidden overflow-y-scroll snap-y snap-mandatory">
      <VideoContainer />
      <Navbar />
      <div id="home" className="snap-start min-h-dvh">
        <Hero />
      </div>
      <div id="experience" className="snap-start min-h-dvh flex flex-col items-center">
        <Resume />
      </div>
      <div id="projects" className="snap-start min-h-dvh">
        <Projects />
      </div>
      <div id="music" className="snap-start min-h-dvh">
        <SpotifySection/>
      </div>
      <div id="photo" className="snap-start min-h-dvh">
        <PhotoGallery />
      </div>
      <div id="events" className="snap-start min-h-dvh flex items-center justify-center">
        <EventsPreview />
      </div>
    </main>
  )
}
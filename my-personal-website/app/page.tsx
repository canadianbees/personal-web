import Hero from "@/components/main/hero/Hero";
import VideoContainer from "@/components/main/background/VideoContainer";
import Image from "next/image";
import Projects from "@/components/main/projects/Projects";
import Resume from "@/components/main/resume/Resume";

export default function Home() {
  return (
    <main className='relative w-screen min-h-scree overflow-x-hidden'>
        <VideoContainer/>
       <div className='relative w-full overflow-x-hidde'>
            <Hero/>
            <Resume/>
            <Projects/>
          
       </div>
       
   
    </main>
   
  )
}

import { Marquee } from "@/components/ui/marquee"
import { ScrollVelocityContainer, ScrollVelocityRow } from "@/components/ui/scroll-based-velocity"
import { cn } from "@/lib/utils"


const resume_items = [
  {
    name: "University of Central Florida",
    dates: "June 2020 - May 2024",
    body: "Bachelors in Computer Science\nMinor in Math, International Engineering, and Political Science",
    img:( <img
  src="/UCF_Knights_logo.svg"
  width="70"
  height="70"
  alt="BigQuery"
/>),
  },
  {
    name: "UCF Renew Lab",
    dates: "Jan 2024 - May 2024",
    body: "AI research assistant at UCF's Renew Lab. Built a GPT-3.5 powered chatbot that analyzed and gave feedback on student-written code",
     img:( <img
  src="/UCF-CECS.jpg"
  width="70"
  height="70"
  alt="BigQuery"
/>),

  },
  {
    name: "Trellix",
    dates: "May 2024 - August 2024",
    body: "Software engineering intern at Trellix. Built a GitHub AI code review bot powered by Gemini 1.5 Pro that automatically reviewed pull requests and enforced best practices across multi-language repositories.",
    img:( <img
  src="/Trellix_Logo.svg"
  width="100"
  height="100"
  alt="BigQuery"
/>),
  },
  {
    name: "Snap Inc.",
    dates: "August 2024 - Present",
    body: "Game Engine Team, Growth Web Team, Media Delivery Platform Team",
    img:( <img
  src="/snapchat.svg"
  width="70"
  height="70"
  alt="BigQuery"
/>),
  },
  
]

const ResumeCard = ({
  img,
  name,
  dates,
  body,
}: {
  img: React.ReactNode
  name: string
  dates: string
  body: string
}) => {
  return (
    <figure
      className={cn(
        "relative h-full xs:w-10 md:w-125 cursor-pointer overflow-hidden rounded-xl border p-4 bg-white/5 border-white/5 backdrop-blur-md text-white p-3"
      )}
    >
      <div className="flex flex-row items-center gap-2">
       {img}
        <div className="flex flex-col">
          <figcaption className="text-sm font-medium dark:text-white">
            {name}
          </figcaption>
          <p className="text-xs font-medium dark:text-white/40">{dates}</p>
        </div>
      </div>
      <blockquote className="mt-2 text-sm">{body}</blockquote>
    </figure>
  )
}
function Resume() {
  return (
    <>

 {/* Mobile - vertical */}
<div className="relative flex md:hidden flex-row w-full h-screen overflow-hidden">
  
  {/* Scrolling title on the left */}
  <div className="w-10 h-full overflow-hidden">
    <Marquee repeat={10} vertical className="-translate-y-100 text-2xl text-yellow-300 [--duration:5s] font-bold" innerClassName="[writing-mode:vertical-rl] rotate-180">
       experience at a glance&nbsp;&nbsp;•&nbsp;&nbsp;
    </Marquee>

  </div>

  {/* Cards on the right */}
  <div className="relative flex-1 overflow-hidden">
    <Marquee pauseOnHover vertical className="[--duration:15s]" >
      {resume_items.map((card) => <ResumeCard key={card.dates} {...card} />)}
    </Marquee>
  </div>
</div>


      {/* Desktop */}
<div className="hidden md:flex flex-col justify-center min-h-screen w-full  z-21">
  <div className="mt-20 w-full text-center overflow-hidden">
    <ScrollVelocityContainer className="text-5xl font-bold tracking-[-0.02em] md:text-7xl md:leading-20">
      <ScrollVelocityRow className="text-yellow-300" baseVelocity={20} direction={-1}>
        experience at a glance&nbsp;&nbsp;•&nbsp;&nbsp;
      </ScrollVelocityRow>
    </ScrollVelocityContainer>
  </div>

  <div className="relative flex flex-col h-full w-full overflow-hidden">
    <Marquee pauseOnHover className="[--duration:20s]">
      {resume_items.map((card) => <ResumeCard key={card.dates} {...card} />)}
    </Marquee>
    <div className="pointer-events-none absolute inset-y-0 left-0 w-1/8 bg-linear-to-r from-black to-transparent" />
    <div className="pointer-events-none absolute inset-y-0 right-0 w-1/8 bg-linear-to-l from-black to-transparent" />
  </div>
</div>
    </>
  )
}
export default  Resume;
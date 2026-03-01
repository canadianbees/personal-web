import { Marquee } from "@/components/ui/marquee"
import { ScrollVelocityContainer, ScrollVelocityRow } from "@/components/ui/scroll-based-velocity"
import { cn } from "@/lib/utils"


const reviews = [
  {
    name: "University of Central Florida",
    username: "June 2020 - May 2024",
    body: "Bachelors in Computer Science\nMinor in Math, International Engineering, and Political Science",
    img:( <img
  src="/UCF_Knights_logo.svg"
  width="70"
  height="70"
  alt="BigQuery"
/>),
  },
  {
    name: "Snap Inc.",
    username: "August 2024 - Present",
    body: "Scenarium Team, Growth Web Team, Media Delivery Platform Team",
    img:( <img
  src="/snapchat.svg"
  width="70"
  height="70"
  alt="BigQuery"
/>),
  },
  {
    name: "UCF Renew Lab",
    username: "Jan 2024 - May 2024",
    body: "AI Research Assistant",
     img:( <img
  src="/UCF-CECS.jpg"
  width="70"
  height="70"
  alt="BigQuery"
/>),

  },
  {
    name: "Trellix",
    username: "May 2024 - August 2024",
    body: "Software Engineer Intern",
    img:( <img
  src="/Trellix_Logo.svg"
  width="70"
  height="70"
  alt="BigQuery"
/>),
  },
  
]

const ResumeCard = ({
  img,
  name,
  username,
  body,
}: {
  img: React.ReactNode
  name: string
  username: string
  body: string
}) => {
  return (
    <figure
      className={cn(
        "relative h-full xs:w-10 md:w-125 cursor-pointer overflow-hidden rounded-xl border p-4bg-white/5 border-white/5 backdrop-blur-md text-white p-3"
      )}
    >
      <div className="flex flex-row items-center gap-2">
       {img}
        <div className="flex flex-col">
          <figcaption className="text-sm font-medium dark:text-white">
            {name}
          </figcaption>
          <p className="text-xs font-medium dark:text-white/40">{username}</p>
        </div>
      </div>
      <blockquote className="mt-2 text-sm">{body}</blockquote>
    </figure>
  )
}

function Resume() {
  return (
<>
    <div  className="mt-20 w-full text-center overflow-hidden">
        <ScrollVelocityContainer className="text-4xl font-bold tracking-[-0.02em] md:text-7xl md:leading-20">
        <ScrollVelocityRow  className="text-yellow-300" baseVelocity={20} direction={-1}>experience at a glance&nbsp;&nbsp;•&nbsp;&nbsp;
</ScrollVelocityRow>
      </ScrollVelocityContainer>
    </div>
    <div className="relative flex flex-col h-full w-full overflow-hidden z-21">
        
      <Marquee pauseOnHover className="[--duration:20s]">
        {reviews.map((cards) => (
          <ResumeCard key={cards.username} {...cards} />
        ))}
      </Marquee>
      {/* <Marquee repeat={10} reverse pauseOnHover className="[--duration:20s]">
        {secondRow.map((review) => (
          <ResumeCard key={review.username} {...review} />
        ))}
      </Marquee> */}
<div className="pointer-events-none absolute inset-y-0 left-0 w-1/8 bg-linear-to-r from-black to-transparent"></div>
<div className="pointer-events-none absolute inset-y-0 right-0 w-1/8 bg-linear-to-l from-black to-transparent"></div>
    </div>
    </>
  )
};

export default  Resume;
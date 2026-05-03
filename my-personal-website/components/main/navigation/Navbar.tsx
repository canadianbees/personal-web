"use client"
import { motion } from "motion/react"

const sections = [
  { label: "home", shortLabel: "home", href: "#home" },
  { label: "experience", shortLabel: "exp.", href: "#experience" },
  { label: "projects", shortLabel: "proj.", href: "#projects" },
  { label: "music", shortLabel: "music", href: "#music" },
  { label: "photography", shortLabel: "photos", href: "#photo" },
]

const externalLinks = [
  { label: "event wall", shortLabel: "events", href: "/event/demo/wall" },
]

const linkClass = "font-mono text-white/60 hover:text-yellow-300 transition-colors duration-200 whitespace-nowrap"
const pillClass = "rounded-full backdrop-blur-md bg-white/5 border border-white/10"

const Navbar = () => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    const target = document.querySelector(href)
    if (target) {
      target.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 20, stiffness: 150 }}
      className="fixed top-0 left-0 right-0 z-50 flex justify-center py-4 px-4"
    >
      {/* Mobile (<768px) */}
      <div className={`${pillClass} md:hidden flex gap-1 px-5 py-2 text-[10px]`}>
        {sections.map(({ shortLabel, href }) => (
          <a key={href} href={href} onClick={(e) => handleClick(e, href)} className={`${linkClass} py-2 px-0.5`}>
            {shortLabel}
          </a>
        ))}
        <span className="text-white/20 py-2">|</span>
        {externalLinks.map(({ shortLabel, href }) => (
          <a key={href} href={href} className={`${linkClass} py-2 px-0.5`}>{shortLabel}</a>
        ))}
      </div>

      {/* Desktop (≥768px) */}
      <div className={`${pillClass} hidden md:flex gap-4 px-5 py-3 text-xs lg:text-sm`}>
        {sections.map(({ label, href }) => (
          <a key={href} href={href} onClick={(e) => handleClick(e, href)} className={linkClass}>
            {label}
          </a>
        ))}
        <span className="text-white/20">|</span>
        {externalLinks.map(({ label, href }) => (
          <a key={href} href={href} className={linkClass}>{label}</a>
        ))}
      </div>
    </motion.nav>
  )
}

export default Navbar

"use client"
import { motion } from "motion/react"

const sections = [
  { label: "home", href: "#home" },
  { label: "experience", href: "#experience" },
  { label: "projects", href: "#projects" },
  { label: "music", href: "#music" },
  { label: "photography", href: "#photo" }

]

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
      <div className="relative flex gap-4 px-5 py-3 text-xs lg:text-sm justify-center rounded-full backdrop-blur-md bg-white/5 border border-white/10 max-w-full scrollbar-none">
        {sections.map(({ label, href }) => (
          <a
            key={href}
            href={href}
            onClick={(e) => handleClick(e, href)}
            className="font-mono text-white/60 hover:text-yellow-300 transition-colors duration-200 whitespace-nowrap"
          >
            {label}
          </a>
        ))}
      </div>
    </motion.nav >
  )
}

export default Navbar
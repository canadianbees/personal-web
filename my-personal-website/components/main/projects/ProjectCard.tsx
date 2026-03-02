"use client"
import Image from "next/image"
import React, { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { HyperText } from "@/components/ui/hyper-text"

interface Props {
  src: string
  title: string
  description: string
  link?: string
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const modalVariants = {
  hidden: { scale: 0.3, opacity: 0, y: 40 },
  visible: { scale: 1, opacity: 1, y: 0 },
  exit: { scale: 0.8, opacity: 0, y: 20 },
}

const modalTransition = {
  type: "spring" as const,
  damping: 18,
  stiffness: 120,
  mass: 0.8,
}

const cardHoverVariants = {
  rest: {
    scale: 1,
    rotateY: 0,
    y: 0,
    boxShadow: "0 0px 0px rgba(0,0,0,0)",
  },
  hover: {
    scale: 1.05,
    rotateY: 4,
    y: -8,
    boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
  },
}

const cardTransition = {
  type: "spring" as const,
  damping: 100,
  stiffness: 500,
  mass: 1,
}


const Card = ({ src, title, description, onClick }: Props & { onClick: () => void }) => {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      onClick={onClick}
      variants={cardHoverVariants}
      initial="rest"
      whileHover="hover"
      transition={cardTransition}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={`
        ${hovered ? "rainbow-border-active" : ""}
        rainbow-border
        relative flex flex-col
        w-80 h-96
        font-mono rounded-lg shadow-lg backdrop-blur-lg
        cursor-pointer overflow-hidden
        z-25
      `}
    >
      <div className="relative w-full h-48 shrink-0 overflow-hidden bg-white/5">
        <Image src={src} alt={title} fill className="object-cover" />
      </div>

      <div className="p-4 flex flex-col flex-1 overflow-hidden gap-1">
        <HyperText className="text-base font-semibold text-white line-clamp-2 h-14">
          {title}
        </HyperText>
        <p className="mt-2 text-gray-400 text-xs line-clamp-3">{description}</p>
        <p className="mt-auto pt-2 text-xs text-white/40">click to read more →</p>
      </div>
    </motion.div>
  )
}


const Modal = ({ src, title, description, link, onClose }: Props & { onClose: () => void }) => (
  <motion.div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    variants={backdropVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
    onClick={onClose}
  >
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

    <motion.div
      className="
        relative z-10
        bg-[#0a0a0a]/90 border border-white/10
        rounded-2xl shadow-2xl
        max-w-2xl w-full max-h-[85vh] overflow-y-auto
      "
      variants={modalVariants}
      transition={modalTransition}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative w-full h-56">
        <Image src={src} alt={title} fill className="object-cover rounded-t-2xl" />
      </div>

      <div className="p-6">
        <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
          {description}
        </p>

        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="
              inline-block mt-6 px-4 py-2 rounded-lg
              bg-white/10 hover:bg-white/20
              text-white text-sm
              transition-colors duration-200
            "
          >
            View Project →
          </a>
        )}
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        className="
          absolute top-4 right-4
          w-8 h-8 rounded-full
          flex items-center justify-center
          bg-black/40 text-white/60 hover:text-white
          text-xl font-bold transition-colors
        "
      >
        ✕
      </button>
    </motion.div>
  </motion.div>
)


const ProjectCard = (props: Props) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Card {...props} onClick={() => setOpen(true)} />

      <AnimatePresence>
        {open && <Modal {...props} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  )
}

export default ProjectCard
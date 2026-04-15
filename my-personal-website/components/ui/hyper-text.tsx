"use client"

import { useEffect, useRef, useState } from "react"
import { motion, MotionProps } from "motion/react"

const MotionDiv = motion.create("div", { forwardMotionProps: true })

import { cn } from "@/lib/utils"

type CharacterSet = string[] | readonly string[]

interface HyperTextProps extends MotionProps {
  children: string
  className?: string
  duration?: number
  as?: React.ElementType
  characterSet?: CharacterSet
  textCase?: "upper" | "lower" | "default"
}

const DEFAULT_CHARACTER_SET = Object.freeze(
  "ABCDEFGHIJKLMNOPQRSTUV~!@#$%^&*()<>,./?;'{}WXYZ".split("")
) as readonly string[]

const getRandomInt = (max: number): number => Math.floor(Math.random() * max)

const scrambleText = (text: string, characterSet: CharacterSet): string[] =>
  text.split("").map((letter) =>
    letter === " " ? " " : characterSet[getRandomInt(characterSet.length)]
  )

export function HyperText({
  children,
  className,
  duration = 800,
  as: Component = "div",
  characterSet = DEFAULT_CHARACTER_SET,
  textCase = "upper",
  ...props
}: HyperTextProps) {
  const [mounted, setMounted] = useState(false)
  const [displayText, setDisplayText] = useState<string[]>(() =>
    children.split("")
  )
  const [isUnscrambled, setIsUnscrambled] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const iterationCount = useRef(0)
  const elementRef = useRef<HTMLElement>(null)

  useEffect(() => { setMounted(true) }, [])

  const handleMouseEnter = () => {
    if (isUnscrambled || isAnimating) return
    iterationCount.current = 0
    setIsAnimating(true)
  }

  useEffect(() => {
    if (!isAnimating) return

    const startTime = performance.now()
    let animationFrameId: number

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      iterationCount.current = progress * children.length

      setDisplayText(
        children.split("").map((letter, index) =>
          letter === " "
            ? " "
            : index <= iterationCount.current
              ? children[index]
              : characterSet[getRandomInt(characterSet.length)]
        )
      )

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate)
      } else {
        setDisplayText(children.split(""))
        setIsAnimating(false)
        setIsUnscrambled(true)
      }
    }

    animationFrameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrameId)
  }, [isAnimating, children, duration, characterSet])

  if (!mounted) {
    return (
      <div className={cn("overflow-hidden py-2 text-4xl font-bold", className)}>
        {textCase === "upper" ? children.toUpperCase() : textCase === "lower" ? children.toLowerCase() : children}
      </div>
    )
  }

  return (
    <MotionDiv
      ref={elementRef as React.RefObject<HTMLDivElement>}
      className={cn("overflow-hidden py-2 text-4xl font-bold", className)}
      onMouseEnter={handleMouseEnter}
      {...props}
    >
      {displayText.map((letter, index) => (
        <motion.span
          key={index}
          className={cn(letter === " " ? "w-3" : "")}
        >
          {textCase === "upper"
            ? letter.toUpperCase()
            : textCase === "lower"
            ? letter.toLowerCase()
            : letter}
        </motion.span>
      ))}
    </MotionDiv>
  )
}
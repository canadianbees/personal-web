"use client"
import dynamic from "next/dynamic"
import { useState, useEffect } from "react"

const StarsCanvas = dynamic(
  () => import("@/components/main/background/StarBackground"),
  { ssr: false }
)

export default function StarBackgroundClient() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Defer Three.js past initial paint — only load during browser idle time
    // Falls back to a 2.5s timeout on browsers without requestIdleCallback
    const cb = () => setMounted(true)
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number })
        .requestIdleCallback(cb, { timeout: 3000 })
      return () => (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id)
    } else {
      const id = setTimeout(cb, 2500)
      return () => clearTimeout(id)
    }
  }, [])

  if (!mounted) return null
  return <StarsCanvas />
}

"use client"
import dynamic from "next/dynamic"

const StarsCanvas = dynamic(
  () => import("@/components/main/background/StarBackground"),
  { ssr: false }
)

export default function StarBackgroundClient() {
  return <StarsCanvas />
}

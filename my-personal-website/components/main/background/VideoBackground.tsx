"use client"
import { usePathname } from "next/navigation"
import VideoContainer from "./VideoContainer"

export default function VideoBackground() {
  const pathname = usePathname()
  if (pathname.endsWith("/wall")) return null
  return <VideoContainer />
}

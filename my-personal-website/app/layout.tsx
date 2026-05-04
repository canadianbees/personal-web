import type { Metadata } from "next";
import { Geist, Geist_Mono, Cedarville_Cursive } from "next/font/google";
import "./globals.css";
import StarBackgroundClient from "@/components/main/background/StarBackgroundClient";
import VideoBackground from "@/components/main/background/VideoBackground";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cedarville = Cedarville_Cursive({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-cedarville",
  preload: false, // only used on main page — don't preload on every route
});

export const metadata: Metadata = {
  title: "Celina's Website",
  description: "This is my portfolio!",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} ${geistMono.variable} ${cedarville.variable} bg-[#D3A1B9] overflow-y-scroll overflow-x-hidden`}>
          <VideoBackground />
          <StarBackgroundClient />
          {children}
      </body>
    </html>
  )
}

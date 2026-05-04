import FencingPage from "@/components/fencing/FencingPage"

export const metadata = {
  title: "Fencing — Celina Alzenor",
  description: "Celina Alzenor's fencing stats and tournament results.",
}

export default function FencingRoute() {
  return (
    <main className="min-h-screen w-screen">
      <FencingPage />
    </main>
  )
}

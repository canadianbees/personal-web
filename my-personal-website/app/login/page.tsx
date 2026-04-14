"use client"
import { useState } from "react"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    await supabase.auth.signInWithOtp({
      email: process.env.NEXT_PUBLIC_ADMIN_EMAIL!,
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    })
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="relative z-10 text-center">
          <p className="text-white text-xl">check your email ✉️</p>
          <p className="text-white/40 text-sm mt-2">tap the link to sign in</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="relative z-10 text-center flex flex-col items-center gap-4">
        <h1 className="text-white text-2xl font-serif">admin</h1>
        <button
          onClick={handleLogin}
          disabled={loading}
          className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded-full hover:bg-white/20 transition disabled:opacity-50"
        >
          {loading ? "sending..." : "send me a login link"}
        </button>
      </div>
    </main>
  )
}

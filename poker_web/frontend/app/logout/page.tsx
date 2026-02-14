"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { setStoredToken } from "@/hooks/use-mp-socket"

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    setStoredToken(null)
    router.replace("/")
  }, [router])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]">
      <p className="text-white/70 text-sm">Logging out…</p>
    </main>
  )
}

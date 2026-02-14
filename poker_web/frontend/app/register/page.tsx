"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { register as registerApi } from "@/lib/api-client"
import { setStoredToken } from "@/hooks/use-mp-socket"
import { GlassPanel } from "@/components/poker/glass-panel"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await registerApi(email, username, password)
      setStoredToken(data.token)
      router.push("/multiplayer")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-semibold text-white text-center">Create account</h1>

        {error && (
          <GlassPanel className="px-4 py-3 bg-red-500/20 border-red-500/40">
            <p className="text-red-200 text-sm">{error}</p>
          </GlassPanel>
        )}

        <GlassPanel className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="register-email" className="block text-sm font-medium text-white/80 mb-1">
                Email
              </label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#0A84FF]/50"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="register-username" className="block text-sm font-medium text-white/80 mb-1">
                Username
              </label>
              <input
                id="register-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#0A84FF]/50"
                placeholder="username"
              />
            </div>
            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-white/80 mb-1">
                Password
              </label>
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#0A84FF]/50"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-white/50">At least 8 characters</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#0A84FF]/30 border border-[#0A84FF]/50 text-white font-semibold hover:bg-[#0A84FF]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-white/60">
            Already have an account?{" "}
            <Link href="/login" className="text-[#0A84FF] hover:underline">
              Log in
            </Link>
          </p>
        </GlassPanel>
      </div>
    </main>
  )
}

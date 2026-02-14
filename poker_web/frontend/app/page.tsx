import Link from "next/link"
import { PokerTable } from "@/components/poker/poker-table"
import { AuthNav } from "@/components/auth-nav"

export default function Page() {
  return (
    <main className="relative">
      <div className="fixed top-4 left-4 z-50 flex flex-wrap gap-2">
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white/90 text-sm font-medium hover:bg-white/15 transition-colors"
        >
          Dashboard
        </Link>
        <Link
          href="/multiplayer"
          className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white/90 text-sm font-medium hover:bg-white/15 transition-colors"
        >
          Play vs Human
        </Link>
        <AuthNav />
      </div>
      <PokerTable />
    </main>
  )
}

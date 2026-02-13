import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function LeaderboardStubPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">
          Full Leaderboard
        </h1>
        <p className="text-muted-foreground">
          Full leaderboard view coming soon.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </div>
    </main>
  )
}

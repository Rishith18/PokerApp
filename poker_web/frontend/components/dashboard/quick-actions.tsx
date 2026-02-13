"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { GlassPanel } from "@/components/poker/glass-panel"
import { Gamepad2, Bot, RotateCcw, BookOpen } from "lucide-react"

const actionButtonBase =
  "relative overflow-hidden flex-1 min-w-0 py-3.5 px-5 rounded-2xl text-sm font-semibold uppercase tracking-wider-xl backdrop-blur-xl transition-all ease-apple duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"

const primaryStyle =
  "bg-[#0A84FF]/30 border border-[#0A84FF]/50 text-white shadow-[0_4px_20px_rgba(10,132,255,0.3)] hover:bg-[#0A84FF]/40 hover:shadow-[0_6px_32px_rgba(10,132,255,0.5)]"

const secondaryStyle =
  "bg-white/[0.1] border border-white/[0.18] text-foreground/90 shadow-glass hover:bg-white/[0.15]"

export function QuickActions() {
  const router = useRouter()

  const handleStub = (path: string) => () => {
    router.push(path)
  }

  return (
    <GlassPanel variant="default" className="p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/multiplayer"
          className={cn(actionButtonBase, primaryStyle)}
        >
          <Gamepad2 className="h-5 w-5 shrink-0" />
          <span>Play Ranked Match</span>
        </Link>
        <Link href="/" className={cn(actionButtonBase, primaryStyle)}>
          <Bot className="h-5 w-5 shrink-0" />
          <span>Play vs AI</span>
        </Link>
        <button
          type="button"
          onClick={handleStub("/dashboard/review")}
          className={cn(actionButtonBase, secondaryStyle)}
        >
          <RotateCcw className="h-5 w-5 shrink-0" />
          <span>Review Last Match</span>
        </button>
        <button
          type="button"
          onClick={handleStub("/dashboard/training")}
          className={cn(actionButtonBase, secondaryStyle)}
        >
          <BookOpen className="h-5 w-5 shrink-0" />
          <span>Training</span>
        </button>
      </div>
    </GlassPanel>
  )
}

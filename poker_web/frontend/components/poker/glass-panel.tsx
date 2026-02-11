import React from "react"
import { cn } from "@/lib/utils"

interface GlassPanelProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
  variant?: 'subtle' | 'default' | 'prominent' | 'elevated'
  shimmer?: boolean
  noise?: boolean
  innerBorder?: boolean
}

const variantStyles = {
  subtle: "bg-white/[0.05] backdrop-blur-md border-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.2)]",
  default: "bg-white/[0.1] backdrop-blur-xl border-white/[0.18] shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]",
  prominent: "bg-white/[0.15] backdrop-blur-2xl border-white/[0.22] shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.12)]",
  elevated: "bg-white/[0.12] backdrop-blur-3xl border-white/[0.2] shadow-glass-lg",
}

export function GlassPanel({
  children,
  className,
  glow = false,
  variant = 'default',
  shimmer = false,
  noise = false,
  innerBorder = false
}: GlassPanelProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border overflow-hidden",
        variantStyles[variant],
        glow && "animate-pulse-glow",
        className
      )}
    >
      {/* Noise texture overlay */}
      {noise && (
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            filter: 'contrast(150%)',
          }}
        />
      )}

      {/* Shimmer effect */}
      {shimmer && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute inset-0 w-full h-full animate-shimmer"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
            }}
          />
        </div>
      )}

      {/* Inner border for depth */}
      {innerBorder && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none border border-white/[0.05]" />
      )}

      {children}
    </div>
  )
}

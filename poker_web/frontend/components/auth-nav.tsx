"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { getStoredToken } from "@/hooks/use-mp-socket"

const linkClass =
  "px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white/90 text-sm font-medium hover:bg-white/15 transition-colors"

export function AuthNav() {
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => {
    setHasToken(!!getStoredToken())
  }, [])

  if (hasToken) {
    return (
      <Link href="/logout" className={linkClass}>
        Log out
      </Link>
    )
  }

  return (
    <>
      <Link href="/login" className={linkClass}>
        Login
      </Link>
      <Link href="/register" className={linkClass}>
        Register
      </Link>
    </>
  )
}

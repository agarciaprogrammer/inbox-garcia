'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Check, Copy, Eye, EyeOff } from 'lucide-react'

interface SecretValueProps {
  value: string
}

const maskedValue = Array.from({ length: 14 }, () => '\u2022').join('')

export default function SecretValue({ value }: SecretValueProps) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => setCopied(false), 1600)
    } catch (err) {
      console.error('Failed to copy secret:', err)
    }
  }

  return (
    <span className="relative my-1 inline-flex max-w-full items-center gap-1.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-2 py-1 align-middle">
      <span className="min-w-0 break-all font-mono text-[12px] leading-relaxed text-zinc-200 select-text">
        {revealed ? value : maskedValue}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setRevealed((current) => !current)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition-all hover:bg-zinc-800 hover:text-zinc-200 cursor-pointer"
          title={revealed ? 'Hide secret' : 'Reveal secret'}
          aria-label={revealed ? 'Hide secret' : 'Reveal secret'}
        >
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={copySecret}
          className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-zinc-500 transition-all hover:bg-zinc-800 hover:text-zinc-200 cursor-pointer"
          title="Copy secret"
          aria-label="Copy secret"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </span>
      {copied && (
        <span className="absolute -top-9 right-0 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-[11px] font-medium text-zinc-200 shadow-xl">
          Copied to clipboard
        </span>
      )}
    </span>
  )
}

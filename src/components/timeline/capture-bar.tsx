'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isValidUrl, normalizeUrl } from '@/lib/utils'
import { LockKeyhole, Paperclip, Send, Loader2 } from 'lucide-react'

interface CaptureBarProps {
  onItemCreated: () => void
  onUploadFile: (file: File) => Promise<void>
}

export default function CaptureBar({ onItemCreated, onUploadFile }: CaptureBarProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [secretPopoverOpen, setSecretPopoverOpen] = useState(false)
  const [secretLabel, setSecretLabel] = useState('')
  const [secretValue, setSecretValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const secretValueRef = useRef<HTMLInputElement>(null)
  const selectionRef = useRef({ start: 0, end: 0 })
  const supabase = createClient()

  // Auto-grow textarea height
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }, [text])

  useEffect(() => {
    if (!secretPopoverOpen) return
    requestAnimationFrame(() => secretValueRef.current?.focus())
  }, [secretPopoverOpen])

  const rememberSelection = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    selectionRef.current = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    }
  }

  // Handle standard text submission (or URL with OG preview)
  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed) return

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      if (isValidUrl(trimmed)) {
        await handleUrlSubmit(trimmed, user.id)
      } else {
        const { error } = await supabase.from('items').insert({
          user_id: user.id,
          type: 'note',
          text: trimmed,
        })
        if (error) throw error
      }

      setText('')
      onItemCreated()
    } catch (err) {
      console.error('Error creating item:', err)
      alert('Failed to send item. Please check console.')
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  // Handle URL Submit with OG tags pre-fetching
  const handleUrlSubmit = async (pastedUrl: string, userId: string) => {
    const normalized = normalizeUrl(pastedUrl)
    let ogTitle = null
    let ogDesc = null
    let ogImg = null

    try {
      // Query the proxy API route to parse Open Graph metadata
      const res = await fetch(`/api/og-preview?url=${encodeURIComponent(normalized)}`)
      if (res.ok) {
        const data = await res.json()
        ogTitle = data.title
        ogDesc = data.description
        ogImg = data.image
      }
    } catch (e) {
      console.warn('Failed to parse Open Graph tags, using fallback', e)
    }

    const { error } = await supabase.from('items').insert({
      user_id: userId,
      type: 'url',
      url: normalized,
      text: pastedUrl.trim(),
      title: ogTitle,
      description: ogDesc,
      og_image: ogImg,
    })

    if (error) throw error
  }

  // Paste Event Handler (Ctrl+V)
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = e.clipboardData.files
    if (files && files.length > 0) {
      e.preventDefault()
      const file = files[0]
      await onUploadFile(file)
      return
    }

    const pastedText = e.clipboardData.getData('text')
    // If input was empty and a URL was pasted, submit it immediately (with preview)
    if (!text.trim() && isValidUrl(pastedText)) {
      e.preventDefault()
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')
        await handleUrlSubmit(pastedText, user.id)
        onItemCreated()
      } catch (err) {
        console.error('Failed to paste URL item:', err)
      } finally {
        setLoading(false)
      }
    }
  }

  // Textarea key listener (Enter to Send, Shift+Enter for new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    rememberSelection()

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const toggleSecretPopover = () => {
    rememberSelection()
    setSecretPopoverOpen((open) => !open)
  }

  const insertSecret = () => {
    const value = secretValue.trim()
    if (!value) return

    const label = secretLabel.trim()
    const secretMarkup = label ? `${label}\n\n{{secret:${value}}}` : `{{secret:${value}}}`
    const { start, end } = selectionRef.current
    const nextText = `${text.slice(0, start)}${secretMarkup}${text.slice(end)}`
    const nextCursor = start + secretMarkup.length

    setText(nextText)
    setSecretLabel('')
    setSecretValue('')
    setSecretPopoverOpen(false)

    requestAnimationFrame(() => {
      const textarea = textareaRef.current
      if (!textarea) return

      textarea.focus()
      textarea.setSelectionRange(nextCursor, nextCursor)
      selectionRef.current = { start: nextCursor, end: nextCursor }
    })
  }

  const handleSecretKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      insertSecret()
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      setSecretPopoverOpen(false)
      textareaRef.current?.focus()
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      await onUploadFile(files[0])
      e.target.value = '' // Reset input value
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-6 pt-2">
      {/* Hidden File Input */}
      <input
        id="file-input-element"
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        disabled={loading}
      />

      <div className="relative bg-zinc-900/80 border border-zinc-900 rounded-2xl shadow-xl backdrop-blur-md transition-all duration-200 focus-within:border-zinc-800/80 focus-within:ring-2 focus-within:ring-violet-500/10 p-2">
        <div className="flex items-end gap-2">
          {/* File Picker Trigger */}
          <button
            id="attach-button"
            type="button"
            onClick={triggerFileSelect}
            disabled={loading}
            className="flex items-center justify-center p-3 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-all disabled:opacity-50 cursor-pointer"
            title="Upload image or file"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          {/* Secret Block Insert */}
          <div className="relative shrink-0">
            <button
              id="insert-secret-button"
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={toggleSecretPopover}
              disabled={loading}
              className="flex items-center justify-center p-3 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-all disabled:opacity-50 cursor-pointer"
              title="Insert secret"
              aria-label="Insert secret"
              aria-expanded={secretPopoverOpen}
            >
              <LockKeyhole className="h-5 w-5" />
            </button>

            {secretPopoverOpen && (
              <div className="absolute bottom-full left-0 z-50 mb-3 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-zinc-800 bg-zinc-950 p-3 shadow-2xl">
                <div className="space-y-2">
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Label</span>
                    <input
                      id="secret-label-input"
                      type="text"
                      value={secretLabel}
                      onChange={(e) => setSecretLabel(e.target.value)}
                      onKeyDown={handleSecretKeyDown}
                      placeholder="Optional"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Secret value</span>
                    <input
                      id="secret-value-input"
                      ref={secretValueRef}
                      type="password"
                      value={secretValue}
                      onChange={(e) => setSecretValue(e.target.value)}
                      onKeyDown={handleSecretKeyDown}
                      placeholder="Paste secret"
                      autoComplete="off"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-xs text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10"
                    />
                  </label>
                  <button
                    id="insert-secret-submit"
                    type="button"
                    onClick={insertSecret}
                    disabled={!secretValue.trim()}
                    className="mt-1 flex w-full items-center justify-center rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 cursor-pointer"
                  >
                    Insert
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Growing Input Textarea */}
          <textarea
            id="chat-textarea"
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={rememberSelection}
            onKeyUp={rememberSelection}
            onSelect={rememberSelection}
            onPaste={handlePaste}
            disabled={loading}
            placeholder="Type a note, paste a link, image or file..."
            className="flex-1 max-h-[200px] py-3 px-2 bg-transparent text-white placeholder-zinc-500 text-sm focus:outline-none resize-none disabled:opacity-50"
          />

          {/* Send Action */}
          <button
            id="send-button"
            type="button"
            onClick={handleSend}
            disabled={loading || !text.trim()}
            className="flex items-center justify-center p-3 rounded-xl bg-violet-600/10 text-violet-400 hover:bg-violet-600 hover:text-white border border-violet-500/20 hover:border-violet-500/40 transition-all disabled:opacity-50 disabled:bg-transparent disabled:text-zinc-600 disabled:border-transparent cursor-pointer"
            title="Send"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

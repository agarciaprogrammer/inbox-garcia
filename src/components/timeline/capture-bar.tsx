'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isValidUrl, normalizeUrl } from '@/lib/utils'
import { Paperclip, Send, Loader2 } from 'lucide-react'

interface CaptureBarProps {
  onItemCreated: () => void
  onUploadFile: (file: File) => Promise<void>
}

export default function CaptureBar({ onItemCreated, onUploadFile }: CaptureBarProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Auto-grow textarea height
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }, [text])

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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
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

          {/* Growing Input Textarea */}
          <textarea
            id="chat-textarea"
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
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

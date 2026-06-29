'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isValidUrl, normalizeUrl } from '@/lib/utils'
import { Paperclip, Send, Loader2, Image as ImageIcon, FileText } from 'lucide-react'

interface CaptureBarProps {
  onItemCreated: () => void
}

export default function CaptureBar({ onItemCreated }: CaptureBarProps) {
  const [text, setText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
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

  // Handle text/URL submissions
  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed) return

    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      if (isValidUrl(trimmed)) {
        const normalized = normalizeUrl(trimmed)
        const { error } = await supabase.from('items').insert({
          user_id: user.id,
          type: 'url',
          url: normalized,
          text: trimmed,
        })
        if (error) throw error
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
      setUploading(false)
      // Focus back on textarea
      textareaRef.current?.focus()
    }
  }

  // Handle URL Paste Auto-submission helper
  const handleUrlSubmit = async (pastedUrl: string) => {
    setUploading(true)
    setUploadProgress('Saving link...')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const normalized = normalizeUrl(pastedUrl)
      const { error } = await supabase.from('items').insert({
        user_id: user.id,
        type: 'url',
        url: normalized,
        text: pastedUrl.trim(),
      })
      if (error) throw error
      onItemCreated()
    } catch (err) {
      console.error('Error pasting URL:', err)
    } finally {
      setUploading(false)
      setUploadProgress(null)
    }
  }

  // Handle file uploads (images & generic files)
  const handleFileUpload = async (file: File) => {
    setUploading(true)
    setUploadProgress('Uploading file...')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const userId = user.id
      const now = new Date()
      const year = now.getFullYear()
      const month = (now.getMonth() + 1).toString().padStart(2, '0')
      const fileExt = file.name.split('.').pop() || ''
      // Secure random file name
      const uniqueId = crypto.randomUUID()
      const storagePath = `${userId}/${year}/${month}/${uniqueId}.${fileExt}`

      // Upload file to Supabase Storage Bucket 'inbox-files'
      const { error: uploadError } = await supabase.storage
        .from('inbox-files')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      const isImage = file.type.startsWith('image/')
      const itemType = isImage ? 'image' : 'file'

      // Insert item metadata into DB
      const { error: dbError } = await supabase.from('items').insert({
        user_id: userId,
        type: itemType,
        text: file.name,
        title: file.name,
        storage_path: storagePath,
        mime: file.type,
        size: file.size,
      })

      if (dbError) throw dbError
      onItemCreated()
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Upload failed. Ensure the storage bucket "inbox-files" is created and public policy allows writes.')
    } finally {
      setUploading(false)
      setUploadProgress(null)
    }
  }

  // Paste Event Handler (Ctrl+V)
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = e.clipboardData.files
    if (files && files.length > 0) {
      e.preventDefault()
      const file = files[0]
      await handleFileUpload(file)
      return
    }

    const pastedText = e.clipboardData.getData('text')
    // If the input was empty and a URL was pasted, submit immediately
    if (!text.trim() && isValidUrl(pastedText)) {
      e.preventDefault()
      await handleUrlSubmit(pastedText)
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
      await handleFileUpload(files[0])
      // Reset input value to allow uploading same file again
      e.target.value = ''
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
        disabled={uploading}
      />

      <div className="relative bg-zinc-900/80 border border-zinc-800 rounded-2xl shadow-xl backdrop-blur-md transition-all duration-200 focus-within:border-zinc-700/80 focus-within:ring-2 focus-within:ring-violet-500/10 p-2">
        {uploading && uploadProgress && (
          <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-violet-400 flex items-center gap-2 shadow-lg animate-bounce">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{uploadProgress}</span>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* File Picker Trigger Button */}
          <button
            id="attach-button"
            type="button"
            onClick={triggerFileSelect}
            disabled={uploading}
            className="flex items-center justify-center p-3 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-all disabled:opacity-50 cursor-pointer"
            title="Upload image or file"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          {/* Growing Textarea Input */}
          <textarea
            id="chat-textarea"
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={uploading}
            placeholder="Type a note, paste a link, image or file..."
            className="flex-1 max-h-[200px] py-3 px-2 bg-transparent text-white placeholder-zinc-500 text-sm focus:outline-none resize-none disabled:opacity-50"
          />

          {/* Send Button */}
          <button
            id="send-button"
            type="button"
            onClick={handleSend}
            disabled={uploading || !text.trim()}
            className="flex items-center justify-center p-3 rounded-xl bg-violet-600/10 text-violet-400 hover:bg-violet-600 hover:text-white border border-violet-500/20 hover:border-violet-500/40 transition-all disabled:opacity-50 disabled:bg-transparent disabled:text-zinc-600 disabled:border-transparent cursor-pointer"
            title="Send"
          >
            {uploading ? (
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

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CaptureBar from '@/components/timeline/capture-bar'
import TimelineList from '@/components/timeline/timeline-list'
import { LogOut, User, Loader2, Sparkles, Search, Upload } from 'lucide-react'

interface Item {
  id: string
  type: 'note' | 'url' | 'image' | 'file'
  text?: string
  title?: string
  url?: string
  storage_path?: string
  mime?: string
  size?: number
  created_at: string
  favorite: boolean
  description?: string
  og_image?: string
}

export default function TimelinePage() {
  const [items, setItems] = useState<Item[]>([])
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [composerHeight, setComposerHeight] = useState(140)
  const composerRef = useRef<HTMLElement>(null)
  
  // File upload progress states
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const fetchTimeline = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      // 1. Fetch current user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email || null)
      } else {
        router.push('/login')
        return
      }

      // 2. Fetch items ordered by creation date (newest first)
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const timelineItems = data || []

      // 3. Batch generate signed URLs for images and files
      const paths = timelineItems
        .filter((item: Item) => item.storage_path)
        .map((item: Item) => item.storage_path as string)

      const urlsMap: Record<string, string> = {}
      
      if (paths.length > 0) {
        const { data: signedData, error: signedError } = await supabase
          .storage
          .from('inbox-files')
          .createSignedUrls(paths, 3600) // URLs valid for 1 hour

        if (signedError) throw signedError

        if (signedData) {
          signedData.forEach((fileObj, index) => {
            const originalPath = paths[index]
            if (fileObj.signedUrl) {
              urlsMap[originalPath] = fileObj.signedUrl
            }
          })
        }
      }

      setItems(timelineItems)
      setSignedUrls(urlsMap)
    } catch (err) {
      console.error('Failed to fetch timeline:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTimeline()
  }, [])

  useEffect(() => {
    const composer = composerRef.current
    if (!composer) return

    const updateComposerHeight = () => {
      setComposerHeight(Math.ceil(composer.getBoundingClientRect().height))
    }

    updateComposerHeight()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateComposerHeight)
      return () => window.removeEventListener('resize', updateComposerHeight)
    }

    const resizeObserver = new ResizeObserver(updateComposerHeight)
    resizeObserver.observe(composer)

    return () => resizeObserver.disconnect()
  }, [])

  // Centralized File Upload logic (used by CaptureBar and Drag-and-Drop)
  const uploadFile = async (file: File) => {
    setUploading(true)
    setUploadProgress(`Uploading ${file.name}...`)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const userId = user.id
      const now = new Date()
      const year = now.getFullYear()
      const month = (now.getMonth() + 1).toString().padStart(2, '0')
      const fileExt = file.name.split('.').pop() || ''
      const uniqueId = crypto.randomUUID()
      const storagePath = `${userId}/${year}/${month}/${uniqueId}.${fileExt}`

      // Upload file to Supabase Storage
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
      await fetchTimeline(false)
    } catch (err: any) {
      console.error('Upload failed:', err)
      alert(`Upload failed: ${err?.message || err}`)
    } finally {
      setUploading(false)
      setUploadProgress(null)
    }
  }

  // Delete Item logic (removes from Supabase Storage and DB)
  const deleteItem = async (id: string, storagePath?: string) => {
    try {
      // 1. Remove from Storage first if file path exists
      if (storagePath) {
        const { error: storageError } = await supabase.storage
          .from('inbox-files')
          .remove([storagePath])
        
        if (storageError) {
          console.error('Error removing file from storage:', storageError)
        }
      }

      // 2. Delete from DB
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Optimistic UI state update
      setItems(prev => prev.filter(item => item.id !== id))
    } catch (err: any) {
      console.error('Deletion failed:', err)
      alert(`Failed to delete item: ${err?.message || err}`)
    }
  }

  // Toggle Favorite
  const toggleFavorite = async (id: string, currentFav: boolean) => {
    try {
      // Optimistic UI update
      setItems(prev => prev.map(item => item.id === id ? { ...item, favorite: !currentFav } : item))

      const { error } = await supabase
        .from('items')
        .update({ favorite: !currentFav })
        .eq('id', id)

      if (error) throw error
    } catch (err) {
      console.error('Toggle favorite failed:', err)
      // Revert optimistic update
      setItems(prev => prev.map(item => item.id === id ? { ...item, favorite: currentFav } : item))
    }
  }

  // Update Note Text
  const updateNoteText = async (id: string, newText: string) => {
    try {
      // Optimistic UI update
      setItems(prev => prev.map(item => item.id === id ? { ...item, text: newText } : item))

      const { error } = await supabase
        .from('items')
        .update({ text: newText })
        .eq('id', id)

      if (error) throw error
    } catch (err) {
      console.error('Updating note failed:', err)
      await fetchTimeline(false) // revert by fetching fresh data
    }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (err) {
      console.error('Error signing out:', err)
      setSigningOut(false)
    }
  }

  // Drag & Drop Viewport Event Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesList = Array.from(e.dataTransfer.files)
      // Upload files sequentially
      for (const file of filesList) {
        await uploadFile(file)
      }
    }
  }

  // Filter items in real time
  const filteredItems = items.filter(item => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return true

    const matchesText = item.text?.toLowerCase().includes(query) || false
    const matchesTitle = item.title?.toLowerCase().includes(query) || false
    const matchesUrl = item.url?.toLowerCase().includes(query) || false
    const matchesDesc = item.description?.toLowerCase().includes(query) || false

    return matchesText || matchesTitle || matchesUrl || matchesDesc
  })

  return (
    <main 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative h-screen flex flex-col bg-zinc-950 text-zinc-50 overflow-hidden select-none"
    >
      {/* Decorative background glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[100px] pointer-events-none" />

      {/* Drag & Drop Visual Overlay Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/85 border-4 border-dashed border-violet-500/35 backdrop-blur-sm p-4 pointer-events-none">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-violet-400 shadow-2xl">
              <Upload className="h-7 w-7 animate-bounce" />
            </div>
            <h2 className="text-xl font-bold text-white">Drop files to upload</h2>
            <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
              Release to instantly add files or images to your personal inbox timeline.
            </p>
          </div>
        </div>
      )}

      {/* Sticky Header */}
      <header className="sticky top-0 z-40 shrink-0 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-900 px-4 py-3.5 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center shadow-lg">
              <Sparkles className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-md font-bold tracking-tight text-white">Inbox</h1>
              <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">External Memory</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {userEmail && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
                <User className="h-3.5 w-3.5" />
                <span className="truncate max-w-[120px]">{userEmail}</span>
              </div>
            )}
            <button
              id="logout-button"
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-300 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
              title="Sign Out"
            >
              {signingOut ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Global Realtime Search Bar */}
      <section className="w-full max-w-3xl mx-auto px-4 pt-4 shrink-0">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
            <Search className="h-4 w-4" />
          </div>
          <input
            id="search-input"
            type="text"
            placeholder="Search notes, links, or filenames..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-10 py-2.5 bg-zinc-900/40 border border-zinc-900 focus:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-violet-500/10 rounded-2xl text-xs text-white placeholder-zinc-500 transition-all"
          />
          {searchQuery && (
            <button 
              id="clear-search-button"
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 text-xs font-semibold cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </section>

      {/* Timeline List Scroll Area */}
      <section 
        className="relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain"
        style={{
          paddingBottom: `${composerHeight + 16}px`,
          scrollPaddingBottom: `${composerHeight + 16}px`,
        }}
      >
        <TimelineList 
          items={filteredItems} 
          signedUrls={signedUrls} 
          loading={loading}
          onDelete={deleteItem}
          onToggleFavorite={toggleFavorite}
          onEditNote={updateNoteText}
        />
      </section>

      {/* Fixed Bottom Capture Bar */}
      <section
        ref={composerRef}
        className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent pt-4 pb-[env(safe-area-inset-bottom)]"
      >
        {uploading && uploadProgress && (
          <div className="absolute top-[-30px] left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-violet-400 flex items-center gap-2 shadow-lg animate-pulse z-40">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{uploadProgress}</span>
          </div>
        )}
        <CaptureBar 
          onItemCreated={() => fetchTimeline(false)} 
          onUploadFile={uploadFile}
        />
      </section>
    </main>
  )
}

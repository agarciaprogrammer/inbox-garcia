'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CaptureBar from '@/components/timeline/capture-bar'
import TimelineList from '@/components/timeline/timeline-list'
import { LogOut, User, Loader2, Sparkles } from 'lucide-react'

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
}

export default function TimelinePage() {
  const [items, setItems] = useState<Item[]>([])
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  const fetchTimeline = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      // 1. Fetch current user to display email
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

  return (
    <main className="relative min-h-screen flex flex-col bg-zinc-950 text-zinc-50 overflow-x-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[100px] pointer-events-none" />

      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-900 px-4 py-3.5 shadow-sm">
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

      {/* Timeline List Scroll Area */}
      <section className="flex-1 flex flex-col min-h-0">
        <TimelineList 
          items={items} 
          signedUrls={signedUrls} 
          loading={loading} 
        />
      </section>

      {/* Sticky Bottom Capture Bar */}
      <section className="sticky bottom-0 z-30 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent pt-4">
        <CaptureBar onItemCreated={() => fetchTimeline(false)} />
      </section>
    </main>
  )
}

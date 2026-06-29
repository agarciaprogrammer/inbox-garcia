'use client'

import React from 'react'
import ItemCard from './item-card'
import { Loader2, Inbox } from 'lucide-react'

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

interface TimelineListProps {
  items: Item[]
  signedUrls: Record<string, string>
  loading: boolean
}

export default function TimelineList({ items, signedUrls, loading }: TimelineListProps) {
  if (loading && items.length === 0) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-20 text-zinc-500">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500 mb-3" />
        <span className="text-sm font-medium">Loading inbox feed...</span>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-20 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-4 shadow-xl">
          <Inbox className="h-7 w-7" />
        </div>
        <h3 className="text-md font-semibold text-white">Your inbox is empty</h3>
        <p className="text-xs text-zinc-500 max-w-sm mt-1.5 leading-relaxed">
          Type a quick note, paste a link, or drag-and-paste images and files. Everything you capture will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-6">
      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <ItemCard 
            key={item.id} 
            item={item} 
            signedUrl={item.storage_path ? signedUrls[item.storage_path] : undefined}
          />
        ))}
      </div>
    </div>
  )
}

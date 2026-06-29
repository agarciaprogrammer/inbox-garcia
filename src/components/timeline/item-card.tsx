'use client'

import React, { useState } from 'react'
import { formatBytes, formatRelativeTime } from '@/lib/utils'
import { FileText, Globe, Image as ImageIcon, Download, ExternalLink, Paperclip, X } from 'lucide-react'

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

interface ItemCardProps {
  item: Item
  signedUrl?: string
}

export default function ItemCard({ item, signedUrl }: ItemCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const formattedTime = formatRelativeTime(item.created_at)
  const fileExt = item.title?.split('.').pop() || item.text?.split('.').pop() || 'file'

  // 1. Note Renderer
  if (item.type === 'note') {
    return (
      <div 
        id={`item-${item.id}`}
        className="flex items-start gap-3 bg-zinc-900/40 border border-zinc-800/80 p-4.5 rounded-2xl hover:border-zinc-700/60 transition-all duration-200"
      >
        <div className="p-2 rounded-xl bg-indigo-600/10 text-indigo-400 shrink-0">
          <FileText className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-zinc-500">Note</span>
            <span className="text-[10px] text-zinc-500">{formattedTime}</span>
          </div>
          <p className="text-[14px] text-zinc-200 whitespace-pre-wrap mt-2 break-words leading-relaxed select-text">
            {item.text}
          </p>
        </div>
      </div>
    )
  }

  // 2. URL Renderer
  if (item.type === 'url') {
    let hostname = 'Link'
    try {
      if (item.url) {
        hostname = new URL(item.url).hostname
      }
    } catch (_) {}

    return (
      <div 
        id={`item-${item.id}`}
        className="flex items-start gap-3 bg-zinc-900/40 border border-zinc-800/80 p-4.5 rounded-2xl hover:border-zinc-700/60 transition-all duration-200"
      >
        <div className="p-2 rounded-xl bg-violet-600/10 text-violet-400 shrink-0">
          <Globe className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-zinc-500">Link — {hostname}</span>
            <span className="text-[10px] text-zinc-500">{formattedTime}</span>
          </div>
          <div className="mt-2 group">
            <a 
              href={item.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-violet-400 hover:text-violet-300 transition-colors break-all leading-normal cursor-pointer"
            >
              <span className="hover:underline">{item.text || item.url}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>
        </div>
      </div>
    )
  }

  // 3. Image Renderer
  if (item.type === 'image') {
    return (
      <div 
        id={`item-${item.id}`}
        className="flex items-start gap-3 bg-zinc-900/40 border border-zinc-800/80 p-4.5 rounded-2xl hover:border-zinc-700/60 transition-all duration-200"
      >
        <div className="p-2 rounded-xl bg-emerald-600/10 text-emerald-400 shrink-0">
          <ImageIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-zinc-500 truncate max-w-[70%]">
              Image — {item.text || 'Untitled'}
            </span>
            <span className="text-[10px] text-zinc-500 shrink-0">{formattedTime}</span>
          </div>

          {signedUrl ? (
            <div className="relative group cursor-zoom-in rounded-xl overflow-hidden border border-zinc-800/80 max-w-md bg-zinc-950 aspect-video">
              <img 
                src={signedUrl} 
                alt={item.text || 'Uploaded Image'} 
                onClick={() => setLightboxOpen(true)}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="h-36 max-w-md bg-zinc-800/20 animate-pulse rounded-xl border border-zinc-800/40" />
          )}

          {/* Lightbox Modal */}
          {lightboxOpen && signedUrl && (
            <div 
              className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in"
              onClick={() => setLightboxOpen(false)}
            >
              <button 
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="max-w-4xl max-h-[85vh] relative" onClick={(e) => e.stopPropagation()}>
                <img 
                  src={signedUrl} 
                  alt={item.text || 'Fullscreen Image'} 
                  className="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain border border-zinc-850"
                />
                <div className="mt-4 text-center text-xs text-zinc-400 break-all px-4">
                  {item.text}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 4. Generic File Renderer
  return (
    <div 
      id={`item-${item.id}`}
      className="flex items-start gap-3 bg-zinc-900/40 border border-zinc-800/80 p-4.5 rounded-2xl hover:border-zinc-700/60 transition-all duration-200"
    >
      <div className="p-2 rounded-xl bg-blue-600/10 text-blue-400 shrink-0">
        <Paperclip className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-zinc-500">File</span>
          <span className="text-[10px] text-zinc-500">{formattedTime}</span>
        </div>

        <div className="flex items-center justify-between gap-4 p-3 bg-zinc-950/40 border border-zinc-800/60 rounded-xl max-w-xl hover:border-zinc-800 transition-colors">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-zinc-150 truncate" title={item.title || item.text}>
              {item.title || item.text}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1.5">
              <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] font-medium tracking-wider uppercase">{fileExt}</span>
              {item.size !== undefined && (
                <>
                  <span>•</span>
                  <span>{formatBytes(item.size)}</span>
                </>
              )}
            </div>
          </div>

          {signedUrl ? (
            <a 
              href={signedUrl} 
              download={item.title || 'file'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-all shrink-0 cursor-pointer"
              title="Download File"
            >
              <Download className="h-4.5 w-4.5" />
            </a>
          ) : (
            <div className="h-9 w-9 bg-zinc-800/40 rounded-xl animate-pulse shrink-0" />
          )}
        </div>
      </div>
    </div>
  )
}

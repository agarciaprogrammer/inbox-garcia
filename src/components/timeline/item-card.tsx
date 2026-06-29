'use client'

import React, { useState, useEffect, useRef } from 'react'
import { formatBytes, formatRelativeTime } from '@/lib/utils'
import { 
  FileText, 
  Globe, 
  Image as ImageIcon, 
  Download, 
  ExternalLink, 
  X, 
  Star, 
  Trash2, 
  Edit2, 
  Check, 
  FileArchive, 
  FileSpreadsheet, 
  FileCode, 
  FileVideo, 
  FileAudio,
  File
} from 'lucide-react'

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

interface ItemCardProps {
  item: Item
  signedUrl?: string
  onDelete: (id: string, storagePath?: string) => Promise<void>
  onToggleFavorite: (id: string, currentFav: boolean) => Promise<void>
  onEditNote: (id: string, newText: string) => Promise<void>
}

// Helper to determine file icon and tailwind color classes based on extension
function getFileIconAndColor(title?: string, mime?: string) {
  const ext = title?.split('.').pop()?.toLowerCase() || ''
  
  if (ext === 'pdf' || mime === 'application/pdf') {
    return { Icon: FileText, color: 'text-rose-400', bg: 'bg-rose-500/10' }
  }
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) {
    return { Icon: FileArchive, color: 'text-amber-400', bg: 'bg-amber-500/10' }
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return { Icon: FileSpreadsheet, color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
  }
  if (['json', 'yaml', 'yml', 'xml', 'html', 'css', 'js', 'ts', 'tsx', 'py', 'go', 'sh'].includes(ext)) {
    return { Icon: FileCode, color: 'text-blue-400', bg: 'bg-blue-500/10' }
  }
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) {
    return { Icon: FileVideo, color: 'text-purple-400', bg: 'bg-purple-500/10' }
  }
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) {
    return { Icon: FileAudio, color: 'text-cyan-400', bg: 'bg-cyan-500/10' }
  }
  if (['doc', 'docx', 'odt'].includes(ext)) {
    return { Icon: FileText, color: 'text-sky-400', bg: 'bg-sky-500/10' }
  }
  
  // Default fallback
  return { Icon: File, color: 'text-zinc-400', bg: 'bg-zinc-800/40' }
}

export default function ItemCard({ item, signedUrl, onDelete, onToggleFavorite, onEditNote }: ItemCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(item.text || '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const formattedTime = formatRelativeTime(item.created_at)

  // Escape key listener for Lightbox and Edit mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxOpen) setLightboxOpen(false)
        if (isEditing) {
          setIsEditing(false)
          setEditText(item.text || '')
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxOpen, isEditing, item.text])

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      // Move cursor to the end
      const length = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(length, length)
    }
  }, [isEditing])

  const handleDeleteClick = () => {
    const confirmed = window.confirm('Are you sure you want to delete this item?')
    if (confirmed) {
      onDelete(item.id, item.storage_path)
    }
  }

  const handleSaveEdit = async () => {
    if (editText.trim() === '') return
    setIsEditing(false)
    await onEditNote(item.id, editText)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditText(item.text || '')
  }

  // Common Card actions (Favorite, Edit, Delete)
  const renderActions = () => (
    <div className="flex items-center gap-1 opacity-60 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
      {/* Favorite Button */}
      <button
        type="button"
        onClick={() => onToggleFavorite(item.id, item.favorite)}
        className={`p-1.5 rounded-lg hover:bg-zinc-800 transition-all cursor-pointer ${
          item.favorite ? 'text-amber-400' : 'text-zinc-500 hover:text-amber-400'
        }`}
        title={item.favorite ? 'Remove from favorites' : 'Mark as favorite'}
      >
        <Star className={`h-4 w-4 ${item.favorite ? 'fill-amber-400' : ''}`} />
      </button>

      {/* Edit Button (Notes Only) */}
      {item.type === 'note' && !isEditing && (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-all cursor-pointer"
          title="Edit note"
        >
          <Edit2 className="h-4 w-4" />
        </button>
      )}

      {/* Delete Button */}
      <button
        type="button"
        onClick={handleDeleteClick}
        className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-all cursor-pointer"
        title="Delete item"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )

  // Card wrapper style (visual polish: compact, subtle chat-like boxes)
  const cardClasses = "group relative flex items-start gap-2.5 bg-zinc-900/20 border border-zinc-900/70 p-2.5 rounded-2xl hover:bg-zinc-900/35 hover:border-zinc-800/80 transition-all duration-200"
  const iconClasses = "p-1.5 rounded-xl border border-zinc-800/70 bg-zinc-900/70 text-zinc-400 shrink-0"

  // 1. Note Renderer
  if (item.type === 'note') {
    return (
      <div id={`item-${item.id}`} className={cardClasses}>
        <div className={iconClasses}>
          <FileText className="h-4.5 w-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-medium text-zinc-600">{formattedTime}</span>
            {renderActions()}
          </div>
          
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <textarea
                ref={textareaRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y min-h-[80px]"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-2.5 py-1 text-[10px] font-semibold text-zinc-400 hover:text-white rounded-lg bg-zinc-800/60 hover:bg-zinc-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-all cursor-pointer"
                >
                  <Check className="h-3 w-3" />
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-zinc-200 whitespace-pre-wrap mt-1 break-words leading-relaxed select-text">
              {item.text}
            </p>
          )}
        </div>
      </div>
    )
  }

  // 2. URL Renderer with Open Graph Support
  if (item.type === 'url') {
    let hostname = 'Link'
    try {
      if (item.url) {
        hostname = new URL(item.url).hostname
      }
    } catch (_) {}

    const hasOgData = item.title || item.description || item.og_image

    return (
      <div id={`item-${item.id}`} className={cardClasses}>
        <div className={iconClasses}>
          <Globe className="h-4.5 w-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-medium text-zinc-600">{formattedTime}</span>
            {renderActions()}
          </div>

          <div className="mt-1.5">
            {hasOgData ? (
              /* Beautiful Open Graph Card Preview */
              <a 
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col sm:flex-row gap-2.5 p-2.5 bg-zinc-950/40 border border-zinc-900 hover:border-zinc-800 rounded-xl transition-all cursor-pointer group/link overflow-hidden"
              >
                {item.og_image && (
                  <div className="w-full sm:w-28 h-20 rounded-lg overflow-hidden border border-zinc-900 bg-zinc-950 shrink-0">
                    <img 
                      src={item.og_image} 
                      alt={item.title || 'OG Image'} 
                      className="w-full h-full object-cover group-hover/link:scale-102 transition-transform duration-200"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <span className="text-[10px] text-zinc-500 font-medium tracking-[0.2em] uppercase truncate">
                    {hostname}
                  </span>
                  <h4 className="text-[12px] font-semibold text-zinc-100 truncate group-hover/link:text-zinc-300 transition-colors mt-0.5">
                    {item.title || item.text}
                  </h4>
                  {item.description && (
                    <p className="text-[11px] text-zinc-500 line-clamp-2 mt-0.5 leading-normal">
                      {item.description}
                    </p>
                  )}
                </div>
              </a>
            ) : (
              /* Fallback link rendering */
              <div className="inline-flex items-center gap-1.5">
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-zinc-300 hover:text-white transition-colors break-all cursor-pointer"
                >
                  <span className="hover:underline">{item.text || item.url}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 3. Image Renderer
  if (item.type === 'image') {
    return (
      <div id={`item-${item.id}`} className={cardClasses}>
        <div className={iconClasses}>
          <ImageIcon className="h-4.5 w-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <span className="text-[10px] text-zinc-500 truncate max-w-[60%]">{item.text || 'Image'}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-zinc-600">{formattedTime}</span>
              {renderActions()}
            </div>
          </div>

          {signedUrl ? (
            <div className="relative group cursor-zoom-in rounded-xl overflow-hidden border border-zinc-900 bg-zinc-950 aspect-video max-w-sm">
              <img 
                src={signedUrl} 
                alt={item.text || 'Uploaded Image'} 
                onClick={() => setLightboxOpen(true)}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="h-28 max-w-sm bg-zinc-800/10 animate-pulse rounded-xl border border-zinc-900" />
          )}

          {/* Fullscreen Lightbox Preview */}
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
                <div className="mt-4 text-center text-xs text-zinc-400 break-all px-4 select-text">
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
  const { Icon: FileIcon, color: iconColor, bg: iconBg } = getFileIconAndColor(item.title, item.mime)
  const fileExt = item.title?.split('.').pop() || 'file'

  return (
    <div id={`item-${item.id}`} className={cardClasses}>
      <div className={`p-1.5 rounded-xl border border-zinc-800/70 ${iconBg} ${iconColor} shrink-0`}>
        <FileIcon className="h-4.5 w-4.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <div className="flex-1 min-w-0" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-zinc-600">{formattedTime}</span>
            {renderActions()}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 p-2.5 bg-zinc-950/40 border border-zinc-900 rounded-xl max-w-xl hover:border-zinc-800 transition-colors">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-zinc-200 truncate" title={item.title || item.text}>
              {item.title || item.text}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1.5">
              <span className="bg-zinc-900/80 border border-zinc-800 px-1 py-0.5 rounded text-[9px] font-semibold uppercase">{fileExt}</span>
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
              className="flex items-center justify-center p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-all shrink-0 cursor-pointer"
              title="Download File"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          ) : (
            <div className="h-8 w-8 bg-zinc-800/10 rounded-lg animate-pulse shrink-0" />
          )}
        </div>
      </div>
    </div>
  )
}

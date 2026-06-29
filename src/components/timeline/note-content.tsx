'use client'

import React from 'react'
import { parseNoteMarkup } from '@/lib/note-markup'
import SecretValue from './secret-value'

interface NoteContentProps {
  text?: string
}

export default function NoteContent({ text = '' }: NoteContentProps) {
  const segments = parseNoteMarkup(text)

  return (
    <div className="text-[13px] text-zinc-200 whitespace-pre-wrap mt-1 break-words leading-relaxed select-text">
      {segments.map((segment, segmentIndex) => {
        if (segment.type === 'secret') {
          return <SecretValue key={`secret-${segment.index}`} value={segment.value} />
        }

        return <React.Fragment key={`text-${segmentIndex}`}>{segment.text}</React.Fragment>
      })}
    </div>
  )
}

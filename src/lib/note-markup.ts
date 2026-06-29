export type NoteSegment =
  | { type: 'text'; text: string }
  | { type: 'secret'; value: string; index: number }

const secretPattern = /\{\{secret:([\s\S]*?)\}\}/g

export function parseNoteMarkup(text: string): NoteSegment[] {
  const segments: NoteSegment[] = []
  let cursor = 0
  let secretIndex = 0

  for (const match of text.matchAll(secretPattern)) {
    const matchIndex = match.index ?? 0

    if (matchIndex > cursor) {
      segments.push({
        type: 'text',
        text: text.slice(cursor, matchIndex),
      })
    }

    segments.push({
      type: 'secret',
      value: match[1],
      index: secretIndex,
    })

    cursor = matchIndex + match[0].length
    secretIndex += 1
  }

  if (cursor < text.length) {
    segments.push({
      type: 'text',
      text: text.slice(cursor),
    })
  }

  return segments
}

export function stripSecretValues(text = ''): string {
  return text.replace(secretPattern, ' ')
}

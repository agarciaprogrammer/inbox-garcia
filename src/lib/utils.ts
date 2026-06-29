/**
 * Formats a size in bytes to a human-readable string.
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

/**
 * Formats a date string into a relative or exact chat-like representation.
 * - Today: e.g. "15:30"
 * - Yesterday: e.g. "Yesterday"
 * - Older: e.g. "29 Jun 2026"
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()

  // Reset times for day comparison
  const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const diffTime = dNow.getTime() - dDate.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  // Time part (HH:MM)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const timeStr = `${hours}:${minutes}`

  if (diffDays === 0) {
    return timeStr
  } else if (diffDays === 1) {
    return `Yesterday`
  } else {
    // Format: 29 Jun 2026
    const day = date.getDate()
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = months[date.getMonth()]
    const year = date.getFullYear()
    return `${day} ${month} ${year}`
  }
}

/**
 * Robust check if a text string is a valid URL.
 */
export function isValidUrl(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  
  // Simple regex check for protocol-led URLs or standard domains
  try {
    const url = new URL(trimmed)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch (_) {
    // Also support quick domains like www.google.com or google.com
    const pattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/
    return pattern.test(trimmed)
  }
}

/**
 * Normalize paste URL: add https if it's a domain paste
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`
  }
  return trimmed
}

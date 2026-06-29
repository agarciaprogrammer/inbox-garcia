import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  try {
    // Fetch with a clean browser-like user agent to bypass bots blocks
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      next: { revalidate: 3600 }, // cache results for 1 hour
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch page: ${res.statusText}`)
    }

    const html = await res.text()

    // 1. Title Extraction
    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i)?.[1] ||
                    html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:title["']/i)?.[1] ||
                    html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']*)["']/i)?.[1] ||
                    html.match(/<title>([^<]*)<\/title>/i)?.[1]

    // 2. Description Extraction
    const ogDescription = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i)?.[1] ||
                          html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:description["']/i)?.[1] ||
                          html.match(/<meta[^>]*name=["']twitter:description["'][^>]*content=["']([^"']*)["']/i)?.[1] ||
                          html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1]

    // 3. Image Extraction
    const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i)?.[1] ||
                    html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:image["']/i)?.[1] ||
                    html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']*)["']/i)?.[1]

    // Resolve relative image URLs to absolute URLs
    let resolvedImage = ogImage
    if (ogImage && !/^https?:\/\//i.test(ogImage)) {
      try {
        const urlObj = new URL(url)
        resolvedImage = new URL(ogImage, urlObj.origin).toString()
      } catch (_) {}
    }

    // Decode standard HTML character entities
    const clean = (text?: string) => {
      if (!text) return ''
      return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim()
    }

    return NextResponse.json({
      title: clean(ogTitle) || null,
      description: clean(ogDescription) || null,
      image: resolvedImage || null,
    })
  } catch (err) {
    console.error('Error fetching Open Graph tags:', err)
    // Fall back gracefully rather than throwing 500
    return NextResponse.json({
      title: null,
      description: null,
      image: null,
      error: String(err),
    })
  }
}

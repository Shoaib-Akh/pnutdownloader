export const extractVideoId = (url) => {
  const fullUrlMatch = url.match(/[?&]v=([^&]+)/)
  if (fullUrlMatch) return fullUrlMatch[1]

  const shortUrlMatch = url.match(/youtu\.be\/([^?]+)/)
  if (shortUrlMatch) return shortUrlMatch[1]

  const embedUrlMatch = url.match(/youtube\.com\/embed\/([^?]+)/)
  if (embedUrlMatch) return embedUrlMatch[1]

  const shortsUrlMatch = url.match(/youtube\.com\/shorts\/([^?]+)/)
  if (shortsUrlMatch) return shortsUrlMatch[1]

  const musicUrlMatch = url.match(/music\.youtube\.com\/watch\?.*v=([^&]+)/)
  if (musicUrlMatch) return musicUrlMatch[1]

  return null
}

/**
 * Formats any image link into a direct, embeddable image URL.
 * Supports Google Drive sharing links, Dropbox links, Base64 data, and standard URLs.
 */
export function formatImageUrl(url?: string | null, fallbackUrl?: string): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return fallbackUrl || ''
  }

  const trimmed = url.trim()

  // Base64 data images
  if (trimmed.startsWith('data:image/')) {
    return trimmed
  }

  // Google Drive sharing links:
  // e.g. https://drive.google.com/file/d/1_fDDQn4y-KYdbuUWhcdRupN6bBNTwBXU/view?usp=sharing
  // e.g. https://drive.google.com/open?id=1_fDDQn4y-KYdbuUWhcdRupN6bBNTwBXU
  // e.g. https://drive.google.com/uc?id=1_fDDQn4y-KYdbuUWhcdRupN6bBNTwBXU
  if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
    let fileId: string | null = null
    const m1 = trimmed.match(/\/file\/d\/([-\w]{25,})/)
    if (m1) {
      fileId = m1[1]
    } else {
      const m2 = trimmed.match(/[?&]id=([-\w]{25,})/)
      if (m2) {
        fileId = m2[1]
      } else {
        const m3 = trimmed.match(/[-\w]{25,}/)
        if (m3) fileId = m3[0]
      }
    }

    if (fileId) {
      // lh3.googleusercontent.com provides direct, high-speed public CDN image delivery
      return `https://lh3.googleusercontent.com/d/${fileId}`
    }
  }

  // Dropbox links
  if (trimmed.includes('dropbox.com')) {
    return trimmed.replace('dl=0', 'raw=1').replace('?dl=1', '?raw=1')
  }

  return trimmed
}

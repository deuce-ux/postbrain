/* eslint-disable @typescript-eslint/no-explicit-any */
export function parseFacebookPosts(jsonData: any): string[] {
  const posts: string[] = []

  function decodeText(str: string): string {
    try {
      return decodeURIComponent(escape(str))
    } catch {
      return str
    }
  }

  function crawl(obj: any, depth: number = 0): void {
    if (depth > 10 || !obj) return

    if (typeof obj === 'string') {
      const decoded = decodeText(obj)
      if (decoded.length > 30 &&
          !decoded.startsWith('http') &&
          !decoded.startsWith('www.') &&
          decoded.split(' ').length > 4) {
        posts.push(decoded)
      }
      return
    }

    if (Array.isArray(obj)) {
      obj.forEach(item => crawl(item, depth + 1))
      return
    }

    if (typeof obj === 'object') {
      // Priority fields first
      const priorityFields = ['post', 'message', 'text', 'content', 'description']
      for (const field of priorityFields) {
        if (obj[field] && typeof obj[field] === 'string' && obj[field].length > 30) {
          posts.push(decodeText(obj[field]))
        }
      }

      // Then recurse into all other fields
      for (const key of Object.keys(obj)) {
        if (!priorityFields.includes(key)) {
          crawl(obj[key], depth + 1)
        }
      }
    }
  }

  crawl(jsonData)

  // Deduplicate and filter
  const unique = Array.from(new Set(posts))
  return unique
    .filter(p => p.length > 30)
    .filter(p => p.split(' ').length > 4)
    .filter(p => !p.startsWith('http'))
    .filter(p => !p.startsWith('www'))
    .filter(p => !p.includes('shared a memory'))
    .filter(p => !p.includes('was tagged'))
    .filter(p => !p.includes('added a new photo'))
    .filter(p => !p.includes('updated his cover'))
    .filter(p => !p.includes('updated her cover'))
    .slice(0, 50)
}

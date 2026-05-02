export function parseFacebookPosts(jsonData: Record<string, unknown> | unknown[]): string[] {
  const posts: string[] = []

  try {
    const data = jsonData as Record<string, unknown>

    // Format 1: { posts: [{ data: [{ post: "text" }] }] }
    if (data.posts && Array.isArray(data.posts)) {
      for (const post of data.posts as Record<string, unknown>[]) {
        if (post.data && Array.isArray(post.data)) {
          for (const item of post.data as Record<string, unknown>[]) {
            if (typeof item.post === 'string' && item.post.length > 20) {
              posts.push(item.post)
            }
          }
        }
        if (typeof post.title === 'string' && post.title.length > 20) {
          posts.push(post.title)
        }
      }
    }

    // Format 2: direct array of post objects
    if (Array.isArray(jsonData)) {
      for (const post of jsonData as Record<string, unknown>[]) {
        if (post.data && Array.isArray(post.data)) {
          for (const item of post.data as Record<string, unknown>[]) {
            if (typeof item.post === 'string' && item.post.length > 20) {
              posts.push(item.post)
            }
          }
        }
      }
    }

    // Format 3: { timeline_posts: [...] }
    if (data.timeline_posts && Array.isArray(data.timeline_posts)) {
      for (const post of data.timeline_posts as Record<string, unknown>[]) {
        if (post.data && Array.isArray(post.data)) {
          for (const item of post.data as Record<string, unknown>[]) {
            if (typeof item.post === 'string') {
              posts.push(item.post)
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Parse error:', error)
  }

  const seen = new Set<string>()
  const unique = posts.filter(p => seen.has(p) ? false : (seen.add(p), true))
  return unique
    .filter(p => p.length > 30)
    .filter(p => !p.startsWith('http'))
    .slice(0, 50)
}

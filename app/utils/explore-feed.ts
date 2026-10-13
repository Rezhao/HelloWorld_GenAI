// Mix communities in rounds so one busy community cannot fill the top of Home.
export function buildExploreFeed<T extends { community_id: string | null }>(
  posts: T[],
  publicCommunityIds: string[],
  limit = 100,
  random: () => number = Math.random,
): T[] {
  const publicIds = new Set(publicCommunityIds)
  const groups = new Map<string, T[]>()
  for (const post of posts) {
    if (!post.community_id || !publicIds.has(post.community_id)) continue
    const group = groups.get(post.community_id) ?? []
    group.push(post)
    groups.set(post.community_id, group)
  }
  function shuffle<U>(items: U[]) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[items[i], items[j]] = [items[j], items[i]]
    }
    return items
  }
  const remaining = [...groups.values()].map(shuffle)
  const feed: T[] = []
  while (remaining.some((group) => group.length > 0) && feed.length < limit) {
    for (const group of shuffle(remaining.filter((items) => items.length > 0))) {
      if (feed.length >= limit) break
      feed.push(group.pop()!)
    }
  }
  return feed
}

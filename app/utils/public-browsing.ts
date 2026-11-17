import 'server-only'
import { createClient } from './server'
import { buildExploreFeed } from './explore-feed'
import type { Community } from './community'
import type { DisplayGeneration } from '../home/home-workspace'
import type { PostComment } from '../home/post/comment-thread'

export async function getPublicCommunities(): Promise<Community[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('public_community_directory')
  if (error) throw Error('Public browsing is not configured yet. Apply supabase/public-browsing.sql in Melon’s Supabase project.')
  return (data ?? []).map((community: Community & { avatar_path?: string; banner_path?: string }) => ({
    ...community,
    is_member: false,
    avatar_url: community.avatar_path ? supabase.storage.from('appearance-images').getPublicUrl(community.avatar_path).data.publicUrl : null,
    banner_url: community.banner_path ? supabase.storage.from('appearance-images').getPublicUrl(community.banner_path).data.publicUrl : null,
  }))
}

export async function getPublicPosts(communityId: string | null = null, postId: string | null = null, shuffle = false): Promise<DisplayGeneration[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('public_community_posts', { target_community: communityId, target_post: postId })
  if (error) throw Error('Unable to load public posts. Check the public-browsing migration.')
  const rows: DisplayGeneration[] = data ?? []
  const selected = shuffle ? buildExploreFeed(rows, [...new Set(rows.flatMap((post) => post.community_id ? [post.community_id] : []))]) : rows.slice(0, 100)
  return Promise.all(selected.map(async (post) => {
    const { data } = await supabase.storage.from('generated-media').createSignedUrl(post.image_path, 300)
    return { ...post, image_url: data?.signedUrl ?? '', user_vote: 0, likes_count: Number(post.likes_count) }
  }))
}

export async function getPublicComments(postId: string, page: number): Promise<{ items: PostComment[]; total: number }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('public_post_comments', { target_post: postId, page_number: page })
  if (error) throw Error('Unable to load public comments.')
  return { items: data.items ?? [], total: Number(data.total ?? 0) }
}

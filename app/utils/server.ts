'use server'

import { createServerClient } from '@supabase/ssr'
import { revalidatePath } from 'next/cache'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { isPostId, validateComment } from './comments'
import { validateCommunity, type Community } from './community'
import { resolveUserProfile, type UserProfile } from './profile'

export type { UserProfile } from './profile'

export async function createClient() {
  const cookieStore = await cookies()

  // If you later generate types from Supabase, pass them here: createServerClient<Database>(...)
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method can be ignored if the middleware is handling it
          }
        },
      },
    }
  )
}

export async function getUserProfile(user: {
  id: string
  email?: string
  user_metadata?: Record<string, unknown>
  identities?: Array<{ provider?: string; identity_data?: Record<string, unknown> | null }>
}) {
  const supabase = await createClient()
  const { data: profileById, error } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle() as { data: UserProfile | null; error: { message: string } | null }

  if (error) throw new Error(error.message)

  const profile = resolveUserProfile(user, profileById)
  if (!profileById) {
    // Never replace a profile that was saved concurrently during sign-in.
    const { error: insertError } = await supabase.from('profiles').upsert(profile, {
      onConflict: 'id',
      ignoreDuplicates: true,
    })
    if (insertError) throw new Error(insertError.message)
  } else if (!profileById.avatar_url && profile.avatar_url) {
    // Persist the provider default for post author cards, without replacing uploads.
    const { error: avatarError } = await supabase.from('profiles')
      .update({ avatar_url: profile.avatar_url })
      .eq('id', user.id)
      .is('avatar_url', null)
    if (avatarError) throw new Error(avatarError.message)
  }

  return profile
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const requestHeaders = await headers()
  const origin = requestHeaders.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL

  if (!origin) {
    throw new Error('Missing site URL for Google OAuth redirect.')
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  return data.url
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    if (error.message.toLowerCase().includes('invalid login credentials')) {
      throw new Error('No password sign-in is set up for this email. Please sign in using Google.')
    }

    throw new Error(error.message)
  }
}

export async function signUpWithPassword(
  firstName: string,
  lastName: string,
  email: string,
  password: string,
) {
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  if (currentUser) {
    throw new Error('This email is already associated with an account. Please sign in with Google.')
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        password_set: true,
      },
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      throw new Error('This email already has an account. Please sign in instead.')
    }

    throw new Error(error.message)
  }

  if (data.user && data.user.identities?.length === 0) {
    throw new Error('This email already has an account. Please sign in instead.')
  }

}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function updateProfile(
  firstName: string,
  lastName: string,
  avatarUrl: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be signed in to update your profile.')
  }

  const { error: authError } = await supabase.auth.updateUser({
    data: { first_name: firstName, last_name: lastName },
  })

  if (authError) {
    throw new Error(authError.message)
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      email: user.email,
      first_name: firstName,
      last_name: lastName,
      avatar_url: avatarUrl || null,
    })
    .eq('id', user.id)

  if (profileError) {
    throw new Error(profileError.message)
  }

  revalidatePath('/', 'layout')
}

export async function updatePassword(currentPassword: string, newPassword: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    throw new Error('You must be signed in to update your password.')
  }

  if (currentPassword) {
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (verifyError) {
      throw new Error('Current password is incorrect.')
    }
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
    data: {
      ...user.user_metadata,
      password_set: true,
    },
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const file = formData.get('avatar')

  if (!user) {
    throw new Error('You must be signed in to upload a profile photo.')
  }

  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Choose an image before uploading.')
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Profile photos must be image files.')
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Profile photos must be smaller than 5 MB.')
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { contentType: file.type, cacheControl: '3600' })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(path)
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl.publicUrl })
    .eq('id', user.id)

  if (profileError) {
    throw new Error(profileError.message)
  }

  revalidatePath('/', 'layout')
  return publicUrl.publicUrl
}

export async function createGeneration(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const file = formData.get('image')
  const prompt = formData.get('prompt')
  const communityId = formData.get('communityId')

  if (!user) {
    throw new Error('You must be signed in to create a generation.')
  }

  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Choose an image before generating a caption.')
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files can be captioned.')
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Images must be smaller than 10 MB.')
  }

  if (typeof prompt !== 'string' || prompt.trim().length < 5 || prompt.trim().length > 500) {
    throw new Error('Add a caption prompt between 5 and 500 characters.')
  }

  if (typeof communityId !== 'string' || !communityId) {
    throw new Error('Choose a community for your post.')
  }
  const { data: community, error: communityError } = await supabase.from('communities')
    .select('id, visibility, created_by').eq('id', communityId).maybeSingle()
  if (communityError) throw new Error(communityError.message)
  if (!community) throw new Error('Community not found.')
  const { data: membership, error: membershipError } = await supabase.from('community_members')
    .select('community_id').eq('community_id', communityId).eq('user_id', user.id).maybeSingle()
  if (membershipError) throw new Error(membershipError.message)
  if (!membership && community.created_by !== user.id) {
    if (community.visibility === 'private') {
      throw new Error('The owner must approve your request before you can post in this private community.')
    }
    const { error: joinError } = await supabase.from('community_members')
      .insert({ community_id: communityId, user_id: user.id })
    if (joinError && joinError.code !== '23505') throw new Error(joinError.message)
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Gemini is not configured yet. Add GEMINI_API_KEY to your environment.')
  }

  const imageBytes = Buffer.from(await file.arrayBuffer()).toString('base64')
  const generationPrompt = `${prompt.trim()}

Return only one complete sentence between 8 and 20 words. Do not use bullets, labels, quotation marks, emojis, or markdown. Finish the sentence before stopping.`
  const requestBody = JSON.stringify({
    contents: [{
      parts: [
        { text: generationPrompt },
        { inline_data: { mime_type: file.type, data: imageBytes } },
      ],
    }],
    generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
  })
  let geminiResponse: Response | null = null

  for (let attempt = 0; attempt < 2; attempt += 1) {
    geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: requestBody,
      },
    )

    if (geminiResponse.ok || ![429, 500, 503].includes(geminiResponse.status)) {
      break
    }

    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
  }

  if (!geminiResponse || !geminiResponse.ok) {
    const providerError = geminiResponse
      ? await geminiResponse.json().catch(() => null) as { error?: { message?: string } } | null
      : null
    const message = providerError?.error?.message
    throw new Error(message ? `Gemini error: ${message}` : 'Gemini could not generate a caption. Try again shortly.')
  }

  const geminiData = await geminiResponse.json() as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> }
      finishReason?: string
    }>
    promptFeedback?: { blockReason?: string }
  }
  const firstCandidate = geminiData.candidates?.[0]
  const caption = firstCandidate?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim()

  if (!caption) {
    const reason = firstCandidate?.finishReason || geminiData.promptFeedback?.blockReason
    throw new Error(reason
      ? `Gemini did not return a caption (${reason}). Try a different image or prompt.`
      : 'Gemini returned an empty caption. Try a different image.')
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const imagePath = `${user.id}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await supabase.storage
    .from('generated-media')
    .upload(imagePath, file, { contentType: file.type, cacheControl: '3600' })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { error: generationError } = await supabase
    .from('ai_generations')
    .insert({
      user_id: user.id,
      community_id: typeof communityId === 'string' && communityId ? communityId : null,
      image_path: imagePath,
      prompt: prompt.trim(),
      caption,
    })

  if (generationError) {
    await supabase.storage.from('generated-media').remove([imagePath])
    throw new Error(generationError.message)
  }

  revalidatePath('/home')
  revalidatePath('/home/my-posts')
  if (typeof communityId === 'string' && communityId) {
    revalidatePath(`/home/community/${communityId}`)
  }
}

export async function getCommunities() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('communities')
    .select('id, name, description, visibility, created_by, created_at')
    .order('name')

  if (error) {
    throw new Error(error.message)
  }

  const { data: memberships, error: membershipError } = await supabase.from('community_members')
    .select('community_id').eq('user_id', user.id)
  if (membershipError) throw new Error(membershipError.message)
  return (data ?? []).map((community) => ({
    ...community,
    is_member: community.created_by === user.id || (memberships ?? []).some((member) => member.community_id === community.id),
  })) as Community[]
}

export async function getProfileCards(userIds: string[]) {
  const supabase = await createClient()

  if (userIds.length === 0) return {}

  const { data, error } = await supabase
    .from('profile_cards')
    .select('id, first_name, last_name, avatar_url')
    .in('id', userIds)

  if (error) {
    throw new Error(error.message)
  }

  return Object.fromEntries((data ?? []).map((profile) => [profile.id, profile]))
}

export async function createCommunity(name: string, description: string, visibility: 'public' | 'private') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be signed in to create a community.')
  }

  const values = validateCommunity(name, description, visibility)

  const { data: community, error: communityError } = await supabase
    .from('communities')
    .insert({ ...values, created_by: user.id })
    .select('id, name')
    .single()

  if (communityError) {
    throw new Error(communityError.code === '23505'
      ? 'That community already exists.'
      : communityError.message)
  }

  revalidatePath('/home')
  return community
}

export async function voteOnGeneration(generationId: string, vote: 1 | -1) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be signed in to vote.')
  }

  const { error } = await supabase
    .from('generation_votes')
    .upsert(
      { generation_id: generationId, user_id: user.id, vote },
      { onConflict: 'generation_id,user_id' },
    )

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/home')
  revalidatePath(`/home/post/${generationId}`)
}

export async function deleteGeneration(generationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be signed in to delete a post.')
  }

  const { data: generation, error: lookupError } = await supabase
    .from('ai_generations')
    .select('image_path')
    .eq('id', generationId)
    .eq('user_id', user.id)
    .maybeSingle() as { data: { image_path: string } | null, error: { message: string } | null }

  if (lookupError) {
    throw new Error(lookupError.message)
  }

  if (!generation) {
    throw new Error('Post not found or you do not own it.')
  }

  const { data: deletedGenerations, error: deleteError } = await supabase
    .from('ai_generations')
    .delete()
    .eq('id', generationId)
    .eq('user_id', user.id)
    .select('id')

  if (deleteError) {
    throw new Error(`Database delete failed: ${deleteError.message}`)
  }

  if (!deletedGenerations || deletedGenerations.length === 0) {
    throw new Error('The post could not be deleted. Run the latest supabase/schema.sql to enable delete permissions.')
  }

  const { error: storageError } = await supabase.storage
    .from('generated-media')
    .remove([generation.image_path])

  if (storageError) {
    throw new Error(`Database post deleted, but image deletion failed. Run the storage delete policy in Supabase: ${storageError.message}`)
  }

  revalidatePath('/home')
  revalidatePath(`/home/post/${generationId}`)
}

export async function joinCommunity(communityId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sign in to join a community.')
  const { data: community, error } = await supabase.from('communities')
    .select('visibility').eq('id', communityId).single()
  if (error) throw new Error(error.message)
  const table = community.visibility === 'private' ? 'community_join_requests' : 'community_members'
  const { error: joinError } = await supabase.from(table).insert({ community_id: communityId, user_id: user.id })
  if (joinError && joinError.code !== '23505') throw new Error(joinError.message)
  revalidatePath('/home', 'layout')
}

export async function reviewCommunityRequest(communityId: string, userId: string, approve: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sign in to review requests.')
  if (typeof approve !== 'boolean') throw new Error('Choose approve or decline.')
  const { error } = await supabase.rpc('review_community_request', {
    target_community: communityId, target_user: userId, approve,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/home', 'layout')
}

export async function addComment(generationId: string, body: string) {
  if (!isPostId(generationId)) throw new Error('Post not found.')
  const text = validateComment(body)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sign in to comment.')
  const { data: post, error: postError } = await supabase.from('ai_generations')
    .select('id').eq('id', generationId).maybeSingle()
  if (postError) throw new Error(postError.message)
  if (!post) throw new Error('This post is unavailable or you do not have access to it.')
  await getUserProfile(user)
  const { error } = await supabase.from('generation_comments')
    .insert({ generation_id: generationId, user_id: user.id, body: text })
  if (error) throw new Error(error.message)
  revalidatePath(`/home/post/${generationId}`)
}

export async function deleteComment(generationId: string, commentId: string) {
  if (!isPostId(generationId) || !isPostId(commentId)) throw new Error('Comment not found.')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sign in to delete a comment.')
  const { data, error } = await supabase.from('generation_comments').delete()
    .eq('id', commentId).eq('generation_id', generationId).eq('user_id', user.id).select('id')
  if (error) throw new Error(error.message)
  if (!data?.length) throw new Error('Comment not found or you do not own it.')
  revalidatePath(`/home/post/${generationId}`)
}

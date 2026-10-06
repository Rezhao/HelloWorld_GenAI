'use server'

import { createServerClient } from '@supabase/ssr'
import { revalidatePath } from 'next/cache'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'

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

  return publicUrl.publicUrl
}

export async function createGeneration(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const file = formData.get('image')
  const prompt = formData.get('prompt')

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
      image_path: imagePath,
      prompt: prompt.trim(),
      caption,
    })

  if (generationError) {
    await supabase.storage.from('generated-media').remove([imagePath])
    throw new Error(generationError.message)
  }

  revalidatePath('/home')
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
}

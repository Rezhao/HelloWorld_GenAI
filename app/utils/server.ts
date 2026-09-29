'use server'

import { createServerClient } from '@supabase/ssr'
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

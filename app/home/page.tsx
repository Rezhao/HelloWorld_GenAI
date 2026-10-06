import { redirect } from 'next/navigation'
import { createClient } from '../utils/server'
import Login from '../login'
import HomeWorkspace, { type Generation } from './home-workspace'

interface Profile {
  first_name: string | null
  last_name: string | null
  email: string | null
  avatar_url: string | null
}

interface Vote {
  generation_id: string
  user_id: string
  vote: 1 | -1
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const { data: profileById } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, avatar_url')
    .eq('id', user.id)
    .maybeSingle() as { data: Profile | null }

  const { data: profileByEmail } = profileById || !user.email
    ? { data: null }
    : await supabase
      .from('profiles')
      .select('first_name, last_name, email, avatar_url')
      .eq('email', user.email)
      .maybeSingle() as { data: Profile | null }

  const profile = profileById ?? profileByEmail
  const displayName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(' ') || user.user_metadata?.full_name || user.email || 'there'

  const { data: generationRows } = await supabase
    .from('ai_generations')
    .select('id, image_path, prompt, caption, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(30) as { data: Generation[] | null }

  const { data: votes } = await supabase
    .from('generation_votes')
    .select('generation_id, user_id, vote') as { data: Vote[] | null }

  const generations = await Promise.all((generationRows ?? []).map(async (generation) => {
    const { data } = await supabase.storage
      .from('generated-media')
      .createSignedUrl(generation.image_path, 60 * 60)

    const generationVotes = (votes ?? []).filter((vote) => vote.generation_id === generation.id)
    return {
      ...generation,
      image_url: data?.signedUrl ?? '',
      likes_count: generationVotes.filter((vote) => vote.vote === 1).length,
      user_vote: (generationVotes.find((vote) => vote.user_id === user.id)?.vote ?? 0) as -1 | 0 | 1,
    }
  }))

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-6 sm:px-8 sm:py-8">
      <header className="mx-auto flex w-full max-w-5xl justify-end">
        <Login
          profile={profile ? { id: user.id, ...profile } : null}
          isSignedIn
        />
      </header>
      <section className="mx-auto w-full max-w-5xl pt-14 sm:pt-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-600">Rate My Captions</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
            Vote and generate new captions with AI.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Welcome, {displayName}. Upload an image, ask Gemini for a caption, and let the community decide if it lands.
          </p>
        </div>
        <HomeWorkspace generations={generations} userId={user.id} />
      </section>
    </main>
  )
}

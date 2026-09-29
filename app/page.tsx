import { createClient } from './utils/server'
import Login from './login'

interface DbItem {
  id: number
  created_at: string
  name: string
  weight: number
}

interface Profile {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

export default async function DataPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let profile: Profile | null = null

  if (user?.email) {
    const { data: profileByEmail } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, avatar_url')
      .eq('email', user.email)
      .maybeSingle() as { data: Profile | null }

    profile = profileByEmail

    if (!profile) {
      const { data: profileById } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle() as { data: Profile | null }

      profile = profileById
    }
  }

  const { data: items, error } = await supabase
    .from('animals')
    .select('*') as { data: DbItem[] | null, error: { message: string } | null }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 sm:py-8">
      <header className="mb-10 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Database Items</h1>
        </div>
        <Login profile={profile} isSignedIn={Boolean(user)} />
      </header>

      {error ? (
        <div>
          <h2 className="text-xl font-bold text-red-500">Error loading data</h2>
          <p className="mt-2">{error.message}</p>
        </div>
      ) : !items || items.length === 0 ? (
        <p className="text-slate-500">No items found in the database table.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">{item.name || 'Untitled'}</h2>
              <p className="mt-1 text-sm text-slate-500">Weight: {item.weight || 'N/A'}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

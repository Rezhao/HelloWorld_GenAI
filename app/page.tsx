import { createClient, getUserProfile } from './utils/server'
import Login from './login'

interface DbItem {
  id: number
  created_at: string
  name: string
  weight: number
}

export default async function DataPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const profile = user ? await getUserProfile(user) : null

  const { data: items, error } = await supabase
    .from('animals')
    .select('*') as { data: DbItem[] | null, error: { message: string } | null }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 sm:py-8">
      <header className="mb-10 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-melon-heading">Melon</h1>
        </div>
        <Login profile={profile} isSignedIn={Boolean(user)} />
      </header>

      {error ? (
        <div>
          <h2 className="text-xl font-bold text-melon-berry">Error loading data</h2>
          <p className="mt-2">{error.message}</p>
        </div>
      ) : !items || items.length === 0 ? (
        <p className="text-melon-muted">No items found in the database table.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-melon-border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-melon-heading">{item.name || 'Untitled'}</h2>
              <p className="mt-1 text-sm text-melon-muted">Weight: {item.weight || 'N/A'}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

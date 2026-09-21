import { createClient } from '@/app/utils/server'

// Optional: Define an interface matching your table structure for strict typing
interface DbItem {
  id: number
  created_at: string
  name: string
  weight: number
}

export default async function HomePage() {
  const supabase = await createClient()

  // Fetch data typed to your custom interface
  const { data: items, error } = await supabase
    .from('animals') 
    .select('*') as { data: DbItem[] | null, error: any }

  if (error) {
    return (
      <main className="p-8">
        <h1 className="text-xl font-bold text-red-500">Error loading data</h1>
        <p>{error.message}</p>
      </main>
    )
  }

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Database Items</h1>
      
      {!items || items.length === 0 ? (
        <p className="text-gray-500">No items found in the database table.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li 
              key={item.id} 
              className="p-4 border rounded-lg shadow-sm bg-white"
            >
              <h2 className="text-lg font-semibold">{item.name || 'Untitled'}</h2>
              <p className="text-sm text-gray-500">Weight: {item.weight || 'N/A'}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

import { safeReturnPath } from '../utils/auth-return'
import Link from 'next/link'
import SignInForm from './sign-in-form'

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const returnTo = safeReturnPath((await searchParams).next)
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-melon-border border-t-4 border-t-melon-pink bg-white p-8 shadow-xl shadow-melon-plum/5">
        <Link href={returnTo} className="text-sm font-semibold text-melon-green-dark hover:text-melon-green-dark">
          Back to Melon
        </Link>
        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-melon-green-dark">Welcome to Melon</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-melon-heading">Sign in</h1>
        <p className="mt-2 text-sm text-melon-muted">Use your email or continue with Google.</p>
        <SignInForm returnTo={returnTo} />
      </section>
    </main>
  )
}
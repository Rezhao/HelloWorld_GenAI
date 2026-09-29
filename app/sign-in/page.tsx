import Link from 'next/link'
import SignInForm from './sign-in-form'

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
        <Link href="/" className="text-sm font-semibold text-teal-600 hover:text-teal-700">
          Back to workspace
        </Link>
        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-teal-600">Welcome back</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Sign in</h1>
        <p className="mt-2 text-sm text-slate-500">Use your email or continue with Google.</p>
        <SignInForm />
      </section>
    </main>
  )
}
'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithGoogle, signInWithPassword, signUpWithPassword } from '../utils/server'

type AuthMode = 'sign-in' | 'sign-up'

export default function SignInForm() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode)
    setMessage('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    try {
      if (mode === 'sign-in') {
        await signInWithPassword(email, password)
        router.push('/home')
      } else {
        await signUpWithPassword(firstName, lastName, email, password)
        setMessage('Account created. Check your email if confirmation is required, then sign in.')
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to complete authentication.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleSignIn() {
    try {
      const googleUrl = await signInWithGoogle()
      window.location.assign(googleUrl)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to start Google sign-in.')
    }
  }

  return (
    <div className="mt-8">
      <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Authentication options">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'sign-in'}
          onClick={() => switchMode('sign-in')}
          className={`rounded-md px-4 py-2.5 text-sm font-semibold transition ${mode === 'sign-in' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'sign-up'}
          onClick={() => switchMode('sign-up')}
          className={`rounded-md px-4 py-2.5 text-sm font-semibold transition ${mode === 'sign-up' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === 'sign-up' && (
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>First name</span>
              <input
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-3 text-slate-950 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Last name</span>
              <input
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-3 text-slate-950 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </label>
          </div>
        )}

        <label className="block space-y-2 text-sm font-medium text-slate-700">
          <span>Email address</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-3 text-slate-950 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </label>

        <label className="block space-y-2 text-sm font-medium text-slate-700">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            minLength={6}
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-3 text-slate-950 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Please wait...' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        <span>OR</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <span className="text-base font-bold text-blue-500" aria-hidden="true">G</span>
        Continue with Google
      </button>

      {message && <p className="mt-4 text-center text-sm text-slate-600">{message}</p>}
    </div>
  )
}

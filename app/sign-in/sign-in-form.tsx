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
      <div className="grid grid-cols-2 rounded-lg bg-melon-blush p-1" role="tablist" aria-label="Authentication options">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'sign-in'}
          onClick={() => switchMode('sign-in')}
          className={`rounded-md px-4 py-2.5 text-sm font-semibold transition ${mode === 'sign-in' ? 'bg-white text-melon-forest shadow-sm' : 'text-melon-muted hover:text-melon-ink'}`}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'sign-up'}
          onClick={() => switchMode('sign-up')}
          className={`rounded-md px-4 py-2.5 text-sm font-semibold transition ${mode === 'sign-up' ? 'bg-white text-melon-forest shadow-sm' : 'text-melon-muted hover:text-melon-ink'}`}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === 'sign-up' && (
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-2 text-sm font-medium text-melon-ink">
              <span>First name</span>
              <input
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
                required
                className="w-full rounded-lg border border-melon-border px-3 py-3 text-melon-forest outline-none transition focus:border-melon-green focus:ring-2 focus:ring-melon-mint"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-melon-ink">
              <span>Last name</span>
              <input
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
                required
                className="w-full rounded-lg border border-melon-border px-3 py-3 text-melon-forest outline-none transition focus:border-melon-green focus:ring-2 focus:ring-melon-mint"
              />
            </label>
          </div>
        )}

        <label className="block space-y-2 text-sm font-medium text-melon-ink">
          <span>Email address</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            className="w-full rounded-lg border border-melon-border px-3 py-3 text-melon-forest outline-none transition focus:border-melon-green focus:ring-2 focus:ring-melon-mint"
          />
        </label>

        <label className="block space-y-2 text-sm font-medium text-melon-ink">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            minLength={6}
            required
            className="w-full rounded-lg border border-melon-border px-3 py-3 text-melon-forest outline-none transition focus:border-melon-green focus:ring-2 focus:ring-melon-mint"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-melon-pink px-4 py-3 text-sm font-semibold text-melon-yellow transition hover:bg-melon-yellow hover:text-melon-pink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Please wait...' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-melon-muted">
        <span className="h-px flex-1 bg-melon-border" />
        <span>OR</span>
        <span className="h-px flex-1 bg-melon-border" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-melon-border px-4 py-3 text-sm font-semibold text-melon-ink transition hover:bg-melon-cream"
      >
        <span className="text-base font-bold text-blue-500" aria-hidden="true">G</span>
        Continue with Google
      </button>

      {message && <p className="mt-4 text-center text-sm text-melon-muted">{message}</p>}
    </div>
  )
}

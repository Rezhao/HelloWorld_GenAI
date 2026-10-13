'use client'

import { FormEvent, useState } from 'react'
import Avatar from '../avatar'
import { useRouter } from 'next/navigation'
import { updatePassword, updateProfile, uploadAvatar } from '../utils/server'

type SettingsValues = {
  firstName: string
  lastName: string
  email: string
  avatarUrl: string
}

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
      {!visible && <path d="m4 4 16 16" />}
    </svg>
  )
}

export default function SettingsForm({
  initialValues,
  hasPassword,
}: {
  initialValues: SettingsValues
  hasPassword: boolean
}) {
  const router = useRouter()
  const [values, setValues] = useState(initialValues)
  const [passwordIsSet, setPasswordIsSet] = useState(hasPassword)
  const [message, setMessage] = useState('')
  const [isEditingPassword, setIsEditingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [visiblePassword, setVisiblePassword] = useState<'current' | 'new' | 'confirm' | null>(null)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(initialValues.avatarUrl)
  const [avatarMessage, setAvatarMessage] = useState('')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  function updateField(field: keyof SettingsValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleAvatarSelection(file: File | undefined) {
    if (!file) return
    setIsUploadingAvatar(true)
    setAvatarMessage('')

    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const avatarUrl = await uploadAvatar(formData)
      setAvatarPreview(avatarUrl)
      updateField('avatarUrl', avatarUrl)
      setAvatarMessage('Profile photo updated.')
      router.refresh()
    } catch (error) {
      setAvatarMessage(error instanceof Error ? error.message : 'Unable to upload profile photo.')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  async function handlePasswordSubmit() {
    setPasswordMessage('')

    if (newPassword !== confirmPassword) {
      setPasswordMessage('New passwords do not match.')
      return
    }

    setIsSavingPassword(true)

    try {
      await updatePassword(currentPassword, newPassword)
      setPasswordIsSet(true)
      setPasswordMessage('Password updated.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setIsEditingPassword(false)
    } catch (error) {
      setPasswordMessage(error instanceof Error ? error.message : 'Unable to update password.')
    } finally {
      setIsSavingPassword(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setMessage('')

    try {
      await updateProfile(
        values.firstName,
        values.lastName,
        values.avatarUrl,
      )
      setMessage('Profile saved.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save profile.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-melon-ink">
          <span>First name</span>
          <input
            type="text"
            value={values.firstName}
            onChange={(event) => updateField('firstName', event.target.value)}
            autoComplete="given-name"
            required
            className="w-full rounded-lg border border-melon-border px-3 py-3 text-melon-forest outline-none transition focus:border-melon-green focus:ring-2 focus:ring-melon-mint"
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-melon-ink">
          <span>Last name</span>
          <input
            type="text"
            value={values.lastName}
            onChange={(event) => updateField('lastName', event.target.value)}
            autoComplete="family-name"
            required
            className="w-full rounded-lg border border-melon-border px-3 py-3 text-melon-forest outline-none transition focus:border-melon-green focus:ring-2 focus:ring-melon-mint"
          />
        </label>
      </div>

      <label className="block space-y-2 text-sm font-medium text-melon-ink">
        <span>Email</span>
        <input
          type="email"
          value={values.email}
          autoComplete="email"
          readOnly
          aria-readonly="true"
          className="w-full cursor-not-allowed rounded-lg border border-melon-border bg-melon-cream px-3 py-3 text-melon-muted outline-none"
        />
      </label>

      <div className="space-y-3">
        <span className="block text-sm font-medium text-melon-ink">Profile photo</span>
        <div className="flex items-center gap-4">
          <Avatar src={avatarPreview} name={[values.firstName, values.lastName].filter(Boolean).join(' ')} className="h-16 w-16 text-lg" />
          <div className="min-w-0 flex-1 space-y-3">
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={(event) => {
                void handleAvatarSelection(event.target.files?.[0])
                event.target.value = ''
              }}
              className="sr-only"
            />
            <label
              htmlFor="avatar-upload"
              className={`inline-block cursor-pointer rounded-lg border border-melon-border px-4 py-2.5 text-sm font-semibold text-melon-ink transition hover:bg-melon-cream ${isUploadingAvatar ? 'pointer-events-none opacity-60' : ''}`}
            >
              {isUploadingAvatar ? 'Uploading...' : 'Upload photo'}
            </label>
          </div>
        </div>
        {avatarMessage && <p className="text-sm text-melon-muted">{avatarMessage}</p>}
      </div>

      <div className="space-y-3">
        <span className="block text-sm font-medium text-melon-ink">Password</span>
        {!isEditingPassword ? (
          <div className="flex items-center gap-3">
            {passwordIsSet && (
              <input
                type="password"
                value="password-set"
                readOnly
                aria-label="Password is set"
                className="min-w-0 flex-1 rounded-lg border border-melon-border bg-melon-cream px-3 py-3 text-melon-muted outline-none"
              />
            )}
            <button
              type="button"
              onClick={() => setIsEditingPassword(true)}
              className="rounded-lg border border-melon-border px-3 py-3 text-sm font-semibold text-melon-ink transition hover:bg-melon-cream"
            >
              {passwordIsSet ? 'Edit password' : 'Set a password'}
            </button>
          </div>
        ) : (
          <div className="space-y-3 rounded-lg border border-melon-border p-4">
            {passwordIsSet && (
              <label className="block space-y-2 text-sm font-medium text-melon-ink">
                <span>Current password</span>
                <div className="relative">
                  <input
                    type={visiblePassword === 'current' ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                    className="w-full rounded-lg border border-melon-border px-3 py-3 pr-11 text-melon-forest outline-none transition focus:border-melon-green focus:ring-2 focus:ring-melon-mint"
                  />
                  <button
                    type="button"
                    onClick={() => setVisiblePassword(visiblePassword === 'current' ? null : 'current')}
                    aria-label={visiblePassword === 'current' ? 'Hide current password' : 'Show current password'}
                    className="absolute inset-y-0 right-0 px-3 text-melon-muted hover:text-melon-ink"
                  >
                    <EyeIcon visible={visiblePassword === 'current'} />
                  </button>
                </div>
              </label>
            )}
            <label className="block space-y-2 text-sm font-medium text-melon-ink">
              <span>New password</span>
              <div className="relative">
                <input
                  type={visiblePassword === 'new' ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                  className="w-full rounded-lg border border-melon-border px-3 py-3 pr-11 text-melon-forest outline-none transition focus:border-melon-green focus:ring-2 focus:ring-melon-mint"
                />
                <button
                  type="button"
                  onClick={() => setVisiblePassword(visiblePassword === 'new' ? null : 'new')}
                  aria-label={visiblePassword === 'new' ? 'Hide new password' : 'Show new password'}
                  className="absolute inset-y-0 right-0 px-3 text-melon-muted hover:text-melon-ink"
                >
                  <EyeIcon visible={visiblePassword === 'new'} />
                </button>
              </div>
            </label>
            <label className="block space-y-2 text-sm font-medium text-melon-ink">
              <span>Confirm new password</span>
              <div className="relative">
                <input
                  type={visiblePassword === 'confirm' ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                  className="w-full rounded-lg border border-melon-border px-3 py-3 pr-11 text-melon-forest outline-none transition focus:border-melon-green focus:ring-2 focus:ring-melon-mint"
                />
                <button
                  type="button"
                  onClick={() => setVisiblePassword(visiblePassword === 'confirm' ? null : 'confirm')}
                  aria-label={visiblePassword === 'confirm' ? 'Hide confirmation password' : 'Show confirmation password'}
                  className="absolute inset-y-0 right-0 px-3 text-melon-muted hover:text-melon-ink"
                >
                  <EyeIcon visible={visiblePassword === 'confirm'} />
                </button>
              </div>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handlePasswordSubmit}
                disabled={isSavingPassword}
                className="rounded-lg bg-melon-pink px-4 py-2.5 text-sm font-semibold text-melon-yellow transition hover:bg-melon-yellow hover:text-melon-pink disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingPassword ? 'Saving...' : 'Save password'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditingPassword(false)}
                className="rounded-lg border border-melon-border px-4 py-2.5 text-sm font-semibold text-melon-ink transition hover:bg-melon-cream"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {passwordMessage && <p className="text-sm text-melon-muted">{passwordMessage}</p>}
      </div>

      <button
        type="submit"
        disabled={isSaving}
        className="w-full rounded-lg bg-melon-pink px-4 py-3 text-sm font-semibold text-melon-yellow transition hover:bg-melon-yellow hover:text-melon-pink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? 'Saving...' : 'Save changes'}
      </button>

      {message && <p className="text-center text-sm text-melon-muted">{message}</p>}
    </form>
  )
}

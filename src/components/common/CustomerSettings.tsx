import { useState, type SubmitEvent } from 'react'
import { useMutation } from '@tanstack/react-query'

import type { UserProfile } from '../../auth/AuthContext'
import { supabase } from '../../lib/supabase'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Input from '../ui/Input'

type Settings = { full_name: string; phone: string | null }

export default function CustomerSettings({ profile, email, onSaved }: {
  profile: UserProfile
  email: string
  onSaved: (settings: Settings) => void
}) {
  const [validation, setValidation] = useState('')
  const save = useMutation({
    mutationFn: async (settings: Settings) => {
      const { error } = await supabase.from('user_profiles').update(settings)
        .eq('id', profile.id).select('id').single()
      if (error) throw error
    },
    onSuccess: (_, settings) => onSaved(settings),
  })

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (save.isPending) return
    const form = new FormData(event.currentTarget)
    const fullName = String(form.get('profile-name') ?? '').trim()
    const phone = String(form.get('profile-phone') ?? '').trim()
    if (!fullName || (phone && !/^\+?[0-9 ()-]{7,24}$/.test(phone))) {
      setValidation('Enter a name and, if provided, a valid phone number.')
      return
    }
    setValidation('')
    save.mutate({ full_name: fullName, phone: phone || null })
  }

  return (
    <Card id="customer-settings" className="scroll-mt-4">
      <h2 className="text-xl font-bold text-brand-navy">Customer settings</h2>
      <form className="mt-4 space-y-4" onSubmit={submit}>
        <Input name="profile-name" label="Full name" required maxLength={100} defaultValue={profile.full_name} autoComplete="name" />
        <Input name="profile-phone" label="Phone (optional)" type="tel" maxLength={24} defaultValue={profile.phone ?? ''} autoComplete="tel" />
        {email && <Input name="profile-email" label="Sign-in email" type="email" value={email} readOnly />}
        {validation && <Alert variant="error" title={validation} />}
        {save.isError && <Alert variant="error" title="Could not save your profile." />}
        {save.isSuccess && <Alert variant="success" title="Profile saved." />}
        <Button type="submit" variant="outline" loading={save.isPending}>Save profile</Button>
      </form>
    </Card>
  )
}

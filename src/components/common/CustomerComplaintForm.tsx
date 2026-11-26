import { useState, type SubmitEvent } from 'react'
import { useMutation } from '@tanstack/react-query'

import { supabase } from '../../lib/supabase'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Textarea from '../ui/Textarea'

export default function CustomerComplaintForm({ requestId }: { requestId: string }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const submit = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('submit_customer_complaint', {
        p_request_id: requestId,
        p_message: message.trim(),
      })
      if (error) throw error
      if (!data) throw new Error('Complaint not accepted')
    },
    onSuccess: () => {
      setMessage('')
      setOpen(false)
    },
  })

  function send(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!submit.isPending && message.trim().length >= 10) submit.mutate()
  }

  return (
    <div className="space-y-2">
      <Button size="sm" variant="ghost" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? 'Close complaint form' : 'Report a problem'}
      </Button>
      {submit.isSuccess && <Alert variant="success" title="Complaint sent to support." />}
      {open && (
        <form className="space-y-2 rounded-xl bg-slate-50 p-3" onSubmit={send}>
          <Textarea id={`complaint-${requestId}`} label="Message for support" rows={3} required minLength={10}
            maxLength={1000} value={message} onChange={(event) => setMessage(event.target.value)} />
          {submit.isError && <Alert variant="error" title="Could not send your complaint." />}
          <Button type="submit" size="sm" loading={submit.isPending} disabled={message.trim().length < 10}>Send complaint</Button>
        </form>
      )}
    </div>
  )
}

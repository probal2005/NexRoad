import { useState, type SubmitEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '../../lib/supabase'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Select from '../ui/Select'
import Textarea from '../ui/Textarea'

export default function CustomerRequestFeedback({ requestId, completed }: {
  requestId: string
  completed: boolean
}) {
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const technician = useQuery({
    queryKey: ['request-technician-name', requestId],
    enabled: open,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.rpc('customer_request_technician_name', { p_request_id: requestId }).abortSignal(signal).maybeSingle()
      if (error) throw error
      return data
    },
  })
  const feedbackKey = ['request-feedback', requestId]
  const feedback = useQuery({
    queryKey: feedbackKey,
    enabled: open && completed,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from('customer_request_feedback').select('rating, comment')
        .eq('request_id', requestId).abortSignal(signal).maybeSingle()
      if (error) throw error
      return data
    },
  })
  const save = useMutation({
    mutationFn: async (values: { rating: number; comment: string | null }) => {
      const { error } = await supabase.from('customer_request_feedback').insert({ request_id: requestId, ...values })
      if (error) throw error
      return values
    },
    onSuccess: (values) => client.setQueryData(feedbackKey, values),
    onError: () => client.invalidateQueries({ queryKey: feedbackKey }),
  })

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (save.isPending) return
    const data = new FormData(event.currentTarget)
    const comment = String(data.get('comment') ?? '').trim()
    save.mutate({ rating: Number(data.get('rating')), comment: comment || null })
  }

  return (
    <div className="space-y-3">
      <Button size="sm" variant="ghost" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? 'Hide technician details' : completed ? 'Technician and feedback' : 'Technician details'}
      </Button>
      {open && (
        <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          {technician.isPending && <p role="status">Loading technician details…</p>}
          {technician.isError && <Alert variant="error" title="Could not load the technician." />}
          {technician.data?.display_name && <p>Assigned technician <strong>{technician.data.display_name}</strong></p>}
          {technician.isSuccess && !technician.data?.display_name && <p>Technician name unavailable.</p>}
          {completed && feedback.isError && <Alert variant="error" title="Could not load your feedback." />}
          {completed && feedback.data && (
            <div>
              <p>Your rating <strong>{feedback.data.rating} / 5</strong></p>
              {feedback.data.comment && <p className="break-words">{feedback.data.comment}</p>}
            </div>
          )}
          {completed && technician.data && feedback.isSuccess && !feedback.data && (
            <form className="space-y-3" onSubmit={submit}>
              <Select id={`rating-${requestId}`} name="rating" label="Service rating" required
                options={[5, 4, 3, 2, 1].map((rating) => ({ value: String(rating), label: `${rating} / 5` }))} />
              <Textarea id={`comment-${requestId}`} name="comment" label="Comment (optional)" maxLength={1000} rows={2} />
              {save.isError && <Alert variant="error" title="Could not save your feedback." />}
              <Button type="submit" size="sm" loading={save.isPending}>Submit feedback</Button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

import { useEffect, useId, useRef, useState, type SubmitEvent } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { supabase } from '../../lib/supabase'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Textarea from '../ui/Textarea'

const timestamp = new Intl.DateTimeFormat('en-IN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Kolkata' })

export default function BookingChat({ requestId, viewer, unread }: {
  requestId: string
  viewer: 'customer' | 'technician'
  unread: number
}) {
  const fieldId = useId()
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const lastRead = useRef(0)
  const retryMessage = useRef<{ id: string; body: string } | null>(null)
  const messages = useInfiniteQuery({
    queryKey: ['booking-chat', requestId],
    enabled: open,
    refetchInterval: 15000,
    initialPageParam: null as number | null,
    queryFn: async ({ signal, pageParam }) => {
      const query = supabase.from('booking_chat_messages')
        .select('id, sender_role, body, created_at').eq('request_id', requestId)
        .order('id', { ascending: false }).limit(31).abortSignal(signal)
      if (pageParam != null) query.lt('id', pageParam)
      const { data, error } = await query
      if (error) throw error
      return { messages: data.slice(0, 30), next: data.length > 30 ? data[29].id : null }
    },
    getNextPageParam: ({ next }) => next,
  })
  const history = messages.data?.pages.flatMap((page) => page.messages)
  const send = useMutation({
    mutationFn: async (message: { id: string; body: string }) => {
      const { data, error } = await supabase.rpc('send_booking_chat', {
        p_request_id: requestId, p_client_id: message.id, p_body: message.body,
      })
      if (error) throw error
      if (data == null) throw new Error('Message unavailable')
    },
    onSuccess: () => {
      retryMessage.current = null
      setBody('')
      void client.invalidateQueries({ queryKey: ['booking-chat', requestId] })
    },
  })

  const newestIncoming = history?.find(({ sender_role }) => sender_role !== viewer)?.id ?? 0
  useEffect(() => {
    if (!open || !newestIncoming) return
    let cancelled = false
    function markRead() {
      if (cancelled || document.visibilityState !== 'visible' || newestIncoming <= lastRead.current) return
      lastRead.current = newestIncoming
      void (async () => {
        try {
          const { data, error } = await supabase.rpc('mark_booking_chat_read', { p_request_id: requestId, p_through_id: newestIncoming })
          if (!error && data) {
            if (!cancelled) await client.invalidateQueries({ queryKey: ['booking-chat-unread'] })
            return
          }
        } catch {
          // Retry the same read marker when the visible conversation refreshes.
        }
        if (lastRead.current === newestIncoming) lastRead.current = 0
      })()
    }
    markRead()
    document.addEventListener('visibilitychange', markRead)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', markRead)
    }
  }, [client, messages.dataUpdatedAt, newestIncoming, open, requestId])

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = body.trim()
    if (!content || send.isPending) return
    const previous = retryMessage.current
    const message = previous?.body === content ? previous : { id: crypto.randomUUID(), body: content }
    retryMessage.current = message
    send.mutate(message)
  }

  return (
    <div className="space-y-2">
      <Button size="sm" variant="outline" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? 'Hide booking chat' : 'Booking chat'}{unread > 0 ? ` · ${unread} unread` : ''}
      </Button>
      {open && (
        <div className="space-y-3 rounded-xl border border-slate-200 p-3">
          {messages.isPending && <p role="status" className="text-sm">Loading messages…</p>}
          {messages.isError && <Alert variant="error" title="Chat is unavailable for this booking." />}
          {history && (history.length ? (
            <>
              {messages.hasNextPage && <Button size="sm" variant="ghost" loading={messages.isFetchingNextPage}
                onClick={() => void messages.fetchNextPage()}>Load earlier messages</Button>}
              <ol aria-live="polite" className="max-h-72 space-y-2 overflow-y-auto">
                {[...history].reverse().map((message) => (
                  <li key={message.id} className="rounded-lg bg-slate-50 p-2 text-sm">
                    <p className="flex flex-wrap justify-between gap-1 text-xs text-slate-600">
                      <strong className="capitalize">{message.sender_role === viewer ? 'You' : message.sender_role}</strong>
                      <time dateTime={message.created_at}>{timestamp.format(new Date(message.created_at))}</time>
                    </p>
                    <p className="whitespace-pre-wrap break-words text-brand-navy">{message.body}</p>
                  </li>
                ))}
              </ol>
            </>
          ) : <p className="text-sm text-slate-600">No messages yet.</p>)}
          <form className="space-y-2" onSubmit={submit}>
            <Textarea id={fieldId} label="Message" maxLength={1000} rows={2} value={body}
              onChange={(event) => setBody(event.target.value)} />
            {send.isError && <Alert variant="error" title="Could not send your message. Try again." />}
            <Button size="sm" type="submit" loading={send.isPending} disabled={!body.trim()}>Send message</Button>
          </form>
        </div>
      )}
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'

import { supabase } from './supabase'

export function useBookingChatUnread(userId: string) {
  return useQuery({
    queryKey: ['booking-chat-unread', userId],
    refetchInterval: 15000,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.rpc('booking_chat_unread').abortSignal(signal)
      if (error) throw error
      return Object.fromEntries(data.map(({ request_id, unread_count }) => [request_id, unread_count]))
    },
  })
}

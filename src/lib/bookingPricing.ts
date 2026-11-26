import type { Json } from './database.types'

export type BookingQuote = {
  currency: 'INR'
  service: string
  base_inr: number
  service_inr: number
  distance_km: number
  distance_rate_inr: number
  distance_inr: number
  distance_basis: 'straight_line' | 'simulated_approach'
  fuel_type: string | null
  fuel_litres: number | null
  fuel_unit_inr: number | null
  fuel_inr: number
  total_inr: number
}

const format = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })
export const formatRupees = (value: number) => format.format(value)

export function readBookingQuote(value: Json | undefined): BookingQuote | null {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.currency !== 'INR') return null
  if (['base_inr', 'service_inr', 'distance_km', 'distance_rate_inr', 'distance_inr', 'fuel_inr', 'total_inr']
    .some((field) => typeof value[field] !== 'number')) return null
  return value as BookingQuote
}

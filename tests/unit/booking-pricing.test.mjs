import assert from 'node:assert/strict'
import test from 'node:test'
import { formatRupees, readBookingQuote } from '../../src/lib/bookingPricing.ts'

const quote = {
  currency: 'INR', service: 'towing', base_inr: 350, service_inr: 75,
  distance_km: 5, distance_rate_inr: 25, distance_inr: 125, distance_basis: 'straight_line',
  fuel_type: null, fuel_litres: null, fuel_unit_inr: null, fuel_inr: 0, total_inr: 550,
}

test('reads the server quote and formats INR using Indian grouping', () => {
  assert.deepEqual(readBookingQuote(quote), quote)
  assert.equal(formatRupees(123456.5), '₹1,23,456.50')
})

test('rejects unavailable and malformed server quotes', () => {
  for (const value of [null, [], { ...quote, currency: 'USD' }, { ...quote, total_inr: '550' }]) {
    assert.equal(readBookingQuote(value), null)
  }
})

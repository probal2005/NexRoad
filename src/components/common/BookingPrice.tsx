import { formatRupees, type BookingQuote } from '../../lib/bookingPricing'

export default function BookingPrice({ quote, finalCharge }: { quote: BookingQuote; finalCharge?: number | null }) {
  const charges = [
    ['Base charge', quote.base_inr],
    ['Service charge', quote.service_inr],
    [`Distance · ${quote.distance_km} km × ${formatRupees(quote.distance_rate_inr)}`, quote.distance_inr],
    ...(quote.fuel_type && quote.fuel_litres !== null && quote.fuel_unit_inr !== null
      ? [[`${quote.fuel_type} · ${quote.fuel_litres} L × ${formatRupees(quote.fuel_unit_inr)}`, quote.fuel_inr] as const] : []),
  ] as const

  return (
    <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
      <dl className="space-y-1">
        {charges.map(([label, amount]) => (
          <div key={label} className="flex justify-between gap-3"><dt className="first-letter:uppercase">{label}</dt><dd>{formatRupees(amount)}</dd></div>
        ))}
        <div className="flex justify-between gap-3 border-t border-slate-200 pt-2 font-bold text-brand-navy">
          <dt>Booking quote</dt><dd>{formatRupees(quote.total_inr)}</dd>
        </div>
        {finalCharge != null && <div className="flex justify-between gap-3 font-bold">
          <dt>Final simulated charge</dt><dd>{formatRupees(finalCharge)}</dd>
        </div>}
      </dl>
      <p className="text-xs text-slate-500">
        {quote.distance_basis === 'straight_line' ? 'Distance is estimated in a straight line between pickup and drop-off.' : 'Distance is a simulated 5 km approach.'}
      </p>
    </div>
  )
}

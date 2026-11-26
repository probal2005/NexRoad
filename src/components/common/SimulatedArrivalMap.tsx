import { useEffect, useState } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer } from 'react-leaflet'
import type { LatLngTuple } from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function SimulatedArrivalMap({ latitude, longitude, departedAt }: {
  latitude: number
  longitude: number
  departedAt: string
}) {
  const [now, setNow] = useState(() => Date.now())
  const progress = Math.max(0, Math.min(1, (now - Date.parse(departedAt)) / 45000))
  const pickup: LatLngTuple = [latitude, longitude]
  const start: LatLngTuple = [latitude + (latitude < 89.98 ? 0.01 : -0.01), longitude + (longitude < 179.98 ? 0.006 : -0.006)]
  const current: LatLngTuple = [
    start[0] + (pickup[0] - start[0]) * progress,
    start[1] + (pickup[1] - start[1]) * progress,
  ]

  useEffect(() => {
    if (progress >= 1) return
    const timer = window.setTimeout(() => setNow(Date.now()), 700)
    return () => window.clearTimeout(timer)
  }, [now, progress])

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-600">Simulated approach · {Math.round(progress * 100)}%</p>
      <MapContainer className="isolate h-56 w-full rounded-xl" bounds={[start, pickup]} boundsOptions={{ padding: [20, 20] }} scrollWheelZoom={false}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
        <Polyline positions={[start, pickup]} pathOptions={{ color: '#64748b', dashArray: '5 6' }} />
        <CircleMarker center={pickup} radius={7} pathOptions={{ color: '#0f172a', fillOpacity: 1 }} />
        <CircleMarker center={current} radius={8} pathOptions={{ color: '#047857', fillOpacity: 1 }} />
      </MapContainer>
    </div>
  )
}

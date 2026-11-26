import { useEffect, useState } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet'
import type { LatLngTuple } from 'leaflet'
import 'leaflet/dist/leaflet.css'

function KeepMarkerVisible({ point }: { point: LatLngTuple }) {
  const map = useMap()
  const [latitude, longitude] = point
  useEffect(() => {
    if (!map.getBounds().contains([latitude, longitude])) map.panTo([latitude, longitude])
  }, [map, latitude, longitude])
  return null
}

export default function SimulatedArrivalMap({ latitude, longitude, departedAt, live }: {
  latitude: number
  longitude: number
  departedAt: string | null
  live?: { latitude: number; longitude: number } | null
}) {
  const [now, setNow] = useState(() => Date.now())
  const progress = departedAt ? Math.max(0, Math.min(1, (now - Date.parse(departedAt)) / 45000)) : 0
  const pickup: LatLngTuple = [latitude, longitude]
  const start: LatLngTuple = [latitude + (latitude < 89.98 ? 0.01 : -0.01), longitude + (longitude < 179.98 ? 0.006 : -0.006)]
  const current: LatLngTuple = live ? [live.latitude, live.longitude] : [
    start[0] + (pickup[0] - start[0]) * progress,
    start[1] + (pickup[1] - start[1]) * progress,
  ]

  useEffect(() => {
    if (live || !departedAt || progress >= 1) return
    const timer = window.setTimeout(() => setNow(Date.now()), 700)
    return () => window.clearTimeout(timer)
  }, [departedAt, live, now, progress])

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-600">{live ? 'Shared technician location' : `Simulated approach · ${Math.round(progress * 100)}%`}</p>
      <MapContainer className="isolate h-56 w-full rounded-xl" bounds={[live ? current : start, pickup]} boundsOptions={{ padding: [20, 20] }} scrollWheelZoom={false}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
        {!live && <Polyline positions={[start, pickup]} pathOptions={{ color: '#64748b', dashArray: '5 6' }} />}
        {live && <KeepMarkerVisible point={current} />}
        <CircleMarker center={pickup} radius={7} pathOptions={{ color: '#0f172a', fillOpacity: 1 }} />
        <CircleMarker center={current} radius={8} pathOptions={{ color: '#047857', fillOpacity: 1 }} />
      </MapContainer>
    </div>
  )
}

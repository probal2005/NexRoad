import { useEffect } from 'react'
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { LatLngTuple } from 'leaflet'
import 'leaflet/dist/leaflet.css'

const chandigarh: LatLngTuple = [30.7333, 76.7794]

function PickupPoint({ position, onSelect }: {
  position: LatLngTuple | null
  onSelect: (latitude: number, longitude: number) => void
}) {
  const map = useMap()
  useMapEvents({
    click: ({ latlng }) => {
      const { lat, lng } = latlng.wrap()
      onSelect(lat, lng)
    },
  })

  useEffect(() => {
    if (position && !map.getBounds().contains(position)) map.panTo(position)
  }, [map, position])

  return position && <CircleMarker center={position} radius={8} pathOptions={{ color: '#047857', fillOpacity: 0.9 }} />
}

export default function PickupMap({ position, onSelect }: {
  position: LatLngTuple | null
  onSelect: (latitude: number, longitude: number) => void
}) {
  return (
    <div className="isolate overflow-hidden rounded-xl border border-slate-200">
      <MapContainer center={position ?? chandigarh} zoom={13} scrollWheelZoom={false} className="h-64 w-full">
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
        <PickupPoint position={position} onSelect={onSelect} />
      </MapContainer>
    </div>
  )
}

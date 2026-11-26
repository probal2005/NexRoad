import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export default function AdminTechnicianMap({ locations }: {
  locations: { id: string; full_name: string; latitude: number; longitude: number }[]
}) {
  const first = locations[0]
  return (
    <MapContainer className="isolate h-72 w-full rounded-xl" scrollWheelZoom={false}
      center={first ? [first.latitude, first.longitude] : [30.7333, 76.7794]} zoom={12}>
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
      {locations.map((location) => (
        <CircleMarker key={location.id} center={[location.latitude, location.longitude]}
          radius={8} pathOptions={{ color: '#047857', fillOpacity: 0.9 }}>
          <Popup>{location.full_name || 'Technician'}</Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}

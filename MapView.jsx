import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import { Map, Navigation, Plane } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

import L from 'leaflet'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const MapView = ({ route }) => {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const airports = {
    BOM: { name: 'Mumbai', lat: 19.0896, lng: 72.8656, code: 'BOM' },
    DEL: { name: 'Delhi', lat: 28.5562, lng: 77.1000, code: 'DEL' },
    BLR: { name: 'Bangalore', lat: 13.1986, lng: 77.7066, code: 'BLR' },
  }

  const origin = airports[route.origin]
  const destination = airports[route.destination]

  const centerLat = (origin.lat + destination.lat) / 2
  const centerLng = (origin.lng + destination.lng) / 2

  const createAirportIcon = (isOrigin = false) => {
    const color = isOrigin ? '#10B981' : '#EF4444'
    return L.divIcon({
      html: `
        <div style="
          background: ${color};
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
          "></div>
        </div>
      `,
      className: 'custom-airport-icon',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })
  }

  const flightPath = [
    [origin.lat, origin.lng],
    [destination.lat, destination.lng],
  ]

  // Approximate distance in km using Haversine formula
  const distance = Math.round(
    111 * Math.sqrt(
      Math.pow(destination.lat - origin.lat, 2) + Math.pow(destination.lng - origin.lng, 2)
    )
  )

  if (!isClient) {
    return (
      <motion.div 
        className="bg-dark-800 rounded-lg p-6 border border-dark-700"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center space-x-3 mb-6">
          <Map className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Route Map</h3>
        </div>
        <div className="flex items-center justify-center h-64 text-dark-400">
          <div className="text-center">
            <Map className="w-12 h-12 mx-auto mb-3 animate-pulse" />
            <p>Loading map...</p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      className="bg-dark-800 rounded-lg p-6 border border-dark-700 hover:border-dark-600 transition-colors"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Map className="w-5 h-5 text-green-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Route Map</h3>
            <p className="text-sm text-dark-400">{origin.name} → {destination.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <Navigation className="w-4 h-4 text-blue-400" />
            <span className="text-dark-400">Distance:</span>
            <span className="text-blue-400 font-medium">~{distance} km</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-dark-700/50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-white">Origin</span>
          </div>
          <p className="text-green-400 font-semibold">{origin.name}</p>
          <p className="text-xs text-dark-400">{origin.code}</p>
        </div>
        <div className="bg-dark-700/50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm font-medium text-white">Destination</span>
          </div>
          <p className="text-red-400 font-semibold">{destination.name}</p>
          <p className="text-xs text-dark-400">{destination.code}</p>
        </div>
      </div>

      <div className="h-64 rounded-lg overflow-hidden border border-dark-700">
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[origin.lat, origin.lng]} icon={createAirportIcon(true)}>
            <Popup>
              <div className="text-center">
                <h3 className="font-semibold text-green-600">{origin.name} Airport</h3>
                <p className="text-sm text-gray-600">{origin.code}</p>
                <p className="text-xs text-gray-500">Origin</p>
              </div>
            </Popup>
          </Marker>
          <Marker position={[destination.lat, destination.lng]} icon={createAirportIcon(false)}>
            <Popup>
              <div className="text-center">
                <h3 className="font-semibold text-red-600">{destination.name} Airport</h3>
                <p className="text-sm text-gray-600">{destination.code}</p>
                <p className="text-xs text-gray-500">Destination</p>
              </div>
            </Popup>
          </Marker>
          <Polyline positions={flightPath} color="#3B82F6" weight={3} opacity={0.8} dashArray="10, 10" />
        </MapContainer>
      </div>

      <div className="mt-4 p-4 bg-dark-700/50 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Plane className="w-4 h-4 text-blue-400" />
            <span className="text-white font-medium">Flight Route</span>
          </div>
          <span className="text-dark-400">Active Route</span>
        </div>
        <div className="mt-2 text-xs text-dark-300">
          This visualization shows the direct flight path between {origin.name} and {destination.name}. 
          The dashed line represents the typical flight corridor used by airlines on this route.
        </div>
      </div>
    </motion.div>
  )
}

export default MapView

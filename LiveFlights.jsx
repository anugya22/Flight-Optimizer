import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plane, RefreshCw, Clock, MapPin, AlertTriangle, CheckCircle, Wifi, WifiOff, ArrowRight } from 'lucide-react'

const LiveFlights = ({ route, isDarkMode = false }) => {
  const [flights, setFlights] = useState([])
  const [allFlights, setAllFlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [view, setView] = useState('route') // 'route' or 'all'

  const themeClasses = {
    bg: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
    bgSecondary: isDarkMode ? 'bg-gray-800' : 'bg-white',
    text: isDarkMode ? 'text-white' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-gray-400' : 'text-gray-600',
    border: isDarkMode ? 'border-gray-700' : 'border-gray-200',
    accent: isDarkMode ? 'text-blue-400' : 'text-blue-600',
  }

  const fetchFlights = async () => {
    try {
      setError(null)
      
      // Fetch route-specific flights
      const routeResponse = await fetch(`http://localhost:5050/flights?origin=${route?.origin || 'BOM'}&destination=${route?.destination || 'DEL'}`)
      const routeData = await routeResponse.json()
      
      if (routeData.error) {
        throw new Error(routeData.error)
      }
      
      setFlights(Array.isArray(routeData) ? routeData : routeData.flights || [])
      
      // Fetch all flights for overview
      const allResponse = await fetch('http://localhost:5050/flights/all')
      const allData = await allResponse.json()
      
      setAllFlights(allData.flights || [])
      setLastUpdated(new Date())
      
    } catch (err) {
      console.error('Error fetching flights:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const forceRefresh = async () => {
    setLoading(true)
    try {
      // Force backend to refresh cache
      await fetch('http://localhost:5050/refresh', { method: 'POST' })
      await fetchFlights()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFlights()
  }, [route])

  // Auto refresh every 2 minutes
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(fetchFlights, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [autoRefresh, route])

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'en-route':
        return 'text-green-500'
      case 'scheduled':
        return 'text-blue-500'
      case 'delayed':
        return 'text-yellow-500'
      case 'cancelled':
        return 'text-red-500'
      case 'landed':
        return 'text-gray-500'
      default:
        return themeClasses.textSecondary
    }
  }

  const getDelayColor = (delay) => {
    if (delay <= 5) return 'text-green-500'
    if (delay <= 15) return 'text-yellow-500'
    return 'text-red-500'
  }

  const FlightCard = ({ flight, index }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`${themeClasses.bgSecondary} rounded-lg p-4 ${themeClasses.border} border hover:shadow-lg transition-all duration-200`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
            {flight.flight_id}
          </div>
          {flight.is_live && (
            <div className="flex items-center space-x-1 text-green-500 text-xs">
              <Wifi className="w-3 h-3" />
              <span>LIVE</span>
            </div>
          )}
        </div>
        
        <div className={`text-sm font-medium ${getStatusColor(flight.status)}`}>
          {flight.status || 'Unknown'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <div className={`text-xs ${themeClasses.textSecondary} mb-1`}>FROM</div>
          <div className={`font-semibold ${themeClasses.text}`}>{flight.origin}</div>
          <div className={`text-sm ${themeClasses.textSecondary}`}>{flight.origin_city}</div>
        </div>
        
        <div>
          <div className={`text-xs ${themeClasses.textSecondary} mb-1`}>TO</div>
          <div className={`font-semibold ${themeClasses.text}`}>{flight.destination || 'N/A'}</div>
          <div className={`text-sm ${themeClasses.textSecondary}`}>{flight.destination_city || 'Unknown'}</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`text-sm ${themeClasses.text}`}>
            <span className="font-mono">
              {flight.scheduled_dep ? new Date(flight.scheduled_dep).toLocaleTimeString('en-IN', { 
                hour: '2-digit', 
                minute: '2-digit' 
              }) : 'N/A'}
            </span>
          </div>
          
          <ArrowRight className={`w-4 h-4 ${themeClasses.textSecondary}`} />
          
          <div className={`text-sm ${themeClasses.text}`}>
            <span className="font-mono">
              {flight.scheduled_arr ? new Date(flight.scheduled_arr).toLocaleTimeString('en-IN', { 
                hour: '2-digit', 
                minute: '2-digit' 
              }) : 'N/A'}
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className={`text-sm ${themeClasses.text}`}>{flight.airline_name || 'Unknown'}</div>
          {flight.delay !== undefined && flight.delay > 0 && (
            <div className={`text-xs ${getDelayColor(flight.delay)}`}>
              +{flight.delay}min delay
            </div>
          )}
        </div>
      </div>

      {(flight.gate || flight.terminal) && (
        <div className={`mt-2 pt-2 border-t ${themeClasses.border} flex space-x-4 text-xs ${themeClasses.textSecondary}`}>
          {flight.terminal && <span>Terminal: {flight.terminal}</span>}
          {flight.gate && <span>Gate: {flight.gate}</span>}
        </div>
      )}
    </motion.div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`${themeClasses.bgSecondary} rounded-lg p-6 ${themeClasses.border} border`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Plane className="w-6 h-6 text-blue-500" />
            <h2 className={`text-xl font-bold ${themeClasses.text}`}>Live Indian Flights</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setView(view === 'route' ? 'all' : 'route')}
              className={`px-3 py-1 rounded ${view === 'route' ? 'bg-blue-600 text-white' : `${themeClasses.border} border ${themeClasses.text}`} text-sm transition-colors`}
            >
              {view === 'route' ? 'Show All' : 'Show Route'}
            </button>
            
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded ${autoRefresh ? 'text-green-500' : 'text-gray-400'} hover:bg-gray-100 transition-colors`}
              title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            >
              {autoRefresh ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            </button>
            
            <button
              onClick={forceRefresh}
              disabled={loading}
              className="p-2 rounded hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''} ${themeClasses.text}`} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm">
            <span className={themeClasses.textSecondary}>
              Route: <span className={themeClasses.accent}>
                {route?.origin || 'BOM'} → {route?.destination || 'DEL'}
              </span>
            </span>
            
            <span className={themeClasses.textSecondary}>
              Flights: <span className={themeClasses.text}>
                {view === 'route' ? flights.length : allFlights.length}
              </span>
            </span>
            
            {lastUpdated && (
              <span className={themeClasses.textSecondary}>
                Updated: {lastUpdated.toLocaleTimeString('en-IN')}
              </span>
            )}
          </div>
          
          <div className={`text-sm ${error ? 'text-red-500' : 'text-green-500'}`}>
            {error ? 'Connection Error' : 'Live Data'}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className={`${themeClasses.bgSecondary} rounded-lg p-12 ${themeClasses.border} border`}>
          <div className="flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <div className={`text-center ${themeClasses.textSecondary}`}>
              <p className="font-medium">Fetching Live Flights...</p>
              <p className="text-sm">Getting real-time data from Indian airports</p>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className={`${themeClasses.bgSecondary} rounded-lg p-8 ${themeClasses.border} border`}>
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-500 mb-2">Failed to Load Live Flights</h3>
            <p className={`${themeClasses.textSecondary} mb-4`}>{error}</p>
            
            <div className={`text-sm ${themeClasses.textSecondary} mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left max-w-md mx-auto`}>
              <h4 className="font-semibold text-yellow-800 mb-2">Quick Setup:</h4>
              <ol className="list-decimal list-inside space-y-1 text-yellow-700">
                <li>Sign up FREE at <a href="https://aviationstack.com/signup/free" className="underline text-blue-600" target="_blank" rel="noopener noreferrer">aviationstack.com</a></li>
                <li>Get your API key</li>
                <li>Add to .env: AVIATIONSTACK_API_KEY=your_key</li>
                <li>Restart your server</li>
              </ol>
            </div>
            
            <button
              onClick={forceRefresh}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* No Flights State */}
      {!loading && !error && (view === 'route' ? flights : allFlights).length === 0 && (
        <div className={`${themeClasses.bgSecondary} rounded-lg p-8 ${themeClasses.border} border`}>
          <div className="text-center">
            <Plane className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className={`text-lg font-semibold ${themeClasses.text} mb-2`}>No Live Flights Found</h3>
            <p className={themeClasses.textSecondary}>
              {view === 'route' 
                ? `No live flights found for ${route?.origin || 'BOM'} → ${route?.destination || 'DEL'}`
                : 'No live Indian flights available at the moment'
              }
            </p>
            <button
              onClick={forceRefresh}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Data
            </button>
          </div>
        </div>
      )}

      {/* Flights Grid */}
      {!loading && !error && (view === 'route' ? flights : allFlights).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(view === 'route' ? flights : allFlights).map((flight, index) => (
            <FlightCard key={flight.flight_id || index} flight={flight} index={index} />
          ))}
        </div>
      )}

      {/* Live Status Footer */}
      <div className={`text-center text-sm ${themeClasses.textSecondary} mt-6`}>
        <div className="flex items-center justify-center space-x-4">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live Data</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>Updates every 2 minutes</span>
          </div>
          <div className="flex items-center space-x-1">
            <MapPin className="w-4 h-4" />
            <span>Indian Airports</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LiveFlights
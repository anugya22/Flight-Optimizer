// Fixed App.js - Ensures all components receive the selected route
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plane, MapPin, Clock, Users, Sun, Moon, Calendar, BarChart3, Radio } from 'lucide-react'

// Import components
import MetricsCards from './components/MetricsCards'
import DelayChart from './components/DelayChart'
import AirlineChart from './components/AirlineChart'
import Heatmap from './components/Heatmap'
import MapView from './components/MapView'
import EasyRescheduler from './components/Rescheduler' // Use the new easy rescheduler
import LiveFlights from './components/LiveFlights'
import FloatingChatBox from './components/ChatBox'

// Import API functions
import { getMetrics, healthCheck } from './lib/api'

function App() {
  const [selectedRoute, setSelectedRoute] = useState({ origin: 'BOM', destination: 'DEL' })
  const [metricsData, setMetricsData] = useState(null)
  const [loading, setLoading] = useState(false) // Change default to false
  const [error, setError] = useState(null)
  const [backendStatus, setBackendStatus] = useState('checking')
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [currentView, setCurrentView] = useState('live') // Default to live
  const [isChatExpanded, setIsChatExpanded] = useState(false)

  // Available Indian routes
  const routes = [
    { origin: 'BOM', destination: 'DEL', label: 'Mumbai → Delhi' },
    { origin: 'DEL', destination: 'BOM', label: 'Delhi → Mumbai' },
    { origin: 'BOM', destination: 'BLR', label: 'Mumbai → Bangalore' },
    { origin: 'DEL', destination: 'BLR', label: 'Delhi → Bangalore' },
    { origin: 'BLR', destination: 'BOM', label: 'Bangalore → Mumbai' },
    { origin: 'BLR', destination: 'DEL', label: 'Bangalore → Delhi' },
    { origin: 'BOM', destination: 'MAA', label: 'Mumbai → Chennai' },
    { origin: 'DEL', destination: 'MAA', label: 'Delhi → Chennai' },
    { origin: 'BOM', destination: 'HYD', label: 'Mumbai → Hyderabad' },
    { origin: 'DEL', destination: 'HYD', label: 'Delhi → Hyderabad' },
    { origin: 'BOM', destination: 'CCU', label: 'Mumbai → Kolkata' },
    { origin: 'DEL', destination: 'CCU', label: 'Delhi → Kolkata' },
  ]

  // Updated navigation items
  const navItems = [
    { id: 'live', label: 'Live Flights', icon: Radio, color: 'text-green-500' },
    { id: 'dashboard', label: 'Analytics', icon: BarChart3, color: 'text-blue-500' },
    { id: 'scheduler', label: 'Scheduler', icon: Calendar, color: 'text-purple-500' },
  ]

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark')
    } else {
      setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
  }, [])

  // Apply theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode)
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  // Check backend health
  useEffect(() => {
    const checkBackend = async () => {
      const health = await healthCheck()
      if (health.ok) {
        setBackendStatus('connected')
        console.log('✅ Backend connected:', health)
      } else {
        setBackendStatus('error')
        setError('Backend server is not responding. Please ensure the backend is running on port 5050.')
      }
    }
    checkBackend()
  }, [])

  // Fetch metrics only for dashboard view and when route changes
  useEffect(() => {
    if (currentView !== 'dashboard' || backendStatus !== 'connected') {
      return
    }
    
    const fetchMetrics = async () => {
      setLoading(true)
      setError(null)
      
      try {
        console.log(`App: Fetching metrics for ${selectedRoute.origin} → ${selectedRoute.destination}`)
        const data = await getMetrics(selectedRoute.origin, selectedRoute.destination)
        
        if (data && !data.error) {
          setMetricsData(data)
          console.log('✅ Metrics loaded:', data)
        } else {
          setError(data.error || 'Failed to fetch metrics data')
        }
      } catch (err) {
        console.error('Metrics fetch error:', err)
        setError('Network error: Unable to fetch data')
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [selectedRoute.origin, selectedRoute.destination, backendStatus, currentView])

  // Handle route selection - FIX: Make sure route is properly updated
  const handleRouteChange = (event) => {
    const [origin, destination] = event.target.value.split('-')
    const newRoute = { origin, destination }
    
    console.log('🔄 Route changed to:', newRoute)
    setSelectedRoute(newRoute)
    
    // Clear previous data when route changes
    setMetricsData(null)
    setError(null)
  }

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  // Theme classes
  const themeClasses = {
    bg: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
    bgSecondary: isDarkMode ? 'bg-gray-800' : 'bg-white',
    text: isDarkMode ? 'text-white' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-gray-400' : 'text-gray-600',
    border: isDarkMode ? 'border-gray-700' : 'border-gray-200',
  }

  if (backendStatus === 'checking') {
    return (
      <div className={`min-h-screen ${themeClasses.bg} flex items-center justify-center transition-colors duration-300`}>
        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Plane className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-pulse" />
          <h2 className={`text-2xl font-bold ${themeClasses.text} mb-2`}>Indian Flight Tracker</h2>
          <p className={themeClasses.textSecondary}>Connecting to live flight data...</p>
        </motion.div>
      </div>
    )
  }

  if (backendStatus === 'error') {
    return (
      <div className={`min-h-screen ${themeClasses.bg} flex items-center justify-center p-4 transition-colors duration-300`}>
        <motion.div 
          className="text-center max-w-md"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
            <Plane className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className={`text-2xl font-bold ${themeClasses.text} mb-2`}>Backend Not Connected</h2>
            <p className={`${themeClasses.textSecondary} mb-4`}>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${themeClasses.bg} ${themeClasses.text} transition-colors duration-300`}>
      {/* Header */}
      <motion.header 
        className={`${themeClasses.bgSecondary} border-b ${themeClasses.border} transition-colors duration-300`}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Plane className="w-8 h-8 text-blue-500" />
              <div>
                <h1 className="text-2xl font-bold">Indian Flight Tracker</h1>
                <p className={`${themeClasses.textSecondary} text-sm`}>Live flights • Real-time analytics • Smart scheduling</p>
              </div>
            </div>
            
            {/* Navigation */}
            <div className="flex items-center space-x-4">
              <nav className="flex space-x-2">
                {navItems.map(item => {
                  const Icon = item.icon
                  return (
                    <motion.button
                      key={item.id}
                      onClick={() => {
                        setCurrentView(item.id)
                        console.log(`📱 Switched to ${item.id} view`)
                      }}
                      className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                        currentView === item.id 
                          ? 'bg-blue-600 text-white' 
                          : `hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Icon className={`w-4 h-4 ${currentView === item.id ? 'text-white' : item.color}`} />
                      <span>{item.label}</span>
                    </motion.button>
                  )
                })}
              </nav>

              {/* Theme Toggle */}
              <motion.button
                onClick={toggleTheme}
                className={`p-2 rounded-lg hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} transition-colors`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-blue-500" />
                )}
              </motion.button>

              {/* Route Selector - FIX: Show actual selected route */}
              <div className="flex items-center space-x-3">
                <MapPin className={`w-5 h-5 ${themeClasses.textSecondary}`} />
                <select
                  value={`${selectedRoute.origin}-${selectedRoute.destination}`}
                  onChange={handleRouteChange}
                  className={`${themeClasses.bgSecondary} border ${themeClasses.border} rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors min-w-[200px]`}
                >
                  {routes.map(route => (
                    <option key={`${route.origin}-${route.destination}`} value={`${route.origin}-${route.destination}`}>
                      {route.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* Debug info to show current route */}
          <div className={`mt-2 text-sm ${themeClasses.textSecondary}`}>
            Current Route: <span className={`${themeClasses.text} font-medium`}>
              {selectedRoute.origin} → {selectedRoute.destination}
            </span>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className={`max-w-7xl mx-auto px-4 py-6 space-y-6 ${isChatExpanded ? 'pr-80' : ''} transition-all duration-300`}>
        {/* Live Flights View */}
        {currentView === 'live' && (
          <motion.div
            key="live-flights"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <LiveFlights route={selectedRoute} isDarkMode={isDarkMode} />
          </motion.div>
        )}

        {/* Dashboard View - FIX: Pass route to ALL components */}
        {currentView === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
                />
                <span className={`ml-3 ${themeClasses.textSecondary}`}>Loading analytics for {selectedRoute.origin} → {selectedRoute.destination}...</span>
              </div>
            ) : error ? (
              <motion.div 
                className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-red-400">{error}</p>
              </motion.div>
            ) : (
              <>
                <MetricsCards data={metricsData?.cards} isDarkMode={isDarkMode} route={selectedRoute} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* FIX: Pass route to DelayChart and AirlineChart */}
                  <DelayChart route={selectedRoute} isDarkMode={isDarkMode} />
                  <AirlineChart data={metricsData?.airline_delays} isDarkMode={isDarkMode} route={selectedRoute} />
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* FIX: Pass route to Heatmap and MapView */}
                  <Heatmap route={selectedRoute} isDarkMode={isDarkMode} />
                  <MapView route={selectedRoute} isDarkMode={isDarkMode} />
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Scheduler View - FIX: Pass route to Rescheduler */}
        {currentView === 'scheduler' && (
          <motion.div
            key="scheduler"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <EasyRescheduler route={selectedRoute} isDarkMode={isDarkMode} />
          </motion.div>
        )}
      </main>

      {/* Floating Chat Box */}
      <FloatingChatBox 
        route={selectedRoute} 
        isDarkMode={isDarkMode}
        isExpanded={isChatExpanded}
        onToggleExpanded={setIsChatExpanded}
      />

      {/* Footer */}
      <footer className={`${themeClasses.bgSecondary} border-t ${themeClasses.border} py-6 mt-12 transition-colors duration-300`}>
        <div className={`max-w-7xl mx-auto px-4 text-center ${themeClasses.textSecondary}`}>
          <p>Indian Flight Tracker - Live Data • AI Analytics • Smart Scheduling</p>
          <div className="flex items-center justify-center space-x-4 mt-2 text-sm">
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Indian Flights</span>
            </span>
            <span className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>Real-time Updates</span>
            </span>
            <span className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>AI-Powered Insights</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
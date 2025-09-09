import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plane, RefreshCw, AlertTriangle, CheckCircle, Clock, ArrowLeft, ArrowRight, Calendar } from 'lucide-react'
import { rescheduleFlights, getFlights } from '../lib/api'

const EasyRescheduler = ({ route, isDarkMode = false }) => {
  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedFlight, setSelectedFlight] = useState(null)
  const [rescheduleResult, setRescheduleResult] = useState(null)
  const [rescheduling, setRescheduling] = useState(false)

  const themeClasses = {
    bg: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
    bgSecondary: isDarkMode ? 'bg-gray-800' : 'bg-white',
    text: isDarkMode ? 'text-white' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-gray-400' : 'text-gray-600',
    border: isDarkMode ? 'border-gray-700' : 'border-gray-200',
    accent: isDarkMode ? 'text-blue-400' : 'text-blue-600',
  }

  useEffect(() => {
    fetchFlights()
  }, [route])

  const fetchFlights = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await getFlights(route?.origin || 'BOM', route?.destination || 'DEL')
      const flightData = Array.isArray(data) ? data : (data.flights || [])
      setFlights(flightData)
    } catch (err) {
      setError(err.message)
      setFlights([])
    } finally {
      setLoading(false)
    }
  }

  const handleQuickReschedule = async (minutes, action) => {
    if (!selectedFlight) return
    
    setRescheduling(true)
    setRescheduleResult(null)
    
    try {
      const result = await rescheduleFlights(selectedFlight.flight_id, minutes)
      setRescheduleResult({
        ...result,
        action,
        minutes: Math.abs(minutes)
      })
      
      if (result.ok) {
        setTimeout(() => {
          fetchFlights()
          setSelectedFlight(null)
        }, 3000)
      }
    } catch (err) {
      setRescheduleResult({
        ok: false,
        error: err.message,
        action,
        minutes: Math.abs(minutes)
      })
    } finally {
      setRescheduling(false)
    }
  }

  const getDelayColor = (delay) => {
    if (delay <= 5) return 'text-green-500'
    if (delay <= 15) return 'text-yellow-500'
    return 'text-red-500'
  }

  const quickActions = [
    { label: 'Move 15min Earlier', minutes: -15, color: 'bg-green-600 hover:bg-green-700', icon: ArrowLeft },
    { label: 'Move 30min Earlier', minutes: -30, color: 'bg-green-700 hover:bg-green-800', icon: ArrowLeft },
    { label: 'Move 15min Later', minutes: 15, color: 'bg-blue-600 hover:bg-blue-700', icon: ArrowRight },
    { label: 'Move 30min Later', minutes: 30, color: 'bg-blue-700 hover:bg-blue-800', icon: ArrowRight },
    { label: 'Move 1hr Later', minutes: 60, color: 'bg-purple-600 hover:bg-purple-700', icon: ArrowRight },
  ]

  if (loading) {
    return (
      <div className={`${themeClasses.bgSecondary} rounded-lg p-8 ${themeClasses.border} border`}>
        <div className="flex items-center justify-center space-x-2">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
          <span className={themeClasses.text}>Finding flights to reschedule...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${themeClasses.bgSecondary} rounded-lg p-8 ${themeClasses.border} border`}>
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-500 mb-2">Can't Load Flights</h3>
          <p className={`${themeClasses.textSecondary} mb-4`}>{error}</p>
          <button
            onClick={fetchFlights}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (flights.length === 0) {
    return (
      <div className={`${themeClasses.bgSecondary} rounded-lg p-8 ${themeClasses.border} border`}>
        <div className="text-center">
          <Plane className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className={`text-lg font-semibold ${themeClasses.text} mb-2`}>No Flights Available</h3>
          <p className={themeClasses.textSecondary}>
            No flights found for {route?.origin || 'BOM'} → {route?.destination || 'DEL'}
          </p>
          <p className={`text-sm ${themeClasses.textSecondary} mt-2`}>
            Try a different route or check back later
          </p>
          <button
            onClick={fetchFlights}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`${themeClasses.bgSecondary} rounded-lg p-6 ${themeClasses.border} border`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`text-xl font-bold ${themeClasses.text}`}>Smart Flight Rescheduler</h2>
            <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>
              Optimize flight times to reduce delays
            </p>
          </div>
          <button
            onClick={fetchFlights}
            className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div className="flex items-center space-x-4 text-sm">
          <span className={themeClasses.textSecondary}>Route:</span>
          <span className={`${themeClasses.accent} font-medium`}>
            {route?.origin || 'BOM'} → {route?.destination || 'DEL'}
          </span>
          <span className={themeClasses.textSecondary}>•</span>
          <span className={themeClasses.text}>{flights.length} flights available</span>
        </div>
      </div>

      {/* Instructions */}
      <div className={`${themeClasses.bgSecondary} rounded-lg p-4 ${themeClasses.border} border border-blue-200 bg-blue-50/10`}>
        <div className="flex items-start space-x-3">
          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
          <div>
            <h4 className={`font-medium ${themeClasses.text} mb-1`}>How to Reschedule</h4>
            <p className={`text-sm ${themeClasses.textSecondary}`}>
              1. Click on any flight below to select it
              2. Choose from easy rescheduling options 
              3. See instant impact on delays and airport congestion
            </p>
          </div>
        </div>
      </div>

      {/* Flight Selection */}
      <div className={`${themeClasses.bgSecondary} rounded-lg ${themeClasses.border} border overflow-hidden`}>
        <div className="p-4 border-b border-gray-200">
          <h3 className={`font-semibold ${themeClasses.text}`}>
            Step 1: Choose a Flight {selectedFlight && `(Selected: ${selectedFlight.flight_id})`}
          </h3>
        </div>
        
        <div className="max-h-64 overflow-y-auto">
          {flights.map((flight, index) => (
            <motion.div
              key={flight.flight_id || index}
              className={`p-4 border-b ${themeClasses.border} cursor-pointer transition-all ${
                selectedFlight?.flight_id === flight.flight_id
                  ? 'bg-blue-50 border-l-4 border-l-blue-500'
                  : `hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`
              }`}
              onClick={() => setSelectedFlight(flight)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                    selectedFlight?.flight_id === flight.flight_id
                      ? 'bg-blue-600 text-white'
                      : `${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`
                  }`}>
                    {flight.flight_id}
                  </div>
                  
                  <div>
                    <div className={`font-medium ${themeClasses.text}`}>
                      {flight.airline || 'Unknown Airline'}
                    </div>
                    <div className={`text-sm ${themeClasses.textSecondary}`}>
                      {flight.route || `${route?.origin} → ${route?.destination}`}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`font-mono text-sm ${themeClasses.text}`}>
                    Departs: {flight.scheduled_dep || 'N/A'}
                  </div>
                  <div className={`text-sm ${getDelayColor(flight.delay || 0)}`}>
                    {flight.delay && flight.delay > 0 ? `${flight.delay}min delay` : 'On time'}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <AnimatePresence>
        {selectedFlight && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`${themeClasses.bgSecondary} rounded-lg p-6 ${themeClasses.border} border`}
          >
            <h3 className={`font-semibold ${themeClasses.text} mb-4`}>
              Step 2: Choose Reschedule Option for {selectedFlight.flight_id}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {quickActions.map((action, index) => {
                const Icon = action.icon
                return (
                  <motion.button
                    key={index}
                    onClick={() => handleQuickReschedule(action.minutes, action.label)}
                    disabled={rescheduling}
                    className={`${action.color} text-white px-4 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
                    whileHover={{ scale: rescheduling ? 1 : 1.02 }}
                    whileTap={{ scale: rescheduling ? 1 : 0.98 }}
                  >
                    {rescheduling ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{action.label}</span>
                      </>
                    )}
                  </motion.button>
                )
              })}
            </div>

            {/* Current Flight Info */}
            <div className={`p-4 ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100/50'} rounded-lg mb-4`}>
              <h4 className={`text-sm font-medium ${themeClasses.text} mb-2`}>Current Schedule</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className={themeClasses.textSecondary}>Departure: </span>
                  <span className={themeClasses.text}>{selectedFlight.scheduled_dep || 'N/A'}</span>
                </div>
                <div>
                  <span className={themeClasses.textSecondary}>Current Delay: </span>
                  <span className={getDelayColor(selectedFlight.delay || 0)}>
                    {selectedFlight.delay > 0 ? `${selectedFlight.delay} minutes` : 'On time'}
                  </span>
                </div>
              </div>
            </div>

            {/* Result Display */}
            <AnimatePresence>
              {rescheduleResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-4 rounded-lg border-l-4 ${
                    rescheduleResult.ok
                      ? 'bg-green-50 text-green-800 border-l-green-500'
                      : 'bg-red-50 text-red-800 border-l-red-500'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    {rescheduleResult.ok ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                    <span className="font-medium">
                      {rescheduleResult.ok 
                        ? `Successfully moved flight ${rescheduleResult.minutes} minutes ${rescheduleResult.action.includes('Earlier') ? 'earlier' : 'later'}!`
                        : 'Reschedule Failed'
                      }
                    </span>
                  </div>
                  
                  {rescheduleResult.ok && (
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="font-medium">Delay Impact:</span> {rescheduleResult.pred_delay_before?.toFixed(1)}min → {rescheduleResult.pred_delay_after?.toFixed(1)}min
                        {rescheduleResult.pred_delay_after < rescheduleResult.pred_delay_before ? 
                          <span className="text-green-600 ml-1">✓ Improved</span> : 
                          <span className="text-yellow-600 ml-1">⚠ Increased</span>
                        }
                      </p>
                      <p>
                        <span className="font-medium">Airport Congestion:</span> {rescheduleResult.slot_load_before} → {rescheduleResult.slot_load_after} flights
                        {rescheduleResult.slot_load_after < rescheduleResult.slot_load_before ? 
                          <span className="text-green-600 ml-1">✓ Less crowded</span> : 
                          <span className="text-yellow-600 ml-1">⚠ More crowded</span>
                        }
                      </p>
                    </div>
                  )}
                  
                  {rescheduleResult.error && (
                    <p className="text-sm">{rescheduleResult.error}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips */}
      {!selectedFlight && (
        <div className={`${themeClasses.bgSecondary} rounded-lg p-4 ${themeClasses.border} border`}>
          <div className="flex items-start space-x-3">
            <Clock className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
            <div>
              <h4 className={`font-medium ${themeClasses.text} mb-2`}>Smart Rescheduling Tips</h4>
              <ul className={`text-sm ${themeClasses.textSecondary} space-y-1`}>
                <li>• Moving flights earlier usually reduces delays</li>
                <li>• Avoid peak hours (7-9 AM, 6-8 PM) when possible</li>
                <li>• Consider airport congestion in your decisions</li>
                <li>• Small changes can have big impacts on punctuality</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EasyRescheduler
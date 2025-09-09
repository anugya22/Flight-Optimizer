import React, { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Clock, TrendingUp } from 'lucide-react'

const DelayChart = ({ route, isDarkMode = false }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const themeClasses = {
    bg: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
    bgSecondary: isDarkMode ? 'bg-gray-800' : 'bg-white',
    text: isDarkMode ? 'text-white' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-gray-400' : 'text-gray-600',
    border: isDarkMode ? 'border-gray-700' : 'border-gray-200',
  }

  // Fix: Actually use the route prop instead of hardcoding BOM-DEL
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const origin = route?.origin || 'BOM'
        const destination = route?.destination || 'DEL'
        
        console.log(`DelayChart: Fetching data for ${origin} → ${destination}`)
        
        const response = await fetch(`http://localhost:5050/metrics?origin=${origin}&destination=${destination}`)
        const metricsData = await response.json()
        
        if (metricsData.error) {
          throw new Error(metricsData.error)
        }
        
        // Use delay_series from metrics endpoint
        const delayData = metricsData.delay_series || []
        setData(delayData)
        
      } catch (err) {
        console.error('DelayChart fetch failed:', err)
        setError(err.message)
        setData([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [route?.origin, route?.destination]) // Fix: Watch for route changes

  // Process data for the chart
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    return data.map(item => ({
      time: `${item.hour.toString().padStart(2, '0')}:00`,
      delay: Math.round(item.avg_delay * 10) / 10,
      hour: item.hour
    })).sort((a, b) => a.hour - b.hour)
  }, [data])

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className={`${themeClasses.bgSecondary} border ${themeClasses.border} rounded-lg p-3 shadow-lg`}>
          <p className={`${themeClasses.text} font-medium`}>{label}</p>
          <p className="text-orange-400">
            <span className={themeClasses.textSecondary}>Average Delay: </span>
            {payload[0].value} minutes
          </p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <motion.div className={`${themeClasses.bgSecondary} rounded-lg p-6 border ${themeClasses.border}`}>
        <div className="flex items-center space-x-3 mb-6">
          <Clock className="w-5 h-5 text-orange-400" />
          <h3 className={`text-lg font-semibold ${themeClasses.text}`}>Delay Timeline</h3>
        </div>
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
          <span className={`ml-3 ${themeClasses.textSecondary}`}>Loading delay data...</span>
        </div>
      </motion.div>
    )
  }

  if (error) {
    return (
      <motion.div className={`${themeClasses.bgSecondary} rounded-lg p-6 border ${themeClasses.border}`}>
        <div className="flex items-center space-x-3 mb-6">
          <Clock className="w-5 h-5 text-orange-400" />
          <h3 className={`text-lg font-semibold ${themeClasses.text}`}>Delay Timeline</h3>
        </div>
        <div className="text-center">
          <p className="text-red-400 mb-2">Error loading delay data</p>
          <p className={`text-sm ${themeClasses.textSecondary}`}>{error}</p>
        </div>
      </motion.div>
    )
  }

  if (!processedData || processedData.length === 0) {
    return (
      <motion.div className={`${themeClasses.bgSecondary} rounded-lg p-6 border ${themeClasses.border}`}>
        <div className="flex items-center space-x-3 mb-6">
          <Clock className="w-5 h-5 text-orange-400" />
          <div>
            <h3 className={`text-lg font-semibold ${themeClasses.text}`}>Delay Timeline</h3>
            <p className={`text-sm ${themeClasses.textSecondary}`}>
              {route?.origin || 'BOM'} → {route?.destination || 'DEL'}
            </p>
          </div>
        </div>
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className={themeClasses.textSecondary}>
            No delay data available for {route?.origin || 'BOM'} → {route?.destination || 'DEL'}
          </p>
          <p className={`text-sm ${themeClasses.textSecondary} mt-2`}>
            Try selecting a different route or check back later
          </p>
        </div>
      </motion.div>
    )
  }

  const maxDelay = Math.max(...processedData.map(d => d.delay))
  const avgDelay = processedData.reduce((sum, d) => sum + d.delay, 0) / processedData.length
  const peakTime = processedData.find(d => d.delay === maxDelay)?.time || 'N/A'
  const minDelay = Math.min(...processedData.map(d => d.delay))
  const bestTime = processedData.find(d => d.delay === minDelay)?.time || 'N/A'

  return (
    <motion.div className={`${themeClasses.bgSecondary} rounded-lg p-6 border ${themeClasses.border} hover:${isDarkMode ? 'border-gray-600' : 'border-gray-300'} transition-colors`}>
      {/* Header - Now shows actual selected route */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Clock className="w-5 h-5 text-orange-400" />
          <div>
            <h3 className={`text-lg font-semibold ${themeClasses.text}`}>Delay Timeline</h3>
            <p className={`text-sm ${themeClasses.textSecondary}`}>
              {route?.origin || 'BOM'} → {route?.destination || 'DEL'} • Hourly averages
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <div className="text-center">
            <p className={themeClasses.textSecondary}>Peak</p>
            <p className="text-orange-400 font-semibold">
              {maxDelay.toFixed(1)}min
            </p>
            <p className={`text-xs ${themeClasses.textSecondary}`}>@ {peakTime}</p>
          </div>
          <div className="text-center">
            <p className={themeClasses.textSecondary}>Average</p>
            <p className="text-blue-400 font-semibold">{avgDelay.toFixed(1)}min</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={isDarkMode ? "#374151" : "#E5E7EB"} 
            />
            <XAxis 
              dataKey="time" 
              stroke={isDarkMode ? "#9CA3AF" : "#6B7280"} 
              fontSize={12} 
              tick={{ fill: isDarkMode ? '#9CA3AF' : '#6B7280' }} 
            />
            <YAxis 
              stroke={isDarkMode ? "#9CA3AF" : "#6B7280"} 
              fontSize={12} 
              tick={{ fill: isDarkMode ? '#9CA3AF' : '#6B7280' }} 
              label={{ 
                value: 'Delay (minutes)', 
                angle: -90, 
                position: 'insideLeft', 
                style: { textAnchor: 'middle', fill: isDarkMode ? '#9CA3AF' : '#6B7280' } 
              }} 
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="delay" 
              stroke="#FB923C" 
              strokeWidth={3} 
              dot={{ fill: '#FB923C', strokeWidth: 2, r: 4 }} 
              activeDot={{ r: 6, stroke: '#FB923C', strokeWidth: 2 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className={`mt-4 p-4 ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100/50'} rounded-lg`}>
        <div className="flex items-center space-x-2 mb-2">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <h4 className={`text-sm font-medium ${themeClasses.text}`}>Route Insights</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <p className={themeClasses.textSecondary}>
            <span className="text-orange-400 font-medium">Peak delays</span> on {route?.origin || 'BOM'}→{route?.destination || 'DEL'} occur at{' '}
            <span className={themeClasses.text}>{peakTime}</span> with{' '}
            <span className="text-orange-400">{maxDelay.toFixed(1)}min</span> average delay.
          </p>
          <p className={themeClasses.textSecondary}>
            <span className="text-green-400 font-medium">Best time</span> to fly is{' '}
            <span className={themeClasses.text}>{bestTime}</span> with only{' '}
            <span className="text-green-400">{minDelay.toFixed(1)}min</span> delay.
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export default DelayChart

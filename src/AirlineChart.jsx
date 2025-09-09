import React from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Building2, Award, AlertTriangle } from 'lucide-react'

const AirlineChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <motion.div 
        className="bg-gray-800 rounded-lg p-6 border border-gray-700"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center space-x-3 mb-6">
          <Building2 className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Airline Performance</h3>
        </div>
        <div className="flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <Building2 className="w-12 h-12 mx-auto mb-3 animate-pulse" />
            <p>Loading airline data...</p>
          </div>
        </div>
      </motion.div>
    )
  }

  const processedData = data.map(item => ({
    airline: item.airline,
    delay: Math.round(item.avg_delay * 10) / 10,
    fill: item.avg_delay <= 5 ? '#10B981' : item.avg_delay <= 10 ? '#F59E0B' : '#EF4444'
  })).sort((a, b) => b.delay - a.delay)

  const airlineNames = {
    'AI': 'Air India',
    '6E': 'IndiGo',
    'UK': 'Vistara',
    'SG': 'SpiceJet',
    'G8': 'GoAir',
    'QF': 'Qantas'
  }

  const chartData = processedData.map(item => ({
    ...item,
    fullName: airlineNames[item.airline] || item.airline
  }))

  const bestPerformer = chartData[chartData.length - 1]
  const worstPerformer = chartData[0]

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{data.fullName} ({data.airline})</p>
          <p className="text-orange-400">
            <span className="text-gray-300">Average Delay: </span>{data.delay} minutes
          </p>
          <div className="mt-2">
            <span className={`text-xs px-2 py-1 rounded-full ${
              data.delay <= 5 ? 'bg-green-500/20 text-green-400' :
              data.delay <= 10 ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {data.delay <= 5 ? 'Excellent' : data.delay <= 10 ? 'Good' : 'Needs Improvement'}
            </span>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <motion.div 
      className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Building2 className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Airline Performance</h3>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <Award className="w-4 h-4 text-green-400" />
            <span className="text-gray-400">Best: </span>
            <span className="text-green-400 font-medium">{bestPerformer?.fullName}</span>
          </div>
          <div className="flex items-center space-x-1">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-gray-400">Needs work: </span>
            <span className="text-red-400 font-medium">{worstPerformer?.fullName}</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="airline" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
            <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} label={{ value: 'Avg Delay (min)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9CA3AF' }}} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="delay" radius={[4, 4, 0, 0]} fill="#10B981">
              {chartData.map((entry, index) => (
                <cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Performance Rankings */}
      <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
        <h4 className="text-sm font-medium text-white mb-3 flex items-center">
          <Award className="w-4 h-4 mr-2 text-blue-400" />
          Performance Rankings
        </h4>
        <div className="space-y-2">
          {chartData.map((airline, index) => (
            <motion.div 
              key={airline.airline}
              className="flex items-center justify-between text-sm p-2 rounded hover:bg-gray-600/50 transition-colors"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <div className="flex items-center space-x-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === chartData.length - 1 ? 'bg-green-500 text-white' :
                  index === 0 ? 'bg-red-500 text-white' :
                  'bg-gray-600 text-gray-300'
                }`}>{index + 1}</span>
                <span className="text-white font-medium">{airline.fullName}</span>
                <span className="text-gray-400">({airline.airline})</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`font-semibold ${
                  airline.delay <= 5 ? 'text-green-400' :
                  airline.delay <= 10 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>{airline.delay}min</span>
                <div className={`w-2 h-2 rounded-full ${
                  airline.delay <= 5 ? 'bg-green-400' :
                  airline.delay <= 10 ? 'bg-yellow-400' :
                  'bg-red-400'
                }`} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default AirlineChart

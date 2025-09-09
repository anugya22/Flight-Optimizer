import React from 'react'
import { motion } from 'framer-motion'
import { Plane, CheckCircle, Clock, TrendingUp } from 'lucide-react'

const MetricsCards = ({ data, isDarkMode = false }) => {
  const themeClasses = {
    bg: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
    bgSecondary: isDarkMode ? 'bg-gray-800' : 'bg-white',
    text: isDarkMode ? 'text-white' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-gray-400' : 'text-gray-600',
    border: isDarkMode ? 'border-gray-700' : 'border-gray-200',
  }

  // Show loading state
  if (!data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className={`${themeClasses.bgSecondary} rounded-lg p-6 animate-pulse border ${themeClasses.border}`}>
            <div className={`h-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-1/2 mb-2`}></div>
            <div className={`h-8 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-1/3`}></div>
          </div>
        ))}
      </div>
    )
  }

  // Extract data from the cards object (matching your backend structure)
  const cards = data.cards || data
  
  // Calculate on-time percentage - use backend value or calculate from avg_delay
  const onTimePercentage = cards.pct_on_time !== undefined 
    ? cards.pct_on_time 
    : cards.avg_delay <= 5 ? 85 : cards.avg_delay <= 15 ? 65 : 45

  const metricsData = [
    {
      title: 'Total Flights',
      value: (cards.total_flights || 0).toLocaleString(),
      icon: Plane,
      color: 'text-blue-400',
      bgColor: isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50',
      borderColor: isDarkMode ? 'border-blue-500/20' : 'border-blue-200',
    },
    {
      title: 'On-Time Performance',
      value: `${onTimePercentage}%`,
      icon: CheckCircle,
      color: onTimePercentage >= 80 ? 'text-green-400' : onTimePercentage >= 60 ? 'text-yellow-400' : 'text-red-400',
      bgColor: onTimePercentage >= 80 
        ? (isDarkMode ? 'bg-green-500/10' : 'bg-green-50')
        : onTimePercentage >= 60 
        ? (isDarkMode ? 'bg-yellow-500/10' : 'bg-yellow-50')
        : (isDarkMode ? 'bg-red-500/10' : 'bg-red-50'),
      borderColor: onTimePercentage >= 80 
        ? (isDarkMode ? 'border-green-500/20' : 'border-green-200')
        : onTimePercentage >= 60 
        ? (isDarkMode ? 'border-yellow-500/20' : 'border-yellow-200')
        : (isDarkMode ? 'border-red-500/20' : 'border-red-200'),
    },
    {
      title: 'Average Delay',
      value: `${cards.avg_delay || 0}min`,
      icon: Clock,
      color: (cards.avg_delay || 0) <= 5 ? 'text-green-400' : (cards.avg_delay || 0) <= 15 ? 'text-yellow-400' : 'text-red-400',
      bgColor: (cards.avg_delay || 0) <= 5 
        ? (isDarkMode ? 'bg-green-500/10' : 'bg-green-50')
        : (cards.avg_delay || 0) <= 15 
        ? (isDarkMode ? 'bg-yellow-500/10' : 'bg-yellow-50')
        : (isDarkMode ? 'bg-red-500/10' : 'bg-red-50'),
      borderColor: (cards.avg_delay || 0) <= 5 
        ? (isDarkMode ? 'border-green-500/20' : 'border-green-200')
        : (cards.avg_delay || 0) <= 15 
        ? (isDarkMode ? 'border-yellow-500/20' : 'border-yellow-200')
        : (isDarkMode ? 'border-red-500/20' : 'border-red-200'),
    }
  ]

  return (
    <motion.div 
      className="grid grid-cols-1 md:grid-cols-3 gap-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, staggerChildren: 0.1 }}
    >
      {metricsData.map((card, index) => (
        <motion.div
          key={card.title}
          className={`${card.bgColor} ${card.borderColor} border rounded-lg p-6 hover:scale-105 transition-all duration-300 cursor-pointer group`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className={`${themeClasses.textSecondary} text-sm font-medium mb-1`}>{card.title}</p>
              <p className={`text-3xl font-bold ${card.color} group-hover:scale-110 transition-transform duration-300`}>
                {card.value}
              </p>
            </div>
            <div className={`${card.color} ${card.bgColor} p-3 rounded-lg group-hover:rotate-12 transition-transform duration-300`}>
              <card.icon className="w-6 h-6" />
            </div>
          </div>
          
          {/* Progress indicator for on-time performance */}
          {card.title === 'On-Time Performance' && (
            <div className="mt-4">
              <div className={`w-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2`}>
                <motion.div
                  className={`h-2 rounded-full ${
                    onTimePercentage >= 80 ? 'bg-green-500' : 
                    onTimePercentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${onTimePercentage}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
              <p className={`text-xs ${themeClasses.textSecondary} mt-1`}>
                {onTimePercentage >= 80 ? 'Excellent' : 
                 onTimePercentage >= 60 ? 'Good' : 'Needs Improvement'}
              </p>
            </div>
          )}

          {/* Trend indicator */}
          <div className="flex items-center mt-3 text-xs">
            <TrendingUp className={`w-3 h-3 mr-1 ${
              card.title === 'On-Time Performance' ? 'text-green-400' : 'text-blue-400'
            }`} />
            <span className={themeClasses.textSecondary}>
              {card.title === 'On-Time Performance' 
                ? `${onTimePercentage > 75 ? '+' : ''}${(onTimePercentage - 75).toFixed(1)}% vs target`
                : card.title === 'Total Flights'
                ? `${data.origin || 'BOM'} → ${data.destination || 'DEL'}`
                : 'Live data'
              }
            </span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}

export default MetricsCards

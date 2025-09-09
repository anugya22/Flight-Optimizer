import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, Bot, User, Clock, X, HelpCircle } from 'lucide-react'
import { getMetrics, getFlights, askQuestion } from '../lib/api'

const ChatBox = ({ route, isDarkMode, isExpanded, onToggleExpanded }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: `Hello! I'm your flight scheduling assistant. Ask me about delays, best times to fly, or airline performance on the ${route.origin} → ${route.destination} route.`,
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const sampleQuestions = [
    "What's the best time to fly to avoid delays?",
    "Which airline has the least delays?",
    "When is the busiest hour?",
    "How can I minimize my travel time?"
  ]

  const themeClasses = {
    bg: isDarkMode ? 'bg-gray-800' : 'bg-white',
    bgSecondary: isDarkMode ? 'bg-gray-700' : 'bg-gray-50',
    text: isDarkMode ? 'text-white' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-gray-400' : 'text-gray-600',
    border: isDarkMode ? 'border-gray-600' : 'border-gray-300',
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isExpanded) inputRef.current?.focus()
  }, [isExpanded])

  useEffect(() => {
    setMessages([{
      id: 1,
      type: 'bot',
      content: `Hello! I'm your flight scheduling assistant. Ask me about delays, best times to fly, or airline performance on the ${route.origin} → ${route.destination} route.`,
      timestamp: new Date()
    }])
  }, [route])

  const analyzeLocalData = async () => {
    try {
      // Get comprehensive data from existing endpoints
      const [metricsData, flightsData] = await Promise.all([
        getMetrics(route.origin, route.destination),
        getFlights(route.origin, route.destination)
      ])

      const metrics = metricsData.cards || {}
      const delayData = metricsData.delay_series || []
      const airlineData = metricsData.airline_delays || []
      const flights = Array.isArray(flightsData) ? flightsData : []

      // Find best and worst times
      const bestHour = delayData.reduce((min, curr) => 
        curr.avg_delay < min.avg_delay ? curr : min, 
        delayData[0] || { hour: 'N/A', avg_delay: 0 }
      )

      const worstHour = delayData.reduce((max, curr) => 
        curr.avg_delay > max.avg_delay ? curr : max,
        delayData[0] || { hour: 'N/A', avg_delay: 0 }
      )

      // Find best airline
      const bestAirline = airlineData.reduce((min, curr) => 
        curr.avg_delay < min.avg_delay ? curr : min,
        airlineData[0] || { airline: 'N/A', avg_delay: 0 }
      )

      return {
        totalFlights: metrics.total_flights || 0,
        avgDelay: metrics.avg_delay || 0,
        onTimePerf: metrics.pct_on_time || 0,
        bestHour,
        worstHour,
        bestAirline,
        flights: flights.slice(0, 5), // Sample flights
        hasData: delayData.length > 0
      }
    } catch (error) {
      console.error('Error analyzing data:', error)
      return { hasData: false }
    }
  }

  const generateResponse = (query, data) => {
    const q = query.toLowerCase()
    
    if (!data.hasData) {
      return "I don't have enough flight data for this route yet. Please make sure your backend is running and has loaded flight data."
    }

    if (q.includes('best time') || q.includes('avoid delay')) {
      return `The best time to fly is ${data.bestHour.hour}:00 with only ${data.bestHour.avg_delay.toFixed(1)} minutes average delay. Avoid flying around ${data.worstHour.hour}:00 when delays average ${data.worstHour.avg_delay.toFixed(1)} minutes.`
    }
    
    if (q.includes('airline') || q.includes('carrier')) {
      return `${data.bestAirline.airline} has the best performance with ${data.bestAirline.avg_delay.toFixed(1)} minutes average delay. Choose this airline for better on-time performance.`
    }
    
    if (q.includes('busiest') || q.includes('busy')) {
      return `The busiest hour is ${data.worstHour.hour}:00 with ${data.worstHour.avg_delay.toFixed(1)} minutes average delay. For less crowded flights, try ${data.bestHour.hour}:00.`
    }
    
    if (q.includes('minimize') || q.includes('reduce') || q.includes('travel time')) {
      return `To minimize delays: 1) Fly at ${data.bestHour.hour}:00, 2) Choose ${data.bestAirline.airline}, 3) Book early morning flights when possible. Current average delay is ${data.avgDelay} minutes.`
    }
    
    if (q.includes('delay') || q.includes('on time') || q.includes('performance')) {
      return `Route performance: ${data.totalFlights} total flights, ${data.avgDelay}min average delay, ${data.onTimePerf}% on-time performance. Peak delays occur at ${data.worstHour.hour}:00.`
    }

    // Default comprehensive response
    return `Here's what I found for ${route.origin} → ${route.destination}: ${data.totalFlights} flights tracked, ${data.avgDelay}min average delay. Best time: ${data.bestHour.hour}:00 (${data.bestHour.avg_delay.toFixed(1)}min delay). Best airline: ${data.bestAirline.airline}. On-time performance: ${data.onTimePerf}%.`
  }

  const handleSendMessage = async (message = null) => {
    const messageText = message || inputValue.trim()
    if (!messageText || isLoading) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: messageText,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Try to use the QA endpoint first (if configured)
      const qaResponse = await askQuestion(messageText, route.origin, route.destination)
      
      let responseText = ''
      
      if (qaResponse.ok && qaResponse.answer && !qaResponse.answer.includes('not configured')) {
        responseText = qaResponse.answer
      } else {
        // Fall back to local analysis
        const data = await analyzeLocalData()
        responseText = generateResponse(messageText, data)
      }

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: responseText,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      console.error('Error in chat response:', error)
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'Sorry, I encountered an error while processing your question. Please check that your backend is running properly.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <>
      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => onToggleExpanded(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg flex items-center justify-center z-50 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <MessageCircle className="w-6 h-6" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white">AI</span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Expanded Chat Interface */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, x: 400, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 400, scale: 0.8 }}
            className={`fixed top-4 right-4 w-80 h-[600px] ${themeClasses.bg} rounded-lg border ${themeClasses.border} shadow-2xl flex flex-col z-50`}
            style={{ backdropFilter: 'blur(10px)' }}
          >
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b ${themeClasses.border}`}>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className={`font-semibold ${themeClasses.text}`}>AI Assistant</h3>
                  <p className={`text-xs ${themeClasses.textSecondary}`}>Ask about flights & delays</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 text-xs text-green-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Online</span>
                </div>
                <button
                  onClick={() => onToggleExpanded(false)}
                  className={`p-1 rounded hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} transition-colors`}
                >
                  <X className={`w-4 h-4 ${themeClasses.textSecondary}`} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start space-x-2 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${message.type === 'user' ? 'bg-blue-500' : 'bg-purple-500'}`}>
                        {message.type === 'user' ? <User className="w-3 h-3 text-white" /> : <Bot className="w-3 h-3 text-white" />}
                      </div>
                      <div className={`rounded-lg px-3 py-2 text-sm ${message.type === 'user' ? 'bg-blue-600 text-white' : `${themeClasses.bgSecondary} ${themeClasses.text}`}`}>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs mt-1 opacity-70">{formatTime(message.timestamp)}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Loading indicator */}
              <AnimatePresence>
                {isLoading && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex justify-start">
                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                        <Bot className="w-3 h-3 text-white" />
                      </div>
                      <div className={`${themeClasses.bgSecondary} rounded-lg px-3 py-2`}>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* Sample Questions */}
            {messages.length === 1 && (
              <div className="px-4 pb-2">
                <div className="flex items-center space-x-2 mb-2">
                  <HelpCircle className="w-3 h-3 text-purple-400" />
                  <span className={`text-xs ${themeClasses.textSecondary}`}>Try asking:</span>
                </div>
                <div className="space-y-1">
                  {sampleQuestions.slice(0, 2).map((question, index) => (
                    <motion.button
                      key={index}
                      className={`text-left w-full p-2 text-xs ${themeClasses.bgSecondary} hover:${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded-lg transition-colors ${themeClasses.textSecondary} hover:${themeClasses.text}`}
                      onClick={() => handleSendMessage(question)}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {question}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className={`p-4 border-t ${themeClasses.border}`}>
              <div className="flex space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Ask about ${route.origin} → ${route.destination} flights...`}
                  className={`flex-1 ${themeClasses.bgSecondary} border ${themeClasses.border} rounded-lg px-3 py-2 text-sm ${themeClasses.text} placeholder-${isDarkMode ? 'gray-400' : 'gray-500'} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  disabled={isLoading}
                />
                <motion.button
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isLoading}
                  className={`px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Send className="w-3 h-3" />
                </motion.button>
              </div>

              <div className={`flex items-center justify-between mt-2 text-xs ${themeClasses.textSecondary}`}>
                <span>Powered by AI • Real flight data</span>
                <span className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Route: {route.origin}→{route.destination}</span>
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default ChatBox

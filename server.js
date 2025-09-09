// server.js - Optimized with Smart Caching
import express from 'express'
import cors from 'cors'
import dayjs from 'dayjs'
import 'dotenv/config'
import fetch from 'node-fetch'

const app = express()
const PORT = process.env.PORT || 5050

app.use(cors())
app.use(express.json())

// Indian airports with coordinates
const INDIAN_AIRPORTS = {
  'BOM': { name: 'Mumbai', city: 'Mumbai', lat: 19.0896, lon: 72.8656, icao: 'VABB' },
  'DEL': { name: 'Delhi', city: 'Delhi', lat: 28.5562, lon: 77.1000, icao: 'VIDP' },
  'BLR': { name: 'Bangalore', city: 'Bangalore', lat: 12.9716, lon: 77.5946, icao: 'VOBL' },
  'MAA': { name: 'Chennai', city: 'Chennai', lat: 12.9941, lon: 80.1709, icao: 'VOMM' },
  'CCU': { name: 'Kolkata', city: 'Kolkata', lat: 22.6547, lon: 88.4467, icao: 'VECC' },
  'HYD': { name: 'Hyderabad', city: 'Hyderabad', lat: 17.2403, lon: 78.4294, icao: 'VOHS' },
  'AMD': { name: 'Ahmedabad', city: 'Ahmedabad', lat: 23.0726, lon: 72.6263, icao: 'VAAH' },
  'COK': { name: 'Kochi', city: 'Kochi', lat: 10.1520, lon: 76.4019, icao: 'VOCI' },
  'GOI': { name: 'Goa', city: 'Goa', lat: 15.3808, lon: 73.8314, icao: 'VOGO' },
  'PNQ': { name: 'Pune', city: 'Pune', lat: 18.5822, lon: 73.9197, icao: 'VAPO' },
}

// Indian airlines
const INDIAN_AIRLINES = {
  '6E': 'IndiGo', 'AI': 'Air India', 'SG': 'SpiceJet', 'UK': 'Vistara',
  'G8': 'Go First', 'I5': 'AirAsia India', '9I': 'Alliance Air',
}

// Smart caching system - MUCH longer cache times to save API calls
let flightCache = {
  data: [],
  timestamp: null,
  ttl: 30 * 60 * 1000, // 30 minutes cache (was 5 minutes)
  apiCallsToday: 0,
  lastApiReset: dayjs().format('YYYY-MM-DD')
}

// Mock data generator for when API limits are reached
function generateMockFlights(origin, destination) {
  const airlines = ['6E', 'AI', 'SG', 'UK']
  const mockFlights = []
  
  for (let i = 0; i < 8; i++) {
    const airline = airlines[Math.floor(Math.random() * airlines.length)]
    const flightNum = `${airline}${Math.floor(1000 + Math.random() * 9000)}`
    const baseTime = dayjs().startOf('day').add(6 + i * 2, 'hours')
    const delay = Math.floor(Math.random() * 45)
    
    mockFlights.push({
      flight_id: flightNum,
      airline_code: airline,
      airline_name: INDIAN_AIRLINES[airline],
      origin,
      destination,
      origin_city: INDIAN_AIRPORTS[origin]?.city || origin,
      destination_city: INDIAN_AIRPORTS[destination]?.city || destination,
      scheduled_dep: baseTime.format('HH:mm'),
      scheduled_arr: baseTime.add(2, 'hours').format('HH:mm'),
      actual_dep: baseTime.add(delay, 'minutes').format('HH:mm'),
      actual_arr: baseTime.add(2, 'hours').add(delay, 'minutes').format('HH:mm'),
      status: delay > 15 ? 'delayed' : (delay > 5 ? 'boarding' : 'on-time'),
      aircraft: `VT-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
      delay,
      gate: `${Math.floor(Math.random() * 20) + 1}`,
      terminal: Math.floor(Math.random() * 3) + 1,
      is_live: false, // Mark as mock data
      route: `${INDIAN_AIRPORTS[origin]?.city} → ${INDIAN_AIRPORTS[destination]?.city}`
    })
  }
  
  return mockFlights
}

// Check daily API limit
function checkApiLimit() {
  const today = dayjs().format('YYYY-MM-DD')
  if (flightCache.lastApiReset !== today) {
    flightCache.apiCallsToday = 0
    flightCache.lastApiReset = today
  }
  return flightCache.apiCallsToday < 50 // Conservative limit (you have 1000 total)
}

async function fetchLiveFlightsFromAPI() {
  if (!checkApiLimit()) {
    console.log('🚫 API limit reached for today, using mock data')
    return []
  }

  const API_KEY = process.env.AVIATIONSTACK_API_KEY
  if (!API_KEY) {
    console.log('⚠️ No AviationStack API key found')
    return []
  }

  try {
    // Only fetch from one major airport to conserve API calls
    const airport = 'BOM' // Focus on Mumbai
    const url = `http://api.aviationstack.com/v1/flights?access_key=${API_KEY}&dep_iata=${airport}&limit=30`
    
    flightCache.apiCallsToday++
    console.log(`📡 API Call #${flightCache.apiCallsToday} - Fetching from ${airport}`)
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.data && Array.isArray(data.data)) {
      const flights = data.data
        .filter(flight => 
          flight.departure?.iata && 
          flight.arrival?.iata && 
          INDIAN_AIRPORTS[flight.departure.iata] && 
          INDIAN_AIRPORTS[flight.arrival.iata]
        )
        .map(flight => ({
          flight_id: flight.flight.iata || flight.flight.number,
          airline_code: flight.airline.iata,
          airline_name: INDIAN_AIRLINES[flight.airline.iata] || flight.airline.name,
          origin: flight.departure.iata,
          destination: flight.arrival.iata,
          origin_city: INDIAN_AIRPORTS[flight.departure.iata]?.city,
          destination_city: INDIAN_AIRPORTS[flight.arrival.iata]?.city,
          scheduled_dep: flight.departure.scheduled ? dayjs(flight.departure.scheduled).format('HH:mm') : 'N/A',
          scheduled_arr: flight.arrival.scheduled ? dayjs(flight.arrival.scheduled).format('HH:mm') : 'N/A',
          actual_dep: flight.departure.actual ? dayjs(flight.departure.actual).format('HH:mm') : null,
          actual_arr: flight.arrival.actual ? dayjs(flight.arrival.actual).format('HH:mm') : null,
          status: flight.flight_status,
          aircraft: flight.aircraft?.registration || 'Unknown',
          delay: calculateDelay(flight.departure.scheduled, flight.departure.actual),
          gate: flight.departure.gate,
          terminal: flight.departure.terminal,
          is_live: true,
          route: `${INDIAN_AIRPORTS[flight.departure.iata]?.city} → ${INDIAN_AIRPORTS[flight.arrival.iata]?.city}`
        }))
      
      console.log(`✅ Got ${flights.length} live flights from API`)
      return flights
    }
    
    return []
  } catch (error) {
    console.error('❌ API fetch failed:', error.message)
    flightCache.apiCallsToday-- // Don't count failed calls
    return []
  }
}

function calculateDelay(scheduled, actual) {
  if (!scheduled || !actual) return 0
  const schedTime = dayjs(scheduled)
  const actualTime = dayjs(actual)
  return Math.max(0, actualTime.diff(schedTime, 'minute'))
}

async function getFlightData() {
  const now = Date.now()
  
  // Return cached data if still valid
  if (flightCache.timestamp && (now - flightCache.timestamp) < flightCache.ttl && flightCache.data.length > 0) {
    console.log('📋 Using cached flight data')
    return flightCache.data
  }
  
  console.log('🔄 Refreshing flight data...')
  let flights = []
  
  // Try to get live data
  const liveFlights = await fetchLiveFlightsFromAPI()
  
  if (liveFlights.length > 0) {
    flights = liveFlights
  } else {
    // Generate mock data for popular routes
    console.log('🎭 Using mock flight data')
    const routes = [
      ['BOM', 'DEL'], ['DEL', 'BOM'], ['BOM', 'BLR'], ['DEL', 'BLR'],
      ['BLR', 'BOM'], ['BLR', 'DEL'], ['BOM', 'MAA'], ['DEL', 'MAA']
    ]
    
    routes.forEach(([origin, dest]) => {
      flights.push(...generateMockFlights(origin, dest))
    })
  }
  
  // Update cache
  flightCache = {
    ...flightCache,
    data: flights,
    timestamp: now
  }
  
  return flights
}

// API ENDPOINTS

app.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    status: 'healthy',
    flights_count: flightCache.data.length,
    api_calls_today: flightCache.apiCallsToday,
    cache_age_minutes: flightCache.timestamp ? Math.round((Date.now() - flightCache.timestamp) / (1000 * 60)) : 0,
    using_live_data: flightCache.data.some(f => f.is_live),
    last_updated: flightCache.timestamp ? new Date(flightCache.timestamp).toISOString() : null
  })
})

app.get('/flights', async (req, res) => {
  const { origin = 'BOM', destination = 'DEL' } = req.query
  
  try {
    const allFlights = await getFlightData()
    
    const routeFlights = allFlights
      .filter(flight => flight.origin === origin && flight.destination === destination)
      .map(flight => ({
        flight_id: flight.flight_id,
        airline: flight.airline_name || flight.airline_code,
        route: flight.route,
        scheduled_dep: flight.scheduled_dep,
        scheduled_arr: flight.scheduled_arr,
        aircraft: flight.aircraft,
        delay: flight.delay || 0,
        status: flight.status || 'scheduled',
        gate: flight.gate,
        terminal: flight.terminal,
        is_live: flight.is_live
      }))
    
    res.json(routeFlights)
  } catch (error) {
    console.error('Error in /flights:', error)
    res.json({ error: error.message, flights: [] })
  }
})

app.get('/flights/all', async (req, res) => {
  try {
    const flights = await getFlightData()
    const routes = [...new Set(flights.map(f => `${f.origin}-${f.destination}`))]
    
    res.json({
      total: flights.length,
      flights: flights.slice(0, 50),
      routes_available: routes,
      api_calls_used: flightCache.apiCallsToday,
      using_live_data: flights.some(f => f.is_live)
    })
  } catch (error) {
    res.json({ error: error.message, flights: [] })
  }
})

app.get('/metrics', async (req, res) => {
  const { origin = 'BOM', destination = 'DEL' } = req.query
  
  try {
    const allFlights = await getFlightData()
    const routeFlights = allFlights.filter(flight => 
      flight.origin === origin && flight.destination === destination
    )
    
    if (routeFlights.length === 0) {
      return res.json({
        origin, destination,
        cards: { total_flights: 0, avg_delay: 0, pct_on_time: 0 },
        delay_series: [],
        airline_delays: [],
        busiest: []
      })
    }
    
    // Calculate metrics
    const delays = routeFlights.map(f => f.delay || 0)
    const avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length
    const onTimeCount = delays.filter(d => d <= 5).length
    const onTimePercent = Math.round((onTimeCount / delays.length) * 100)
    
    // Group delays by hour (simulate hourly data)
    const delayByHour = {}
    routeFlights.forEach(flight => {
      if (flight.scheduled_dep && flight.scheduled_dep !== 'N/A') {
        const hour = parseInt(flight.scheduled_dep.split(':')[0])
        if (!isNaN(hour)) {
          if (!delayByHour[hour]) delayByHour[hour] = []
          delayByHour[hour].push(flight.delay || 0)
        }
      }
    })
    
    // Create delay series for chart
    const delaySeries = Object.entries(delayByHour).map(([hour, delays]) => ({
      hour: parseInt(hour),
      avg_delay: Math.round(delays.reduce((a, b) => a + b, 0) / delays.length)
    })).sort((a, b) => a.hour - b.hour)
    
    // Airline performance
    const airlineMap = {}
    routeFlights.forEach(flight => {
      const airline = flight.airline_name || 'Unknown'
      if (!airlineMap[airline]) airlineMap[airline] = []
      airlineMap[airline].push(flight.delay || 0)
    })
    
    const airlineDelays = Object.entries(airlineMap).map(([airline, delays]) => ({
      airline,
      avg_delay: Math.round(delays.reduce((a, b) => a + b, 0) / delays.length)
    }))
    
    res.json({
      origin, destination,
      cards: {
        total_flights: routeFlights.length,
        avg_delay: Math.round(avgDelay),
        pct_on_time: onTimePercent
      },
      delay_series: delaySeries,
      airline_delays: airlineDelays,
      busiest: [] // Simplified for now
    })
    
  } catch (error) {
    console.error('Error in /metrics:', error)
    res.json({ error: error.message })
  }
})

app.post('/reschedule', async (req, res) => {
  const { flight_id, minutes_shift = 0 } = req.query
  
  try {
    const allFlights = await getFlightData()
    const flight = allFlights.find(f => f.flight_id === flight_id)
    
    if (!flight) {
      return res.json({ ok: false, error: 'Flight not found' })
    }
    
    const minutesShift = parseInt(minutes_shift)
    const currentDelay = flight.delay || 0
    
    // Simple simulation of reschedule impact
    const newDelay = Math.max(0, currentDelay + (minutesShift > 0 ? -2 : 1))
    const currentSlotLoad = Math.floor(Math.random() * 8) + 3
    const newSlotLoad = currentSlotLoad + (minutesShift > 0 ? 1 : -1)
    
    res.json({
      ok: true,
      flight_id,
      minutes_shift: minutesShift,
      pred_delay_before: currentDelay,
      pred_delay_after: newDelay,
      slot_load_before: currentSlotLoad,
      slot_load_after: Math.max(1, newSlotLoad),
      message: `Flight ${flight_id} rescheduled by ${minutesShift} minutes`
    })
    
  } catch (error) {
    res.json({ ok: false, error: error.message })
  }
})

app.get('/qa', async (req, res) => {
  const { query = '', origin = 'BOM', destination = 'DEL' } = req.query

  if (!process.env.OPENROUTER_API_KEY) {
    return res.json({
      ok: true,
      answer: 'AI chat is not configured. Please add OPENROUTER_API_KEY to your .env file.',
    })
  }

  try {
    const allFlights = await getFlightData()
    const routeFlights = allFlights.filter(f => f.origin === origin && f.destination === destination)
    
    if (routeFlights.length === 0) {
      return res.json({
        ok: true,
        answer: `No flight data available for the ${origin} to ${destination} route. Try selecting a different route.`,
      })
    }
    
    // Create simple stats for AI
    const avgDelay = routeFlights.reduce((sum, f) => sum + (f.delay || 0), 0) / routeFlights.length
    const onTimeFlights = routeFlights.filter(f => (f.delay || 0) <= 5).length
    const delayedFlights = routeFlights.length - onTimeFlights
    
    const systemPrompt = 'You are a helpful flight information assistant. Provide concise, practical answers about flight delays and scheduling. Keep responses under 100 words.'
    
    const userPrompt = `Route: ${origin} → ${destination}
Total flights: ${routeFlights.length}
Average delay: ${avgDelay.toFixed(1)} minutes
On-time flights: ${onTimeFlights}
Delayed flights: ${delayedFlights}

Question: ${query}`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemma-2-9b-it:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 150,
      }),
    })

    const data = await response.json()
    const answer = data.choices?.[0]?.message?.content || 'Sorry, I could not process your question.'

    res.json({ ok: true, answer })
  } catch (err) {
    console.error('QA endpoint error:', err.message)
    res.json({ ok: false, error: 'AI service temporarily unavailable' })
  }
})

// Manual refresh endpoint
app.post('/refresh', async (req, res) => {
  try {
    flightCache.timestamp = 0 // Force refresh
    const flights = await getFlightData()
    res.json({ 
      ok: true, 
      message: `Refreshed ${flights.length} flights`,
      flights_count: flights.length,
      api_calls_used: flightCache.apiCallsToday,
      using_live_data: flights.some(f => f.is_live)
    })
  } catch (error) {
    res.json({ ok: false, error: error.message })
  }
})

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Optimized Flight Server running on http://localhost:${PORT}`)
  console.log(`💾 Smart caching enabled - 30min cache time`)
  console.log(`🔢 API calls today: ${flightCache.apiCallsToday}/50 (daily limit)`)
  console.log(`📡 AviationStack API: ${process.env.AVIATIONSTACK_API_KEY ? '✅ Connected' : '❌ Not configured'}`)
  
  // Initial data load
  await getFlightData()
  console.log(`📊 Loaded ${flightCache.data.length} flights into cache`)
  
  // Refresh every 30 minutes (instead of 5) to save API calls
  setInterval(async () => {
    console.log('🔄 Scheduled refresh...')
    await getFlightData()
  }, 30 * 60 * 1000)
})
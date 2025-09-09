// API functions for communicating with backend
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5050";

// Helper function to make API calls with error handling
const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    return { ok: false, error: error.message };
  }
};

// Get dashboard metrics for a specific route
export const getMetrics = async (origin = "BOM", destination = "DEL") => {
  return await apiCall(`/metrics?origin=${origin}&destination=${destination}`);
};

// Get flights for a specific route
export const getFlights = async (origin = "BOM", destination = "DEL") => {
  return await apiCall(`/flights?origin=${origin}&destination=${destination}`);
};

// Get airport slot congestion data
export const getSlots = async (airport = "BOM") => {
  return await apiCall(`/slots?airport=${airport}`);
};

// Reschedule a flight and get impact analysis
export const rescheduleFlights = async (flightId, minutesShift) => {
  return await apiCall(
    `/reschedule?flight_id=${flightId}&minutes_shift=${minutesShift}`,
    { method: "POST" }
  );
};

// Ask natural language questions about flight data
export const askQuestion = async (
  query,
  origin = "BOM",
  destination = "DEL"
) => {
  const encodedQuery = encodeURIComponent(query);
  return await apiCall(
    `/qa?query=${encodedQuery}&origin=${origin}&destination=${destination}`
  );
};

// Health check to verify backend connection
export const healthCheck = async () => {
  return await apiCall("/health");
};

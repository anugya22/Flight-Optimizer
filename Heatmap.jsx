import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";

const Heatmap = ({ route, data: propData, isDarkMode = false }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const themeClasses = {
    bg: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
    bgSecondary: isDarkMode ? 'bg-gray-800' : 'bg-white',
    text: isDarkMode ? 'text-white' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-gray-400' : 'text-gray-600',
    border: isDarkMode ? 'border-gray-700' : 'border-gray-200',
  }

  // Fetch from backend metrics endpoint (which has delay_series data)
  useEffect(() => {
    if (propData && propData.length) {
      setData(propData);
      setLoading(false);
      return;
    }

    if (!route?.origin) return;

    setLoading(true);
    fetch(
      `http://localhost:5050/metrics?origin=${route.origin}&destination=${route.destination}`
    )
      .then((res) => res.json())
      .then((metricsData) => {
        // Convert delay_series to heatmap format
        const heatmapData = metricsData.delay_series || [];
        setData(heatmapData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Heatmap fetch failed:", err);
        setData([]);
        setLoading(false);
      });
  }, [route, propData]);

  // Process heatmap data
  const heatmapData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const maxDelay = Math.max(...data.map((d) => d.avg_delay || 0));

    return hours.map((hour) => {
      const hourData = data.find((d) => d.hour === hour);
      const avgDelay = hourData?.avg_delay || 0;
      const intensity = maxDelay > 0 ? avgDelay / maxDelay : 0;
      return {
        hour,
        delay: avgDelay,
        intensity,
        level:
          intensity === 0
            ? "empty"
            : intensity < 0.3
            ? "low"
            : intensity < 0.7
            ? "medium"
            : "high",
      };
    });
  }, [data]);

  const getColorClass = (level) => {
    switch (level) {
      case "empty":
        return `${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-200 border-gray-300'}`;
      case "low":
        return "bg-green-500/30 border-green-500/50";
      case "medium":
        return "bg-yellow-500/50 border-yellow-500/70";
      case "high":
        return "bg-red-500/70 border-red-500/90";
      default:
        return `${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-200 border-gray-300'}`;
    }
  };

  const stats = useMemo(() => {
    if (!heatmapData.length) return null;
    const nonZeroHours = heatmapData.filter((h) => h.delay > 0);
    const peakHour = heatmapData.reduce(
      (peak, curr) => (curr.delay > peak.delay ? curr : peak),
      heatmapData[0]
    );
    const quietHour = nonZeroHours.length
      ? nonZeroHours.reduce(
          (quiet, curr) => (curr.delay < quiet.delay ? curr : quiet),
          nonZeroHours[0]
        )
      : null;
    return {
      peakHour,
      quietHour,
      avgDelay: heatmapData.reduce((sum, h) => sum + h.delay, 0) / heatmapData.length,
      activeHours: nonZeroHours.length,
    };
  }, [heatmapData]);

  if (loading) {
    return (
      <motion.div className={`${themeClasses.bgSecondary} rounded-lg p-6 border ${themeClasses.border} animate-pulse`}>
        <div className="flex items-center space-x-3 mb-6">
          <Activity className="w-5 h-5 text-purple-400" />
          <h3 className={`text-lg font-semibold ${themeClasses.text}`}>Delay Heatmap</h3>
        </div>
        <p className={themeClasses.textSecondary}>Loading delay data...</p>
      </motion.div>
    );
  }

  return (
    <motion.div className={`${themeClasses.bgSecondary} rounded-lg p-6 border ${themeClasses.border} hover:${isDarkMode ? 'border-gray-600' : 'border-gray-300'} transition-colors`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Activity className="w-5 h-5 text-purple-400" />
          <div>
            <h3 className={`text-lg font-semibold ${themeClasses.text}`}>Delay Heatmap</h3>
            <p className={`text-sm ${themeClasses.textSecondary}`}>
              {route?.origin || 'BOM'} → {route?.destination || 'DEL'} delays by hour
            </p>
          </div>
        </div>
        <div className="text-right text-sm">
          <p className={themeClasses.textSecondary}>Avg Delay</p>
          <p className="text-purple-400 font-semibold text-lg">
            {stats?.avgDelay?.toFixed(1) || "0"}min
          </p>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-12 gap-1 mb-4">
        {heatmapData.map((hour) => (
          <motion.div
            key={hour.hour}
            className={`${getColorClass(
              hour.level
            )} border rounded aspect-square flex flex-col items-center justify-center cursor-pointer hover:scale-110 transition-all duration-200 group relative`}
            whileHover={{ scale: 1.1 }}
          >
            <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              {hour.hour}
            </span>
            <span className={`text-xs ${isDarkMode ? 'text-white/80' : 'text-gray-700'}`}>
              {hour.delay?.toFixed(0) || 0}m
            </span>
            <div className={`absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 ${themeClasses.bgSecondary} ${themeClasses.text} text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 whitespace-nowrap z-20 border ${themeClasses.border}`}>
              {hour.hour}:00 – {hour.delay?.toFixed(1) || 0}min avg delay
              <div className={`absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-${isDarkMode ? 'gray-800' : 'white'}`}></div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gray-300 border rounded"></div>
            <span className={themeClasses.textSecondary}>No delays</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500/30 border border-green-500/50 rounded"></div>
            <span className={themeClasses.textSecondary}>Low</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500/50 border border-yellow-500/70 rounded"></div>
            <span className={themeClasses.textSecondary}>Medium</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500/70 border border-red-500/90 rounded"></div>
            <span className={themeClasses.textSecondary}>High</span>
          </div>
        </div>
        
        {stats && (
          <div className="text-right text-xs">
            <p className={themeClasses.textSecondary}>
              Peak: <span className="text-red-400">{stats.peakHour?.hour}:00</span>
              {stats.quietHour && (
                <span className={themeClasses.textSecondary}>
                  {' • Best: '}<span className="text-green-400">{stats.quietHour.hour}:00</span>
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Insights */}
      {stats && (
        <div className={`p-4 ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100/50'} rounded-lg`}>
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <h4 className={`text-sm font-medium ${themeClasses.text}`}>Insights</h4>
          </div>
          <div className="text-sm space-y-1">
            <p className={themeClasses.textSecondary}>
              <span className="text-red-400 font-medium">Peak delays</span> occur at{' '}
              <span className={themeClasses.text}>{stats.peakHour.hour}:00</span> with{' '}
              <span className="text-red-400">{stats.peakHour.delay?.toFixed(1)}min</span> average delay.
            </p>
            {stats.quietHour && (
              <p className={themeClasses.textSecondary}>
                <span className="text-green-400 font-medium">Best time</span> to fly is{' '}
                <span className={themeClasses.text}>{stats.quietHour.hour}:00</span> with only{' '}
                <span className="text-green-400">{stats.quietHour.delay?.toFixed(1)}min</span> delay.
              </p>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Heatmap;
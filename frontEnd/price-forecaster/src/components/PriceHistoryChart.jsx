import React, { useState, useMemo, useEffect } from 'react';
import { 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';
import { BarChart2, Calendar, TrendingUp, Sparkles, Layers, Anchor } from 'lucide-react';

const formatDatePretty = (dStr) => {
  if (!dStr) return '';
  try {
    const parts = dStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parts[2];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day} ${months[monthIndex] || ''} ${year}`;
    }
  } catch (e) {}
  return dStr;
};

const PriceHistoryChart = ({ 
  historyData, 
  predictedPrice, 
  cropName, 
  selectedDate, 
  forecastSeries = [],
  isFutureForecast = false,
  latestActualDate = '2026-09-10',
  forecastStartDate = '2026-09-17',
  dateAdjusted = false,
  originalDate = null,
  horizonCategory = null,
  lang = 'en'
}) => {
  const targetDate = selectedDate || (historyData && historyData.length > 0 ? historyData[historyData.length - 1].date : null);
  const selectedYear = targetDate ? parseInt(targetDate.split('-')[0]) : 2026;

  // View modes: 'SELECTED_YEAR', 'ALL', 'FORECAST_ONLY', '3M', '6M', '1Y', or year number string
  const [timeRange, setTimeRange] = useState('SELECTED_YEAR');
  const [chartType, setChartType] = useState('area');

  useEffect(() => {
    if (timeRange === 'SELECTED_YEAR' || !isNaN(Number(timeRange))) {
      setTimeRange('SELECTED_YEAR');
    }
  }, [selectedYear]);

  // Combine historical records and future recursive forecast series into one unified dataset
  const combinedTrajectory = useMemo(() => {
    if (!historyData || historyData.length === 0) return [];

    // 1. Mark historical records
    const histPoints = historyData.map((d) => {
      const isBoundary = d.date === latestActualDate;
      return {
        ...d,
        year: d.date,
        formattedDate: formatDatePretty(d.date),
        actual_price: d.price,
        forecast_price: isBoundary && isFutureForecast ? d.price : null,
        isForecast: false,
        isBoundary: isBoundary
      };
    });

    // 2. If this is a future forecast with recursive steps, append forecast series
    if (isFutureForecast && forecastSeries && forecastSeries.length > 0) {
      const totalSteps = forecastSeries.length;
      const forecastPoints = forecastSeries.map((s, idx) => ({
        year: s.date,
        formattedDate: formatDatePretty(s.date),
        date: s.date,
        week: s.week,
        year_num: s.year,
        price: s.predicted_price,
        actual_price: null,
        forecast_price: s.predicted_price,
        isForecast: true,
        step: s.step,
        totalSteps: totalSteps,
        isTarget: idx === totalSteps - 1,
        lag_1: s.lag_1,
        lag_1_source: s.lag_1_source,
        data_type: s.data_type || 'FORECAST_PRICE'
      }));

      return [...histPoints, ...forecastPoints];
    }

    // 3. If target is in history, append single prediction target marker
    if (predictedPrice && !isFutureForecast) {
      const targetInHist = histPoints.find(p => p.date === targetDate);
      if (!targetInHist) {
        histPoints.push({
          year: targetDate ? `Forecast (${targetDate})` : 'Forecast (Target)',
          formattedDate: formatDatePretty(targetDate),
          price: predictedPrice,
          actual_price: null,
          forecast_price: predictedPrice,
          date: targetDate,
          year_num: selectedYear,
          isForecast: true,
          isTarget: true
        });
      }
    }

    return histPoints;
  }, [historyData, forecastSeries, isFutureForecast, latestActualDate, predictedPrice, targetDate, selectedYear]);

  // Extract all available years across both actual history and future forecasts
  const availableYears = useMemo(() => {
    if (!combinedTrajectory || combinedTrajectory.length === 0) return [2020, 2021, 2022, 2023, 2024, 2025, 2026];
    const yrSet = new Set(combinedTrajectory.map(d => d.year_num).filter(Boolean));
    return Array.from(yrSet).sort();
  }, [combinedTrajectory]);

  // Filter data based on selected time range
  const filteredData = useMemo(() => {
    if (!combinedTrajectory || combinedTrajectory.length === 0) return [];

    // A. Forecast Only Preset (useful when reviewing long 52 to 182-week horizon)
    if (timeRange === 'FORECAST_ONLY') {
      const boundaryRecord = combinedTrajectory.find(d => d.date === latestActualDate);
      const forecastRecords = combinedTrajectory.filter(d => d.isForecast);
      if (boundaryRecord) {
        return [boundaryRecord, ...forecastRecords];
      }
      return forecastRecords;
    }

    // B. Year-specific filter
    const isYearSpecific = timeRange === 'SELECTED_YEAR' || !isNaN(Number(timeRange));
    const yearToFilter = timeRange === 'SELECTED_YEAR' ? selectedYear : Number(timeRange);

    if (isYearSpecific && yearToFilter) {
      return combinedTrajectory.filter(d => {
        if (d.year_num !== yearToFilter) return false;
        if (yearToFilter === selectedYear && targetDate) {
          return d.date <= targetDate;
        }
        return true;
      });
    }

    // C. Relative ranges leading up to targetDate (3M, 6M, 1Y, 3Y, ALL)
    const priorRecords = targetDate 
      ? combinedTrajectory.filter(d => d.date <= targetDate)
      : combinedTrajectory;

    let count = priorRecords.length;
    if (timeRange === '3M') count = 13;
    else if (timeRange === '6M') count = 26;
    else if (timeRange === '1Y') count = 52;
    else if (timeRange === '3Y') count = 156;
    else count = priorRecords.length;

    return priorRecords.slice(-count);
  }, [combinedTrajectory, timeRange, selectedYear, targetDate, latestActualDate]);

  // Calculate statistics (min, max, average) for the current filtered view
  const stats = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return { min: 0, max: 0, avg: 0 };
    const prices = filteredData.map(d => d.price).filter(p => !isNaN(p));
    if (prices.length === 0) return { min: 0, max: 0, avg: 0 };
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    return { min, max, avg };
  }, [filteredData]);

  // Boundary reference for chart visual marker
  const boundaryRecord = useMemo(() => {
    return filteredData.find(d => d.date === latestActualDate);
  }, [filteredData, latestActualDate]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const isForecast = dataPoint.isForecast;
      const isBoundary = dataPoint.isBoundary;

      return (
        <div className="custom-chart-tooltip">
          <div className="tooltip-header">
            {isForecast 
              ? `🔮 Recursive Forecast (Step ${dataPoint.step || 'Target'} of ${dataPoint.totalSteps || 'N/A'})`
              : isBoundary 
                ? '⚓ Last Actual Observation (Boundary)'
                : `📅 ${dataPoint.formattedDate || label}`}
          </div>
          
          <div className="tooltip-price">
            Rs. {payload[0].value != null ? Number(payload[0].value).toFixed(2) : (payload[1]?.value != null ? Number(payload[1].value).toFixed(2) : 'N/A')}
            <span className="tooltip-unit">/ kg</span>
          </div>

          <div className="tooltip-meta-rows">
            <div className="t-meta">
              <span className="m-lbl">Date:</span>
              <span className="m-val">{dataPoint.formattedDate || dataPoint.date} (Thursday)</span>
            </div>
            {isForecast && dataPoint.lag_1 != null && (
              <div className="t-meta">
                <span className="m-lbl">T-1 Lag:</span>
                <span className="m-val">Rs. {Number(dataPoint.lag_1).toFixed(2)} ({dataPoint.lag_1_source})</span>
              </div>
            )}
            <div className="t-type-tag">
              {isForecast ? 'Dashed Line: Recursive Multi-Step Forecast' : 'Solid Line: Historical Actual Market Price'}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const activePeriodLabel = useMemo(() => {
    if (timeRange === 'FORECAST_ONLY') {
      return lang === 'en' ? `Recursive Forecast Horizon (${forecastStartDate} to ${targetDate})` : `පුරෝකථන කාලපරාසය`;
    }
    if (timeRange === 'SELECTED_YEAR') {
      return lang === 'en' ? `Year ${selectedYear} (Until ${targetDate || 'Today'})` : `${selectedYear} වසර (${targetDate || 'අද'} දක්වා)`;
    }
    if (!isNaN(Number(timeRange))) {
      return lang === 'en' ? `Year ${timeRange}` : `${timeRange} වසර`;
    }
    return timeRange;
  }, [timeRange, selectedYear, targetDate, forecastStartDate, lang]);

  return (
    <div className="chart-card glass-panel">
      {/* Chart Header */}
      <div className="chart-header">
        <div>
          <div className="chart-badge">
            <BarChart2 size={13} className="text-emerald-400" />
            <span>
              {isFutureForecast 
                ? (lang === 'en' ? 'Long-Horizon Forecast Trajectory' : 'දීර්ඝකාලීන පුරෝකථන ප්‍රවණතාව')
                : (lang === 'en' ? 'Historical Market Analytics' : 'ඓතිහාසික මිල විශ්ලේෂණය')}
            </span>
          </div>
          <h3 className="chart-title">
            {lang === 'en' ? `Price History & Forecast Trajectory` : `මිල ඉතිහාසය හා ඉදිරි පුරෝකථන ප්‍රවණතාව`}
          </h3>
          <p className="chart-subtitle">
            {lang === 'en' 
              ? `Displaying weekly retail market prices for ${activePeriodLabel}. Solid green line = Historical actuals (ends ${formatDatePretty(latestActualDate)}); Dashed amber line = Future recursive forecasts.` 
              : `${activePeriodLabel} සඳහා සතිපතා සිල්ලර වෙළඳපල මිල හැසිරීම. තද කොළ රේඛාව = සැබෑ මිල; කඩින්කඩ රේඛාව = AI පුරෝකථනය.`}
          </p>
        </div>

        {/* Time Filter Controls */}
        <div className="time-filter-controls">
          <div className="time-filter-group main-filters">
            {isFutureForecast && (
              <button
                className={`time-btn highlight-forecast ${timeRange === 'FORECAST_ONLY' ? 'active' : ''}`}
                onClick={() => setTimeRange('FORECAST_ONLY')}
                title="Zoom directly into the future recursive forecast horizon"
              >
                <Sparkles size={11} style={{ display: 'inline', marginRight: 4 }} />
                {lang === 'en' ? 'Forecast Only' : 'පුරෝකථනය පමණි'}
              </button>
            )}

            <button
              className={`time-btn highlight-year ${timeRange === 'SELECTED_YEAR' ? 'active' : ''}`}
              onClick={() => setTimeRange('SELECTED_YEAR')}
              title={`View target year ${selectedYear} up to ${targetDate}`}
            >
              <Calendar size={11} style={{ display: 'inline', marginRight: 4 }} />
              {selectedYear} ({lang === 'en' ? 'Target Year' : 'ඉලක්ක වසර'})
            </button>

            {['3M', '6M', '1Y', '3Y', 'ALL'].map((r) => (
              <button
                key={r}
                className={`time-btn ${timeRange === r ? 'active' : ''}`}
                onClick={() => setTimeRange(r)}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Quick Year Selector Pills */}
          <div className="year-pills-row">
            <span className="year-label">{lang === 'en' ? 'Select Year:' : 'වසර තෝරන්න:'}</span>
            {availableYears.map((yr) => (
              <button
                key={yr}
                className={`year-pill ${((timeRange === 'SELECTED_YEAR' && selectedYear === yr) || timeRange === String(yr)) ? 'active' : ''}`}
                onClick={() => setTimeRange(String(yr))}
              >
                {yr}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Trajectory Legend Strip */}
      <div className="trajectory-legend-strip">
        <div className="legend-indicator">
          <span className="legend-line actual"></span>
          <span className="legend-text">
            {lang === 'en' ? `Historical Actual Price (Solid line, up to ${formatDatePretty(latestActualDate)})` : `සැබෑ වෙළඳපල මිල`}
          </span>
        </div>
        {isFutureForecast && (
          <div className="legend-indicator">
            <span className="legend-line forecast"></span>
            <span className="legend-text">
              {lang === 'en' ? `Future Recursive Forecast (Dashed line, from ${formatDatePretty(forecastStartDate)} to ${formatDatePretty(targetDate)})` : `අනාගත AI පුරෝකථනය`}
            </span>
          </div>
        )}
      </div>

      {/* Mini Stats Summary Bar */}
      <div className="chart-stats-strip">
        <div className="chart-stat-item">
          <span className="stat-label">{lang === 'en' ? 'Period Low' : 'අඩුම මිල'}:</span>
          <span className="stat-val low">Rs. {stats.min.toFixed(2)}</span>
        </div>
        <div className="chart-stat-item">
          <span className="stat-label">{lang === 'en' ? 'Period Average' : 'සාමාන්‍යය'}:</span>
          <span className="stat-val avg">Rs. {stats.avg.toFixed(2)}</span>
        </div>
        <div className="chart-stat-item">
          <span className="stat-label">{lang === 'en' ? 'Period Peak' : 'වැඩිම මිල'}:</span>
          <span className="stat-val high">Rs. {stats.max.toFixed(2)}</span>
        </div>
        {predictedPrice && (
          <div className="chart-stat-item forecast-highlight">
            <span className="stat-label">{lang === 'en' ? 'Target Forecast' : 'ඉලක්ක පුරෝකථනය'}:</span>
            <span className="stat-val fc">Rs. {predictedPrice.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Chart Canvas */}
      <div className="chart-canvas-wrapper">
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={filteredData} margin={{ top: 15, right: 25, left: -5, bottom: 20 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
            <XAxis 
              dataKey="year" 
              stroke="#64748b" 
              fontSize={11} 
              tickLine={false}
              interval="preserveStartEnd"
              angle={filteredData.length > 25 ? -25 : 0}
              textAnchor={filteredData.length > 25 ? 'end' : 'middle'}
              height={filteredData.length > 25 ? 50 : 30}
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={11} 
              tickLine={false} 
              unit=" Rs"
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Average Reference Line */}
            {stats.avg > 0 && (
              <ReferenceLine 
                y={stats.avg} 
                stroke="#475569" 
                strokeDasharray="3 3" 
                label={{ value: `Avg Rs.${stats.avg}`, fill: '#94a3b8', fontSize: 10, position: 'insideTopRight' }} 
              />
            )}

            {/* Section 15 Boundary Marker: Last Actual Data & Recursive Forecast Begins */}
            {boundaryRecord && isFutureForecast && (
              <ReferenceLine 
                x={boundaryRecord.year} 
                stroke="#64748b" 
                strokeWidth={1.5}
                strokeDasharray="4 4" 
                label={{ 
                  value: `Last Actual (${formatDatePretty(latestActualDate)})`, 
                  fill: '#94a3b8', 
                  fontSize: 10, 
                  position: 'top',
                  offset: 10
                }} 
              />
            )}

            {/* Solid Line + Area for Actual Historical Observations */}
            <Area 
              type="monotone" 
              dataKey="actual_price" 
              stroke="#10b981" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#priceGradient)" 
              dot={false}
              activeDot={{ r: 4, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
              connectNulls={false}
            />

            {/* Dashed Line + Area for Future Recursive Forecasts */}
            <Area 
              type="monotone" 
              dataKey="forecast_price" 
              stroke="#34d399" 
              strokeWidth={2}
              strokeDasharray="4 4"
              fillOpacity={1} 
              fill="url(#forecastGradient)" 
              dot={(props) => {
                if (props.payload.isTarget) {
                  return (
                    <circle 
                      key="fc-tgt-dot"
                      cx={props.cx} 
                      cy={props.cy} 
                      r={5} 
                      fill="#34d399" 
                      stroke="#ffffff" 
                      strokeWidth={2} 
                    />
                  );
                }
                if (props.payload.isBoundary) {
                  return (
                    <circle 
                      key="fc-bnd-dot"
                      cx={props.cx} 
                      cy={props.cy} 
                      r={4} 
                      fill="#64748b" 
                      stroke="#ffffff" 
                      strokeWidth={1.5} 
                    />
                  );
                }
                return null;
              }}
              activeDot={{ r: 5, fill: '#34d399', stroke: '#ffffff', strokeWidth: 2 }}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <style>{`
        .chart-card {
          padding: 24px;
          margin-bottom: 24px;
        }
        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }
        .chart-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(16, 185, 129, 0.12);
          color: var(--emerald-400);
          border: 1px solid rgba(16, 185, 129, 0.25);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .chart-title {
          font-family: var(--font-heading);
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .chart-subtitle {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 2px;
          line-height: 1.4;
        }
        .time-filter-controls {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }
        .time-filter-group {
          display: flex;
          background: var(--bg-pill);
          padding: 3px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
          gap: 2px;
          flex-wrap: wrap;
        }
        .time-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }
        .time-btn:hover {
          color: var(--text-primary);
        }
        .time-btn.active {
          background: var(--bg-card);
          color: var(--emerald-400);
          border: 1px solid var(--border-card);
          box-shadow: var(--shadow-sm);
        }
        .time-btn.highlight-year {
          background: rgba(16, 185, 129, 0.08);
          color: var(--emerald-400);
        }
        .time-btn.highlight-year.active {
          background: var(--emerald-500);
          color: #ffffff;
        }
        .time-btn.highlight-forecast {
          background: var(--bg-pill);
          color: var(--text-secondary);
          border: 1px solid var(--border-subtle);
        }
        .time-btn.highlight-forecast.active {
          background: var(--emerald-500);
          color: #ffffff;
        }
        .year-pills-row {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
        }
        .year-label {
          font-size: 10px;
          color: var(--text-muted);
          margin-right: 2px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .year-pill {
          background: var(--bg-pill);
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          padding: 2px 7px;
          border-radius: 4px;
          font-size: 10px;
          font-family: var(--font-mono);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .year-pill:hover {
          color: var(--text-primary);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .year-pill.active {
          background: rgba(16, 185, 129, 0.15);
          border-color: var(--emerald-500);
          color: var(--emerald-400);
          font-weight: 600;
        }
        .trajectory-legend-strip {
          display: flex;
          align-items: center;
          gap: 20px;
          background: var(--bg-input);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 8px 12px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .legend-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .legend-line {
          width: 24px;
          height: 3px;
          border-radius: 2px;
        }
        .legend-line.actual {
          background: var(--emerald-500);
        }
        .legend-line.forecast {
          background: transparent;
          border-top: 2px dashed var(--emerald-400);
        }
        .legend-text {
          font-size: 11px;
          color: var(--text-secondary);
        }
        .chart-stats-strip {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          background: var(--bg-pill);
          padding: 10px 14px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
          flex-wrap: wrap;
        }
        .chart-stat-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }
        .stat-label {
          color: var(--text-muted);
        }
        .stat-val {
          font-family: var(--font-mono);
          font-weight: 700;
        }
        .stat-val.low { color: var(--cyan-400); }
        .stat-val.avg { color: var(--amber-400); }
        .stat-val.high { color: var(--rose-400); }
        .stat-val.fc { color: var(--emerald-400); }
        .forecast-highlight {
          background: var(--bg-pill-active);
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid var(--border-glow);
        }
        .chart-canvas-wrapper {
          width: 100%;
          margin-top: 10px;
        }
        .custom-chart-tooltip {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          box-shadow: var(--shadow-lg);
          backdrop-filter: blur(12px);
          min-width: 180px;
          color: var(--text-primary);
        }
        .tooltip-header {
          font-size: 11px;
          color: var(--text-muted);
          margin-bottom: 4px;
          font-weight: 700;
        }
        .tooltip-price {
          font-family: var(--font-mono);
          font-size: 18px;
          font-weight: 800;
          color: var(--emerald-400);
        }
        .tooltip-unit {
          font-size: 11px;
          color: var(--text-secondary);
        }
        .tooltip-meta-rows {
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .t-meta {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          gap: 8px;
        }
        .m-lbl { color: var(--text-muted); }
        .m-val { color: var(--text-secondary); font-family: var(--font-mono); }
        .t-type-tag {
          font-size: 9px;
          color: var(--amber-400);
          font-weight: 600;
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
};

export default PriceHistoryChart;

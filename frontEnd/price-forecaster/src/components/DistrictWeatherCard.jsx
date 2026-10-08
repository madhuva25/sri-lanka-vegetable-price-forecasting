import React from 'react';
import { CloudRain, Thermometer, Calendar, Clock } from 'lucide-react';
import { DISTRICTS_DATA } from '../data/cropsData';

const DistrictWeatherCard = ({ weatherData, cropRegion, selectedDate, lang }) => {
  if (!weatherData) return null;

  // Extract date range from weatherData or fallback
  const startDate = weatherData.start_date;
  const endDate = weatherData.end_date || weatherData.target_date || selectedDate;
  const periodText = weatherData.period_text || (startDate && endDate ? `${startDate} to ${endDate}` : selectedDate);

  // Filter out non-district keys
  const nonDistrictKeys = ['avg_rainfall_mm', 'avg_temp_c', 'start_date', 'end_date', 'period_text', 'target_date'];
  const districtEntries = Object.entries(weatherData).filter(([key]) => !nonDistrictKeys.includes(key));

  return (
    <div className="district-weather-card glass-panel">
      <div className="weather-card-header">
        <div>
          <div className="weather-header-badges">
            <div className="weather-badge">
              <CloudRain size={13} className="text-emerald-400" />
              <span>{lang === 'en' ? 'Open-Meteo Climate Sync' : 'ස්වයංක්‍රීය කාලගුණ දත්ත'}</span>
            </div>

            {/* Date Window Indicator Badge */}
            {(startDate || endDate) && (
              <div className="weather-date-range-badge">
                <Calendar size={13} color="var(--text-muted)" />
                <span>
                  {lang === 'en' 
                    ? `Observation Window: ${startDate || 'N/A'} → ${endDate || 'N/A'}`
                    : `නිරීක්ෂණ සතිය: ${startDate || ''} සිට ${endDate || ''} දක්වා`}
                </span>
              </div>
            )}
          </div>

          <h3 className="weather-title">
            {lang === 'en' ? 'Regional Agricultural Climate' : 'කෘෂිකාර්මික දිස්ත්‍රික් කාලගුණය'}
          </h3>
          <p className="weather-desc">
            {lang === 'en' 
              ? `7-Day historical & forecast climate metrics (${periodText || 'Selected Week'}) fed into the ${cropRegion === 'upcountry' ? 'Up-Country' : 'Low-Country'} AI model.` 
              : `මිල පුරෝකථන ආකෘතියට ස්වයංක්‍රීයව ඇතුළත් වූ සතිපතා (${periodText || 'තෝරාගත් සතිය'}) කාලගුණ දත්ත.`}
          </p>
        </div>

        {weatherData.avg_rainfall_mm !== undefined && (
          <div className="weather-avg-badge">
            <span className="avg-label">{lang === 'en' ? 'Regional Avg Rain:' : 'සාමාන්‍ය වර්ෂාව:'}</span>
            <span className="avg-val">{weatherData.avg_rainfall_mm} mm</span>
          </div>
        )}
      </div>

      {/* District Cards Grid */}
      <div className="districts-weather-grid">
        {districtEntries.map(([districtKey, metrics]) => {
          const districtMeta = DISTRICTS_DATA.find(d => d.id === districtKey) || {
            name: districtKey.replace('_', ' ').toUpperCase(),
            name_si: districtKey,
            elevation: 'N/A'
          };

          const isHighRain = metrics?.rainfall_mm > 40;
          const cardStart = metrics?.start_date || startDate;
          const cardEnd = metrics?.end_date || endDate;

          return (
            <div key={districtKey} className="district-metric-box">
              <div className="district-box-top">
                <div className="district-name-col">
                  <span className="district-name-en">{districtMeta.name}</span>
                  <span className="district-name-si">{districtMeta.name_si}</span>
                </div>
                <span className="district-elev">{districtMeta.elevation}</span>
              </div>

              {/* District Observation Date Range */}
              {(cardStart || cardEnd) && (
                <div className="district-date-chip">
                  <Clock size={11} className="text-cyan-400" />
                  <span>{cardStart} to {cardEnd}</span>
                </div>
              )}

              <div className="district-metrics-row">
                {/* Rainfall Metric */}
                <div className={`metric-col rain ${isHighRain ? 'high' : ''}`}>
                  <div className="metric-icon-label">
                    <CloudRain size={13} />
                    <span>{lang === 'en' ? '7-Day Rain' : 'වර්ෂාව'}</span>
                  </div>
                  <div className="metric-val">{metrics?.rainfall_mm ?? 0} <span className="m-unit">mm</span></div>
                </div>

                {/* Temperature Metric */}
                <div className="metric-col temp">
                  <div className="metric-icon-label">
                    <Thermometer size={13} />
                    <span>{lang === 'en' ? 'Avg Temp' : 'උෂ්ණත්වය'}</span>
                  </div>
                  <div className="metric-val">{metrics?.temp_c ?? 0} <span className="m-unit">°C</span></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .district-weather-card {
          padding: 24px;
          margin-bottom: 24px;
        }
        .weather-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        .weather-header-badges {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 6px;
        }
        .weather-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(6, 182, 212, 0.12);
          color: var(--cyan-400);
          border: 1px solid rgba(6, 182, 212, 0.25);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .weather-date-range-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(245, 158, 11, 0.12);
          color: var(--amber-400);
          border: 1px solid rgba(245, 158, 11, 0.3);
          padding: 2px 10px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 700;
          font-family: var(--font-mono);
        }
        .weather-title {
          font-family: var(--font-heading);
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .weather-desc {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .weather-avg-badge {
          background: rgba(6, 182, 212, 0.15);
          border: 1px solid rgba(6, 182, 212, 0.3);
          padding: 6px 12px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }
        .avg-label {
          color: var(--text-muted);
        }
        .avg-val {
          font-family: var(--font-mono);
          font-weight: 700;
          color: var(--cyan-400);
        }
        .districts-weather-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }
        .district-metric-box {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-md);
          padding: 14px;
          transition: all 0.2s;
        }
        .district-metric-box:hover {
          border-color: var(--border-glow);
          transform: translateY(-2px);
        }
        .district-box-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        .district-name-col {
          display: flex;
          flex-direction: column;
        }
        .district-name-en {
          font-family: var(--font-heading);
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .district-name-si {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 500;
        }
        .district-elev {
          font-size: 10px;
          font-family: var(--font-mono);
          color: var(--text-muted);
          background: var(--bg-pill);
          padding: 2px 6px;
          border-radius: 4px;
        }
        .district-date-chip {
          display: flex;
          align-items: center;
          gap: 5px;
          background: var(--bg-input);
          border: 1px solid var(--border-subtle);
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-family: var(--font-mono);
          color: var(--text-muted);
          margin-bottom: 10px;
        }
        .district-metrics-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .metric-col {
          display: flex;
          flex-direction: column;
          background: var(--bg-input);
          padding: 8px 10px;
          border-radius: var(--radius-sm);
        }
        .metric-icon-label {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: var(--text-muted);
          margin-bottom: 2px;
        }
        .metric-col.rain .metric-icon-label { color: var(--text-secondary); }
        .metric-col.temp .metric-icon-label { color: var(--text-secondary); }
        .metric-val {
          font-family: var(--font-mono);
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .m-unit {
          font-size: 10px;
          color: var(--text-muted);
        }
        .metric-col.rain.high {
          border: 1px solid var(--border-card);
          background: var(--bg-pill);
        }
      `}</style>
    </div>
  );
};

export default DistrictWeatherCard;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CloudSun, 
  CloudRain, 
  Thermometer, 
  RefreshCw, 
  AlertTriangle, 
  Droplets, 
  Mountain 
} from 'lucide-react';
import { DISTRICTS_DATA } from '../data/cropsData';

const WeatherStation = ({ lang, targetDate }) => {
  const [weatherMap, setWeatherMap] = useState({});
  const [periodText, setPeriodText] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchDistrictsWeather = async () => {
    setLoading(true);
    try {
      const url = targetDate 
        ? `http://127.0.0.1:8000/api/weather/districts?target_date=${targetDate}`
        : `http://127.0.0.1:8000/api/weather/districts`;
      const response = await axios.get(url);
      setWeatherMap(response.data.districts || {});
      setPeriodText(response.data.period_text || '');
    } catch (err) {
      console.error('Error fetching district weather:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDistrictsWeather();
  }, [targetDate]);

  return (
    <div className="weather-station-view">
      <div className="station-header glass-panel">
        <div>
          <div className="station-badges-row">
            <div className="station-badge">
              <CloudSun size={13} className="text-emerald-400" />
              <span>{lang === 'en' ? 'Live Meteorological Intelligence' : 'කාලගුණ නිරීක්ෂණ මධ්‍යස්ථානය'}</span>
            </div>
            {periodText && (
              <div className="station-date-badge">
                <span>📅 {lang === 'en' ? `Observation Window: ${periodText}` : `නිරීක්ෂණ කාලය: ${periodText}`}</span>
              </div>
            )}
          </div>
          <h2 className="station-title">
            {lang === 'en' ? 'Key Agricultural Districts Weather Station' : 'ප්‍රධාන කෘෂිකාර්මික දිස්ත්‍රික්ක 7ක කාලගුණය'}
          </h2>
          <p className="station-desc">
            {lang === 'en' 
              ? `Real-time and historical 7-day rainfall and temperature monitoring across Up-Country and Low-Country cultivation hubs (${periodText || 'Active Week'}).` 
              : `ශ්‍රී ලංකාවේ ප්‍රධාන එළවළු වගා කරන දිස්ත්‍රික්කයන්හි (${periodText || 'නිරීක්ෂිත සතිය'}) වර්ෂාපතන හා උෂ්ණත්ව තත්ත්වය.`}
          </p>
        </div>

        <button 
          className="btn-primary refresh-weather-btn"
          onClick={fetchDistrictsWeather}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          <span>{lang === 'en' ? 'Sync Live Satellite Data' : 'යාවත්කාලීන කරන්න'}</span>
        </button>
      </div>

      {/* District Cards Grid */}
      <div className="station-districts-grid">
        {DISTRICTS_DATA.map((district) => {
          const liveData = weatherMap[district.id] || { rainfall_mm: 25.0, temperature_c: 24.0 };
          const isHighRain = liveData.rainfall_mm > 40;
          const isCool = liveData.temperature_c < 18;

          return (
            <div key={district.id} className="station-district-card glass-panel">
              <div className="card-top-row">
                <div>
                  <h3 className="card-district-name">
                    {district.name} <span className="si-tag">{district.name_si}</span>
                  </h3>
                  <div className="zone-pill">
                    <Mountain size={11} />
                    <span>{district.zone} ({district.elevation})</span>
                  </div>
                </div>

                <div className="weather-icon-bubble">
                  {isHighRain ? <CloudRain size={24} className="text-emerald-400" /> : <CloudSun size={24} color="var(--text-secondary)" />}
                </div>
              </div>

              {/* Major Metrics */}
              <div className="metrics-box-grid">
                <div className="metric-cell">
                  <div className="metric-cell-label">
                    <Droplets size={13} className="text-cyan-400" />
                    <span>{lang === 'en' ? 'Weekly Rainfall' : 'වර්ෂාපතනය'}</span>
                  </div>
                  <div className="metric-cell-val">
                    {liveData.rainfall_mm} <span className="u">mm</span>
                  </div>
                </div>

                <div className="metric-cell">
                  <div className="metric-cell-label">
                    <Thermometer size={13} className="text-amber-400" />
                    <span>{lang === 'en' ? 'Mean Temperature' : 'උෂ්ණත්වය'}</span>
                  </div>
                  <div className="metric-cell-val">
                    {liveData.temperature_c} <span className="u">°C</span>
                  </div>
                </div>
              </div>

              {/* Agricultural Impact Alert */}
              <div className={`agri-alert-strip ${isHighRain ? 'rain-warning' : isCool ? 'frost-warning' : 'optimal'}`}>
                {isHighRain ? (
                  <>
                    <AlertTriangle size={13} />
                    <span>Heavy rainfall: Risk of crop disease and transport disruption.</span>
                  </>
                ) : (
                  <>
                    <span style={{ color: '#10b981' }}>✓</span>
                    <span>Stable climate conditions for harvesting & logistics.</span>
                  </>
                )}
              </div>

              {/* Major Crops */}
              <div className="district-crops-row">
                <span className="crops-label">{lang === 'en' ? 'Main Produce:' : 'ප්‍රධාන භෝග:'}</span>
                <div className="crops-tags">
                  {district.mainCrops.map(c => (
                    <span key={c} className="crop-mini-badge">{c}</span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .weather-station-view {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .station-header {
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
        }
        .station-badges-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 6px;
        }
        .station-badge {
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
        .station-date-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(245, 158, 11, 0.12);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
          padding: 2px 10px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 700;
          font-family: var(--font-mono);
        }
        .station-title {
          font-family: var(--font-heading);
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .station-desc {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .refresh-weather-btn {
          font-size: 13px;
        }
        .station-districts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 18px;
        }
        .station-district-card {
          padding: 20px;
          transition: all 0.2s;
        }
        .station-district-card:hover {
          transform: translateY(-2px);
          border-color: var(--border-glow);
          box-shadow: var(--shadow-md);
        }
        .card-top-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }
        .card-district-name {
          font-family: var(--font-heading);
          font-size: 19px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .si-tag {
          font-size: 13px;
          color: var(--text-muted);
          font-weight: 500;
          margin-left: 4px;
        }
        .zone-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--text-muted);
          background: var(--bg-pill);
          padding: 2px 6px;
          border-radius: 4px;
          margin-top: 4px;
        }
        .weather-icon-bubble {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--bg-input);
          border: 1px solid var(--border-card);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .metrics-box-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 14px;
        }
        .metric-cell {
          background: var(--bg-input);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
        }
        .metric-cell-label {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: var(--text-muted);
          margin-bottom: 4px;
        }
        .metric-cell-val {
          font-family: var(--font-mono);
          font-size: 18px;
          font-weight: 800;
          color: var(--text-primary);
        }
        .metric-cell-val .u {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
        }
        .agri-alert-strip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 14px;
        }
        .agri-alert-strip.optimal {
          background: rgba(16, 185, 129, 0.12);
          color: var(--emerald-400);
          border: 1px solid rgba(16, 185, 129, 0.25);
        }
        .agri-alert-strip.rain-warning {
          background: rgba(239, 68, 68, 0.12);
          color: var(--rose-400);
          border: 1px solid rgba(239, 68, 68, 0.25);
        }
        .district-crops-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          border-top: 1px solid var(--border-subtle);
          padding-top: 10px;
        }
        .crops-label {
          color: var(--text-muted);
          font-weight: 600;
        }
        .crops-tags {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        .crop-mini-badge {
          background: var(--bg-pill);
          color: var(--text-secondary);
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default WeatherStation;

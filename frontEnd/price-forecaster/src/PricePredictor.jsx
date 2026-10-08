import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Header from './components/Header';
import CropSelector from './components/CropSelector';
import PredictorForm from './components/PredictorForm';
import PredictionResultCard from './components/PredictionResultCard';
import PriceHistoryChart from './components/PriceHistoryChart';
import FactorsBreakdown from './components/FactorsBreakdown';
import DistrictWeatherCard from './components/DistrictWeatherCard';
import MultiCropCompare from './components/MultiCropCompare';
import TrendsDashboard from './components/TrendsDashboard';
import WeatherStation from './components/WeatherStation';
import BasketCalculator from './components/BasketCalculator';
import MarketInsights from './components/MarketInsights';
import { CROPS_DATA } from './data/cropsData';

const PricePredictor = () => {
  const [activeTab, setActiveTab] = useState('forecaster');
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('agri_theme') || 'light';
    } catch {
      return 'light';
    }
  });
  const [lang, setLang] = useState('en');
  const [backendStatus, setBackendStatus] = useState(false);
  const [regionFilter, setRegionFilter] = useState('all');
  const [selectedCrop, setSelectedCrop] = useState(CROPS_DATA[0]); // Default Carrot
  const [loading, setLoading] = useState(false);
  const [autoSimulate, setAutoSimulate] = useState(true);
  const [result, setResult] = useState(null);
  const [notification, setNotification] = useState(null);

  // Initialize Form Data
  const getInitialDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getWeekText = (dateStr) => {
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const year = d.getFullYear();
    const weekOfMonth = Math.ceil(day / 7);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `W${weekOfMonth}.${monthNames[month - 1]}.${year}`;
  };

  const [formData, setFormData] = useState({
    selected_date: getInitialDate(),
    month: new Date().getMonth() + 1,
    monsoon_season: 2, // Southwest Monsoon
    is_festive: 0,
    diesel_price_weekly_actual: 340.0,
    inflation_rate_cpi_weekly_mean: 5.2,
    weekText: getWeekText(getInitialDate())
  });

  // Apply Theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('agri_theme', theme);
    } catch {}
  }, [theme]);

  // Check Backend Connection on Mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await axios.get('http://127.0.0.1:8000/');
        if (res.data.status === 'online') {
          setBackendStatus(true);
        }
      } catch (_e) {
        setBackendStatus(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Main Prediction Request Function
  const handlePredict = React.useCallback(async (customFormData = null) => {
    const dataToSend = customFormData || formData;
    if (!dataToSend.selected_date) {
      showToast('Please select a target prediction date.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `http://127.0.0.1:8000/predict/${selectedCrop.region}/${selectedCrop.id}`,
        dataToSend
      );

      setResult(response.data);
      setBackendStatus(true);
    } catch (err) {
      console.error('Prediction API Error:', err);
      showToast('Backend inference error. Ensure FastAPI server is running.', 'error');
    }
    setLoading(false);
  }, [formData, selectedCrop]);

  // Run prediction when crop changes
  useEffect(() => {
    handlePredict();
  }, [selectedCrop, handlePredict]);

  const handleSelectCrop = (crop) => {
    setSelectedCrop(crop);
  };

  return (
    <div className="app-layout">
      {/* Toast Notification */}
      {notification && (
        <div className={`toast-notification ${notification.type}`}>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Global Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        setTheme={setTheme}
        lang={lang}
        setLang={setLang}
        backendStatus={backendStatus}
      />

      {/* Main Content Area */}
      <main className="main-content-container">
        {activeTab === 'forecaster' && (
          <div className="forecaster-view">
            {/* Top: Crop Selector Grid */}
            <CropSelector
              selectedCrop={selectedCrop}
              onSelectCrop={handleSelectCrop}
              regionFilter={regionFilter}
              setRegionFilter={setRegionFilter}
              lang={lang}
            />

            {/* Split Grid: Left Form Controls, Right Forecast Results */}
            <div className="forecaster-split-grid">
              <div className="split-left-col">
                <PredictorForm
                  selectedCrop={selectedCrop}
                  formData={formData}
                  setFormData={setFormData}
                  onSubmit={handlePredict}
                  loading={loading}
                  lang={lang}
                  autoSimulate={autoSimulate}
                  setAutoSimulate={setAutoSimulate}
                />
              </div>

              <div className="split-right-col">
                {result ? (
                  <>
                    <PredictionResultCard
                      result={result}
                      selectedCrop={selectedCrop}
                      formData={formData}
                      lang={lang}
                    />

                    <FactorsBreakdown
                      factors={result.factors}
                      lang={lang}
                    />

                    <DistrictWeatherCard
                      weatherData={result.weather_data}
                      cropRegion={selectedCrop.region}
                      selectedDate={formData.selected_date}
                      lang={lang}
                    />

                    <PriceHistoryChart
                      historyData={result.history}
                      predictedPrice={result.predicted_price_lkr || result.prediction}
                      cropName={selectedCrop.name}
                      selectedDate={result.target_date || formData.selected_date}
                      forecastSeries={result.forecast_series}
                      isFutureForecast={result.is_future_forecast}
                      latestActualDate={result.latest_actual_date}
                      forecastStartDate={result.forecast_start_date}
                      dateAdjusted={result.date_adjusted}
                      originalDate={result.original_selected_date}
                      horizonCategory={result.horizon_category}
                      lang={lang}
                    />
                  </>
                ) : (
                  <div className="empty-forecast-prompt glass-panel">
                    <div className="spinner"></div>
                    <p>Generating initial AI forecast model outputs...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'compare' && (
          <MultiCropCompare formData={formData} lang={lang} />
        )}

        {activeTab === 'trends' && (
          <TrendsDashboard lang={lang} />
        )}

        {activeTab === 'weather' && (
          <WeatherStation lang={lang} targetDate={formData.selected_date} />
        )}

        {activeTab === 'basket' && (
          <BasketCalculator formData={formData} lang={lang} />
        )}

        {activeTab === 'insights' && (
          <MarketInsights formData={formData} lang={lang} />
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-brand">
            🌱 AgriPrice Forecaster Sri Lanka • Random Forest Regression System v2.0
          </div>
          <div className="footer-sub">
            Integrated with Open-Meteo Weather API & Sri Lanka Wholesale Agricultural Pricing Datasets (2020–2025).
          </div>
        </div>
      </footer>

      <style>{`
        .app-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: var(--bg-app);
          background-image: radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.04) 0%, transparent 60%);
          background-attachment: fixed;
        }
        .main-content-container {
          flex: 1;
          max-width: 1400px;
          width: 100%;
          margin: 0 auto;
          padding: 24px 20px 48px 20px;
        }
        .forecaster-split-grid {
          display: grid;
          grid-template-columns: 460px minmax(0, 1fr);
          gap: 24px;
          align-items: flex-start;
          min-width: 0;
          max-width: 100%;
          width: 100%;
        }
        @media (max-width: 1080px) {
          .forecaster-split-grid {
            grid-template-columns: 1fr;
          }
        }
        .split-left-col {
          position: sticky;
          top: 130px;
          min-width: 0;
          max-width: 100%;
        }
        @media (max-width: 1080px) {
          .split-left-col {
            position: static;
          }
        }
        .split-right-col {
          display: flex;
          flex-direction: column;
          min-width: 0;
          max-width: 100%;
          width: 100%;
          overflow: hidden;
        }
        .empty-forecast-prompt {
          padding: 60px 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          color: var(--text-secondary);
        }
        .toast-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          padding: 12px 20px;
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 600;
          box-shadow: var(--shadow-lg);
          animation: slideDown 0.3s ease;
        }
        .toast-notification.error {
          background: #ef4444;
          color: #ffffff;
        }
        .toast-notification.info {
          background: var(--emerald-500);
          color: #ffffff;
        }
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .app-footer {
          border-top: 1px solid var(--border-subtle);
          background: var(--bg-card);
          padding: 24px;
          text-align: center;
          margin-top: auto;
        }
        .footer-content {
          max-width: 1400px;
          margin: 0 auto;
        }
        .footer-brand {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
        }
        .footer-sub {
          font-size: 12px;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
};

export default PricePredictor;
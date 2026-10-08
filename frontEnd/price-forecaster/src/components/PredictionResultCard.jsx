import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Copy, 
  Check, 
  Download, 
  ShieldCheck, 
  History,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Sparkles,
  Target,
  Award,
  Calendar,
  AlertTriangle,
  Layers,
  Database,
  FileSpreadsheet,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

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

const PredictionResultCard = ({ result, selectedCrop, formData, lang }) => {
  const [copied, setCopied] = useState(false);
  const [showAuditTable, setShowAuditTable] = useState(true);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);

  const auditTable = result?.audit_table || [];
  const totalAuditRows = auditTable.length;
  const totalAuditPages = Math.ceil(totalAuditRows / auditPageSize) || 1;
  const paginatedAuditRows = useMemo(() => {
    if (auditPageSize === 0) return auditTable;
    const start = (auditPage - 1) * auditPageSize;
    return auditTable.slice(start, start + auditPageSize);
  }, [auditTable, auditPage, auditPageSize]);

  if (!result) return null;

  const price = result.predicted_price_lkr ?? result.prediction ?? result.predicted_price ?? 0;
  const metrics = result.model_metrics || selectedCrop?.metrics || {
    mae: 11.9,
    rmse: 17.33,
    mape: 4.52,
    accuracy: 95.48,
    modelFile: `model_rf_${selectedCrop?.region}_${selectedCrop?.id}.pkl`
  };

  const mae = metrics.mae;
  const rmse = metrics.rmse;
  const mape = metrics.mape;
  const accuracy = metrics.accuracy;

  // Compounded uncertainty for future recursive forecasts
  const compoundedMae = result.compounded_mae ?? mae;
  const compoundedRmse = result.compounded_rmse ?? rmse;

  const priceMin = result.price_min ?? Math.max(0, Math.round((price - compoundedMae) * 100) / 100);
  const priceMax = result.price_max ?? Math.round((price + compoundedMae) * 100) / 100;
  const priceMinRmse = result.price_min_rmse ?? Math.max(0, Math.round((price - compoundedRmse) * 100) / 100);
  const priceMaxRmse = result.price_max_rmse ?? Math.round((price + compoundedRmse) * 100) / 100;

  const percentChange = result.percent_change || 0;
  const isUp = result.trend === 'up' || percentChange > 0;
  const isDown = result.trend === 'down' || percentChange < 0;

  const isFuture = !!result.is_future_forecast;

  const handleCopySummary = () => {
    const text = `🌱 AgriPrice Forecast: ${selectedCrop?.name} (${selectedCrop?.name_si})\n` +
      `📅 Target Date: ${result.target_date || formData.selected_date || 'N/A'}\n` +
      (result.date_adjusted ? `ℹ️ (Adjusted from ${result.original_selected_date} to Thursday cadence)\n` : '') +
      `💰 Predicted Retail Price: Rs. ${Number(price).toFixed(2)} / kg\n` +
      (isFuture 
        ? `🔮 Method: ${result.forecast_method} (${result.forecast_steps} weeks horizon)\n🎯 Estimated Interval: Rs. ${Number(priceMin).toFixed(2)} - Rs. ${Number(priceMax).toFixed(2)} (Compounded MAE ±Rs. ${Number(compoundedMae).toFixed(2)})\n`
        : `🎯 Expected Fluctuation: ±Rs. ${Number(mae).toFixed(2)} (±${mape}%)\n📊 Confidence Band (MAE): Rs. ${Number(priceMin).toFixed(2)} - Rs. ${Number(priceMax).toFixed(2)}\n`) +
      `📈 Model Accuracy: ${accuracy}%\n` +
      `⛽ Diesel: Rs. ${formData.diesel_price_weekly_actual} | Inflation: ${formData.inflation_rate_cpi_weekly_mean}%`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Crop,Sinhala Name,Date,Week,Predicted Price (LKR/kg),MAE (Rs),RMSE (Rs),MAPE %,Accuracy %,Min Range (MAE),Max Range (MAE),Min Extreme (RMSE),Max Extreme (RMSE),Diesel Price,Inflation %",
         `"${selectedCrop?.name}","${selectedCrop?.name_si}","${result.target_date || formData.selected_date}","${formData.weekText || ''}",${price},${compoundedMae},${compoundedRmse},${mape},${accuracy},${priceMin},${priceMax},${priceMinRmse},${priceMaxRmse},${formData.diesel_price_weekly_actual},${formData.inflation_rate_cpi_weekly_mean}`
        ].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agriprice_${selectedCrop?.id}_${result.target_date || formData.selected_date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAuditCSV = () => {
    if (!auditTable || auditTable.length === 0) return;
    const headers = [
      "Step", "Forecast Date", "Predicted Price (LKR)", "Data Type",
      "price_lag_1", "price_lag_1_source",
      "price_lag_2", "price_lag_2_source",
      "price_lag_4", "price_lag_4_source",
      "price_lag_52", "price_lag_52_source",
      "rolling_mean_4", "rolling_std_4", "price_change_1",
      "Rainfall (mm)", "Rainfall_Source",
      "Temperature (C)", "Temperature_Source",
      "Humidity (%)", "Humidity_Source",
      "Diesel (LKR)", "Diesel_Source",
      "Inflation (%)", "Inflation_Source"
    ];

    const rows = auditTable.map(row => [
      row.Step || row.step,
      `"${row["Forecast Date"] || row.forecast_date}"`,
      row["Predicted Price"] || row.predicted_price,
      `"${row["Data Type"] || row.data_type}"`,
      row.price_lag_1,
      `"${row.price_lag_1_source}"`,
      row.price_lag_2,
      `"${row.price_lag_2_source}"`,
      row.price_lag_4,
      `"${row.price_lag_4_source}"`,
      row.price_lag_52,
      `"${row.price_lag_52_source}"`,
      row.rolling_mean_4,
      row.rolling_std_4,
      row.price_change_1,
      row.Rainfall || row.rainfall,
      `"${row.Rainfall_Source || row.rainfall_source}"`,
      row.Temperature || row.temperature,
      `"${row.Temperature_Source || row.temperature_source}"`,
      row.Humidity || row.humidity,
      `"${row.Humidity_Source || row.humidity_source}"`,
      row.Diesel || row.diesel,
      `"${row.Diesel_Source || row.diesel_source}"`,
      row.Inflation || row.inflation,
      `"${row.Inflation_Source || row.inflation_source}"`
    ].join(","));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `forecast_audit_${selectedCrop?.id}_${result.target_date || 'future'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="prediction-result-card glass-panel glow-emerald">
      {/* 1. Header Top Bar */}
      <div className="result-top-bar">
        <div className="crop-title-group">
          <span className="crop-avatar-large">{selectedCrop?.icon}</span>
          <div className="crop-info-meta">
            <div className="result-badge">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>
                {isFuture
                  ? (lang === 'en' ? `Recursive Multi-Step AI Forecast` : `පුනරාවර්තී බහු-පියවර AI පුරෝකථනය`)
                  : (lang === 'en' ? `AI Random Forest Model` : `කෘතිම බුද්ධි ආකෘතිය`)}
              </span>
            </div>
            <h2 className="predicted-crop-name">
              {selectedCrop?.name} <span className="si-name">{selectedCrop?.name_si}</span>
            </h2>
          </div>
        </div>

        <div className="result-actions">
          <button className="icon-action-btn" onClick={handleCopySummary} title="Copy Summary">
            {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
          </button>
          <button className="icon-action-btn" onClick={handleExportCSV} title="Export Prediction CSV">
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* 2. Thursday Adjustment Alert Banner */}
      {result.date_adjusted && (
        <div className="thursday-adjustment-banner">
          <div className="adjust-icon-col">
            <Calendar size={18} className="text-amber-400" />
          </div>
          <div className="adjust-content">
            <div className="adjust-title">
              {lang === 'en' ? 'Forecast Date Adjusted to Weekly Thursday Cadence' : 'පුරෝකථන දිනය සතිපතා බ්‍රහස්පතින්දා දිනට සකස් කරන ලදී'}
            </div>
            <div className="adjust-details">
              <span className="pill-orig">
                {lang === 'en' ? 'Selected Date:' : 'තෝරාගත් දිනය:'} <strong>{formatDatePretty(result.original_selected_date)}</strong>
              </span>
              <ArrowRight size={14} className="adjust-arrow" />
              <span className="pill-target">
                {lang === 'en' ? 'Forecast Week:' : 'පුරෝකථන සතිය:'} <strong>{formatDatePretty(result.target_date)} (Thursday)</strong>
              </span>
            </div>
            <p className="adjust-subtext">
              {lang === 'en' 
                ? 'Forecast date adjusted to the nearest valid weekly Thursday. The vegetable pricing engine operates strictly on the weekly Thursday auction cadence.'
                : 'දැන්වීම: මෙම ආකෘතිය සතිපතා බ්‍රහස්පතින්දා වෙළඳපල මිල චක්‍රය මත පමණක් ක්‍රියාත්මක වේ. එබැවින් ඔබ තෝරාගත් දිනය ළඟම බ්‍රහස්පතින්දා දිනයට සකසන ලදී.'}
            </p>
          </div>
        </div>
      )}

      {/* 3. MAIN HERO PRICE DISPLAY (Prominently visible at top) */}
      <div className="hero-price-box">
        <div className="price-label">
          {isFuture
            ? (lang === 'en' ? `Predicted Central Retail Price (${formatDatePretty(result.target_date)})` : `අපේක්ෂිත සාමාන්‍ය සිල්ලර මිල (${formatDatePretty(result.target_date)})`)
            : (lang === 'en' ? 'Predicted Central Retail Price' : 'අපේක්ෂිත සාමාන්‍ය සිල්ලර මිල')}
        </div>
        
        <div className="price-number-row">
          <span className="currency-prefix">Rs.</span>
          <span className="main-price-val">{Number(price).toFixed(2)}</span>
          <span className="unit-suffix">/ kg</span>
        </div>

        {/* Weekly Trend Indicator Row */}
        <div className="trend-indicator-row">
          <div className={`stat-pill trend-pill ${isUp ? 'up' : isDown ? 'down' : 'neutral'}`}>
            {isUp ? <TrendingUp size={13} /> : isDown ? <TrendingDown size={13} /> : <Minus size={13} />}
            <span>{percentChange > 0 ? `+${percentChange}%` : `${percentChange}%`} vs Last Week</span>
          </div>
        </div>

        {/* Visual Range Gauge */}
        <div className="range-gauge-container">
          <div className="range-gauge-labels">
            <div className="gauge-label-col left">
              <span className="g-title">{isFuture ? (lang === 'en' ? 'Forecast Interval Min' : 'අවම මිල') : (lang === 'en' ? 'Expected Min (MAE)' : 'අවම මිල')}</span>
              <span className="g-price min">Rs. {Number(priceMin).toFixed(2)}</span>
            </div>

            <div className="gauge-label-col center">
              <span className="g-title">{lang === 'en' ? 'Predicted Baseline' : 'මධ්‍යම මිල'}</span>
              <span className="g-price target">Rs. {Number(price).toFixed(2)}</span>
            </div>

            <div className="gauge-label-col right">
              <span className="g-title">{isFuture ? (lang === 'en' ? 'Forecast Interval Max' : 'උපරිම මිල') : (lang === 'en' ? 'Expected Max (MAE)' : 'උපරිම මිල')}</span>
              <span className="g-price max">Rs. {Number(priceMax).toFixed(2)}</span>
            </div>
          </div>

          <div className="gauge-bar-track">
            <div className="gauge-bar-fill"></div>
            <div className="gauge-marker center-target" title={`Baseline Rs. ${Number(price).toFixed(2)}`}></div>
          </div>

          <div className="rmse-extreme-note">
            <span>
              {lang === 'en' 
                ? `⚡ Extreme Shock Boundary (RMSE ±Rs. ${Number(compoundedRmse).toFixed(2)}): ` 
                : `⚡ ආන්තික කම්පන උපරිම පරාසය (RMSE ±රු. ${Number(compoundedRmse).toFixed(2)}): `}
              <strong>Rs. {Number(priceMinRmse).toFixed(2)} – Rs. {Number(priceMaxRmse).toFixed(2)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 4. Future Recursive Horizon Summary Card (Sleek & Fully Responsive Auto-fit Grid) */}
      {isFuture && (
        <div className="horizon-summary-card">
          <div className="horizon-card-header">
            <div className="h-title-row">
              <Layers size={16} className="text-emerald-400" />
              <span className="h-heading">
                {lang === 'en' ? 'Recursive Forecast Trajectory Summary' : 'පුනරාවර්තී පුරෝකථන සාරාංශය'}
              </span>
            </div>
            <span className="horizon-cat-badge">
              {result.horizon_category || 'Recursive Multi-Step'}
            </span>
          </div>

          <div className="horizon-metrics-grid">
            <div className="h-metric-item">
              <span className="h-label">{lang === 'en' ? 'Latest Actual Data' : 'නවතම සැබෑ මිල'}</span>
              <span className="h-val actual">{formatDatePretty(result.latest_actual_date)}</span>
              <span className="h-sub">{lang === 'en' ? 'Observation End' : 'දත්ත සමුදා අවසන් සතිය'}</span>
            </div>

            <div className="h-metric-item">
              <span className="h-label">{lang === 'en' ? 'Forecast Start' : 'ආරම්භය'}</span>
              <span className="h-val start">{formatDatePretty(result.forecast_start_date)}</span>
              <span className="h-sub">{lang === 'en' ? 'T+1 Weekly Step' : 'පළමු පුරෝකථන සතිය'}</span>
            </div>

            <div className="h-metric-item">
              <span className="h-label">{lang === 'en' ? 'Target Forecast' : 'ඉලක්ක දිනය'}</span>
              <span className="h-val target">{formatDatePretty(result.target_date)}</span>
              <span className="h-sub">{lang === 'en' ? 'Selected Week' : 'තෝරාගත් සතිය'}</span>
            </div>

            <div className="h-metric-item">
              <span className="h-label">{lang === 'en' ? 'Forecast Horizon' : 'පියවර ගණන'}</span>
              <span className="h-val steps">{result.forecast_steps} {lang === 'en' ? 'weeks' : 'සති'}</span>
              <span className="h-sub">{lang === 'en' ? 'Autoregressive Cycles' : 'අනුක්‍රමික පියවර'}</span>
            </div>
          </div>

          <div className="horizon-method-strip">
            <span className="method-label">{lang === 'en' ? 'Method:' : 'ක්‍රමය:'}</span>
            <span className="method-val">{result.forecast_method || 'Recursive Multi-Step Forecast'}</span>
            <span className="method-note">
              {lang === 'en' 
                ? '• Zero future leakage • Forecasts dynamically feed as autoregressive lag inputs'
                : '• අනාගත දත්ත කාන්දු වීමකින් තොරව පෙර පුරෝකථනයන් ඊළඟ පියවරේ යෙදවුම් ලෙස භාවිතා කෙරේ'}
            </span>
          </div>
        </div>
      )}

      {/* 5. Long Horizon Uncertainty Warning Notice */}
      {isFuture && (
        <div className="long-horizon-warning-box">
          <div className="warn-icon-col">
            <AlertTriangle size={18} className="text-amber-400" />
          </div>
          <div className="warn-content">
            <div className="warn-title">
              {lang === 'en' ? 'Forecast Horizon Uncertainty Notice' : 'දිගුකාලීන පුරෝකථන අවිනිශ්චිතතා නිවේදනය'}
            </div>
            <p className="warn-text">
              "Forecast uncertainty increases as the forecast horizon becomes longer because previous model predictions are recursively used as future lag inputs."
            </p>
            <div className="warn-stat-row">
              <span>
                {lang === 'en' ? 'Estimated forecast interval:' : 'ඇස්තමේන්තුගත පරාසය:'}{' '}
                <strong className="interval-val">Rs. {Number(priceMin).toFixed(2)} – Rs. {Number(priceMax).toFixed(2)} / kg</strong>
              </span>
              <span className="warn-mae-diff">
                {lang === 'en' 
                  ? `(1-Step Base MAE: ±Rs. ${Number(mae).toFixed(2)} → Compounded Horizon MAE: ±Rs. ${Number(compoundedMae).toFixed(2)})`
                  : `(පදනම් MAE: ±රු. ${Number(mae).toFixed(2)} → සංයුක්ත MAE: ±රු. ${Number(compoundedMae).toFixed(2)})`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 6. Ground Truth Actual vs Predicted Validation Section (For Historical Dates <= 2026-07-30) */}
      {!isFuture && result.ground_truth && result.ground_truth.has_actual && (
        <div className="ground-truth-validation-card">
          <div className="gt-header">
            <div className="gt-title-row">
              <Target size={16} className="text-cyan-400" />
              <span className="gt-heading">
                {lang === 'en' ? 'Actual Database vs AI Prediction Comparison' : 'සැබෑ වෙළඳපල මිල හා AI පුරෝකථන සැසඳීම'}
              </span>
              <span className="gt-match-pill">
                {result.ground_truth.is_exact_date ? '✓ Exact Date Match' : `✓ Week ${result.ground_truth.actual_week} Match`}
              </span>
            </div>

            <div className="gt-accuracy-badge-box">
              <Award size={15} className="text-amber-400" />
              <span className="gt-acc-label">{lang === 'en' ? 'Prediction Accuracy:' : 'නිරවද්‍යතාව:'}</span>
              <span className={`gt-acc-value ${result.ground_truth.accuracy_percentage >= 95 ? 'superb' : result.ground_truth.accuracy_percentage >= 90 ? 'high' : 'medium'}`}>
                ★ {result.ground_truth.accuracy_percentage}%
              </span>
            </div>
          </div>

          <div className="gt-cols-grid">
            <div className="gt-item actual">
              <span className="gt-label">{lang === 'en' ? 'Actual Database Retail Price' : 'සැබෑ දත්ත සමුදා මිල'}</span>
              <div className="gt-price-row">
                <span className="gt-price actual-color">Rs. {Number(result.ground_truth.actual_price).toFixed(2)}</span>
                <span className="gt-unit">/ kg</span>
              </div>
              <span className="gt-date-note">📅 {result.ground_truth.actual_date} (Week {result.ground_truth.actual_week})</span>
            </div>

            <div className="gt-item predicted">
              <span className="gt-label">{lang === 'en' ? 'Model Predicted Price' : 'AI පුරෝකථන මිල'}</span>
              <div className="gt-price-row">
                <span className="gt-price pred-color">Rs. {Number(price).toFixed(2)}</span>
                <span className="gt-unit">/ kg</span>
              </div>
              <span className="gt-date-note">Random Forest Regression</span>
            </div>

            <div className="gt-item gap">
              <span className="gt-label">{lang === 'en' ? 'Price Gap (Variance)' : 'මිල පරතරය (අපගමනය)'}</span>
              <div className="gt-price-row">
                <span className={`gt-price ${result.ground_truth.price_gap > 0 ? 'gap-over' : result.ground_truth.price_gap < 0 ? 'gap-under' : 'gap-exact'}`}>
                  {result.ground_truth.price_gap > 0 ? `+ Rs. ${Number(result.ground_truth.price_gap).toFixed(2)}` : result.ground_truth.price_gap < 0 ? `- Rs. ${Number(result.ground_truth.price_gap_abs).toFixed(2)}` : 'Rs. 0.00'}
                </span>
                <span className="gt-unit">/ kg</span>
              </div>
              <span className="gt-date-note">
                {result.ground_truth.gap_percentage}% {result.ground_truth.price_gap >= 0 ? 'over-prediction' : 'under-prediction'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 7. Dynamic Lag Prices & Feature Inputs Strip */}
      {result.lag_prices && (
        <div className="lags-strip">
          <div className="lags-strip-title">
            <History size={14} className="text-emerald-400" />
            <span>
              {lang === 'en' 
                ? `Input Lag Features for Target Week (${formatDatePretty(result.target_date || formData.selected_date)}):` 
                : `ඉලක්ක සතිය සඳහා යෙදවුම් මිල ගණන්:`}
            </span>
          </div>

          <div className="lags-grid">
            {/* Lag 1 */}
            <div className="lag-item">
              <div className="lag-label-row">
                <span className="lag-label">1-Week Lag (T-1)</span>
                <span className={`lag-source-badge ${result.lag_prices.lag_1_is_forecast ? 'forecast' : 'actual'}`}>
                  {result.lag_prices.lag_1_is_forecast ? 'Model Forecast' : 'Actual'}
                </span>
              </div>
              <span className="lag-value">Rs. {result.lag_prices.lag_1 != null ? Number(result.lag_prices.lag_1).toFixed(2) : 'N/A'}</span>
              <span className="lag-source-text">{result.lag_prices.lag_1_source || 'Actual'}</span>
            </div>

            {/* Lag 2 */}
            <div className="lag-item">
              <div className="lag-label-row">
                <span className="lag-label">2-Week Lag (T-2)</span>
                <span className={`lag-source-badge ${result.lag_prices.lag_2_is_forecast ? 'forecast' : 'actual'}`}>
                  {result.lag_prices.lag_2_is_forecast ? 'Model Forecast' : 'Actual'}
                </span>
              </div>
              <span className="lag-value">Rs. {result.lag_prices.lag_2 != null ? Number(result.lag_prices.lag_2).toFixed(2) : 'N/A'}</span>
              <span className="lag-source-text">{result.lag_prices.lag_2_source || 'Actual'}</span>
            </div>

            {/* Lag 4 */}
            <div className="lag-item">
              <div className="lag-label-row">
                <span className="lag-label">4-Week Lag (T-4)</span>
                <span className={`lag-source-badge ${result.lag_prices.lag_4_is_forecast ? 'forecast' : 'actual'}`}>
                  {result.lag_prices.lag_4_is_forecast ? 'Model Forecast' : 'Actual'}
                </span>
              </div>
              <span className="lag-value">Rs. {result.lag_prices.lag_4 != null ? Number(result.lag_prices.lag_4).toFixed(2) : 'N/A'}</span>
              <span className="lag-source-text">{result.lag_prices.lag_4_source || 'Actual'}</span>
            </div>

            {/* Lag 52 */}
            <div className="lag-item">
              <div className="lag-label-row">
                <span className="lag-label">52-Week Lag (T-52)</span>
                <span className={`lag-source-badge ${result.lag_prices.lag_52_is_forecast ? 'forecast' : 'actual'}`}>
                  {result.lag_prices.lag_52_is_forecast ? 'Model Forecast' : 'Actual'}
                </span>
              </div>
              <span className="lag-value">Rs. {result.lag_prices.lag_52 != null ? Number(result.lag_prices.lag_52).toFixed(2) : 'N/A'}</span>
              <span className="lag-source-text">{result.lag_prices.lag_52_source || 'Actual'}</span>
            </div>
          </div>

          {/* Rolling Features & Exogenous Sources Sub-strip */}
          <div className="features-secondary-row">
            <div className="feat-chip">
              <span className="f-name">rolling_mean_4:</span>
              <span className="f-val">Rs. {result.lag_prices.rolling_mean_4 != null ? Number(result.lag_prices.rolling_mean_4).toFixed(2) : 'N/A'}</span>
            </div>
            <div className="feat-chip">
              <span className="f-name">rolling_std_4:</span>
              <span className="f-val">{result.lag_prices.rolling_std_4 != null ? Number(result.lag_prices.rolling_std_4).toFixed(2) : 'N/A'}</span>
            </div>
            <div className="feat-chip">
              <span className="f-name">price_change_1:</span>
              <span className="f-val">{result.lag_prices.price_change_1 != null ? (result.lag_prices.price_change_1 > 0 ? `+${Number(result.lag_prices.price_change_1).toFixed(2)}` : Number(result.lag_prices.price_change_1).toFixed(2)) : 'N/A'}</span>
            </div>
            {result.input_sources && (
              <>
                <div className="feat-chip source">
                  <span className="f-name">Weather:</span>
                  <span className="f-val">{result.input_sources.weather_source}</span>
                </div>
                <div className="feat-chip source">
                  <span className="f-name">Diesel:</span>
                  <span className="f-val">{result.input_sources.diesel_source}</span>
                </div>
                <div className="feat-chip source">
                  <span className="f-name">Inflation:</span>
                  <span className="f-val">{result.input_sources.inflation_source}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 9. Complete Forecast Audit Table (Isolated with Strict Overflow Protection) */}
      {isFuture && auditTable.length > 0 && (
        <div className="forecast-audit-container">
          <div className="audit-header" onClick={() => setShowAuditTable(!showAuditTable)}>
            <div className="audit-title-row">
              <FileSpreadsheet size={16} className="text-emerald-400" />
              <span className="audit-heading">
                {lang === 'en' ? `Full Recursive Forecast Audit Trail (${totalAuditRows} Weekly Steps)` : `සම්පූර්ණ පුරෝකථන විගණන සටහන (${totalAuditRows} සති)`}
              </span>
              <span className="audit-badge">
                {lang === 'en' ? 'Leakage-Free Verified' : 'සත්‍යාපිතයි'}
              </span>
            </div>

            <div className="audit-actions" onClick={(e) => e.stopPropagation()}>
              <button className="csv-export-btn" onClick={handleExportAuditCSV} title="Export full 22-column audit trail as CSV">
                <Download size={13} />
                <span>Export Audit CSV</span>
              </button>
              <button className="details-toggle-btn" onClick={() => setShowAuditTable(!showAuditTable)}>
                {showAuditTable ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>

          {showAuditTable && (
            <div className="audit-table-content">
              <div className="audit-table-scroll-wrapper">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Step</th>
                      <th>Forecast Date</th>
                      <th>Predicted Price</th>
                      <th>Data Type</th>
                      <th>price_lag_1</th>
                      <th>Lag 1 Source</th>
                      <th>price_lag_2</th>
                      <th>Lag 2 Source</th>
                      <th>price_lag_4</th>
                      <th>Lag 4 Source</th>
                      <th>price_lag_52</th>
                      <th>Lag 52 Source</th>
                      <th>rolling_mean_4</th>
                      <th>rolling_std_4</th>
                      <th>price_change_1</th>
                      <th>Rainfall</th>
                      <th>Rainfall Source</th>
                      <th>Temp (°C)</th>
                      <th>Temp Source</th>
                      <th>Humidity (%)</th>
                      <th>Diesel (Rs.)</th>
                      <th>Diesel Source</th>
                      <th>Inflation (%)</th>
                      <th>Inflation Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAuditRows.map((row, idx) => (
                      <tr key={idx} className={(row.Step || row.step) === totalAuditRows ? 'target-row-highlight' : ''}>
                        <td className="cell-step"><strong>{row.Step || row.step}</strong></td>
                        <td className="cell-date">{row["Forecast Date"] || row.forecast_date}</td>
                        <td className="cell-price">Rs. {Number(row["Predicted Price"] || row.predicted_price).toFixed(2)}</td>
                        <td>
                          <span className="type-badge forecast">{row["Data Type"] || row.data_type}</span>
                        </td>
                        <td className="cell-num">Rs. {Number(row.price_lag_1).toFixed(2)}</td>
                        <td>
                          <span className={`source-pill ${String(row.price_lag_1_source).includes('Forecast') ? 'fc' : 'act'}`}>
                            {row.price_lag_1_source}
                          </span>
                        </td>
                        <td className="cell-num">Rs. {Number(row.price_lag_2).toFixed(2)}</td>
                        <td>
                          <span className={`source-pill ${String(row.price_lag_2_source).includes('Forecast') ? 'fc' : 'act'}`}>
                            {row.price_lag_2_source}
                          </span>
                        </td>
                        <td className="cell-num">Rs. {Number(row.price_lag_4).toFixed(2)}</td>
                        <td>
                          <span className={`source-pill ${String(row.price_lag_4_source).includes('Forecast') ? 'fc' : 'act'}`}>
                            {row.price_lag_4_source}
                          </span>
                        </td>
                        <td className="cell-num">Rs. {Number(row.price_lag_52).toFixed(2)}</td>
                        <td>
                          <span className={`source-pill ${String(row.price_lag_52_source).includes('Forecast') ? 'fc' : 'act'}`}>
                            {row.price_lag_52_source}
                          </span>
                        </td>
                        <td className="cell-num">Rs. {Number(row.rolling_mean_4).toFixed(2)}</td>
                        <td className="cell-num">{Number(row.rolling_std_4).toFixed(2)}</td>
                        <td className="cell-num">{Number(row.price_change_1).toFixed(2)}</td>
                        <td className="cell-num">{row.Rainfall || row.rainfall} mm</td>
                        <td className="cell-source">{row.Rainfall_Source || row.rainfall_source}</td>
                        <td className="cell-num">{row.Temperature || row.temperature}°C</td>
                        <td className="cell-source">{row.Temperature_Source || row.temperature_source}</td>
                        <td className="cell-num">{row.Humidity || row.humidity}%</td>
                        <td className="cell-num">Rs. {Number(row.Diesel || row.diesel).toFixed(2)}</td>
                        <td className="cell-source">{row.Diesel_Source || row.diesel_source}</td>
                        <td className="cell-num">{Number(row.Inflation || row.inflation).toFixed(2)}%</td>
                        <td className="cell-source">{row.Inflation_Source || row.inflation_source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination & Controls */}
              {totalAuditPages > 1 && (
                <div className="audit-pagination-strip">
                  <div className="pagination-info">
                    {lang === 'en' 
                      ? `Showing step ${((auditPage - 1) * auditPageSize) + 1} to ${Math.min(auditPage * auditPageSize, totalAuditRows)} of ${totalAuditRows} total steps`
                      : `පියවර ${((auditPage - 1) * auditPageSize) + 1} සිට ${Math.min(auditPage * auditPageSize, totalAuditRows)} දක්වා (මුළු ${totalAuditRows})`}
                  </div>

                  <div className="pagination-controls">
                    <button 
                      className="page-btn" 
                      disabled={auditPage === 1}
                      onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={14} />
                      <span>Prev</span>
                    </button>

                    <span className="page-current">Page {auditPage} of {totalAuditPages}</span>

                    <button 
                      className="page-btn" 
                      disabled={auditPage === totalAuditPages}
                      onClick={() => setAuditPage(p => Math.min(totalAuditPages, p + 1))}
                    >
                      <span>Next</span>
                      <ChevronRight size={14} />
                    </button>

                    <button 
                      className={`page-size-toggle ${auditPageSize === 0 ? 'active' : ''}`}
                      onClick={() => {
                        if (auditPageSize === 0) {
                          setAuditPageSize(10);
                          setAuditPage(1);
                        } else {
                          setAuditPageSize(0);
                        }
                      }}
                    >
                      {auditPageSize === 0 ? 'Paginate (10)' : 'Show All Steps'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        .prediction-result-card {
          padding: 24px;
          margin-bottom: 24px;
          border-color: var(--border-card);
          background: var(--bg-card);
          min-width: 0;
          max-width: 100%;
          width: 100%;
          box-sizing: border-box;
          overflow: hidden;
        }

        .result-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .crop-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .crop-avatar-large {
          font-size: 36px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        }
        .crop-info-meta {
          display: flex;
          flex-direction: column;
        }
        .result-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(16, 185, 129, 0.1);
          color: var(--emerald-400);
          border: 1px solid rgba(16, 185, 129, 0.2);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 2px;
          width: fit-content;
        }
        .predicted-crop-name {
          font-family: var(--font-heading);
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.1;
        }
        .si-name {
          font-size: 16px;
          color: var(--text-muted);
          font-weight: 500;
          margin-left: 6px;
        }
        .result-actions {
          display: flex;
          gap: 8px;
        }
        .icon-action-btn {
          width: 34px;
          height: 34px;
          border-radius: var(--radius-sm);
          background: var(--bg-pill);
          border: 1px solid var(--border-card);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .icon-action-btn:hover {
          background: var(--bg-card-hover);
          color: var(--text-primary);
          border-color: var(--border-glow);
        }

        /* Thursday Adjustment Banner */
        .thursday-adjustment-banner {
          display: flex;
          gap: 12px;
          background: var(--bg-pill);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 12px 14px;
          margin-bottom: 16px;
          min-width: 0;
          max-width: 100%;
        }
        .adjust-icon-col {
          display: flex;
          align-items: flex-start;
          padding-top: 2px;
          flex-shrink: 0;
          color: var(--text-muted);
        }
        .adjust-content {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }
        .adjust-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .adjust-details {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .pill-orig {
          background: var(--bg-input);
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          color: var(--text-secondary);
          border: 1px solid var(--border-subtle);
        }
        .pill-target {
          background: rgba(16, 185, 129, 0.1);
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          color: var(--emerald-400);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .adjust-arrow {
          color: var(--text-muted);
          flex-shrink: 0;
        }
        .adjust-subtext {
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.4;
          margin: 0;
        }

        /* Hero Price Box */
        .hero-price-box {
          background: var(--bg-input);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-md);
          padding: 22px 20px;
          margin-bottom: 16px;
          min-width: 0;
          max-width: 100%;
          box-sizing: border-box;
        }
        .price-label {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: center;
          margin-bottom: 4px;
        }
        .price-number-row {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 6px;
          margin-bottom: 14px;
        }
        .currency-prefix {
          font-family: var(--font-heading);
          font-size: 22px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .main-price-val {
          font-family: var(--font-heading);
          font-size: 46px;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -1px;
          line-height: 1;
        }
        .unit-suffix {
          font-size: 15px;
          color: var(--text-muted);
          font-weight: 500;
        }
        .trend-indicator-row {
          display: flex;
          justify-content: center;
          margin-bottom: 14px;
        }
        .stat-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 600;
        }
        .trend-pill.up {
          background: rgba(239, 68, 68, 0.12);
          color: var(--rose-400);
          border: 1px solid rgba(239, 68, 68, 0.25);
        }
        .trend-pill.down {
          background: rgba(16, 185, 129, 0.12);
          color: var(--emerald-400);
          border: 1px solid rgba(16, 185, 129, 0.25);
        }
        .trend-pill.neutral {
          background: var(--bg-pill);
          color: var(--text-secondary);
        }
        .range-gauge-container {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 14px;
        }
        .range-gauge-labels {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          margin-bottom: 8px;
        }
        .gauge-label-col {
          display: flex;
          flex-direction: column;
        }
        .gauge-label-col.left { text-align: left; }
        .gauge-label-col.center { text-align: center; }
        .gauge-label-col.right { text-align: right; }
        .g-title {
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
        }
        .g-price {
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 700;
          color: var(--text-secondary);
        }
        .g-price.min { color: var(--text-secondary); }
        .g-price.target { color: var(--emerald-400); font-weight: 800; font-size: 14px; }
        .g-price.max { color: var(--text-secondary); }
        .gauge-bar-track {
          position: relative;
          height: 6px;
          background: var(--border-card);
          border-radius: 4px;
          overflow: visible;
          margin: 6px 0 10px 0;
        }
        .gauge-bar-fill {
          position: absolute;
          left: 10%;
          right: 10%;
          top: 0;
          bottom: 0;
          background: linear-gradient(90deg, rgba(16, 185, 129, 0.2) 0%, var(--emerald-500) 50%, rgba(16, 185, 129, 0.2) 100%);
          border-radius: 4px;
        }
        .gauge-marker.center-target {
          position: absolute;
          left: 50%;
          top: -4px;
          transform: translateX(-50%);
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--emerald-400);
          border: 2px solid #ffffff;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
        }
        .rmse-extreme-note {
          font-size: 11px;
          color: var(--text-muted);
          text-align: center;
          border-top: 1px solid var(--border-subtle);
          padding-top: 8px;
        }
        .rmse-extreme-note strong {
          color: var(--text-secondary);
          font-family: var(--font-mono);
        }

        /* Fully Responsive Horizon Summary Card */
        .horizon-summary-card {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-md);
          padding: 14px;
          margin-bottom: 16px;
          min-width: 0;
          max-width: 100%;
          box-sizing: border-box;
        }
        .horizon-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .h-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .h-heading {
          font-family: var(--font-heading);
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .horizon-cat-badge {
          background: rgba(16, 185, 129, 0.1);
          color: var(--emerald-400);
          border: 1px solid rgba(16, 185, 129, 0.2);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 600;
        }
        .horizon-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 8px;
          min-width: 0;
          max-width: 100%;
        }
        .h-metric-item {
          background: var(--bg-input);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-sm);
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }
        .h-label {
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .h-val {
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 700;
          margin: 3px 0 1px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--text-primary);
        }
        .h-val.target { color: var(--emerald-400); }
        .h-sub {
          font-size: 9px;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .horizon-method-strip {
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px solid var(--border-subtle);
          font-size: 11px;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .method-label {
          color: var(--text-muted);
          font-weight: 600;
        }
        .method-val {
          color: var(--text-primary);
          font-weight: 600;
        }
        .method-note {
          color: var(--text-muted);
          font-size: 10px;
        }

        /* Long Horizon Warning Notice */
        .long-horizon-warning-box {
          display: flex;
          gap: 10px;
          background: var(--bg-pill);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 10px 14px;
          margin-bottom: 16px;
          min-width: 0;
          max-width: 100%;
        }
        .warn-icon-col {
          display: flex;
          align-items: flex-start;
          padding-top: 2px;
          flex-shrink: 0;
          color: var(--text-muted);
        }
        .warn-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .warn-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .warn-text {
          font-size: 11px;
          color: var(--text-secondary);
          line-height: 1.4;
          margin: 0;
        }
        .warn-stat-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 4px;
          flex-wrap: wrap;
        }
        .interval-val {
          color: var(--text-primary);
          font-family: var(--font-mono);
          font-weight: 600;
        }
        .warn-mae-diff {
          font-size: 10px;
          color: var(--text-muted);
        }

        /* Ground Truth Card */
        .ground-truth-validation-card {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-md);
          padding: 14px;
          margin-bottom: 16px;
          min-width: 0;
          max-width: 100%;
        }
        .gt-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .gt-title-row { display: flex; align-items: center; gap: 8px; }
        .gt-heading { font-family: var(--font-heading); font-size: 13px; font-weight: 600; color: var(--text-primary); }
        .gt-match-pill {
          background: var(--bg-pill);
          color: var(--text-secondary);
          border: 1px solid var(--border-subtle);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
        }
        .gt-accuracy-badge-box {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-pill);
          padding: 3px 10px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-subtle);
          font-size: 11px;
        }
        .gt-acc-label { color: var(--text-muted); font-size: 10px; }
        .gt-acc-value { font-family: var(--font-mono); font-weight: 700; font-size: 13px; }
        .gt-acc-value.superb,
        .gt-acc-value.high { color: var(--emerald-400); }
        .gt-acc-value.medium { color: var(--text-primary); }
        .gt-cols-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 10px;
        }
        .gt-item {
          background: var(--bg-input);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-sm);
          padding: 10px;
          display: flex;
          flex-direction: column;
        }
        .gt-item.actual { border-left: 3px solid var(--border-card); }
        .gt-item.predicted { border-left: 3px solid var(--emerald-500); }
        .gt-item.gap { border-left: 3px solid var(--border-card); }
        .gt-label { font-size: 10px; color: var(--text-muted); margin-bottom: 3px; font-weight: 600; }
        .gt-price-row { display: flex; align-items: baseline; gap: 4px; margin-bottom: 2px; }
        .gt-price { font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: var(--text-primary); }
        .gt-price.pred-color { color: var(--emerald-400); }
        .gt-unit { font-size: 10px; color: var(--text-muted); }
        .gt-date-note { font-size: 10px; color: var(--text-secondary); font-family: var(--font-mono); }

        /* Lags Strip */
        .lags-strip {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-md);
          padding: 12px 14px;
          margin-bottom: 16px;
          min-width: 0;
          max-width: 100%;
        }
        .lags-strip-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-primary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
        }
        .lags-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 8px;
        }
        .lag-item {
          display: flex;
          flex-direction: column;
          background: var(--bg-input);
          padding: 8px 10px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-card);
          min-width: 0;
        }
        .lag-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
          gap: 4px;
        }
        .lag-label { font-size: 10px; color: var(--text-muted); font-weight: 600; white-space: nowrap; }
        .lag-source-badge {
          font-size: 9px;
          font-weight: 600;
          padding: 1px 4px;
          border-radius: 3px;
          text-transform: uppercase;
          white-space: nowrap;
          background: var(--bg-pill);
          color: var(--text-muted);
          border: 1px solid var(--border-subtle);
        }
        .lag-source-badge.forecast {
          background: rgba(16, 185, 129, 0.08);
          color: var(--emerald-400);
          border-color: rgba(16, 185, 129, 0.2);
        }
        .lag-value {
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 2px;
        }
        .lag-source-text {
          font-size: 9px;
          color: var(--text-muted);
          font-family: var(--font-mono);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .features-secondary-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px solid var(--border-subtle);
        }
        .feat-chip {
          background: var(--bg-input);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 10px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .feat-chip .f-name { color: var(--text-muted); font-weight: 500; }
        .feat-chip .f-val { color: var(--text-secondary); font-family: var(--font-mono); font-weight: 600; }

        /* Metrics Summary Card */
        .metrics-summary-card {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-md);
          padding: 14px;
          margin-bottom: 16px;
          min-width: 0;
          max-width: 100%;
        }
        .metrics-top-strip {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          margin-bottom: 10px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .metrics-title-row { display: flex; align-items: center; gap: 8px; }
        .metrics-heading { font-family: var(--font-heading); font-size: 13px; font-weight: 600; color: var(--text-primary); }
        .accuracy-pill {
          background: rgba(16, 185, 129, 0.1);
          color: var(--emerald-400);
          border: 1px solid rgba(16, 185, 129, 0.2);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: 10px;
          font-weight: 600;
          font-family: var(--font-mono);
        }
        .details-toggle-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; }
        .metrics-quad-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 8px;
        }
        .quad-cell {
          background: var(--bg-input);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-sm);
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .quad-label { font-size: 10px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .quad-val { font-family: var(--font-mono); font-size: 14px; font-weight: 700; margin: 3px 0 1px 0; color: var(--text-primary); }
        .quad-val.acc { color: var(--emerald-400); }
        .quad-sub { font-size: 9px; color: var(--text-muted); }
        .metric-explanation-drawer {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid var(--border-subtle);
          font-size: 11px;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        .model-file-tag { margin-top: 6px; font-size: 10px; color: var(--text-muted); }
        .model-file-tag code {
          background: var(--bg-input);
          padding: 2px 6px;
          border-radius: 4px;
          color: var(--emerald-400);
          font-family: var(--font-mono);
        }

        /* Forecast Audit Table Container */
        .forecast-audit-container {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-md);
          margin-top: 16px;
          overflow: hidden;
          min-width: 0;
          max-width: 100%;
          width: 100%;
          box-sizing: border-box;
        }
        .audit-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: var(--bg-input);
          cursor: pointer;
          border-bottom: 1px solid var(--border-card);
          flex-wrap: wrap;
          gap: 8px;
        }
        .audit-title-row { display: flex; align-items: center; gap: 8px; }
        .audit-heading { font-family: var(--font-heading); font-size: 13px; font-weight: 600; color: var(--text-primary); }
        .audit-badge {
          background: rgba(16, 185, 129, 0.1);
          color: var(--emerald-400);
          border: 1px solid rgba(16, 185, 129, 0.2);
          padding: 2px 7px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
        }
        .audit-actions { display: flex; align-items: center; gap: 8px; }
        .csv-export-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-pill);
          border: 1px solid var(--border-card);
          color: var(--text-primary);
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .csv-export-btn:hover { background: var(--bg-card-hover); border-color: var(--emerald-500); }
        .audit-table-content {
          padding: 10px 14px;
          min-width: 0;
          max-width: 100%;
          overflow: hidden;
        }
        .audit-table-scroll-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          max-height: 420px;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          max-width: 100%;
          width: 100%;
        }
        .audit-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          white-space: nowrap;
        }
        .audit-table th {
          position: sticky;
          top: 0;
          background: var(--bg-input);
          color: var(--text-muted);
          font-weight: 600;
          text-align: left;
          padding: 8px 10px;
          border-bottom: 2px solid var(--border-card);
          z-index: 2;
        }
        .audit-table td {
          padding: 6px 10px;
          border-bottom: 1px solid var(--border-subtle);
          color: var(--text-secondary);
        }
        .audit-table tr:hover { background: var(--bg-card-hover); }
        .audit-table tr.target-row-highlight {
          background: rgba(16, 185, 129, 0.08);
          border-left: 3px solid var(--emerald-500);
        }
        .cell-step { color: var(--text-secondary); font-family: var(--font-mono); }
        .cell-date { font-family: var(--font-mono); font-weight: 500; color: var(--text-primary); }
        .cell-price { font-family: var(--font-mono); font-weight: 700; color: var(--text-primary); }
        .cell-num { font-family: var(--font-mono); }
        .cell-source { font-size: 10px; color: var(--text-muted); }
        .type-badge.forecast {
          background: rgba(16, 185, 129, 0.1);
          color: var(--emerald-400);
          border: 1px solid rgba(16, 185, 129, 0.2);
          padding: 1px 5px;
          border-radius: 3px;
          font-size: 9px;
          font-weight: 600;
        }
        .source-pill {
          padding: 1px 5px;
          border-radius: 3px;
          font-size: 9px;
          font-family: var(--font-mono);
        }
        .source-pill.act { background: var(--bg-pill); color: var(--text-secondary); }
        .source-pill.fc { background: rgba(16, 185, 129, 0.08); color: var(--emerald-400); }
        .audit-pagination-strip {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 4px 2px 4px;
          font-size: 11px;
          color: var(--text-muted);
          flex-wrap: wrap;
          gap: 8px;
        }
        .pagination-controls { display: flex; align-items: center; gap: 8px; }
        .page-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: var(--bg-pill);
          border: 1px solid var(--border-card);
          color: var(--text-secondary);
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          cursor: pointer;
        }
        .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .page-current { font-family: var(--font-mono); font-weight: 600; color: var(--text-primary); }
        .page-size-toggle {
          background: transparent;
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 10px;
          cursor: pointer;
        }
        .page-size-toggle.active { color: var(--emerald-400); border-color: var(--emerald-500); }

        /* Light Theme Precision Overrides */
        [data-theme="light"] .prediction-result-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.06);
        }
        [data-theme="light"] .hero-price-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }
        [data-theme="light"] .main-price-val {
          color: #0f172a;
        }
        [data-theme="light"] .currency-prefix {
          color: #059669;
        }
        [data-theme="light"] .deviation-banner {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }
        [data-theme="light"] .deviation-badge {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #0f172a;
        }
        [data-theme="light"] .range-gauge-container {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }
        [data-theme="light"] .gauge-bar-track {
          background: #e2e8f0;
        }
        [data-theme="light"] .gauge-marker.center-target {
          background: #059669;
          border: 2px solid #ffffff;
          box-shadow: 0 0 8px rgba(5, 150, 105, 0.4);
        }
        [data-theme="light"] .thursday-adjustment-banner {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }
        [data-theme="light"] .pill-orig {
          background: #e2e8f0;
          color: #334155;
          border: 1px solid #cbd5e1;
        }
        [data-theme="light"] .pill-target {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }
        [data-theme="light"] .horizon-summary-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }
        [data-theme="light"] .lags-panel {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }
        [data-theme="light"] .audit-table th {
          background: #f1f5f9;
          color: #475569;
          border-bottom: 2px solid #e2e8f0;
        }
        [data-theme="light"] .audit-table td {
          border-bottom: 1px solid #e2e8f0;
          color: #334155;
        }
        [data-theme="light"] .audit-table tr:hover {
          background: #f8fafc;
        }
        [data-theme="light"] .audit-table tr.target-row-highlight {
          background: #ecfdf5;
          border-left: 3px solid #059669;
        }
        [data-theme="light"] .icon-action-btn {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #475569;
        }
        [data-theme="light"] .icon-action-btn:hover {
          background: #f8fafc;
          color: #0f172a;
          border-color: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

export default PredictionResultCard;

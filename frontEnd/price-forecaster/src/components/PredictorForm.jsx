import React from 'react';
import { 
  Calendar, 
  CloudRain, 
  Fuel, 
  Percent, 
  PartyPopper, 
  Sparkles, 
  Zap,
  Clock,
  RotateCcw
} from 'lucide-react';
import { MONSOONS, getMacroEconomicsForDate } from '../data/cropsData';

const PredictorForm = ({ 
  selectedCrop, 
  formData, 
  setFormData, 
  onSubmit, 
  loading, 
  lang,
  autoSimulate,
  setAutoSimulate
}) => {

  // Auto-calculate week, month, climate & macroeconomic indicators when date changes
  const handleDateChange = (e) => {
    const dateVal = e.target.value;
    if (dateVal) {
      const d = new Date(dateVal);
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const year = d.getFullYear();
      const weekOfMonth = Math.ceil(day / 7);
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const formattedWeek = `W${weekOfMonth}.${monthNames[month - 1]}.${year}`;

      // Auto deduce monsoon season based on month
      let deducedMonsoon = 1;
      if (month >= 3 && month <= 4) deducedMonsoon = 1; // FIM
      else if (month >= 5 && month <= 9) deducedMonsoon = 2; // SWM
      else if (month >= 10 && month <= 11) deducedMonsoon = 3; // SIM
      else deducedMonsoon = 4; // NEM

      // Auto deduce festive season for peak festival months
      const isFestiveAuto = (month === 4 || month === 12 || month === 5) ? 1 : 0;

      // Auto deduce Sri Lanka CCPI Inflation & Diesel price from macroeconomic timeline
      const { inflation, diesel } = getMacroEconomicsForDate(dateVal);

      const updated = {
        ...formData,
        selected_date: dateVal,
        month: month,
        monsoon_season: deducedMonsoon,
        is_festive: isFestiveAuto,
        diesel_price_weekly_actual: diesel,
        inflation_rate_cpi_weekly_mean: inflation,
        weekText: formattedWeek
      };

      setFormData(updated);
      if (autoSimulate) onSubmit(updated);
    }
  };

  const handleSliderChange = (name, value) => {
    const numVal = parseFloat(value);
    const updated = {
      ...formData,
      [name]: numVal
    };
    setFormData(updated);
    if (autoSimulate) onSubmit(updated);
  };

  const handlePresetDiesel = (delta) => {
    const newPrice = Math.max(200, Math.min(600, (formData.diesel_price_weekly_actual || 340) + delta));
    handleSliderChange('diesel_price_weekly_actual', newPrice);
  };

  return (
    <div className="predictor-form-card glass-panel">
      <div className="form-header">
        <div>
          <div className="form-badge">
            <Sparkles size={14} className="text-emerald-400" />
            <span>AI Predictive Parameters</span>
          </div>
          <h3 className="form-title">
            {lang === 'en' ? 'Market & Environmental Inputs' : 'වෙළෙඳපොළ හා පාරිසරික සාධක'}
          </h3>
          <p className="form-subtitle">
            {lang === 'en' 
              ? 'Tune macroeconomic indicators, weather seasons, and dates for precise forecasting.' 
              : 'ඉන්ධන, උද්ධමනය, මෝසම් කාලගුණය සහ දිනය සකසා අනාවැකිය ලබාගන්න.'}
          </p>
        </div>

        {/* Live Simulation Switch */}
        <div className="sim-toggle-wrapper">
          <label className="switch-label">
            <Zap size={14} className={autoSimulate ? 'text-emerald-400' : 'text-muted'} />
            <span className="sim-text">{lang === 'en' ? 'Live Auto-Simulate' : 'ක්ෂණික සිමියුලේෂන්'}</span>
            <input
              type="checkbox"
              checked={autoSimulate}
              onChange={(e) => setAutoSimulate(e.target.checked)}
              className="toggle-checkbox"
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        {/* Section 1: Date & Week Selector */}
        <div className="param-section">
          <div className="section-label-group">
            <Calendar size={16} className="text-emerald-400" />
            <label className="section-label">
              {lang === 'en' ? 'Target Forecast Date' : 'පුරෝකථන ඉලක්ක දිනය'}
            </label>
            {formData.weekText && (
              <span className="week-tag">
                <Clock size={12} /> {formData.weekText} (Month {formData.month})
              </span>
            )}
          </div>
          <input
            type="date"
            className="custom-input date-picker-input"
            value={formData.selected_date || ''}
            onChange={handleDateChange}
            required
          />
        </div>

        {/* Section 2: Monsoon Season Selector */}
        <div className="param-section">
          <div className="section-label-group">
            <CloudRain size={16} className="text-cyan-400" />
            <label className="section-label">
              {lang === 'en' ? 'Monsoon Climate Season' : 'මෝසම් කාලගුණ තත්ත්වය'}
            </label>
          </div>
          <div className="monsoon-grid">
            {MONSOONS.map((m) => {
              const isSelected = formData.monsoon_season === m.value;
              return (
                <div
                  key={m.value}
                  className={`monsoon-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSliderChange('monsoon_season', m.value)}
                >
                  <div className="monsoon-top">
                    <span className="monsoon-icon">{m.icon}</span>
                    <span className="monsoon-code">{m.code}</span>
                  </div>
                  <div className="monsoon-name">{m.name}</div>
                  <div className="monsoon-period">{m.period}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Festive Season Switch */}
        <div className="param-section">
          <div className="festive-card">
            <div className="festive-info">
              <PartyPopper size={20} className={formData.is_festive ? 'text-amber-400' : 'text-muted'} />
              <div>
                <div className="festive-title">
                  {lang === 'en' ? 'Festive & Peak Season Surge' : 'උත්සව සමය (ඉහළ ඉල්ලුම)'}
                </div>
                <div className="festive-desc">
                  {lang === 'en' 
                    ? 'Sinhala/Tamil New Year, Christmas, Ramadan, or Vesak market surge' 
                    : 'අවුරුදු, නත්තල්, රාමසාන් හෝ වෙසක් වැනි ඉල්ලුම අධික සමයන්'}
                </div>
              </div>
            </div>
            <div className="festive-buttons">
              <button
                type="button"
                className={`festive-choice ${formData.is_festive === 0 ? 'active' : ''}`}
                onClick={() => handleSliderChange('is_festive', 0)}
              >
                {lang === 'en' ? 'Off (Normal)' : 'නැත (සාමාන්‍ය)'}
              </button>
              <button
                type="button"
                className={`festive-choice festive-active ${formData.is_festive === 1 ? 'active' : ''}`}
                onClick={() => handleSliderChange('is_festive', 1)}
              >
                🎉 {lang === 'en' ? 'On (Festive)' : 'ඔව් (උත්සව)'}
              </button>
            </div>
          </div>
        </div>

        {/* Section 4: Diesel Fuel Price Slider */}
        {(() => {
          const autoMacro = getMacroEconomicsForDate(formData.selected_date);
          return (
            <>
              <div className="param-section slider-section">
                <div className="slider-header">
                  <div className="slider-title-group">
                    <Fuel size={16} className="text-amber-400" />
                    <label className="section-label">
                      {lang === 'en' ? 'Diesel Price (Transport Impact)' : 'ඩීසල් මිල (ප්‍රවාහන වියදම්)'}
                    </label>
                  </div>
                  <div className="slider-value-badge">
                    Rs. {formData.diesel_price_weekly_actual} / L
                  </div>
                </div>

                <input
                  type="range"
                  min="100"
                  max="500"
                  step="5"
                  value={formData.diesel_price_weekly_actual || autoMacro.diesel}
                  onChange={(e) => handleSliderChange('diesel_price_weekly_actual', e.target.value)}
                />

                <div className="quick-presets">
                  <button type="button" className="preset-btn" onClick={() => handlePresetDiesel(-20)}>- Rs. 20</button>
                  <button type="button" className="preset-btn" onClick={() => handlePresetDiesel(-10)}>- Rs. 10</button>
                  <button 
                    type="button" 
                    className="preset-btn reset" 
                    onClick={() => handleSliderChange('diesel_price_weekly_actual', autoMacro.diesel)}
                    title="Auto-Sync with Central Bank / CPC Timeline for selected date"
                  >
                    <RotateCcw size={11} style={{ display: 'inline', marginRight: 4 }} />
                    Auto ({autoMacro.diesel})
                  </button>
                  <button type="button" className="preset-btn" onClick={() => handlePresetDiesel(10)}>+ Rs. 10</button>
                  <button type="button" className="preset-btn" onClick={() => handlePresetDiesel(20)}>+ Rs. 20</button>
                </div>
              </div>

              {/* Section 5: Inflation Rate CPI Slider */}
              <div className="param-section slider-section">
                <div className="slider-header">
                  <div className="slider-title-group">
                    <Percent size={16} className="text-rose-400" />
                    <label className="section-label">
                      {lang === 'en' ? 'Inflation Rate (CCPI Mean %)' : 'උද්ධමන අනුපාතිකය (CCPI %)'}
                    </label>
                  </div>
                  <div className="slider-value-badge inflation">
                    {formData.inflation_rate_cpi_weekly_mean}%
                  </div>
                </div>

                <input
                  type="range"
                  min="-2"
                  max="70"
                  step="0.2"
                  value={formData.inflation_rate_cpi_weekly_mean ?? autoMacro.inflation}
                  onChange={(e) => handleSliderChange('inflation_rate_cpi_weekly_mean', e.target.value)}
                />

                <div className="quick-presets">
                  <button type="button" className="preset-btn" onClick={() => handleSliderChange('inflation_rate_cpi_weekly_mean', Math.max(-2, Math.round(((formData.inflation_rate_cpi_weekly_mean || 5) - 2) * 10) / 10))}>-2%</button>
                  <button 
                    type="button" 
                    className="preset-btn reset" 
                    onClick={() => handleSliderChange('inflation_rate_cpi_weekly_mean', autoMacro.inflation)}
                    title="Auto-Sync with Central Bank CCPI Timeline for selected date"
                  >
                    <RotateCcw size={11} style={{ display: 'inline', marginRight: 4 }} />
                    Auto ({autoMacro.inflation}%)
                  </button>
                  <button type="button" className="preset-btn" onClick={() => handleSliderChange('inflation_rate_cpi_weekly_mean', Math.min(70, Math.round(((formData.inflation_rate_cpi_weekly_mean || 5) + 2) * 10) / 10))}>+2%</button>
                  <button type="button" className="preset-btn" onClick={() => handleSliderChange('inflation_rate_cpi_weekly_mean', Math.min(70, Math.round(((formData.inflation_rate_cpi_weekly_mean || 5) + 5) * 10) / 10))}>+5%</button>
                </div>

                <div className="slider-ticks">
                  <span>0% (Target)</span>
                  <span>5% (Baseline)</span>
                  <span>20% (High)</span>
                  <span>65%+ (Crisis)</span>
                </div>
              </div>
            </>
          );
        })()}

        {/* Submit Action Button */}
        <button
          type="submit"
          className="btn-primary submit-forecast-btn"
          disabled={loading || !formData.selected_date}
        >
          {loading ? (
            <>
              <div className="spinner"></div>
              <span>{lang === 'en' ? 'Fetching Live Weather & Running Random Forest AI...' : 'දත්ත ලබාගනිමින් පුරෝකථනය සිදුකෙරේ...'}</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span>
                {lang === 'en' 
                  ? `Run Forecast for ${selectedCrop?.name || 'Selected Crop'}` 
                  : `${selectedCrop?.name_si || 'එළවළු'} මිල පුරෝකථනය කරන්න`}
              </span>
            </>
          )}
        </button>
      </form>

      <style>{`
        .predictor-form-card {
          padding: 24px;
          height: 100%;
        }
        .form-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 18px;
        }
        .form-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(16, 185, 129, 0.12);
          color: var(--emerald-400);
          border: 1px solid rgba(16, 185, 129, 0.25);
          padding: 3px 10px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .form-title {
          font-family: var(--font-heading);
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.2;
        }
        .form-subtitle {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .sim-toggle-wrapper {
          display: flex;
          align-items: center;
        }
        .switch-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .toggle-checkbox {
          display: none;
        }
        .toggle-slider {
          position: relative;
          width: 36px;
          height: 20px;
          background: var(--border-card);
          border-radius: 20px;
          transition: all 0.2s;
        }
        .toggle-slider:before {
          content: "";
          position: absolute;
          width: 14px;
          height: 14px;
          left: 3px;
          bottom: 3px;
          background: #ffffff;
          border-radius: 50%;
          transition: all 0.2s;
        }
        .toggle-checkbox:checked + .toggle-slider {
          background: var(--emerald-500);
        }
        .toggle-checkbox:checked + .toggle-slider:before {
          transform: translateX(16px);
        }
        .param-section {
          margin-bottom: 20px;
        }
        .section-label-group {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }
        .section-label {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .week-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(16, 185, 129, 0.15);
          color: var(--emerald-400);
          border: 1px solid rgba(16, 185, 129, 0.3);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 700;
          font-family: var(--font-mono);
        }
        .date-picker-input {
          cursor: pointer;
          font-size: 15px;
          font-weight: 500;
        }
        .monsoon-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .monsoon-card {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-md);
          padding: 10px 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .monsoon-card:hover {
          border-color: var(--border-glow);
          background: var(--bg-card-hover);
        }
        .monsoon-card.selected {
          border-color: var(--emerald-500);
          background: rgba(16, 185, 129, 0.08);
          box-shadow: 0 0 0 1px var(--emerald-500);
        }
        .monsoon-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .monsoon-icon {
          font-size: 18px;
        }
        .monsoon-code {
          font-size: 10px;
          font-weight: 700;
          background: var(--bg-pill);
          padding: 2px 5px;
          border-radius: 4px;
          color: var(--text-muted);
        }
        .monsoon-name {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.2;
        }
        .monsoon-period {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .festive-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-md);
          padding: 14px 16px;
          gap: 14px;
          flex-wrap: wrap;
        }
        .festive-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .festive-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .festive-desc {
          font-size: 11px;
          color: var(--text-muted);
        }
        .festive-buttons {
          display: flex;
          gap: 6px;
          background: var(--bg-pill);
          padding: 3px;
          border-radius: var(--radius-sm);
        }
        .festive-choice {
          background: transparent;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }
        .festive-choice.active {
          background: var(--bg-card);
          color: var(--text-primary);
          border: 1px solid var(--border-card);
        }
        .festive-choice.festive-active.active {
          background: rgba(16, 185, 129, 0.12);
          color: var(--emerald-400);
          border-color: rgba(16, 185, 129, 0.25);
        }
        .slider-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .slider-title-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .slider-value-badge {
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 600;
          background: var(--bg-pill);
          color: var(--text-primary);
          border: 1px solid var(--border-card);
          padding: 2px 10px;
          border-radius: var(--radius-full);
        }
        .slider-value-badge.inflation {
          background: var(--bg-pill);
          color: var(--text-primary);
          border-color: var(--border-card);
        }
        .quick-presets {
          display: flex;
          gap: 6px;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        .preset-btn {
          background: var(--bg-pill);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .preset-btn:hover {
          background: var(--bg-card-hover);
          color: var(--text-primary);
          border-color: var(--border-card);
        }
        .preset-btn.reset {
          font-weight: 700;
          color: var(--emerald-400);
        }
        .slider-ticks {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: var(--text-muted);
          margin-top: 6px;
        }
        .submit-forecast-btn {
          width: 100%;
          padding: 16px;
          font-size: 16px;
          margin-top: 10px;
        }
        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: #ffffff;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Light Theme Precision Overrides */
        [data-theme="light"] .predictor-form-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.06);
        }
        [data-theme="light"] .monsoon-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
        }
        [data-theme="light"] .monsoon-card:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
        }
        [data-theme="light"] .monsoon-card.selected {
          border-color: #059669;
          background: #ecfdf5;
          box-shadow: 0 0 0 1px #059669, 0 4px 12px rgba(5, 150, 105, 0.1);
        }
        [data-theme="light"] .festive-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
        }
        [data-theme="light"] .festive-buttons {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
        }
        [data-theme="light"] .festive-choice {
          color: #64748b;
        }
        [data-theme="light"] .festive-choice.active {
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }
        [data-theme="light"] .festive-choice.festive-active.active {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }
        [data-theme="light"] .preset-btn {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #475569;
        }
        [data-theme="light"] .preset-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        [data-theme="light"] .preset-btn.reset {
          color: #047857;
        }
        [data-theme="light"] .slider-value-badge {
          background: #f1f5f9;
          color: #0f172a;
          border: 1px solid #e2e8f0;
        }
        [data-theme="light"] .week-tag {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }
        [data-theme="light"] input[type="range"] {
          background: #e2e8f0;
          border: none;
        }
        [data-theme="light"] input[type="range"]::-webkit-slider-thumb {
          background: #059669;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 6px rgba(5, 150, 105, 0.3);
        }
      `}</style>
    </div>
  );
};

export default PredictorForm;

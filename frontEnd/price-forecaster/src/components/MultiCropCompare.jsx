import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Layers, Check, RefreshCw } from 'lucide-react';
import { CROPS_DATA } from '../data/cropsData';

const MultiCropCompare = ({ formData, lang }) => {
  const [selectedIds, setSelectedIds] = useState(['carrot', 'bean', 'tomato', 'bandakka']);
  const [comparisonResults, setComparisonResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleToggleCrop = (id) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 2) {
        setSelectedIds(selectedIds.filter(i => i !== id));
      }
    } else {
      if (selectedIds.length < 5) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const fetchComparison = useCallback(async () => {
    setLoading(true);
    const results = [];
    for (const id of selectedIds) {
      const crop = CROPS_DATA.find(c => c.id === id);
      if (!crop) continue;

      try {
        const response = await axios.post(
          `http://127.0.0.1:8000/predict/${crop.region}/${crop.id}`,
          formData
        );
        results.push({
          id: crop.id,
          name: crop.name,
          name_si: crop.name_si,
          icon: crop.icon,
          region: crop.region,
          color: crop.color,
          price: response.data.predicted_price_lkr || response.data.prediction,
          minPrice: response.data.price_min,
          maxPrice: response.data.price_max,
          mae: response.data.margin_of_error_rs || crop.metrics?.mae,
          rmse: response.data.margin_of_error_rmse_rs || crop.metrics?.rmse,
          mape: response.data.margin_of_error_pct || crop.metrics?.mape,
          accuracy: response.data.model_accuracy || crop.metrics?.accuracy,
          percentChange: response.data.percent_change || 0,
          lag1: response.data.lag_prices?.lag_1 || 0
        });
      } catch (err) {
        console.error(`Error forecasting ${id}:`, err);
      }
    }
    setComparisonResults(results);
    setLoading(false);
  }, [selectedIds, formData]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  return (
    <div className="compare-dashboard">
      <div className="compare-header glass-panel">
        <div>
          <div className="compare-badge">
            <Layers size={13} className="text-emerald-400" />
            <span>{lang === 'en' ? 'Side-by-Side Analysis' : 'එළවළු මිල සංසන්දනය'}</span>
          </div>
          <h2 className="compare-title">
            {lang === 'en' ? 'Multi-Vegetable Forecast Matrix & Accuracy' : 'එළවළු වර්ග කිහිපයක මිල හා නිරවද්‍යතා සංසන්දනය'}
          </h2>
          <p className="compare-desc">
            {lang === 'en' 
              ? 'Select 2 to 5 vegetables to compare projected retail prices, expected fluctuation margins (MAE), and trained model accuracy.' 
              : 'වත්මන් ආර්ථික හා කාලගුණ තත්ත්වයන් යටතේ එළවළු වර්ග කිහිපයක පුරෝකථන මිල ගණන් සහ නිරවද්‍යතා දත්ත සංසන්දනය කරන්න.'}
          </p>
        </div>

        <button 
          className="btn-primary refresh-compare-btn"
          onClick={fetchComparison}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          <span>{lang === 'en' ? 'Refresh All Forecasts' : 'නැවත ගණනය කරන්න'}</span>
        </button>
      </div>

      {/* Crop Selection Strip */}
      <div className="crop-pills-bar glass-panel">
        <span className="pills-label">{lang === 'en' ? 'Select up to 5 crops:' : 'එළවළු 5ක් දක්වා තෝරන්න:'}</span>
        <div className="pills-list">
          {CROPS_DATA.map((crop) => {
            const isSelected = selectedIds.includes(crop.id);
            return (
              <button
                key={crop.id}
                className={`crop-pill-btn ${isSelected ? 'selected' : ''}`}
                onClick={() => handleToggleCrop(crop.id)}
                style={{ '--pill-color': crop.color }}
              >
                <span>{crop.icon}</span>
                <span>{crop.name}</span>
                {isSelected && <Check size={12} strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Comparison Chart */}
      <div className="compare-chart-card glass-panel">
        <h3 className="chart-card-title">
          {lang === 'en' ? 'Projected Price Comparison (LKR / Kg)' : 'පුරෝකථන මිල සංසන්දනාත්මක ප්‍රස්ථාරය (රු/කිග්‍රෑ)'}
        </h3>

        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonResults} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} unit=" Rs" />
              <Tooltip 
                formatter={(val) => [`Rs. ${Number(val).toFixed(2)} / kg`, 'Predicted Price']}
                contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)', borderRadius: '8px', color: 'var(--text-primary)', boxShadow: 'var(--shadow-md)' }}
              />
              <Bar dataKey="price" radius={[6, 6, 0, 0]} barSize={36} fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="compare-cards-grid">
        {comparisonResults.map((item) => (
          <div key={item.id} className="compare-item-card glass-panel">
            <div className="item-card-top">
              <span className="item-icon">{item.icon}</span>
              <span className="acc-mini-tag">
                ★ {item.accuracy}% Acc
              </span>
            </div>

            <div className="item-name">{item.name}</div>
            <div className="item-name-si">{item.name_si}</div>

            <div className="item-price-box">
              <span className="curr">Rs.</span>
              <span className="val">{item.price?.toFixed(2)}</span>
              <span className="kg">/ kg</span>
            </div>

            <div className="item-fluctuation-box">
              <span className="dev-lbl">Expected Fluctuation:</span>
              <span className="dev-val">± Rs. {item.mae?.toFixed(2)} ({item.mape}%)</span>
            </div>

            <div className="item-stats-row">
              <div className="stat-sub">
                <span className="stat-sub-label">Confidence Band</span>
                <span className="stat-sub-val">Rs. {item.minPrice?.toFixed(0)} – {item.maxPrice?.toFixed(0)}</span>
              </div>
              <div className="stat-sub">
                <span className="stat-sub-label">Weekly Shift</span>
                <span className={`stat-sub-val ${item.percentChange >= 0 ? 'text-rose' : 'text-emerald'}`}>
                  {item.percentChange >= 0 ? `+${item.percentChange}%` : `${item.percentChange}%`}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .compare-dashboard {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .compare-header {
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
        }
        .compare-badge {
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
        .compare-title {
          font-family: var(--font-heading);
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .compare-desc {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .refresh-compare-btn {
          font-size: 13px;
          padding: 10px 18px;
        }
        .crop-pills-bar {
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .pills-label {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-secondary);
        }
        .pills-list {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .crop-pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-pill);
          border: 1px solid var(--border-card);
          color: var(--text-secondary);
          padding: 6px 12px;
          border-radius: var(--radius-full);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .crop-pill-btn:hover {
          background: var(--bg-card-hover);
          color: var(--text-primary);
        }
        .crop-pill-btn.selected {
          background: rgba(16, 185, 129, 0.12);
          border-color: var(--emerald-500);
          color: var(--emerald-400);
        }
        .compare-chart-card {
          padding: 24px;
        }
        .chart-card-title {
          font-family: var(--font-heading);
          font-size: 17px;
          font-weight: 700;
          margin-bottom: 16px;
          color: var(--text-primary);
        }
        .compare-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        .compare-item-card {
          padding: 18px;
          border: 1px solid var(--border-card);
          transition: all 0.2s;
        }
        .compare-item-card:hover {
          transform: translateY(-2px);
          border-color: var(--border-glow);
          box-shadow: var(--shadow-md);
        }
        .item-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .item-icon {
          font-size: 28px;
        }
        .acc-mini-tag {
          font-size: 11px;
          font-weight: 600;
          font-family: var(--font-mono);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          background: rgba(16, 185, 129, 0.1);
          color: var(--emerald-400);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .item-fluctuation-box {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--bg-pill);
          border: 1px solid var(--border-subtle);
          padding: 6px 10px;
          border-radius: var(--radius-sm);
          margin-bottom: 10px;
          font-size: 11px;
        }
        .dev-lbl {
          color: var(--text-muted);
          font-weight: 600;
        }
        .dev-val {
          font-family: var(--font-mono);
          font-weight: 600;
          color: var(--text-primary);
        }
        .item-name {
          font-family: var(--font-heading);
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .item-name-si {
          font-size: 13px;
          color: var(--emerald-400);
          font-weight: 600;
          margin-bottom: 12px;
        }
        .item-price-box {
          display: flex;
          align-items: baseline;
          gap: 4px;
          background: var(--bg-input);
          padding: 12px;
          border-radius: var(--radius-md);
          margin-bottom: 12px;
        }
        .item-price-box .curr {
          font-size: 16px;
          font-weight: 700;
          color: var(--emerald-400);
        }
        .item-price-box .val {
          font-family: var(--font-heading);
          font-size: 26px;
          font-weight: 800;
          color: var(--text-primary);
        }
        .item-price-box .kg {
          font-size: 12px;
          color: var(--text-muted);
        }
        .item-stats-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          font-size: 11px;
        }
        .stat-sub {
          display: flex;
          flex-direction: column;
        }
        .stat-sub-label {
          color: var(--text-muted);
        }
        .stat-sub-val {
          font-family: var(--font-mono);
          font-weight: 700;
          color: var(--text-secondary);
        }
        .text-rose { color: var(--rose-400) !important; }
        .text-emerald { color: var(--emerald-400) !important; }
      `}</style>
    </div>
  );
};

export default MultiCropCompare;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, Download, Database } from 'lucide-react';
import { CROPS_DATA } from '../data/cropsData';

const TrendsDashboard = ({ lang }) => {
  const [selectedCrop, setSelectedCrop] = useState('carrot');
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableFilter, setTableFilter] = useState('');

  const fetchHistory = async (cropId) => {
    setLoading(true);
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/history/${cropId}`);
      setHistoryData(response.data.history || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory(selectedCrop);
  }, [selectedCrop]);

  const activeCropMeta = CROPS_DATA.find(c => c.id === selectedCrop) || CROPS_DATA[0];

  const handleDownloadHistoricalCSV = () => {
    if (!historyData.length) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Week/Date,Price (Rs/kg)", ...historyData.map(r => `"${r.year}",${r.price}`)].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedCrop}_historical_prices_2020_2025.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="trends-dashboard">
      <div className="trends-header glass-panel">
        <div>
          <div className="trends-badge">
            <TrendingUp size={13} className="text-emerald-400" />
            <span>{lang === 'en' ? 'Long-Term Market Intelligence' : 'ඓතිහාසික වෙළෙඳපොළ ප්‍රවණතා'}</span>
          </div>
          <h2 className="trends-title">
            {lang === 'en' ? 'Historical Price Trends & Seasonality' : 'එළවළු මිල ඉතිහාසය හා කාලගුණික බලපෑම්'}
          </h2>
          <p className="trends-desc">
            {lang === 'en' 
              ? 'Analyze multi-year price patterns (2020–2025), annual inflation spikes, and monsoon seasonality cycles.' 
              : '2020-2025 දක්වා සතිපතා මිල ගණන් සහ වාර්ෂික උච්චාවචනයන් විශ්ලේෂණය කරන්න.'}
          </p>
        </div>

        <button 
          className="btn-secondary download-btn"
          onClick={handleDownloadHistoricalCSV}
          disabled={historyData.length === 0}
        >
          <Download size={15} />
          <span>{lang === 'en' ? 'Download Full Dataset (CSV)' : 'දත්ත ගොනුව බාගත කරන්න'}</span>
        </button>
      </div>

      {/* Vegetable Selector Tabs */}
      <div className="crops-tab-strip glass-panel">
        {CROPS_DATA.map((crop) => {
          const isActive = selectedCrop === crop.id;
          return (
            <button
              key={crop.id}
              className={`crop-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setSelectedCrop(crop.id)}
            >
              <span>{crop.icon}</span>
              <span>{crop.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Full-Width Trend Chart */}
      <div className="trend-chart-panel glass-panel">
        <div className="trend-chart-header">
          <div className="chart-crop-info">
            <span className="crop-ico">{activeCropMeta.icon}</span>
            <div>
              <h3 className="chart-crop-title">
                {activeCropMeta.name} <span className="si">({activeCropMeta.name_si})</span>
              </h3>
              <span className="chart-crop-sub">
                {lang === 'en' ? `Showing ${historyData.length} weekly price observations` : `සති ${historyData.length} ක මිල සටහන්`}
              </span>
            </div>
          </div>
        </div>

        <div className="trend-chart-container">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <span>Loading Historical Data...</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={historyData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                <XAxis dataKey="year" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit=" Rs" />
                <Tooltip 
                  formatter={(val) => [`Rs. ${Number(val).toFixed(2)} / kg`, 'Retail Price']}
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)', borderRadius: '8px', color: 'var(--text-primary)', boxShadow: 'var(--shadow-md)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Historical Data Records Table */}
      <div className="history-table-panel glass-panel">
        <div className="table-header-row">
          <div className="table-title-group">
            <Database size={16} className="text-emerald-400" />
            <h4 className="table-title">
              {lang === 'en' ? 'Recent Historical Records' : 'පසුගිය මිල වාර්තා'}
            </h4>
          </div>
          <input
            type="text"
            placeholder="Filter by week or year (e.g. 2024, W3)..."
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            className="table-filter-input"
          />
        </div>

        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>{lang === 'en' ? 'Week Identifier / Date' : 'සතිය / දිනය'}</th>
                <th>{lang === 'en' ? 'Crop' : 'එළවළු'}</th>
                <th>{lang === 'en' ? 'Retail Price (LKR / kg)' : 'සිල්ලර මිල (රු/කිග්‍රෑ)'}</th>
                <th>{lang === 'en' ? 'Variance Status' : 'මිල තත්ත්වය'}</th>
              </tr>
            </thead>
            <tbody>
              {historyData
                .filter(row => !tableFilter || row.year?.toLowerCase().includes(tableFilter.toLowerCase()))
                .slice(-15)
                .reverse()
                .map((row, idx) => {
                  const isHigh = row.price > 400;
                  return (
                    <tr key={idx}>
                      <td className="font-mono">{row.year}</td>
                      <td>{activeCropMeta.name}</td>
                      <td className="font-mono font-bold text-emerald">Rs. {Number(row.price).toFixed(2)}</td>
                      <td>
                        <span className={`status-pill ${isHigh ? 'surge' : 'normal'}`}>
                          {isHigh ? 'Market Surge' : 'Stable Range'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .trends-dashboard {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .trends-header {
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
        }
        .trends-badge {
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
        .trends-title {
          font-family: var(--font-heading);
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .trends-desc {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .download-btn {
          font-size: 13px;
        }
        .crops-tab-strip {
          padding: 12px 16px;
          display: flex;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .crops-tab-strip::-webkit-scrollbar {
          display: none;
        }
        .crop-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-pill);
          border: 1px solid var(--border-card);
          color: var(--text-secondary);
          padding: 8px 16px;
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .crop-tab-btn:hover {
          background: var(--bg-card-hover);
          color: var(--text-primary);
        }
        .crop-tab-btn.active {
          background: var(--bg-card);
          color: var(--emerald-400);
          border-color: var(--emerald-500);
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.25);
        }
        .trend-chart-panel {
          padding: 24px;
        }
        .trend-chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .chart-crop-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .crop-ico {
          font-size: 32px;
        }
        .chart-crop-title {
          font-family: var(--font-heading);
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .chart-crop-title .si {
          color: var(--emerald-400);
          font-weight: 600;
        }
        .chart-crop-sub {
          font-size: 12px;
          color: var(--text-muted);
        }
        .trend-chart-container {
          width: 100%;
          min-height: 380px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: var(--text-secondary);
        }
        .history-table-panel {
          padding: 24px;
        }
        .table-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .table-title-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .table-title {
          font-family: var(--font-heading);
          font-size: 17px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .table-filter-input {
          background: var(--bg-input);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-sm);
          padding: 8px 14px;
          color: var(--text-primary);
          font-size: 13px;
          outline: none;
        }
        .table-wrapper {
          overflow-x: auto;
        }
        .custom-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .custom-table th {
          text-align: left;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-card);
          color: var(--text-muted);
          font-weight: 700;
          text-transform: uppercase;
          font-size: 11px;
        }
        .custom-table td {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-subtle);
          color: var(--text-primary);
        }
        .custom-table tr:hover td {
          background: var(--bg-card-hover);
        }
        .font-mono { font-family: var(--font-mono); }
        .font-bold { font-weight: 700; }
        .status-pill {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }
        .status-pill.normal {
          background: var(--bg-pill-active);
          color: var(--emerald-400);
          border: 1px solid var(--border-glow);
        }
        .status-pill.surge {
          background: rgba(239, 68, 68, 0.12);
          color: var(--rose-400);
          border: 1px solid rgba(239, 68, 68, 0.25);
        }
      `}</style>
    </div>
  );
};

export default TrendsDashboard;

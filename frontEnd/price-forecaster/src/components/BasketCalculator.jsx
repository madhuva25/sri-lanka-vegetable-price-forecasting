import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ShoppingBag, Trash2, Receipt, Sparkles } from 'lucide-react';
import { CROPS_DATA } from '../data/cropsData';

const BasketCalculator = ({ formData, lang }) => {
  const [basket, setBasket] = useState([
    { id: 'carrot', qty: 2 },
    { id: 'bean', qty: 1 },
    { id: 'tomato', qty: 1.5 },
    { id: 'bandakka', qty: 1 }
  ]);
  const [prices, setPrices] = useState({});

  const fetchPrices = useCallback(async () => {
    const newPrices = {};
    for (const item of basket) {
      const crop = CROPS_DATA.find(c => c.id === item.id);
      if (!crop) continue;
      try {
        const response = await axios.post(
          `http://127.0.0.1:8000/predict/${crop.region}/${crop.id}`,
          formData
        );
        newPrices[item.id] = response.data.predicted_price_lkr || response.data.prediction;
      } catch (_err) {
        newPrices[item.id] = 300.0;
      }
    }
    setPrices(newPrices);
  }, [basket, formData]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const handleUpdateQty = (id, delta) => {
    setBasket(basket.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0.25, Math.round((item.qty + delta) * 10) / 10);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const handleRemove = (id) => {
    setBasket(basket.filter(item => item.id !== id));
  };

  const handleAddCrop = (id) => {
    if (!basket.some(item => item.id === id)) {
      setBasket([...basket, { id, qty: 1 }]);
    }
  };

  const totalCost = basket.reduce((acc, item) => {
    const unitPrice = prices[item.id] || 0;
    return acc + (unitPrice * item.qty);
  }, 0);

  const availableToAdd = CROPS_DATA.filter(crop => !basket.some(item => item.id === crop.id));

  return (
    <div className="basket-view">
      <div className="basket-header glass-panel">
        <div>
          <div className="basket-badge">
            <ShoppingBag size={13} className="text-emerald-400" />
            <span>{lang === 'en' ? 'Smart Shopping & Budget Planner' : 'එළවළු මිල ගණනය'}</span>
          </div>
          <h2 className="basket-title">
            {lang === 'en' ? 'Vegetable Basket Price Forecaster' : 'සතිපතා එළවළු මල්ලේ මිල ගණනය කිරීම'}
          </h2>
          <p className="basket-desc">
            {lang === 'en' 
              ? 'Add vegetable quantities to estimate your household or wholesale procurement bill based on forecasted AI prices.' 
              : 'අවශ්‍ය එළවළු ප්‍රමාණ ඇතුළත් කර අපේක්ෂිත සම්පූර්ණ පිරිවැය ගණනය කරගන්න.'}
          </p>
        </div>

        {/* Hero Total Bill Card */}
        <div className="basket-total-card">
          <span className="total-label">{lang === 'en' ? 'Projected Total Cost' : 'අපේක්ෂිත මුළු වියදම'}</span>
          <div className="total-number">
            <span className="curr">Rs.</span>
            <span className="val">{totalCost.toFixed(2)}</span>
          </div>
          <span className="total-sub">{basket.length} {lang === 'en' ? 'Vegetables Selected' : 'තෝරාගත් එළවළු'}</span>
        </div>
      </div>

      <div className="basket-content-grid">
        {/* Left Column: Basket Items List */}
        <div className="basket-items-panel glass-panel">
          <h3 className="panel-sub-title">{lang === 'en' ? 'Basket Items' : 'තෝරාගත් එළවළු ලැයිස්තුව'}</h3>

          <div className="basket-items-list">
            {basket.map((item) => {
              const crop = CROPS_DATA.find(c => c.id === item.id);
              const unitPrice = prices[item.id] || 0;
              const subtotal = unitPrice * item.qty;

              return (
                <div key={item.id} className="basket-item-row">
                  <div className="item-left">
                    <span className="item-emoji">{crop?.icon}</span>
                    <div>
                      <h4 className="item-name-text">{crop?.name}</h4>
                      <span className="item-unit-rate">Rs. {unitPrice.toFixed(2)} / kg</span>
                    </div>
                  </div>

                  <div className="item-qty-controls">
                    <button className="qty-btn" onClick={() => handleUpdateQty(item.id, -0.5)}>-</button>
                    <span className="qty-val">{item.qty} kg</span>
                    <button className="qty-btn" onClick={() => handleUpdateQty(item.id, 0.5)}>+</button>
                  </div>

                  <div className="item-subtotal-col">
                    <span className="subtotal-val">Rs. {subtotal.toFixed(2)}</span>
                    <button className="delete-item-btn" onClick={() => handleRemove(item.id)} title="Remove">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Add Available Crops */}
          {availableToAdd.length > 0 && (
            <div className="add-more-strip">
              <span className="add-label">{lang === 'en' ? '+ Add to basket:' : '+ තවත් එක් කරන්න:'}</span>
              <div className="add-chips">
                {availableToAdd.map((crop) => (
                  <button
                    key={crop.id}
                    className="add-chip-btn"
                    onClick={() => handleAddCrop(crop.id)}
                  >
                    <span>{crop.icon}</span>
                    <span>{crop.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Receipt Breakdown & Advice */}
        <div className="basket-summary-panel glass-panel">
          <div className="receipt-header">
            <Receipt size={18} className="text-emerald-400" />
            <h3 className="receipt-title">{lang === 'en' ? 'Estimated Invoice Breakdown' : 'මිල විස්තරය'}</h3>
          </div>

          <div className="receipt-lines">
            <div className="receipt-line">
              <span>Subtotal (Farmgate / Retail)</span>
              <span className="font-mono">Rs. {totalCost.toFixed(2)}</span>
            </div>
            <div className="receipt-line">
              <span>Macro Fuel Transport Index</span>
              <span className="font-mono">Rs. {(formData.diesel_price_weekly_actual / 20).toFixed(2)}</span>
            </div>
            <div className="receipt-line">
              <span>Target Week</span>
              <span className="font-mono font-bold text-emerald">{formData.weekText || 'Current'}</span>
            </div>
            <div className="receipt-line total">
              <span>Estimated Budget:</span>
              <span className="total-highlight">Rs. {totalCost.toFixed(2)}</span>
            </div>
          </div>

          <div className="budget-tip-box">
            <Sparkles size={16} className="text-amber-400" />
            <p>
              {lang === 'en'
                ? 'Tip: Low-country gourds and cucurbits currently offer lower price volatility compared to high-altitude crops.'
                : 'උපදෙස: උඩරට එළවළු වලට වඩා පහතරට එළවළු වල මිල උච්චාවචනය අඩු මට්ටමක පවතී.'}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .basket-view {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .basket-header {
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        .basket-badge {
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
        .basket-title {
          font-family: var(--font-heading);
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .basket-desc {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .basket-total-card {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.05) 100%);
          border: 1px solid rgba(52, 211, 153, 0.35);
          padding: 16px 24px;
          border-radius: var(--radius-md);
          text-align: center;
        }
        .total-label {
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 600;
          text-transform: uppercase;
        }
        .total-number {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 4px;
          margin: 4px 0;
        }
        .total-number .curr {
          font-size: 18px;
          color: var(--emerald-400);
          font-weight: 700;
        }
        .total-number .val {
          font-family: var(--font-heading);
          font-size: 34px;
          font-weight: 800;
          color: var(--text-primary);
        }
        .total-sub {
          font-size: 11px;
          color: var(--text-muted);
        }
        .basket-content-grid {
          display: grid;
          grid-template-columns: 2fr 1.2fr;
          gap: 20px;
        }
        @media (max-width: 900px) {
          .basket-content-grid {
            grid-template-columns: 1fr;
          }
        }
        .basket-items-panel, .basket-summary-panel {
          padding: 24px;
        }
        .panel-sub-title {
          font-family: var(--font-heading);
          font-size: 17px;
          font-weight: 700;
          margin-bottom: 16px;
          color: var(--text-primary);
        }
        .basket-items-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }
        .basket-item-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          padding: 12px 16px;
          border-radius: var(--radius-md);
          gap: 14px;
        }
        .item-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }
        .item-emoji {
          font-size: 26px;
        }
        .item-name-text {
          font-family: var(--font-heading);
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .item-unit-rate {
          font-size: 11px;
          color: var(--text-muted);
        }
        .item-qty-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-input);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-card);
        }
        .qty-btn {
          width: 24px;
          height: 24px;
          background: var(--bg-pill);
          border: none;
          border-radius: 4px;
          color: var(--text-primary);
          font-weight: 700;
          cursor: pointer;
        }
        .qty-val {
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 700;
          min-width: 45px;
          text-align: center;
        }
        .item-subtotal-col {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .subtotal-val {
          font-family: var(--font-mono);
          font-size: 15px;
          font-weight: 700;
          color: var(--emerald-400);
        }
        .delete-item-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: color 0.15s;
        }
        .delete-item-btn:hover {
          color: var(--rose-400);
        }
        .add-more-strip {
          border-top: 1px solid var(--border-subtle);
          padding-top: 14px;
        }
        .add-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 8px;
          display: block;
        }
        .add-chips {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .add-chip-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-pill);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .add-chip-btn:hover {
          background: var(--bg-card-hover);
          color: var(--text-primary);
          border-color: var(--emerald-500);
        }
        .receipt-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 10px;
        }
        .receipt-title {
          font-family: var(--font-heading);
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .receipt-lines {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        }
        .receipt-line {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: var(--text-secondary);
        }
        .receipt-line.total {
          border-top: 1px dashed var(--border-card);
          padding-top: 12px;
          margin-top: 4px;
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .total-highlight {
          font-family: var(--font-heading);
          font-size: 20px;
          color: var(--emerald-400);
        }
        .budget-tip-box {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: var(--bg-pill);
          border: 1px solid var(--border-subtle);
          padding: 12px 14px;
          border-radius: var(--radius-md);
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
};

export default BasketCalculator;

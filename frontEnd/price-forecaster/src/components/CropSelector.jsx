import React, { useState } from 'react';
import { Search, MapPin, Tag, Check } from 'lucide-react';
import { CROPS_DATA } from '../data/cropsData';

const CropSelector = ({ selectedCrop, onSelectCrop, regionFilter, setRegionFilter, lang }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCrops = CROPS_DATA.filter(crop => {
    const matchesRegion = regionFilter === 'all' || crop.region === regionFilter;
    const matchesSearch = 
      crop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      crop.name_si.includes(searchTerm) ||
      crop.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRegion && matchesSearch;
  });

  return (
    <div className="crop-selector-card glass-panel">
      <div className="selector-header">
        <div>
          <h3 className="selector-title">
            🌱 {lang === 'en' ? 'Select Vegetable Crop' : 'එළවළු වර්ගය තෝරන්න'}
          </h3>
          <p className="selector-desc">
            {lang === 'en' 
              ? 'Choose an Up-Country or Low-Country vegetable to run AI price forecast' 
              : 'පුරෝකථනය ලබා ගැනීමට අවශ්‍ය උඩරට හෝ පහතරට එළවළු වර්ගය තෝරන්න'}
          </p>
        </div>

        {/* Region Filter Buttons */}
        <div className="filter-button-group">
          <button 
            className={`filter-chip ${regionFilter === 'all' ? 'active' : ''}`}
            onClick={() => setRegionFilter('all')}
          >
            {lang === 'en' ? 'All Crops (9)' : 'සියල්ල (9)'}
          </button>
          <button 
            className={`filter-chip upcountry ${regionFilter === 'upcountry' ? 'active' : ''}`}
            onClick={() => setRegionFilter('upcountry')}
          >
            🏔️ {lang === 'en' ? 'Up-Country' : 'උඩරට'}
          </button>
          <button 
            className={`filter-chip lowcountry ${regionFilter === 'lowcountry' ? 'active' : ''}`}
            onClick={() => setRegionFilter('lowcountry')}
          >
            🌾 {lang === 'en' ? 'Low-Country' : 'පහතරට'}
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="search-bar-wrapper">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder={lang === 'en' ? 'Search vegetable by name or category (e.g. Carrot, බෝංචි, Legumes)...' : 'නම හෝ වර්ගය අනුව සොයන්න...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        {searchTerm && (
          <button className="clear-search-btn" onClick={() => setSearchTerm('')}>✕</button>
        )}
      </div>

      {/* Crops Grid */}
      <div className="crops-grid">
        {filteredCrops.map((crop) => {
          const isSelected = selectedCrop?.id === crop.id;
          return (
            <div
              key={crop.id}
              className={`crop-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectCrop(crop)}
              style={{
                '--crop-theme-color': crop.color
              }}
            >
              <div className="crop-card-top">
                <span className="crop-icon-large">{crop.icon}</span>
                <span className={`region-badge ${crop.region}`}>
                  {crop.region === 'upcountry' ? (lang === 'en' ? 'Up-Country' : 'උඩරට') : (lang === 'en' ? 'Low-Country' : 'පහතරට')}
                </span>
              </div>

              <div className="crop-info">
                <div className="crop-names">
                  <h4 className="crop-primary-name">{crop.name}</h4>
                  <span className="crop-sinhala-name">{crop.name_si}</span>
                </div>
                
                <div className="crop-meta-tags">
                  <span className="meta-tag">
                    <Tag size={11} /> {crop.category}
                  </span>
                  <span className="meta-tag districts">
                    <MapPin size={11} /> {crop.districts.slice(0, 2).join(', ')}
                  </span>
                </div>
              </div>

              {isSelected && (
                <div className="selection-checkmark">
                  <Check size={14} color="#ffffff" strokeWidth={3} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .crop-selector-card {
          padding: 24px;
          margin-bottom: 24px;
        }
        .selector-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .selector-title {
          font-family: var(--font-heading);
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
        }
        .selector-desc {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .filter-button-group {
          display: flex;
          gap: 8px;
          background: var(--bg-pill);
          padding: 4px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
        }
        .filter-chip {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .filter-chip.active {
          background: var(--bg-card);
          color: var(--text-primary);
          border: 1px solid var(--border-card);
          box-shadow: var(--shadow-sm);
        }
        .filter-chip.upcountry.active,
        .filter-chip.lowcountry.active {
          color: var(--text-primary);
          border-color: rgba(16, 185, 129, 0.4);
          background: var(--bg-card);
        }
        .search-bar-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          margin-bottom: 20px;
        }
        .search-icon {
          position: absolute;
          left: 14px;
          color: var(--text-muted);
          pointer-events: none;
        }
        .search-input {
          width: 100%;
          background: var(--bg-input);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-md);
          padding: 12px 40px 12px 42px;
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
          transition: all 0.2s;
        }
        .search-input:focus {
          border-color: var(--emerald-500);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
        }
        .clear-search-btn {
          position: absolute;
          right: 12px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 14px;
        }
        .crops-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
          gap: 14px;
        }
        .crop-card {
          position: relative;
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-md);
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }
        .crop-card:hover {
          transform: translateY(-2px);
          border-color: var(--border-glow);
          background: var(--bg-card-hover);
          box-shadow: var(--shadow-md);
        }
        .crop-card.selected {
          border-color: var(--emerald-500);
          background: var(--bg-card);
          box-shadow: 0 0 0 2px var(--emerald-500), 0 8px 24px -4px rgba(5, 150, 105, 0.16);
        }
        .crop-card.selected::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--emerald-500);
        }
        .crop-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .crop-icon-large {
          font-size: 32px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
        }
        .region-badge {
          font-size: 10.5px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: var(--radius-full);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: var(--bg-pill);
          color: var(--text-secondary);
          border: 1px solid var(--border-subtle);
        }
        .crop-names {
          margin-bottom: 8px;
        }
        .crop-primary-name {
          font-family: var(--font-heading);
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.2;
        }
        .crop-sinhala-name {
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 500;
          margin-left: 4px;
        }
        .crop-meta-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 10px;
        }
        .meta-tag {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--text-secondary);
          background: var(--bg-pill);
          padding: 3px 7px;
          border-radius: 4px;
          border: 1px solid var(--border-subtle);
        }
        .meta-tag.accuracy-tag {
          background: var(--bg-pill-active);
          color: var(--emerald-500);
          font-weight: 700;
          font-family: var(--font-mono);
          border: 1px solid rgba(5, 150, 105, 0.25);
        }
        .crop-price-range {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          border-top: 1px solid var(--border-subtle);
          padding-top: 8px;
          margin-top: 4px;
        }
        .range-label {
          color: var(--text-muted);
          font-size: 11px;
          white-space: nowrap;
        }
        .range-val.fluctuation-val {
          font-family: var(--font-mono);
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
        }
        .selection-checkmark {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--emerald-500);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(5, 150, 105, 0.35);
        }

        /* Light Theme Precision Overrides */
        [data-theme="light"] .crop-selector-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.06);
        }
        [data-theme="light"] .filter-button-group {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
        }
        [data-theme="light"] .filter-chip {
          color: #64748b;
        }
        [data-theme="light"] .filter-chip.active {
          background: #ffffff;
          color: #0f172a;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }
        [data-theme="light"] .search-input {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #0f172a;
        }
        [data-theme="light"] .search-input:focus {
          border-color: #059669;
          box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.12);
        }
        [data-theme="light"] .crop-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }
        [data-theme="light"] .crop-card:hover {
          background: #ffffff;
          border-color: #cbd5e1;
          box-shadow: 0 10px 25px -4px rgba(15, 23, 42, 0.08);
        }
        [data-theme="light"] .crop-card.selected {
          background: #ffffff;
          border-color: #059669;
          box-shadow: 0 0 0 2px #059669, 0 10px 24px -4px rgba(5, 150, 105, 0.15);
        }
        [data-theme="light"] .region-badge {
          background: #f1f5f9;
          color: #334155;
          border: 1px solid #e2e8f0;
        }
        [data-theme="light"] .meta-tag {
          background: #f8fafc;
          color: #475569;
          border: 1px solid #e2e8f0;
        }
        [data-theme="light"] .meta-tag.accuracy-tag {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }
      `}</style>
    </div>
  );
};

export default CropSelector;

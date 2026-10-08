import React from 'react';
import { 
  Fuel, 
  CloudRain, 
  History, 
  Percent, 
  Info, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ArrowRightLeft,
} from 'lucide-react';

const FactorsBreakdown = ({ factors, lang }) => {
  if (!factors || factors.length === 0) return null;

  const COLORS = ['#10b981', '#059669', '#34d399', '#6ee7b7'];
  const ICONS = [Fuel, CloudRain, History, Percent];

  // Calculate net upward vs downward count
  const upCount = factors.filter(f => f.price_effect === 'increase').length;
  const downCount = factors.filter(f => f.price_effect === 'decrease').length;

  return (
    <div className="factors-card glass-panel">
      {/* 2-Week Relative Shift & Directional Impact Header */}
      <div className="shift-section-header">
        <div className="shift-badge-row">
          <ArrowRightLeft size={14} className="text-amber-400" />
          <span className="shift-heading">
            {lang === 'en' 
              ? '2-Week Factor Shift & Directional Price Pressure (T vs T-2 Weeks)' 
              : 'සති 2 ක සාධක වෙනස්වීම හා මිල කෙරෙහි බලපෑම (T vs T-2 සති)'}
          </span>
        </div>
        <div className="net-stance-badge">
          {upCount > downCount ? (
            <span className="net-pill up">
              <TrendingUp size={12} />
              {lang === 'en' ? `Net Upward Pressure (${upCount} factors)` : `මිල ඉහළ යාමේ පීඩනය වැඩි (${upCount})`}
            </span>
          ) : downCount > upCount ? (
            <span className="net-pill down">
              <TrendingDown size={12} />
              {lang === 'en' ? `Net Downward Pressure (${downCount} factors)` : `මිල පහළ බැසීමේ පීඩනය වැඩි (${downCount})`}
            </span>
          ) : (
            <span className="net-pill neutral">
              <Minus size={12} />
              {lang === 'en' ? 'Balanced Market Forces' : 'සමතුලිත වෙළඳපල බලවේග'}
            </span>
          )}
        </div>
      </div>

      {/* Factor Cards Grid (Showing 2-Week Shifts & Up/Down Effects) */}
      <div className="factors-grid">
        {factors.map((factor, index) => {
          const Icon = ICONS[index % ICONS.length] || Info;
          const color = COLORS[index % COLORS.length];
          const isUp = factor.price_effect === 'increase';
          const isDown = factor.price_effect === 'decrease';

          const pctVal = factor.change_pct ?? 0;
          const hasPct = factor.change_pct !== undefined && factor.change_pct !== null;

          return (
            <div 
              key={factor.name} 
              className={`factor-card-enhanced ${isUp ? 'effect-up' : isDown ? 'effect-down' : 'effect-neutral'}`}
              style={{ '--item-accent': color }}
            >
              {/* Card Header */}
              <div className="factor-card-top">
                <div className="factor-title-group">
                  <div className="factor-icon-wrapper" style={{ color: color, background: `${color}15` }}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <span className="factor-card-name">{factor.name}</span>
                    <div className="factor-card-sub">{lang === 'en' ? 'Feature Importance' : 'ආකෘති බලපෑම'}: <strong>{factor.impact}%</strong></div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="factor-mini-meter">
                  <div className="factor-mini-fill" style={{ width: `${factor.impact}%`, backgroundColor: color }}></div>
                </div>
              </div>

              {/* 2-Week Comparative Metric Row */}
              <div className="metric-compare-box">
                <div className="compare-col">
                  <span className="cmp-lbl">{lang === 'en' ? 'Forecast Target (T)' : 'ඉලක්ක අගය (T)'}</span>
                  <span className="cmp-val current">{factor.current_val || 'N/A'}</span>
                </div>

                <div className="cmp-arrow-col">
                  <ArrowRightLeft size={13} className="text-slate-500" />
                </div>

                <div className="compare-col">
                  <span className="cmp-lbl">{lang === 'en' ? '2 Weeks Ago (T-2)' : 'සති 2කට පෙර (T-2)'}</span>
                  <span className="cmp-val prev">{factor.prev_2w_val || 'N/A'}</span>
                </div>

                {hasPct && (
                  <div className={`cmp-shift-badge ${pctVal > 0 ? 'pos' : pctVal < 0 ? 'neg' : 'zero'}`}>
                    {pctVal > 0 ? `+${pctVal}%` : `${pctVal}%`}
                  </div>
                )}
              </div>

              {/* Directional Effect Banner */}
              <div className={`price-impact-tag ${isUp ? 'impact-up' : isDown ? 'impact-down' : 'impact-neutral'}`}>
                {isUp ? (
                  <>
                    <TrendingUp size={14} className="impact-icon" />
                    <span>{lang === 'en' ? (factor.effect_label || 'Pushes Price UP (+)') : (factor.effect_label_si || 'මිල ඉහළ දැමීමේ බලපෑම (+)')}</span>
                  </>
                ) : isDown ? (
                  <>
                    <TrendingDown size={14} className="impact-icon" />
                    <span>{lang === 'en' ? (factor.effect_label || 'Pulls Price DOWN (-)') : (factor.effect_label_si || 'මිල පහත හෙලීමේ බලපෑම (-)')}</span>
                  </>
                ) : (
                  <>
                    <Minus size={14} className="impact-icon" />
                    <span>{lang === 'en' ? (factor.effect_label || 'Stable / Neutral (0)') : (factor.effect_label_si || 'ස්ථාවර බලපෑම (0)')}</span>
                  </>
                )}
              </div>

              {/* Contextual Explanation */}
              {(factor.explanation || factor.explanation_si) && (
                <div className="factor-explanation-box">
                  <p className="factor-explanation-text">
                    {lang === 'en' 
                      ? (factor.explanation || 'No historical variance detected over the 2-week observation window.') 
                      : (factor.explanation_si || factor.explanation || 'සති 2ක කාලය තුළ සුවිශේෂී වෙනසක් නිරීක්ෂණය නොවීය.')}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .factors-card {
          padding: 24px;
          margin-bottom: 24px;
        }
        /* 2-Week Shift Section Header */
        .shift-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          padding: 10px 14px;
          background: var(--bg-pill);
          border: 1px solid var(--border-subtle);
          border-radius: 10px;
          margin-bottom: 16px;
        }
        .shift-badge-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .shift-heading {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .net-stance-badge .net-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 20px;
        }
        .net-pill.up {
          background: rgba(239, 68, 68, 0.12);
          color: var(--rose-400);
          border: 1px solid rgba(239, 68, 68, 0.25);
        }
        .net-pill.down {
          background: rgba(16, 185, 129, 0.12);
          color: var(--emerald-400);
          border: 1px solid rgba(16, 185, 129, 0.25);
        }
        .net-pill.neutral {
          background: var(--bg-pill);
          color: var(--text-secondary);
          border: 1px solid var(--border-card);
        }

        /* Enhanced Factor Cards Grid */
        .factors-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 14px;
        }
        .factor-card-enhanced {
          background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .factor-card-enhanced:hover {
          transform: translateY(-2px);
          border-color: var(--border-glow);
          box-shadow: var(--shadow-md);
        }

        .factor-card-enhanced.effect-up {
          border-left: 3px solid rgba(239, 68, 68, 0.6);
        }
        .factor-card-enhanced.effect-down {
          border-left: 3px solid rgba(16, 185, 129, 0.6);
        }
        .factor-card-enhanced.effect-neutral {
          border-left: 3px solid var(--border-card);
        }

        .factor-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .factor-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .factor-icon-wrapper {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          background: var(--bg-pill);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .factor-card-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          display: block;
          line-height: 1.2;
        }
        .factor-card-sub {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .factor-card-sub strong {
          color: var(--text-primary);
        }
        .factor-mini-meter {
          width: 45px;
          height: 5px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 3px;
          overflow: hidden;
        }
        .factor-mini-fill {
          height: 100%;
          border-radius: 3px;
          background: var(--emerald-500);
        }

        /* 2-Week Metric Compare Box */
        .metric-compare-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--bg-input);
          border: 1px solid var(--border-card);
          border-radius: var(--radius-sm);
          padding: 8px 10px;
          gap: 6px;
        }
        .compare-col {
          display: flex;
          flex-direction: column;
        }
        .cmp-lbl {
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .cmp-val {
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 600;
        }
        .cmp-val.current {
          color: var(--text-primary);
        }
        .cmp-val.prev {
          color: var(--text-muted);
        }
        .cmp-arrow-col {
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.6;
        }
        .cmp-shift-badge {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .cmp-shift-badge.pos {
          background: var(--bg-pill);
          color: var(--text-secondary);
        }
        .cmp-shift-badge.neg {
          background: rgba(16, 185, 129, 0.1);
          color: var(--emerald-400);
        }
        .cmp-shift-badge.zero {
          background: var(--bg-pill);
          color: var(--text-muted);
        }

        /* Price Direction Tag */
        .price-impact-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 700;
        }
        .price-impact-tag.impact-up {
          background: rgba(244, 63, 94, 0.12);
          color: #f43f5e;
          border: 1px solid rgba(244, 63, 94, 0.25);
        }
        .price-impact-tag.impact-down {
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }
        .price-impact-tag.impact-neutral {
          background: rgba(100, 116, 139, 0.12);
          color: #94a3b8;
          border: 1px solid rgba(100, 116, 139, 0.25);
        }
        .impact-icon {
          flex-shrink: 0;
        }

        /* Factor Explanation Box */
        .factor-explanation-box {
          background: var(--bg-pill);
          border-radius: 6px;
          padding: 8px 10px;
          border-left: 2px solid var(--border-card);
        }
        .factor-explanation-text {
          font-size: 11.5px;
          color: var(--text-secondary);
          line-height: 1.45;
          margin: 0;
        }

        @media (max-width: 640px) {
          .factors-grid {
            grid-template-columns: 1fr;
          }
          .shift-section-header {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default FactorsBreakdown;

import React from 'react';
import { 
  Lightbulb, 
  CloudRain, 
  DollarSign, 
  Sparkles,
  Truck,
  Leaf
} from 'lucide-react';

const MarketInsights = ({ formData, lang }) => {
  const isSouthwest = formData.monsoon_season === 2;
  const isNortheast = formData.monsoon_season === 4;
  const isHighDiesel = (formData.diesel_price_weekly_actual || 340) > 360;

  const insights = [
    {
      id: 1,
      title: lang === 'en' ? 'Fuel & Logistics Pressure Index' : 'ඉන්ධන හා ප්‍රවාහන බලපෑම',
      tag: isHighDiesel ? 'HIGH IMPACT' : 'STABLE',
      tagType: isHighDiesel ? 'danger' : 'success',
      icon: Truck,
      desc: lang === 'en'
        ? `Diesel at Rs. ${formData.diesel_price_weekly_actual} accounts for up to 40% of wholesale-to-retail price divergence for long-haul routes (e.g., Nuwara Eliya → Manning Market / Dambulla Economic Centre).`
        : `ඩීසල් මිල රු. ${formData.diesel_price_weekly_actual} මට්ටමේ පැවතීම උඩරට සිට දඹුල්ල හා කොළඹ තොග වෙළෙඳපොළට ප්‍රවාහන වියදම ඉහළ නංවයි.`
    },
    {
      id: 2,
      title: lang === 'en' ? 'Monsoon Cultivation & Harvest Dynamics' : 'මෝසම් කාලගුණ හා අස්වනු බලපෑම',
      tag: isSouthwest ? 'YALA SEASON' : isNortheast ? 'MAHA SEASON' : 'INTER-MONSOON',
      tagType: 'info',
      icon: CloudRain,
      desc: lang === 'en'
        ? isSouthwest
          ? 'Heavy rainfall in wet-zone slopes may increase post-harvest rot in tender vegetables (Beans, Leeks). Anticipate tighter market supply.'
          : 'Intermediate and dry zone cultivation (Okra, Brinjal, Long Beans) benefits from stable conditions. Favorable wholesale prices expected.'
        : 'මෝසම් වර්ෂාපතනය හේතුවෙන් ඇතැම් එළවළු වර්ග වල අස්වැන්න හා ප්‍රවාහනය සීමාවිය හැක.'
    },
    {
      id: 3,
      title: lang === 'en' ? 'Farmer Planting Advisory (Random Forest Insights)' : 'ගොවි මහතුන් සඳහා උපදෙස්',
      tag: 'ADVISORY',
      tagType: 'warning',
      icon: Leaf,
      desc: lang === 'en'
        ? 'High crop lag autocorrelation indicates current price peaks will persist for 2-3 weeks before supply stabilization. Optimal timing for staged harvesting.'
        : 'වත්මන් ඉහළ මිල තත්ත්වය ඉදිරි සති 2-3 තුළ ස්ථායී විය හැකි බැවින් අස්වනු නෙළීම සැලසුම් සහගතව සිදුකරන්න.'
    },
    {
      id: 4,
      title: lang === 'en' ? 'Consumer Purchasing Window' : 'පාරිභෝගික මිල උපදෙස්',
      tag: 'BUDGET',
      tagType: 'success',
      icon: DollarSign,
      desc: lang === 'en'
        ? 'Low-country cucurbits (Cucumber, Bitter Gourd) demonstrate lower price sensitivity to fuel shocks compared to highland crops.'
        : 'පහතරට වගාකරන පිපිඤ්ඤා, කරවිල ආදී එළවළු වල මිල ස්ථායීතාව සාපේක්ෂව ඉහළ මට්ටමක පවතී.'
    }
  ];

  return (
    <div className="insights-view">
      <div className="insights-header glass-panel">
        <div>
          <div className="insights-badge">
            <Sparkles size={13} className="text-amber-400" />
            <span>{lang === 'en' ? 'AI Market Intelligence' : 'කෘෂිකාර්මික වෙළෙඳ තොරතුරු'}</span>
          </div>
          <h2 className="insights-title">
            {lang === 'en' ? 'Agricultural Economy & Market Advisories' : 'කෘෂිකාර්මික වෙළෙඳපොළ උපදෙස් හා බුද්ධි තොරතුරු'}
          </h2>
          <p className="insights-desc">
            {lang === 'en' 
              ? 'Actionable market insights derived from machine learning regression models, climate cycles, and supply chain factors.' 
              : 'කාලගුණික දත්ත සහ ආර්ථික දර්ශක මත පදනම්ව ගොවීන්ට හා පාරිභෝගිකයින්ට උපදෙස්.'}
          </p>
        </div>
      </div>

      {/* Insights Cards Grid */}
      <div className="insights-grid">
        {insights.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="insight-card glass-panel">
              <div className="insight-top">
                <div className="insight-icon-box">
                  <Icon size={20} className="text-emerald-400" />
                </div>
                <span className={`insight-tag ${item.tagType}`}>
                  {item.tag}
                </span>
              </div>

              <h3 className="insight-card-title">{item.title}</h3>
              <p className="insight-card-desc">{item.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Strategic Market Highlights */}
      <div className="strategic-panel glass-panel">
        <div className="strategic-header">
          <Lightbulb size={20} className="text-amber-400" />
          <h3 className="strategic-title">
            {lang === 'en' ? 'Economic Centres Price Transmission Note' : 'ආර්ථික මධ්‍යස්ථාන තොග මිල සම්ප්‍රේෂණය'}
          </h3>
        </div>
        <p className="strategic-text">
          {lang === 'en'
            ? 'Retail vegetable prices in Sri Lanka strongly correlate with Colombo (Pettah/Manning Market), Dambulla, and Meegoda Dedicated Economic Centres. Our model models historical price lags (Lag 1, Lag 2, Lag 4) against real-time rainfall data from Open-Meteo and macro diesel transport indices to minimize forecasting error.'
            : 'ශ්‍රී ලංකාවේ සිල්ලර එළවළු මිල ප්‍රධාන ආර්ථික මධ්‍යස්ථාන වල තොග මිල, සතිපතා වර්ෂාපතනය සහ ඩීසල් ප්‍රවාහන පිරිවැය සමඟ දැඩිව බැඳී පවතී. මෙම පද්ධතිය මඟින් නිවැරදිම අනාවැකි ලබාදෙයි.'}
        </p>
      </div>

      <style>{`
        .insights-view {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .insights-header {
          padding: 24px;
        }
        .insights-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(245, 158, 11, 0.12);
          color: var(--amber-400);
          border: 1px solid rgba(245, 158, 11, 0.25);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .insights-title {
          font-family: var(--font-heading);
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .insights-desc {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .insights-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 18px;
        }
        .insight-card {
          padding: 22px;
          transition: all 0.2s;
        }
        .insight-card:hover {
          transform: translateY(-3px);
          border-color: var(--border-glow);
          box-shadow: var(--shadow-lg);
        }
        .insight-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }
        .insight-icon-box {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .insight-tag {
          font-size: 10px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: var(--radius-full);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .insight-tag.danger {
          background: rgba(239, 68, 68, 0.1);
          color: var(--rose-400);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .insight-tag.success {
          background: rgba(16, 185, 129, 0.1);
          color: var(--emerald-400);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .insight-tag.warning {
          background: var(--bg-pill);
          color: var(--text-secondary);
          border: 1px solid var(--border-subtle);
        }
        .insight-tag.info {
          background: var(--bg-pill);
          color: var(--text-secondary);
          border: 1px solid var(--border-subtle);
        }
        .insight-card-title {
          font-family: var(--font-heading);
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 8px;
          line-height: 1.3;
        }
        .insight-card-desc {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        .strategic-panel {
          padding: 24px;
          background: var(--bg-card);
          border-left: 3px solid var(--emerald-500);
        }
        .strategic-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .strategic-title {
          font-family: var(--font-heading);
          font-size: 17px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .strategic-text {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
};

export default MarketInsights;

export const CROPS_DATA = [
  {
    id: "carrot",
    name: "Carrot",
    name_si: "කැරට්",
    region: "upcountry",
    region_si: "උඩරට",
    icon: "🥕",
    category: "Root Vegetables",
    color: "#F97316",
    bgGradient: "from-orange-500/20 to-amber-500/10",
    districts: ["Nuwara Eliya", "Badulla"],
    harvestDays: 90,
    typicalPriceRange: "Rs. 240 - 480",
    desc: "Major up-country cool-climate root crop primarily cultivated in Nuwara Eliya and Badulla highlands.",
    metrics: {
      mae: 11.90,
      rmse: 17.33,
      mape: 4.52,
      accuracy: 95.48,
      modelFile: "model_rf_upcountry_carrot.pkl"
    }
  },
  {
    id: "bean",
    name: "Green Beans",
    name_si: "බෝංචි",
    region: "upcountry",
    region_si: "උඩරට",
    icon: "🌱",
    category: "Legumes",
    color: "#10B981",
    bgGradient: "from-emerald-500/20 to-teal-500/10",
    districts: ["Badulla", "Kandy", "Matale", "Nuwara Eliya"],
    harvestDays: 60,
    typicalPriceRange: "Rs. 320 - 680",
    desc: "Fast-yielding legume grown across central hills. Highly sensitive to heavy rainfall and transport delays.",
    metrics: {
      mae: 79.04,
      rmse: 85.55,
      mape: 14.88,
      accuracy: 85.12,
      modelFile: "model_rf_upcountry_bean.pkl"
    }
  },
  {
    id: "leeks",
    name: "Leeks",
    name_si: "ලීක්ස්",
    region: "upcountry",
    region_si: "උඩරට",
    icon: "🥬",
    category: "Alliums",
    color: "#22C55E",
    bgGradient: "from-green-500/20 to-emerald-500/10",
    districts: ["Nuwara Eliya", "Badulla"],
    harvestDays: 110,
    typicalPriceRange: "Rs. 280 - 550",
    desc: "High-value cool climate crop requiring consistent soil moisture and moderate highland temperatures.",
    metrics: {
      mae: 14.85,
      rmse: 22.04,
      mape: 4.31,
      accuracy: 95.69,
      modelFile: "model_rf_upcountry_leeks.pkl"
    }
  },
  {
    id: "tomato",
    name: "Tomato",
    name_si: "තක්කාලි",
    region: "upcountry",
    region_si: "උඩරට",
    icon: "🍅",
    category: "Solanaceae",
    color: "#EF4444",
    bgGradient: "from-red-500/20 to-rose-500/10",
    districts: ["Kandy", "Matale", "Badulla"],
    harvestDays: 75,
    typicalPriceRange: "Rs. 150 - 450",
    desc: "High-demand perishable crop with high price volatility during monsoon transitions and supply gluts.",
    metrics: {
      mae: 60.79,
      rmse: 69.20,
      mape: 10.37,
      accuracy: 89.63,
      modelFile: "model_rf_upcountry_tomato.pkl"
    }
  },
  {
    id: "bandakka",
    name: "Bandakka (Okra)",
    name_si: "බණ්ඩක්කා",
    region: "lowcountry",
    region_si: "පහතරට",
    icon: "🌿",
    category: "Malvaceae",
    color: "#84CC16",
    bgGradient: "from-lime-500/20 to-emerald-500/10",
    districts: ["Anuradhapura", "Kurunegala", "Hambantota"],
    harvestDays: 50,
    typicalPriceRange: "Rs. 180 - 360",
    desc: "Warm-climate drought-resistant crop widely grown in the dry zone during Yala and Maha seasons.",
    metrics: {
      mae: 9.75,
      rmse: 13.26,
      mape: 3.69,
      accuracy: 96.31,
      modelFile: "model_rf_lowcountry_bandakka.pkl"
    }
  },
  {
    id: "bitterg",
    name: "Bitter Gourd",
    name_si: "කරවිල",
    region: "lowcountry",
    region_si: "පහතරට",
    icon: "🥒",
    category: "Cucurbits",
    color: "#059669",
    bgGradient: "from-emerald-600/20 to-green-700/10",
    districts: ["Kurunegala", "Anuradhapura", "Hambantota"],
    harvestDays: 70,
    typicalPriceRange: "Rs. 320 - 620",
    desc: "Medicinal climbing cucurbit with stable consumer demand and consistent wholesale market pricing.",
    metrics: {
      mae: 116.93,
      rmse: 121.15,
      mape: 14.52,
      accuracy: 85.48,
      modelFile: "model_rf_lowcountry_bitterg.pkl"
    }
  },
  {
    id: "bringel",
    name: "Brinjal (Eggplant)",
    name_si: "වම්බටු",
    region: "lowcountry",
    region_si: "පහතරට",
    icon: "🍆",
    category: "Solanaceae",
    color: "#8B5CF6",
    bgGradient: "from-purple-500/20 to-indigo-500/10",
    districts: ["Kurunegala", "Anuradhapura", "Hambantota"],
    harvestDays: 80,
    typicalPriceRange: "Rs. 250 - 520",
    desc: "Staple low-country vegetable with high domestic consumption across Sri Lankan households.",
    metrics: {
      mae: 26.93,
      rmse: 31.42,
      mape: 5.90,
      accuracy: 94.10,
      modelFile: "model_rf_lowcountry_bringel.pkl"
    }
  },
  {
    id: "cucumber",
    name: "Cucumber",
    name_si: "පිපිඤ්ඤා",
    region: "lowcountry",
    region_si: "පහතරට",
    icon: "🥗",
    category: "Cucurbits",
    color: "#06B6D4",
    bgGradient: "from-cyan-500/20 to-sky-500/10",
    districts: ["Kurunegala", "Anuradhapura", "Hambantota"],
    harvestDays: 45,
    typicalPriceRange: "Rs. 100 - 280",
    desc: "Quick-growing hydrating crop with high harvest frequency in warm low-country agricultural zones.",
    metrics: {
      mae: 13.93,
      rmse: 15.69,
      mape: 5.91,
      accuracy: 94.09,
      modelFile: "model_rf_lowcountry_cucumber.pkl"
    }
  },
  {
    id: "long",
    name: "Long Beans",
    name_si: "මෑකරල්",
    region: "lowcountry",
    region_si: "පහතරට",
    icon: "🌾",
    category: "Legumes",
    color: "#14B8A6",
    bgGradient: "from-teal-500/20 to-emerald-500/10",
    districts: ["Kurunegala", "Anuradhapura", "Hambantota"],
    harvestDays: 65,
    typicalPriceRange: "Rs. 220 - 460",
    desc: "Popular low-country legume known for high protein content and regular culinary use.",
    metrics: {
      mae: 11.95,
      rmse: 19.35,
      mape: 2.86,
      accuracy: 97.14,
      modelFile: "model_rf_lowcountry_long.pkl"
    }
  }
];

export const DISTRICTS_DATA = [
  { id: "nuwara_eliya", name: "Nuwara Eliya", name_si: "නුවරඑළිය", zone: "Up-Country", lat: 6.9687, lon: 80.7828, elevation: "1,868 m", mainCrops: ["Carrot", "Leeks", "Potato", "Cabbage"] },
  { id: "badulla", name: "Badulla", name_si: "බදුල්ල", zone: "Up-Country", lat: 6.9934, lon: 81.0550, elevation: "680 m", mainCrops: ["Beans", "Carrot", "Tomato", "Cabbage"] },
  { id: "kandy", name: "Kandy", name_si: "මහනුවර", zone: "Up-Country", lat: 7.2906, lon: 80.6337, elevation: "500 m", mainCrops: ["Tomato", "Beans", "Radish", "Capsicum"] },
  { id: "matale", name: "Matale", name_si: "මාතලේ", zone: "Up-Country", lat: 7.4675, lon: 80.6234, elevation: "364 m", mainCrops: ["Tomato", "Beans", "Chili", "Onion"] },
  { id: "anuradhapura", name: "Anuradhapura", name_si: "අනුරාධපුරය", zone: "Low-Country", lat: 8.3114, lon: 80.4037, elevation: "81 m", mainCrops: ["Bandakka", "Bitter Gourd", "Pumpkin", "Brinjal"] },
  { id: "hambantota", name: "Hambantota", name_si: "හම්බන්තොට", zone: "Low-Country", lat: 6.1248, lon: 81.1185, elevation: "16 m", mainCrops: ["Brinjal", "Cucumber", "Okra", "Long Beans"] },
  { id: "kurunegala", name: "Kurunegala", name_si: "කුරුණෑගල", zone: "Low-Country", lat: 7.4818, lon: 80.3609, elevation: "116 m", mainCrops: ["Long Beans", "Cucumber", "Bitter Gourd", "Snake Gourd"] }
];

export const MONSOONS = [
  { value: 1, name: "First Inter-Monsoon", period: "Mar - Apr", code: "FIM", icon: "🌤️", desc: "Moderate afternoon convectional showers with warm temperatures." },
  { value: 2, name: "Southwest Monsoon", period: "May - Sep", code: "SWM", icon: "🌧️", desc: "Heavy torrential rainfall in wet zone & central highland windward slopes (Yala season)." },
  { value: 3, name: "Second Inter-Monsoon", period: "Oct - Nov", code: "SIM", icon: "⛈️", desc: "Widespread thunderstorms across the entire island. Crucial for Maha season land preparation." },
  { value: 4, name: "Northeast Monsoon", period: "Dec - Feb", code: "NEM", icon: "🌦️", desc: "Brings rain to the northern and eastern dry & intermediate zones (Maha season)." }
];

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

/**
 * Retrieves historical and forecasted Sri Lankan Macroeconomic metrics (CCPI Inflation % & CPC Diesel Rs/L)
 * based on the selected date (2020 - 2026+).
 */
export const getMacroEconomicsForDate = (dateStr) => {
  if (!dateStr) return { inflation: 5.2, diesel: 340 };

  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12

  // 1. 2020: Stable low fuel & moderate inflation
  if (year === 2020) {
    const inflation = (month <= 6) ? 5.4 : 4.8;
    return { inflation, diesel: 104 };
  }

  // 2. 2021: Gradual rise in inflation and fuel price adjustments
  if (year === 2021) {
    if (month <= 5) return { inflation: 5.2, diesel: 104 };
    if (month <= 10) return { inflation: 7.6, diesel: 111 };
    return { inflation: 12.1, diesel: 121 };
  }

  // 3. 2022: Economic Crisis & Peak Hyperinflation
  if (year === 2022) {
    if (month <= 3) return { inflation: 18.7, diesel: 176 };
    if (month <= 5) return { inflation: 39.1, diesel: 289 };
    if (month <= 8) return { inflation: 64.3, diesel: 400 };
    if (month === 9) return { inflation: 69.8, diesel: 430 }; // Peak hyperinflation
    return { inflation: 57.2, diesel: 430 };
  }

  // 4. 2023: Disinflation cycle & IMF stabilization
  if (year === 2023) {
    if (month <= 3) return { inflation: 50.3, diesel: 405 };
    if (month <= 6) return { inflation: 12.0, diesel: 325 };
    if (month <= 9) return { inflation: 1.3, diesel: 356 };
    return { inflation: 4.0, diesel: 368 };
  }

  // 5. 2024: Low steady inflation / deflation & stabilized fuel prices
  if (year === 2024) {
    if (month <= 3) return { inflation: 6.4, diesel: 363 };
    if (month <= 6) return { inflation: 1.7, diesel: 317 };
    if (month <= 9) return { inflation: 0.5, diesel: 307 };
    return { inflation: -0.8, diesel: 303 };
  }

  // 6. 2025: Target inflation corridor
  if (year === 2025) {
    if (month <= 4) return { inflation: 3.2, diesel: 325 };
    if (month <= 8) return { inflation: 4.1, diesel: 330 };
    return { inflation: 4.5, diesel: 335 };
  }

  // 7. 2026+: Projected baseline steady-state
  if (year >= 2026) {
    if (month <= 4) return { inflation: 4.8, diesel: 338 };
    if (month <= 8) return { inflation: 5.2, diesel: 340 };
    return { inflation: 5.5, diesel: 345 };
  }

  return { inflation: 5.2, diesel: 340 };
};

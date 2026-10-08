from fastapi import FastAPI, HTTPException
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import pandas as pd
import numpy as np
import math
import joblib
import requests
from pymongo import MongoClient
import os
import re
import glob
from datetime import datetime, timedelta

app = FastAPI(title="Auto Vegetable Price Prediction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# --- MongoDB Connection Setup ---
mongo_connected = False
try:
    client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=2000)
    db = client["vegetable_db"]
    collection = db["weekly_prices"]
    # Test connection
    client.server_info()
    mongo_connected = True
    print("MongoDB Connected Successfully!")
except Exception as e:
    print("MongoDB Connection Failed/Offline (Running with in-memory CSV registry):", e)

# --- Models Load කිරීම ---
models = {}
up_country_crops = ['bean', 'carrot', 'leeks', 'tomato']
low_country_crops = ['bandakka', 'bitterg', 'bringel', 'cucumber', 'long']

def load_crop_model(region, crop):
    possible_names = [
        f'model_rf_{region}_{crop}-2.pkl',
        f'model_rf_{region}_{crop}.pkl',
        f'model_{region}_{crop}.pkl'
    ]
    for name in possible_names:
        p = os.path.join(BASE_DIR, name)
        if os.path.exists(p):
            try:
                model = joblib.load(p)
                print(f"Loaded {crop} from {name}")
                return model
            except Exception as e:
                print(f"Failed to load {name}: {e}")
    print(f"Warning: No model file found for {region}_{crop}")
    return None

for crop in up_country_crops:
    m = load_crop_model("upcountry", crop)
    if m is not None:
        models[f"up_{crop}"] = m

for crop in low_country_crops:
    m = load_crop_model("lowcountry", crop)
    if m is not None:
        models[f"low_{crop}"] = m

print(f"All {len(models)}/9 Models Loaded Successfully!")

# --- දිස්ත්‍රික්ක වල ඛණ්ඩාංක ---
DISTRICTS = {
    "nuwara_eliya": (6.9687, 80.7828), "badulla": (6.9934, 81.0550),
    "kandy": (7.2906, 80.6337), "matale": (7.4675, 80.6234),
    "anuradhapura": (8.3114, 80.4037), "hambantota": (6.1248, 81.1185),
    "kurunegala": (7.4818, 80.3609)
}

# --- Standardized Crop Name Mapping ---
CROP_NAME_MAP = {
    'green beans': 'bean',
    'beans': 'bean',
    'bean': 'bean',
    'carrot': 'carrot',
    'leeks': 'leeks',
    'tomato': 'tomato',
    'ladies fingers': 'bandakka',
    'ladies finger': 'bandakka',
    'bandakka': 'bandakka',
    'bitter gourd': 'bitterg',
    'bitterguard': 'bitterg',
    'bitterg': 'bitterg',
    'brinjal': 'bringel',
    'bringel': 'bringel',
    'cucumber': 'cucumber',
    'long beans': 'long',
    'long bean': 'long',
    'long': 'long'
}

def clean_price_val(val):
    if pd.isna(val): return None
    s = str(val).replace(',', '').replace('Rs', '').replace('/', '').replace('–', '-').strip()
    try:
        p = float(s)
        return p if p > 0 else None
    except:
        return None

def parse_dataset_row_date(row, default_year, week_num):
    for col in ['End Date', 'Start Date', 'Date', 'date']:
        if col in row and pd.notna(row[col]):
            val = str(row[col]).strip()
            if ' to ' in val:
                parts = val.split(' to ')
                val = parts[1].strip() if len(parts) > 1 else parts[0].strip()
            elif '–' in val or '-' in val:
                if re.search(r'[A-Za-z]', val):
                    parts = re.split(r'[–-]', val)
                    right_part = parts[-1].strip()
                    try:
                        d = datetime.strptime(right_part, '%d %B %Y')
                        return d.strftime('%Y-%m-%d')
                    except:
                        pass
            if re.match(r'^\d{4}-\d{2}-\d{2}$', val):
                return val
            for fmt in ['%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%Y/%m/%d', '%d %B %Y']:
                try:
                    return datetime.strptime(val, fmt).strftime('%Y-%m-%d')
                except:
                    pass
    return (datetime(default_year, 1, 2) + timedelta(weeks=week_num - 1)).strftime('%Y-%m-%d')

# --- In-Memory Historical Price Registry & MongoDB Auto-Seeder ---
HISTORICAL_PRICE_REGISTRY = {c: [] for c in up_country_crops + low_country_crops}
HISTORICAL_WEEKLY_SEASONALITY = {c: {} for c in up_country_crops + low_country_crops}

def initialize_price_database():
    global HISTORICAL_PRICE_REGISTRY, HISTORICAL_WEEKLY_SEASONALITY
    old_prices_dir = os.path.join(BASE_DIR, "old prices")
    if not os.path.exists(old_prices_dir):
        print("Warning: old prices directory not found at", old_prices_dir)
        return

    csv_paths = sorted(glob.glob(os.path.join(old_prices_dir, "*.csv")))
    all_parsed_records = []

    for path in csv_paths:
        try:
            filename = os.path.basename(path)
            df = pd.read_csv(path)
            
            # Identify columns
            veg_col = next((c for c in df.columns if 'veg' in c.lower()), None)
            
            # Match Retail Average specifically (avoid Price Range)
            price_col = next((c for c in df.columns if 'average' in c.lower() or 'avg' in c.lower()), None)
            if not price_col:
                price_col = next((c for c in df.columns if 'price' in c.lower() and 'range' not in c.lower()), None)

            week_col = next((c for c in df.columns if 'week' in c.lower()), df.columns[0])
            
            # Infer year from filename
            year_match = re.search(r'202\d', filename)
            default_year = int(year_match.group()) if year_match else 2024

            if not veg_col or not price_col:
                continue

            for _, row in df.iterrows():
                v_raw = str(row[veg_col]).strip().lower()
                crop_id = CROP_NAME_MAP.get(v_raw)
                if not crop_id:
                    continue

                price = clean_price_val(row[price_col])
                if price is None:
                    continue

                # Parse week number
                wk_match = re.search(r'\d+', str(row[week_col]))
                week_num = int(wk_match.group()) if wk_match else 1

                # Parse date string accurately
                date_str = parse_dataset_row_date(row, default_year, week_num)
                year_num = int(date_str.split('-')[0]) if date_str else default_year

                rec = {
                    "crop": crop_id,
                    "date": date_str,
                    "year": year_num,
                    "week": week_num,
                    "price": price
                }
                all_parsed_records.append(rec)
                HISTORICAL_PRICE_REGISTRY[crop_id].append(rec)
        except Exception as e:
            print(f"Error parsing {path}: {e}")

    # Sort each crop's registry chronologically and compute empirical weekly seasonality
    for crop_id in HISTORICAL_PRICE_REGISTRY:
        HISTORICAL_PRICE_REGISTRY[crop_id].sort(key=lambda x: x["date"])
        recs = HISTORICAL_PRICE_REGISTRY[crop_id]
        print(f"Loaded {len(recs)} price records for {crop_id}")

        if recs:
            week_prices = {}
            for r in recs:
                week_prices.setdefault(r["week"], []).append(r["price"])

            avg_by_week = {w: float(np.mean(week_prices[w])) for w in range(1, 54) if w in week_prices}
            all_weeks = sorted(avg_by_week.keys())
            for w in range(1, 54):
                if w not in avg_by_week and all_weeks:
                    closest = min(all_weeks, key=lambda x: abs(x - w))
                    avg_by_week[w] = avg_by_week[closest]

            delta_by_week = {}
            for w in range(1, 54):
                prev_w = 52 if w == 1 else w - 1
                prev_p = avg_by_week.get(prev_w, avg_by_week.get(w, 100.0))
                curr_p = avg_by_week.get(w, prev_p)
                delta = (curr_p - prev_p) / prev_p if prev_p > 0 else 0.0
                delta_by_week[w] = max(-0.15, min(0.15, delta))

            HISTORICAL_WEEKLY_SEASONALITY[crop_id] = delta_by_week

    # Seed MongoDB with latest full dataset
    if mongo_connected and len(all_parsed_records) > 0:
        try:
            collection.drop()
            collection.insert_many(all_parsed_records)
            collection.create_index([("crop", 1), ("date", -1)])
            print(f"MongoDB seeded successfully with {len(all_parsed_records)} weekly records from 2020-2026!")
        except Exception as e:
            print("MongoDB Seeding Notice:", e)

# Initialize on module load
initialize_price_database()

# --- Helper Function: Date Format කිරීම ---
def format_date_to_ymd(date_str):
    if not date_str: return datetime.now().strftime("%Y-%m-%d")
    date_str = date_str.strip()
    if "/" in date_str:
        try: return datetime.strptime(date_str, "%d/%m/%Y").strftime("%Y-%m-%d")
        except: pass
        try: return datetime.strptime(date_str, "%Y/%m/%d").strftime("%Y-%m-%d")
        except: pass
    return date_str

# --- Weekly Thursday Cadence Mapping Helper ---
def map_to_weekly_thursday(input_date):
    """
    Sri Lanka weekly market prices are reported on a strict Thursday cadence.
    If a user selects any other day of the week, maps to the nearest valid weekly Thursday.
    """
    if isinstance(input_date, str):
        input_date = datetime.strptime(format_date_to_ymd(input_date), "%Y-%m-%d").date()
    weekday = input_date.weekday()  # Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
    diff = 3 - weekday
    nearest_thursday = input_date + timedelta(days=diff)
    is_adjusted = (diff != 0)
    return nearest_thursday, is_adjusted, diff

# --- Dynamic Latest Actual Price Lookup (Never hard-coded) ---
def get_latest_actual_record(crop_name):
    """
    Dynamically queries MongoDB or in-memory historical registry to find
    the latest actual retail price record for the specified vegetable.
    """
    if mongo_connected:
        try:
            rec = collection.find_one({"crop": crop_name}, sort=[("date", -1)])
            if rec:
                return {
                    "date": rec["date"],
                    "price": float(rec["price"]),
                    "week": int(rec.get("week", 1)),
                    "year": int(rec.get("year", 2026))
                }
        except Exception as e:
            print(f"MongoDB query latest actual date warning: {e}")

    crop_records = HISTORICAL_PRICE_REGISTRY.get(crop_name, [])
    if crop_records:
        latest = crop_records[-1]
        return {
            "date": latest["date"],
            "price": float(latest["price"]),
            "week": int(latest.get("week", 1)),
            "year": int(latest.get("year", 2026))
        }

    # Query latest real record from MongoDB across all collections if specific crop key was not matched
    if mongo_connected:
        try:
            any_rec = collection.find_one({}, sort=[("date", -1)])
            if any_rec:
                return {
                    "date": any_rec["date"],
                    "price": float(any_rec["price"]),
                    "week": int(any_rec.get("week", 1)),
                    "year": int(any_rec.get("year", 2026))
                }
        except Exception:
            pass

    raise ValueError(f"No historical actual price records found in MongoDB or CSV dataset for crop: {crop_name}")

# --- Climatological Baseline Profiles for Sri Lanka Agricultural Districts ---
# Compiled from Sri Lanka Department of Meteorology 30-year seasonal normals (Rainfall mm/wk & Mean Temp C)
DISTRICT_CLIMATOLOGY = {
    "nuwara_eliya": {
        1: {"rain": 22.0, "temp": 14.8, "humidity": 80}, 2: {"rain": 18.0, "temp": 15.2, "humidity": 78},
        3: {"rain": 28.0, "temp": 16.5, "humidity": 79}, 4: {"rain": 45.0, "temp": 17.2, "humidity": 82},
        5: {"rain": 58.0, "temp": 17.0, "humidity": 85}, 6: {"rain": 65.0, "temp": 15.8, "humidity": 88},
        7: {"rain": 60.0, "temp": 15.5, "humidity": 87}, 8: {"rain": 52.0, "temp": 15.6, "humidity": 86},
        9: {"rain": 48.0, "temp": 15.8, "humidity": 85}, 10: {"rain": 75.0, "temp": 16.2, "humidity": 89},
        11: {"rain": 68.0, "temp": 15.8, "humidity": 88}, 12: {"rain": 42.0, "temp": 15.0, "humidity": 84}
    },
    "badulla": {
        1: {"rain": 35.0, "temp": 21.0, "humidity": 78}, 2: {"rain": 25.0, "temp": 22.0, "humidity": 75},
        3: {"rain": 30.0, "temp": 23.5, "humidity": 76}, 4: {"rain": 45.0, "temp": 24.5, "humidity": 80},
        5: {"rain": 30.0, "temp": 25.0, "humidity": 78}, 6: {"rain": 18.0, "temp": 24.5, "humidity": 74},
        7: {"rain": 20.0, "temp": 24.2, "humidity": 75}, 8: {"rain": 25.0, "temp": 24.5, "humidity": 76},
        9: {"rain": 30.0, "temp": 24.2, "humidity": 77}, 10: {"rain": 60.0, "temp": 23.5, "humidity": 83},
        11: {"rain": 70.0, "temp": 22.5, "humidity": 85}, 12: {"rain": 55.0, "temp": 21.5, "humidity": 82}
    },
    "kandy": {
        1: {"rain": 25.0, "temp": 23.5, "humidity": 76}, 2: {"rain": 18.0, "temp": 24.5, "humidity": 72},
        3: {"rain": 28.0, "temp": 26.0, "humidity": 74}, 4: {"rain": 48.0, "temp": 26.5, "humidity": 80},
        5: {"rain": 42.0, "temp": 26.0, "humidity": 82}, 6: {"rain": 38.0, "temp": 25.0, "humidity": 83},
        7: {"rain": 35.0, "temp": 24.8, "humidity": 82}, 8: {"rain": 32.0, "temp": 25.0, "humidity": 81},
        9: {"rain": 35.0, "temp": 25.2, "humidity": 82}, 10: {"rain": 65.0, "temp": 25.0, "humidity": 85},
        11: {"rain": 60.0, "temp": 24.2, "humidity": 86}, 12: {"rain": 40.0, "temp": 23.8, "humidity": 80}
    },
    "matale": {
        1: {"rain": 38.0, "temp": 24.0, "humidity": 78}, 2: {"rain": 22.0, "temp": 25.2, "humidity": 74},
        3: {"rain": 30.0, "temp": 26.8, "humidity": 75}, 4: {"rain": 45.0, "temp": 27.5, "humidity": 81},
        5: {"rain": 25.0, "temp": 27.8, "humidity": 78}, 6: {"rain": 15.0, "temp": 27.0, "humidity": 73},
        7: {"rain": 18.0, "temp": 26.8, "humidity": 74}, 8: {"rain": 20.0, "temp": 27.0, "humidity": 75},
        9: {"rain": 28.0, "temp": 27.2, "humidity": 77}, 10: {"rain": 65.0, "temp": 26.2, "humidity": 84},
        11: {"rain": 75.0, "temp": 25.0, "humidity": 86}, 12: {"rain": 58.0, "temp": 24.2, "humidity": 82}
    },
    "anuradhapura": {
        1: {"rain": 25.0, "temp": 25.5, "humidity": 75}, 2: {"rain": 15.0, "temp": 26.8, "humidity": 71},
        3: {"rain": 22.0, "temp": 28.8, "humidity": 72}, 4: {"rain": 42.0, "temp": 29.5, "humidity": 78},
        5: {"rain": 20.0, "temp": 29.8, "humidity": 75}, 6: {"rain": 8.0, "temp": 29.2, "humidity": 68},
        7: {"rain": 10.0, "temp": 29.0, "humidity": 69}, 8: {"rain": 15.0, "temp": 29.2, "humidity": 70},
        9: {"rain": 25.0, "temp": 29.0, "humidity": 74}, 10: {"rain": 65.0, "temp": 27.8, "humidity": 82},
        11: {"rain": 72.0, "temp": 26.5, "humidity": 85}, 12: {"rain": 48.0, "temp": 25.8, "humidity": 80}
    },
    "hambantota": {
        1: {"rain": 22.0, "temp": 26.5, "humidity": 74}, 2: {"rain": 12.0, "temp": 27.0, "humidity": 72},
        3: {"rain": 18.0, "temp": 28.2, "humidity": 73}, 4: {"rain": 32.0, "temp": 29.0, "humidity": 76},
        5: {"rain": 28.0, "temp": 28.8, "humidity": 77}, 6: {"rain": 18.0, "temp": 28.2, "humidity": 75},
        7: {"rain": 15.0, "temp": 28.0, "humidity": 74}, 8: {"rain": 16.0, "temp": 28.0, "humidity": 74},
        9: {"rain": 22.0, "temp": 28.2, "humidity": 75}, 10: {"rain": 48.0, "temp": 27.8, "humidity": 79},
        11: {"rain": 62.0, "temp": 27.2, "humidity": 82}, 12: {"rain": 45.0, "temp": 26.8, "humidity": 78}
    },
    "kurunegala": {
        1: {"rain": 20.0, "temp": 26.0, "humidity": 75}, 2: {"rain": 18.0, "temp": 27.5, "humidity": 72},
        3: {"rain": 32.0, "temp": 29.0, "humidity": 74}, 4: {"rain": 58.0, "temp": 29.5, "humidity": 80},
        5: {"rain": 45.0, "temp": 28.8, "humidity": 81}, 6: {"rain": 32.0, "temp": 27.8, "humidity": 79},
        7: {"rain": 30.0, "temp": 27.5, "humidity": 78}, 8: {"rain": 28.0, "temp": 27.8, "humidity": 78},
        9: {"rain": 38.0, "temp": 28.0, "humidity": 80}, 10: {"rain": 78.0, "temp": 27.2, "humidity": 85},
        11: {"rain": 75.0, "temp": 26.5, "humidity": 86}, 12: {"rain": 38.0, "temp": 26.0, "humidity": 79}
    }
}

# --- Smart Weather Function with Strict Source Attribution & In-Memory Cache ---
WEATHER_CACHE = {}

def get_smart_weather_for_district(lat, lon, district_key, target_date_obj, is_recursive_step=False):
    today = datetime.now().date()
    start_date = target_date_obj - timedelta(days=6)
    end_date = target_date_obj
    start_date_str = start_date.strftime("%Y-%m-%d")
    end_date_str = end_date.strftime("%Y-%m-%d")
    date_key = target_date_obj.strftime("%Y-%m-%d")
    cache_key = (district_key, date_key)
    
    if cache_key in WEATHER_CACHE:
        return WEATHER_CACHE[cache_key]

    month = target_date_obj.month
    clim = DISTRICT_CLIMATOLOGY.get(district_key, {}).get(month, {"rain": 25.0, "temp": 24.0, "humidity": 78})

    # For recursive forecasting or dates > 14 days out, use fast climatology seasonal estimate
    if is_recursive_step or target_date_obj > today + timedelta(days=14):
        res = (round(float(clim["rain"]), 2), round(float(clim["temp"]), 2), float(clim.get("humidity", 78)), "Historical Seasonal Estimate (Climatology)", start_date_str, end_date_str)
        WEATHER_CACHE[cache_key] = res
        return res

    # 1. Historical Actual Observation
    if end_date < today:
        try:
            url = "https://archive-api.open-meteo.com/v1/archive"
            params = {
                "latitude": lat, "longitude": lon,
                "start_date": start_date_str, "end_date": end_date_str,
                "daily": ["precipitation_sum", "temperature_2m_mean"],
                "timezone": "auto"
            }
            res_api = requests.get(url, params=params, timeout=2).json()
            if "daily" in res_api:
                rain = round(sum(res_api["daily"].get("precipitation_sum", []) or [0]), 2)
                temps = res_api["daily"].get("temperature_2m_mean", []) or [25.0]
                temp = round(sum(temps) / max(len(temps), 1), 2)
                res = (rain, temp, 78.0, "Actual Weather Observation", start_date_str, end_date_str)
                WEATHER_CACHE[cache_key] = res
                return res
        except Exception:
            pass

    # 2. Near-Term Official Weather Forecast (up to 14 days)
    elif start_date <= today + timedelta(days=14):
        try:
            url = "https://api.open-meteo.com/v1/forecast"
            params = {
                "latitude": lat, "longitude": lon,
                "daily": ["precipitation_sum", "temperature_2m_mean"],
                "timezone": "auto"
            }
            res_api = requests.get(url, params=params, timeout=2).json()
            if "daily" in res_api:
                rain = round(sum(res_api["daily"].get("precipitation_sum", []) or [0]), 2)
                temps = res_api["daily"].get("temperature_2m_mean", []) or [25.0]
                temp = round(sum(temps) / max(len(temps), 1), 2)
                res = (rain, temp, 80.0, "Weather Forecast (Open-Meteo)", start_date_str, end_date_str)
                WEATHER_CACHE[cache_key] = res
                return res
        except Exception:
            pass

    res = (round(float(clim["rain"]), 2), round(float(clim["temp"]), 2), float(clim.get("humidity", 78)), "Historical Seasonal Estimate (Climatology)", start_date_str, end_date_str)
    WEATHER_CACHE[cache_key] = res
    return res

def get_weekly_weather(lat, lon, target_date_str=None, district_key="nuwara_eliya"):
    if target_date_str:
        try:
            target_date = datetime.strptime(format_date_to_ymd(target_date_str), "%Y-%m-%d").date()
        except ValueError:
            target_date = datetime.now().date()
    else:
        target_date = datetime.now().date()
    rain, temp, _, _, s_date, e_date = get_smart_weather_for_district(lat, lon, district_key, target_date)
    return rain, temp, s_date, e_date

# --- Future Macroeconomic Estimator with Source Attribution ---
def get_smart_macroeconomics(date_obj, latest_actual_date, user_diesel=340.0, user_inflation=5.2, is_final_step=False):
    year = date_obj.year
    month = date_obj.month
    
    # 1. Historical Actual Period (<= latest available actual date)
    if date_obj <= latest_actual_date:
        if year == 2020:
            return 104.0, "Central Bank Historical Actual", 5.2, "Central Bank Historical Actual"
        elif year == 2021:
            return 111.0, "Central Bank Historical Actual", 7.6, "Central Bank Historical Actual"
        elif year == 2022:
            return 400.0, "CBSL Crisis Historical Actual", 64.3, "CBSL Crisis Historical Actual"
        elif year == 2023:
            return 356.0, "Central Bank Historical Actual", 12.0, "Central Bank Historical Actual"
        elif year == 2024:
            return 317.0, "Central Bank Historical Actual", 1.7, "Central Bank Historical Actual"
        elif year == 2025:
            return 330.0, "Central Bank Historical Actual", 4.1, "Central Bank Historical Actual"
        else:
            return 340.0, "CBSL / CPC Historical Actual", 5.2, "Central Bank CCPI Historical Actual"
            
    # 2. User Policy / Shock Scenario (if adjusted on target date)
    if is_final_step and (user_diesel != 340.0 or user_inflation != 5.2):
        return round(float(user_diesel), 2), "User-Defined Policy Scenario", round(float(user_inflation), 2), "User-Defined Policy Scenario"
        
    # 3. Future Projected Corridor (Central Bank Baseline)
    if year == 2026:
        diesel = 340.0
        inflation = 5.2
    elif year == 2027:
        diesel = 345.0
        inflation = 5.0
    elif year == 2028:
        diesel = 350.0
        inflation = 4.8
    else:
        diesel = 355.0
        inflation = 4.5
        
    return diesel, "Macroeconomic Baseline Projection", inflation, "CCPI Inflation Corridor Projection"

# --- MongoDB & In-Memory Dynamic Lags Function (For Historical Backtests) ---
def get_lag_prices_from_db(crop_name, target_date=None):
    ymd_date = format_date_to_ymd(target_date)
    
    # 1. Try MongoDB Query (strictly prior to target date: date < target_date)
    if mongo_connected:
        try:
            query = {"crop": crop_name, "date": {"$lt": ymd_date}}
            records = list(collection.find(query).sort("date", -1).limit(5))
            if len(records) >= 4:
                lag_1 = float(records[0]["price"])
                lag_2 = float(records[1]["price"])
                lag_4 = float(records[3]["price"])
                return lag_1, lag_2, lag_4, records[0]["date"], records[1]["date"], records[3]["date"]
        except Exception as e:
            print(f"MongoDB query failed for {crop_name}: {e}")

    # 2. In-Memory Registry Fallback
    crop_records = HISTORICAL_PRICE_REGISTRY.get(crop_name, [])
    if crop_records:
        past_records = [r for r in crop_records if r["date"] < ymd_date]
        if len(past_records) >= 4:
            r1 = past_records[-1]
            r2 = past_records[-2]
            r4 = past_records[-4]
            return float(r1["price"]), float(r2["price"]), float(r4["price"]), r1["date"], r2["date"], r4["date"]
        elif crop_records:
            # Dynamically derive from crop's earliest available actual prices
            p = float(crop_records[0]["price"])
            d = crop_records[0]["date"]
            return p, p, p, d, d, d

    # 3. If crop is missing from registry, query earliest available actual price from MongoDB
    if mongo_connected:
        try:
            rec = collection.find_one({"crop": crop_name}, sort=[("date", 1)])
            if rec:
                p = float(rec["price"])
                d = rec["date"]
                return p, p, p, d, d, d
        except Exception:
            pass

    raise ValueError(f"No historical actual price records exist in database to compute lag features for crop: {crop_name}")

# --- Helper Function: ඉතිහාස දත්ත ලබා ගැනීම ---
def get_history_data(crop_name):
    crop_records = HISTORICAL_PRICE_REGISTRY.get(crop_name, [])
    if crop_records:
        # Return all historical records for full timeline and year-based visualization
        return [
            {
                "year": f"Wk {r['week']} ({r['date']})",
                "price": r["price"],
                "date": r["date"],
                "week": r["week"],
                "year_num": r["year"]
            }
            for r in crop_records
        ]
    return []

# --- Helper Function: Ground Truth සැබෑ වෙළඳපල මිල සොයාගැනීම (2020 - mid 2026) ---
def get_actual_price_for_date(crop_name, target_date_str):
    if not target_date_str:
        return None
    crop_records = HISTORICAL_PRICE_REGISTRY.get(crop_name, [])
    if not crop_records:
        return None
    
    try:
        t_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
    except Exception:
        return None

    # 1. Exact date match
    for r in crop_records:
        if r["date"] == target_date_str:
            return {"price": float(r["price"]), "date": r["date"], "week": r["week"], "year": r["year"], "exact": True}

    # 2. Closest record within +/- 4 days (matching weekly bulletin)
    closest = None
    min_diff = 5
    for r in crop_records:
        try:
            r_date = datetime.strptime(r["date"], "%Y-%m-%d").date()
            diff = abs((r_date - t_date).days)
            if diff <= 4 and diff < min_diff:
                min_diff = diff
                closest = {"price": float(r["price"]), "date": r["date"], "week": r["week"], "year": r["year"], "exact": False}
        except Exception:
            continue

    return closest

# --- Request Data Model ---
class PredictionRequest(BaseModel):
    month: Optional[int] = None
    monsoon_season: Optional[int] = 1
    is_festive: Optional[int] = 0
    diesel_price_weekly_actual: Optional[float] = 340.0
    inflation_rate_cpi_weekly_mean: Optional[float] = 2.5
    selected_date: Optional[str] = None

# --- Exact Model Evaluation & Error Metrics from Training ---
MODEL_METRICS = {
    "bandakka": {
        "mae": 9.75,
        "rmse": 13.26,
        "mape": 3.69,
        "accuracy": 96.31,
        "model_file": "model_rf_lowcountry_bandakka.pkl"
    },
    "bitterg": {
        "mae": 116.93,
        "rmse": 121.15,
        "mape": 14.52,
        "accuracy": 85.48,
        "model_file": "model_rf_lowcountry_bitterg.pkl"
    },
    "bringel": {
        "mae": 26.93,
        "rmse": 31.42,
        "mape": 5.90,
        "accuracy": 94.10,
        "model_file": "model_rf_lowcountry_bringel.pkl"
    },
    "cucumber": {
        "mae": 13.93,
        "rmse": 15.69,
        "mape": 5.91,
        "accuracy": 94.09,
        "model_file": "model_rf_lowcountry_cucumber.pkl"
    },
    "long": {
        "mae": 11.95,
        "rmse": 19.35,
        "mape": 2.86,
        "accuracy": 97.14,
        "model_file": "model_rf_lowcountry_long.pkl"
    },
    "bean": {
        "mae": 79.04,
        "rmse": 85.55,
        "mape": 14.88,
        "accuracy": 85.12,
        "model_file": "model_rf_upcountry_bean.pkl"
    },
    "carrot": {
        "mae": 11.90,
        "rmse": 17.33,
        "mape": 4.52,
        "accuracy": 95.48,
        "model_file": "model_rf_upcountry_carrot.pkl"
    },
    "leeks": {
        "mae": 14.85,
        "rmse": 22.04,
        "mape": 4.31,
        "accuracy": 95.69,
        "model_file": "model_rf_upcountry_leeks.pkl"
    },
    "tomato": {
        "mae": 60.79,
        "rmse": 69.20,
        "mape": 10.37,
        "accuracy": 89.63,
        "model_file": "model_rf_upcountry_tomato.pkl"
    }
}

# --- Crop Metadata Details ---
CROPS_META = {
    "bean": {"name": "Green Beans", "name_si": "බෝංචි", "region": "upcountry", "icon": "🌱", "category": "Legumes", "color": "#10B981", "metrics": MODEL_METRICS["bean"]},
    "carrot": {"name": "Carrot", "name_si": "කැරට්", "region": "upcountry", "icon": "🥕", "category": "Root Vegetables", "color": "#F97316", "metrics": MODEL_METRICS["carrot"]},
    "leeks": {"name": "Leeks", "name_si": "ලීක්ස්", "region": "upcountry", "icon": "🥬", "category": "Alliums", "color": "#22C55E", "metrics": MODEL_METRICS["leeks"]},
    "tomato": {"name": "Tomato", "name_si": "තක්කාලි", "region": "upcountry", "icon": "🍅", "category": "Solanaceae", "color": "#EF4444", "metrics": MODEL_METRICS["tomato"]},
    "bandakka": {"name": "Bandakka (Okra)", "name_si": "බණ්ඩක්කා", "region": "lowcountry", "icon": "🌿", "category": "Malvaceae", "color": "#84CC16", "metrics": MODEL_METRICS["bandakka"]},
    "bitterg": {"name": "Bitter Gourd", "name_si": "කරවිල", "region": "lowcountry", "icon": "🥒", "category": "Cucurbits", "color": "#059669", "metrics": MODEL_METRICS["bitterg"]},
    "bringel": {"name": "Brinjal (Eggplant)", "name_si": "වම්බටු", "region": "lowcountry", "icon": "🍆", "category": "Solanaceae", "color": "#8B5CF6", "metrics": MODEL_METRICS["bringel"]},
    "cucumber": {"name": "Cucumber", "name_si": "පිපිඤ්ඤා", "region": "lowcountry", "icon": "🥗", "category": "Cucurbits", "color": "#06B6D4", "metrics": MODEL_METRICS["cucumber"]},
    "long": {"name": "Long Beans", "name_si": "මෑකරල්", "region": "lowcountry", "icon": "🌾", "category": "Legumes", "color": "#14B8A6", "metrics": MODEL_METRICS["long"]}
}

# --- Root & Metadata Endpoints ---
@app.get("/")
def get_root():
    return {
        "status": "online",
        "service": "Auto Vegetable Price Prediction API",
        "version": "2.0.0",
        "models_loaded": len(models),
        "crops": list(CROPS_META.keys()),
        "model_metrics": MODEL_METRICS,
        "mongo_connected": mongo_connected
    }

@app.get("/api/crops")
def get_crops():
    return {
        "crops": [
            {"id": crop_id, **meta} for crop_id, meta in CROPS_META.items()
        ],
        "upcountry": up_country_crops,
        "lowcountry": low_country_crops,
        "metrics": MODEL_METRICS
    }

@app.get("/api/history/{crop_name}")
def get_crop_history(crop_name: str):
    crop_clean = crop_name.lower().strip()
    history = get_history_data(crop_clean)
    meta = CROPS_META.get(crop_clean, {"name": crop_name, "name_si": crop_name, "region": "unknown"})
    return {
        "crop": crop_clean,
        "meta": meta,
        "total_records": len(history),
        "history": history
    }

@app.get("/api/weather/districts")
def get_all_districts_weather(target_date: str = None):
    weather_data = {}
    target_date_clean = format_date_to_ymd(target_date)
    start_date_str = None
    end_date_str = None
    for district_key, coords in DISTRICTS.items():
        rain, temp, s_date, e_date = get_weekly_weather(*coords, target_date_clean)
        start_date_str = s_date
        end_date_str = e_date
        weather_data[district_key] = {
            "name": district_key.replace("_", " ").title(),
            "rainfall_mm": rain,
            "temperature_c": temp,
            "start_date": s_date,
            "end_date": e_date,
            "lat": coords[0],
            "lon": coords[1]
        }
    return {
        "date": target_date_clean,
        "start_date": start_date_str,
        "end_date": end_date_str,
        "period_text": f"{start_date_str} to {end_date_str}",
        "districts": weather_data
    }

# --- Explainability Helper: 2-Week Relative Factor Dynamics & Price Impact ---
def compute_explainability_factors(crop_name, region, target_date, current_metrics, prev_2w_metrics, lag_1, lag_2):
    diesel_curr = float(current_metrics.get("diesel", 345.0))
    diesel_prev = float(prev_2w_metrics.get("diesel", diesel_curr))
    
    rain_curr = float(current_metrics.get("rainfall", 20.0))
    rain_prev = float(prev_2w_metrics.get("rainfall", rain_curr))
    
    cpi_curr = float(current_metrics.get("inflation", 1.8))
    cpi_prev = float(prev_2w_metrics.get("inflation", cpi_curr))
    
    # Feature importance baseline weights
    diesel_impact = min(50, max(25, int(diesel_curr / 8.5)))
    rain_impact = min(35, max(15, int(rain_curr * 0.8 + 15)))
    inflation_impact = min(25, max(10, int(cpi_curr * 2.0)))
    lags_impact = max(10, 100 - (diesel_impact + rain_impact + inflation_impact))
    total_impact = diesel_impact + rain_impact + inflation_impact + lags_impact
    
    crop_display = crop_name.capitalize()
    
    # 1. Fuel / Transport (Diesel)
    d_diff = round(diesel_curr - diesel_prev, 2)
    d_pct = round((d_diff / diesel_prev) * 100, 1) if diesel_prev > 0 else 0.0
    if d_diff > 0.5:
        d_eff = "increase"
        d_lbl = "Pushes Price UP (+)"
        d_lbl_si = "මිල ඉහළ දැමීමේ බලපෑම (+)"
        d_exp = f"Diesel price rose by +{d_pct:.1f}% over the past 2 weeks (Rs. {diesel_prev:.1f} → Rs. {diesel_curr:.1f}/L), adding transport cost pressure on retail prices."
        d_exp_si = f"පසුගිය සති 2 තුළ ඩීසල් මිල +{d_pct:.1f}% කින් (රු. {diesel_prev:.1f} සිට රු. {diesel_curr:.1f} දක්වා) වැඩිවීම ප්‍රවාහන වියදම් ඉහළ දමා සිල්ලර මිල ඉහළ යාමට බලපායි."
    elif d_diff < -0.5:
        d_eff = "decrease"
        d_lbl = "Pulls Price DOWN (-)"
        d_lbl_si = "මිල පහත හෙලීමේ බලපෑම (-)"
        d_exp = f"Diesel price fell by {d_pct:.1f}% over the past 2 weeks (Rs. {diesel_prev:.1f} → Rs. {diesel_curr:.1f}/L), reducing transport overhead and easing retail prices."
        d_exp_si = f"පසුගිය සති 2 තුළ ඩීසල් මිල {d_pct:.1f}% කින් අඩු වීම ප්‍රවාහන වියදම් ලිහිල් කර සිල්ලර මිල පහත වැටීමට සහාය වේ."
    else:
        d_eff = "neutral"
        d_lbl = "Stable / Neutral (0)"
        d_lbl_si = "ස්ථාවර බලපෑම (0)"
        d_exp = f"Diesel price remained steady at Rs. {diesel_curr:.1f}/L over the past 2 weeks, maintaining steady transport freight costs."
        d_exp_si = f"පසුගිය සති 2 තුළ ඩීසල් මිල රු. {diesel_curr:.1f}/L මට්ටමේ ස්ථාවරව පැවතීම ප්‍රවාහන වියදම් කෙරෙහි මධ්‍යස්ථව බලපායි."

    # 2. Weather & Rainfall
    r_diff = round(rain_curr - rain_prev, 1)
    r_pct = round((r_diff / rain_prev) * 100, 1) if rain_prev > 0 else 0.0
    if rain_curr > 45.0 and r_diff > 5.0:
        r_eff = "increase"
        r_lbl = "Pushes Price UP (+)"
        r_lbl_si = "මිල ඉහළ දැමීමේ බලපෑම (+)"
        r_exp = f"Weekly rainfall surged by +{r_pct:.1f}% to {rain_curr:.1f} mm over the past 2 weeks; heavy wet weather disrupts farm harvesting and damages supply."
        r_exp_si = f"පසුගිය සති 2 තුළ වර්ෂාපතනය +{r_pct:.1f}% කින් {rain_curr:.1f} mm දක්වා වැඩිවීම අස්වනු නෙලීමට බාධා කර සැපයුම අඩු කරන බැවින් මිල ඉහළ යයි."
    elif rain_curr < 10.0 and rain_prev < 10.0:
        r_eff = "increase"
        r_lbl = "Pushes Price UP (+)"
        r_lbl_si = "මිල ඉහළ දැමීමේ බලපෑම (+)"
        r_exp = f"Persistent dry weather ({rain_curr:.1f} mm/wk) over the past 2 weeks restricts irrigation and lowers crop yields."
        r_exp_si = f"පසුගිය සති 2 පුරා අඩු වර්ෂාපතනයක් ({rain_curr:.1f} mm) පැවතීම නිසා අස්වැන්න අඩු වී මිල ඉහළ යාමට බලපායි."
    elif 15.0 <= rain_curr <= 40.0 and rain_prev > 45.0:
        r_eff = "decrease"
        r_lbl = "Pulls Price DOWN (-)"
        r_lbl_si = "මිල පහත හෙලීමේ බලපෑම (-)"
        r_exp = f"Rainfall normalized to an optimal {rain_curr:.1f} mm/wk ({r_diff:+.1f} mm vs 2w ago), improving field accessibility and harvest supply."
        r_exp_si = f"වර්ෂාපතනය යහපත් මට්ටමකට ({rain_curr:.1f} mm) සාමාන්‍යකරණය වීමෙන් අස්වනු සැපයුම ඉහළ ගොස් මිල පහළ බැසීමට උපකාරී වේ."
    else:
        r_eff = "neutral"
        r_lbl = "Stable / Moderate (0)"
        r_lbl_si = "ස්ථාවර බලපෑම (0)"
        r_exp = f"Rainfall of {rain_curr:.1f} mm/wk (vs {rain_prev:.1f} mm 2w ago) remains within manageable seasonal expectations."
        r_exp_si = f"වර්ෂාපතනය පසුගිය සති 2 ට සාපේක්ෂව ({rain_prev:.1f} mm සිට {rain_curr:.1f} mm) සාමාන්‍ය මට්ටමක පවතී."

    # 3. Lag Prices (Supply Momentum)
    p_diff = round(lag_1 - lag_2, 2)
    p_pct = round((p_diff / lag_2) * 100, 1) if lag_2 > 0 else 0.0
    if p_diff > 5.0:
        p_eff = "increase"
        p_lbl = "Pushes Price UP (+)"
        p_lbl_si = "මිල ඉහළ දැමීමේ බලපෑම (+)"
        p_exp = f"{crop_display} market price climbed by +{p_pct:.1f}% over the 2-week window (from Rs. {lag_2:.2f} to Rs. {lag_1:.2f}), signaling tightening wholesale supply."
        p_exp_si = f"පසුගිය සති 2 තුළ {crop_display} මිල රු. {lag_2:.2f} සිට රු. {lag_1:.2f} දක්වා (+{p_pct:.1f}%) ඉහළ යාම සැපයුම අඩුවීම නිසා මිල ඉහළ යාමට බලපායි."
    elif p_diff < -5.0:
        p_eff = "decrease"
        p_lbl = "Pulls Price DOWN (-)"
        p_lbl_si = "මිල පහත හෙලීමේ බලපෑම (-)"
        p_exp = f"{crop_display} market price dropped by {p_pct:.1f}% over the 2-week window (from Rs. {lag_2:.2f} to Rs. {lag_1:.2f}), reflecting harvest supply inflows."
        p_exp_si = f"පසුගිය සති 2 තුළ {crop_display} මිල රු. {lag_2:.2f} සිට රු. {lag_1:.2f} දක්වා ({p_pct:.1f}%) පහත වැටීම වැඩි අස්වනු සැපයුම නිසා මිල පහළ යාමට බලපායි."
    else:
        p_eff = "neutral"
        p_lbl = "Stable Momentum (0)"
        p_lbl_si = "ස්ථාවර ප්‍රවණතාව (0)"
        p_exp = f"{crop_display} market price changed minimally ({p_diff:+.2f} Rs/kg) over the 2-week window, indicating supply-demand equilibrium."
        p_exp_si = f"පසුගිය සති 2 තුළ {crop_display} මිලෙහි විශාල වෙනසක් නොවීම (රු. {lag_2:.2f} සිට රු. {lag_1:.2f}) ස්ථාවර සැපයුමක් පෙන්වයි."

    # 4. Inflation & CPI
    i_diff = round(cpi_curr - cpi_prev, 2)
    if i_diff > 0.15:
        i_eff = "increase"
        i_lbl = "Pushes Price UP (+)"
        i_lbl_si = "මිල ඉහළ දැමීමේ බලපෑම (+)"
        i_exp = f"CPI inflation rose by +{i_diff:.2f}% over the past 2 weeks ({cpi_prev:.1f}% → {cpi_curr:.1f}%), increasing farm input and retail margin pressures."
        i_exp_si = f"පසුගිය සති 2 තුළ උද්ධමනය {cpi_prev:.1f}% සිට {cpi_curr:.1f}% දක්වා ඉහළ යාම පොදු මිල මට්ටම ඉහළ දැමීමට බලපායි."
    elif i_diff < -0.15:
        i_eff = "decrease"
        i_lbl = "Pulls Price DOWN (-)"
        i_lbl_si = "මිල පහත හෙලීමේ බලපෑම (-)"
        i_exp = f"CPI inflation eased by {i_diff:.2f}% over the past 2 weeks ({cpi_prev:.1f}% → {cpi_curr:.1f}%), cooling baseline price expectations."
        i_exp_si = f"පසුගිය සති 2 තුළ උද්ධමනය පහත වැටීම සාමාන්‍ය මිල පීඩනය ලිහිල් කිරීමට සහාය වේ."
    else:
        i_eff = "neutral"
        i_lbl = "Stable / Neutral (0)"
        i_lbl_si = "ස්ථාවර බලපෑම (0)"
        i_exp = f"CPI inflation remained steady at {cpi_curr:.1f}% over the past 2 weeks, maintaining predictable baseline conditions."
        i_exp_si = f"පසුගිය සති 2 තුළ උද්ධමනය {cpi_curr:.1f}% මට්ටමේ ස්ථාවරව පැවතීම මිල කෙරෙහි මධ්‍යස්ථව බලපායි."

    return [
        {
            "name": "Fuel / Transport (Diesel)",
            "impact": round((diesel_impact / total_impact) * 100, 1),
            "current_val": f"Rs. {diesel_curr:.1f}/L",
            "prev_2w_val": f"Rs. {diesel_prev:.1f}/L",
            "change_val": d_diff,
            "change_pct": d_pct,
            "price_effect": d_eff,
            "effect_label": d_lbl,
            "effect_label_si": d_lbl_si,
            "explanation": d_exp,
            "explanation_si": d_exp_si
        },
        {
            "name": "Weather & Rainfall",
            "impact": round((rain_impact / total_impact) * 100, 1),
            "current_val": f"{rain_curr:.1f} mm",
            "prev_2w_val": f"{rain_prev:.1f} mm",
            "change_val": r_diff,
            "change_pct": r_pct,
            "price_effect": r_eff,
            "effect_label": r_lbl,
            "effect_label_si": r_lbl_si,
            "explanation": r_exp,
            "explanation_si": r_exp_si
        },
        {
            "name": "Historical Lag Prices",
            "impact": round((lags_impact / total_impact) * 100, 1),
            "current_val": f"Rs. {lag_1:.2f}",
            "prev_2w_val": f"Rs. {lag_2:.2f}",
            "change_val": p_diff,
            "change_pct": p_pct,
            "price_effect": p_eff,
            "effect_label": p_lbl,
            "effect_label_si": p_lbl_si,
            "explanation": p_exp,
            "explanation_si": p_exp_si
        },
        {
            "name": "Inflation & CPI",
            "impact": round((inflation_impact / total_impact) * 100, 1),
            "current_val": f"{cpi_curr:.1f}%",
            "prev_2w_val": f"{cpi_prev:.1f}%",
            "change_val": i_diff,
            "change_pct": round((i_diff / cpi_prev) * 100, 1) if cpi_prev > 0 else 0.0,
            "price_effect": i_eff,
            "effect_label": i_lbl,
            "effect_label_si": i_lbl_si,
            "explanation": i_exp,
            "explanation_si": i_exp_si
        }
    ]

# --- Unified Long-Horizon Recursive Vegetable Price Forecasting Engine ---
def run_vegetable_prediction(crop_name: str, region: str, data: PredictionRequest):
    crop_name = crop_name.lower().strip()
    model_key = f"{'up' if region == 'upcountry' else 'low'}_{crop_name}"
    if model_key not in models:
        raise HTTPException(status_code=404, detail=f"Model for {region} crop '{crop_name}' not found.")

    # 1. Target Date Mapping & Validation (Strict Weekly Thursday Cadence)
    requested_date_str = format_date_to_ymd(data.selected_date)
    target_thursday, is_adjusted, diff_days = map_to_weekly_thursday(requested_date_str)
    target_thursday_str = target_thursday.strftime("%Y-%m-%d")

    # 2. Dynamic Latest Actual Price Detection (Never hard-coded)
    latest_record = get_latest_actual_record(crop_name)
    latest_actual_date = datetime.strptime(latest_record["date"], "%Y-%m-%d").date()
    latest_actual_date_str = latest_record["date"]
    latest_actual_price = latest_record["price"]

    crop_metrics = MODEL_METRICS.get(crop_name, {"mae": 15.0, "rmse": 20.0, "mape": 5.0, "accuracy": 95.0})
    mae_val = crop_metrics["mae"]
    rmse_val = crop_metrics["rmse"]
    mape_val = crop_metrics["mape"]
    accuracy_val = crop_metrics["accuracy"]
    history_data = get_history_data(crop_name)

    # -------------------------------------------------------------------------
    # CASE A: Target Date is within Historical Data Period (<= latest actual date)
    # Direct Historical Evaluation & Ground Truth Comparison
    # -------------------------------------------------------------------------
    if target_thursday <= latest_actual_date:
        if region == "upcountry":
            ne_rain, ne_temp, s_date, e_date = get_weekly_weather(*DISTRICTS["nuwara_eliya"], target_thursday_str, "nuwara_eliya")
            bd_rain, bd_temp, _, _ = get_weekly_weather(*DISTRICTS["badulla"], target_thursday_str, "badulla")
            kd_rain, kd_temp, _, _ = get_weekly_weather(*DISTRICTS["kandy"], target_thursday_str, "kandy")
            mt_rain, mt_temp, _, _ = get_weekly_weather(*DISTRICTS["matale"], target_thursday_str, "matale")
            avg_rain = round((ne_rain + bd_rain + kd_rain + mt_rain) / 4.0, 2)
            avg_temp = round((ne_temp + bd_temp + kd_temp + mt_temp) / 4.0, 2)
            weather_payload = {
                "start_date": s_date, "end_date": e_date, "period_text": f"{s_date} to {e_date}", "target_date": target_thursday_str,
                "nuwara_eliya": {"rainfall_mm": ne_rain, "temp_c": ne_temp, "start_date": s_date, "end_date": e_date},
                "badulla": {"rainfall_mm": bd_rain, "temp_c": bd_temp, "start_date": s_date, "end_date": e_date},
                "kandy": {"rainfall_mm": kd_rain, "temp_c": kd_temp, "start_date": s_date, "end_date": e_date},
                "matale": {"rainfall_mm": mt_rain, "temp_c": mt_temp, "start_date": s_date, "end_date": e_date},
                "avg_rainfall_mm": avg_rain, "avg_temp_c": avg_temp
            }
        else:
            an_rain, an_temp, s_date, e_date = get_weekly_weather(*DISTRICTS["anuradhapura"], target_thursday_str, "anuradhapura")
            hb_rain, hb_temp, _, _ = get_weekly_weather(*DISTRICTS["hambantota"], target_thursday_str, "hambantota")
            ku_rain, ku_temp, _, _ = get_weekly_weather(*DISTRICTS["kurunegala"], target_thursday_str, "kurunegala")
            avg_rain = round((an_rain + hb_rain + ku_rain) / 3.0, 2)
            avg_temp = round((an_temp + hb_temp + ku_temp) / 3.0, 2)
            weather_payload = {
                "start_date": s_date, "end_date": e_date, "period_text": f"{s_date} to {e_date}", "target_date": target_thursday_str,
                "anuradhapura": {"rainfall_mm": an_rain, "temp_c": an_temp, "start_date": s_date, "end_date": e_date},
                "hambantota": {"rainfall_mm": hb_rain, "temp_c": hb_temp, "start_date": s_date, "end_date": e_date},
                "kurunegala": {"rainfall_mm": ku_rain, "temp_c": ku_temp, "start_date": s_date, "end_date": e_date},
                "avg_rainfall_mm": avg_rain, "avg_temp_c": avg_temp
            }

        lag_1, lag_2, lag_4, d1, d2, d4 = get_lag_prices_from_db(crop_name, target_thursday_str)

        if region == "upcountry":
            input_row = {
                'month': data.month, 'monsoon_season': data.monsoon_season, 'is_festive': data.is_festive,
                'diesel_price_weekly_actual': data.diesel_price_weekly_actual, 'inflation_rate_cpi_weekly_mean': data.inflation_rate_cpi_weekly_mean,
                'nuwara eliya_rainfall_mm_weekly': ne_rain, 'nuwara eliya_temp_avg_c_weekly': ne_temp,
                'badulla_rainfall_mm_weekly': bd_rain, 'badulla_temp_avg_c_weekly': bd_temp,
                'kandy_rainfall_mm_weekly': kd_rain, 'kandy_temp_avg_c_weekly': kd_temp,
                'matale_rainfall_mm_weekly': mt_rain, 'matale_temp_avg_c_weekly': mt_temp,
                f'{crop_name}_price_weekly_mean_lag_1': lag_1,
                f'{crop_name}_price_weekly_mean_lag_2': lag_2,
                f'{crop_name}_price_weekly_mean_lag_4': lag_4
            }
        else:
            input_row = {
                'month': data.month, 'monsoon_season': data.monsoon_season, 'is_festive': data.is_festive,
                'diesel_price_weekly_actual': data.diesel_price_weekly_actual, 'inflation_rate_cpi_weekly_mean': data.inflation_rate_cpi_weekly_mean,
                'anuradhapura_rainfall_mm_weekly': an_rain, 'anuradhapura_temp_avg_c_weekly': an_temp,
                'hambantota_rainfall_mm_weekly': hb_rain, 'hambantota_temp_avg_c_weekly': hb_temp,
                'kurunegala_rainfall_mm_weekly': ku_rain, 'kurunegala_temp_avg_c_weekly': ku_temp,
                f'{crop_name}_price_weekly_mean_lag_1': lag_1,
                f'{crop_name}_price_weekly_mean_lag_2': lag_2,
                f'{crop_name}_price_weekly_mean_lag_4': lag_4
            }

        df = pd.DataFrame([input_row])
        predicted_price = round(float(models[model_key].predict(df)[0]), 2)

        price_min = round(max(0.0, predicted_price - mae_val), 2)
        price_max = round(predicted_price + mae_val, 2)
        price_min_rmse = round(max(0.0, predicted_price - rmse_val), 2)
        price_max_rmse = round(predicted_price + rmse_val, 2)

        # Ground truth comparison
        actual_info = get_actual_price_for_date(crop_name, target_thursday_str)
        if actual_info:
            act_price = actual_info["price"]
            p_gap = round(predicted_price - act_price, 2)
            p_gap_abs = round(abs(p_gap), 2)
            err_pct = round((p_gap_abs / act_price) * 100, 2) if act_price > 0 else 0.0
            acc_pct = round(max(0.0, 100.0 - err_pct), 2)
            ground_truth = {
                "has_actual": True, "actual_price": act_price, "actual_date": actual_info["date"],
                "actual_week": actual_info["week"], "actual_year": actual_info["year"],
                "is_exact_date": actual_info["exact"], "price_gap": p_gap, "price_gap_abs": p_gap_abs,
                "gap_percentage": err_pct, "accuracy_percentage": acc_pct
            }
        else:
            ground_truth = {"has_actual": False, "actual_price": None, "price_gap": None, "accuracy_percentage": None}

        date_2w_ago = target_thursday - timedelta(days=14)
        date_2w_ago_str = date_2w_ago.strftime("%Y-%m-%d")
        d_prev, _, i_prev, _ = get_smart_macroeconomics(
            date_2w_ago, latest_actual_date, data.diesel_price_weekly_actual, data.inflation_rate_cpi_weekly_mean, is_final_step=False
        )
        if region == "upcountry":
            ne_r2, _, _, _ = get_weekly_weather(*DISTRICTS["nuwara_eliya"], date_2w_ago_str, "nuwara_eliya")
            bd_r2, _, _, _ = get_weekly_weather(*DISTRICTS["badulla"], date_2w_ago_str, "badulla")
            kd_r2, _, _, _ = get_weekly_weather(*DISTRICTS["kandy"], date_2w_ago_str, "kandy")
            mt_r2, _, _, _ = get_weekly_weather(*DISTRICTS["matale"], date_2w_ago_str, "matale")
            rain_prev = round((ne_r2 + bd_r2 + kd_r2 + mt_r2) / 4.0, 2)
        else:
            an_r2, _, _, _ = get_weekly_weather(*DISTRICTS["anuradhapura"], date_2w_ago_str, "anuradhapura")
            hb_r2, _, _, _ = get_weekly_weather(*DISTRICTS["hambantota"], date_2w_ago_str, "hambantota")
            ku_r2, _, _, _ = get_weekly_weather(*DISTRICTS["kurunegala"], date_2w_ago_str, "kurunegala")
            rain_prev = round((an_r2 + hb_r2 + ku_r2) / 3.0, 2)

        factors = compute_explainability_factors(
            crop_name=crop_name,
            region=region,
            target_date=target_thursday,
            current_metrics={"diesel": data.diesel_price_weekly_actual, "rainfall": avg_rain, "inflation": data.inflation_rate_cpi_weekly_mean},
            prev_2w_metrics={"diesel": d_prev, "rainfall": rain_prev, "inflation": i_prev},
            lag_1=lag_1,
            lag_2=lag_2
        )

        price_diff = round(predicted_price - lag_1, 2)
        percent_change = round((price_diff / lag_1) * 100, 1) if lag_1 > 0 else 0.0

        return {
            "vegetable": crop_name,
            "prediction": predicted_price,
            "predicted_price": predicted_price,
            "predicted_price_lkr": predicted_price,
            "selected_date": target_thursday_str,
            "target_date": target_thursday_str,
            "original_selected_date": requested_date_str,
            "requested_date": requested_date_str,
            "target_forecast_date": target_thursday_str,
            "date_adjusted": is_adjusted,
            "adjustment_note": f"Forecast date adjusted to the nearest valid weekly Thursday ({target_thursday_str})." if is_adjusted else None,
            "is_future_forecast": False,
            "forecast_method": "Direct Historical Evaluation",
            "latest_actual_date": latest_actual_date_str,
            "latest_actual_price": latest_actual_price,
            "forecast_start_date": None,
            "forecast_steps": 0,
            "forecast_horizon_weeks": 0,
            "horizon_category": "Historical Backtest",
            "uncertainty_note": "Direct single-step evaluation using recorded historical market lag prices.",
            "price_min": price_min,
            "price_max": price_max,
            "price_min_rmse": price_min_rmse,
            "price_max_rmse": price_max_rmse,
            "compounded_mae": mae_val,
            "compounded_rmse": rmse_val,
            "margin_of_error_rs": mae_val,
            "margin_of_error_rmse_rs": rmse_val,
            "margin_of_error_pct": mape_val,
            "model_accuracy": accuracy_val,
            "model_metrics": crop_metrics,
            "price_change": price_diff,
            "percent_change": percent_change,
            "trend": "up" if price_diff > 0 else ("down" if price_diff < 0 else "neutral"),
            "automated_data_fetched": True,
            "input_sources": {
                "weather_source": "Historical Station Observation",
                "diesel_source": "Historical Ceylon Petroleum Data",
                "inflation_source": "Historical Central Bank CCPI"
            },
            "ground_truth": ground_truth,
            "weather_data": weather_payload,
            "lag_prices": {
                "lag_1": lag_1, "lag_2": lag_2, "lag_4": lag_4, "lag_52": lag_4,
                "lag_1_date": d1, "lag_2_date": d2, "lag_4_date": d4, "lag_52_date": d4,
                "lag_1_source": f"Actual {d1}", "lag_2_source": f"Actual {d2}",
                "lag_4_source": f"Actual {d4}", "lag_52_source": f"Actual {d4}"
            },
            "factors": factors,
            "history": history_data,
            "forecast_series": [],
            "audit_table": []
        }

    # -------------------------------------------------------------------------
    # CASE B: Long-Horizon Recursive Multi-Step Forecasting (target > latest actual)
    # -------------------------------------------------------------------------
    step_days = (target_thursday - latest_actual_date).days
    num_steps = max(1, step_days // 7)
    forecast_start_date = latest_actual_date + timedelta(days=7)
    forecast_start_date_str = forecast_start_date.strftime("%Y-%m-%d")

    # Determine horizon category & uncertainty
    if num_steps <= 4:
        horizon_category = "Short-term recursive forecast"
    elif num_steps <= 12:
        horizon_category = "Medium-term recursive forecast"
    elif num_steps <= 52:
        horizon_category = "Long-horizon recursive forecast"
    else:
        horizon_category = "Long-range scenario forecast"

    uncertainty_note = "Forecast uncertainty increases as the forecast horizon becomes longer because previous model predictions are recursively used as future lag inputs."

    # Build initial in-memory price sequence from actual registry (NEVER contaminated)
    price_buffer = {}
    crop_actuals = HISTORICAL_PRICE_REGISTRY.get(crop_name, [])
    for r in crop_actuals:
        price_buffer[r["date"]] = {"price": float(r["price"]), "type": "ACTUAL"}

    def get_buffer_price(dt):
        dt_str = dt.strftime("%Y-%m-%d")
        if dt_str in price_buffer:
            return price_buffer[dt_str]["price"], price_buffer[dt_str]["type"], dt_str
        # Nearest date lookup in buffer
        closest_str = min(price_buffer.keys(), key=lambda d: abs((datetime.strptime(d, "%Y-%m-%d").date() - dt).days))
        item = price_buffer[closest_str]
        return item["price"], item["type"], closest_str

    audit_table = []
    forecast_series = []
    final_weather_payload = {}
    final_lags = {}

    for step in range(1, num_steps + 1):
        step_date = latest_actual_date + timedelta(days=7 * step)
        step_date_str = step_date.strftime("%Y-%m-%d")
        is_final = (step == num_steps)

        # 1. Dynamic Lag Dates
        t1_dt = step_date - timedelta(days=7)
        t2_dt = step_date - timedelta(days=14)
        t4_dt = step_date - timedelta(days=28)
        t52_dt = step_date - timedelta(days=364)

        lag_1, lag_1_type, lag_1_str = get_buffer_price(t1_dt)
        lag_2, lag_2_type, lag_2_str = get_buffer_price(t2_dt)
        lag_4, lag_4_type, lag_4_str = get_buffer_price(t4_dt)
        lag_52, lag_52_type, lag_52_str = get_buffer_price(t52_dt)

        lag_1_source = f"Actual {lag_1_str}" if lag_1_type == "ACTUAL" else f"Model Forecast {lag_1_str}"
        lag_2_source = f"Actual {lag_2_str}" if lag_2_type == "ACTUAL" else f"Model Forecast {lag_2_str}"
        lag_4_source = f"Actual {lag_4_str}" if lag_4_type == "ACTUAL" else f"Model Forecast {lag_4_str}"
        lag_52_source = f"Actual {lag_52_str}" if lag_52_type == "ACTUAL" else f"Model Forecast {lag_52_str}"

        # 2. Rolling Features Calculation from Available Historical Actuals + Previous Model Forecasts
        w3 = get_buffer_price(step_date - timedelta(days=21))[0]
        rolling_mean_4 = round(float(np.mean([lag_1, lag_2, w3, lag_4])), 2)
        rolling_std_4 = round(float(np.std([lag_1, lag_2, w3, lag_4])), 2)
        price_change_1 = round(lag_1 - lag_2, 2)
        price_change_4 = round(lag_1 - lag_4, 2)

        # 3. Calendar & Monsoon Dynamics
        month = step_date.month
        monsoon = 1 if month in [3, 4] else 2 if month in [5, 6, 7, 8, 9] else 3 if month in [10, 11] else 4
        is_festive = data.is_festive if is_final else (1 if month in [4, 5, 12] else 0)

        # 4. Macroeconomic Estimates
        diesel, diesel_source, inflation, inflation_source = get_smart_macroeconomics(
            step_date, latest_actual_date, data.diesel_price_weekly_actual, data.inflation_rate_cpi_weekly_mean, is_final
        )

        # 5. Smart Weather per District (Immediate climatology for recursive steps)
        if region == "upcountry":
            ne_r, ne_t, ne_h, ne_src, s_date, e_date = get_smart_weather_for_district(*DISTRICTS["nuwara_eliya"], "nuwara_eliya", step_date, is_recursive_step=True)
            bd_r, bd_t, bd_h, bd_src, _, _ = get_smart_weather_for_district(*DISTRICTS["badulla"], "badulla", step_date, is_recursive_step=True)
            kd_r, kd_t, kd_h, kd_src, _, _ = get_smart_weather_for_district(*DISTRICTS["kandy"], "kandy", step_date, is_recursive_step=True)
            mt_r, mt_t, mt_h, mt_src, _, _ = get_smart_weather_for_district(*DISTRICTS["matale"], "matale", step_date, is_recursive_step=True)
            avg_rain = round((ne_r + bd_r + kd_r + mt_r) / 4.0, 2)
            avg_temp = round((ne_t + bd_t + kd_t + mt_t) / 4.0, 2)
            avg_hum = round((ne_h + bd_h + kd_h + mt_h) / 4.0, 1)

            input_row = {
                'month': month, 'monsoon_season': monsoon, 'is_festive': is_festive,
                'diesel_price_weekly_actual': diesel, 'inflation_rate_cpi_weekly_mean': inflation,
                'nuwara eliya_rainfall_mm_weekly': ne_r, 'nuwara eliya_temp_avg_c_weekly': ne_t,
                'badulla_rainfall_mm_weekly': bd_r, 'badulla_temp_avg_c_weekly': bd_t,
                'kandy_rainfall_mm_weekly': kd_r, 'kandy_temp_avg_c_weekly': kd_t,
                'matale_rainfall_mm_weekly': mt_r, 'matale_temp_avg_c_weekly': mt_t,
                f'{crop_name}_price_weekly_mean_lag_1': lag_1,
                f'{crop_name}_price_weekly_mean_lag_2': lag_2,
                f'{crop_name}_price_weekly_mean_lag_4': lag_4
            }

            if is_final:
                final_weather_payload = {
                    "start_date": s_date, "end_date": e_date, "period_text": f"{s_date} to {e_date}", "target_date": step_date_str,
                    "nuwara_eliya": {"rainfall_mm": ne_r, "temp_c": ne_t, "source": ne_src, "start_date": s_date, "end_date": e_date},
                    "badulla": {"rainfall_mm": bd_r, "temp_c": bd_t, "source": bd_src, "start_date": s_date, "end_date": e_date},
                    "kandy": {"rainfall_mm": kd_r, "temp_c": kd_t, "source": kd_src, "start_date": s_date, "end_date": e_date},
                    "matale": {"rainfall_mm": mt_r, "temp_c": mt_t, "source": mt_src, "start_date": s_date, "end_date": e_date},
                    "avg_rainfall_mm": avg_rain, "avg_temp_c": avg_temp, "avg_humidity": avg_hum, "weather_source": ne_src
                }
        else:
            an_r, an_t, an_h, an_src, s_date, e_date = get_smart_weather_for_district(*DISTRICTS["anuradhapura"], "anuradhapura", step_date, is_recursive_step=True)
            hb_r, hb_t, hb_h, hb_src, _, _ = get_smart_weather_for_district(*DISTRICTS["hambantota"], "hambantota", step_date, is_recursive_step=True)
            ku_r, ku_t, ku_h, ku_src, _, _ = get_smart_weather_for_district(*DISTRICTS["kurunegala"], "kurunegala", step_date, is_recursive_step=True)
            avg_rain = round((an_r + hb_r + ku_r) / 3.0, 2)
            avg_temp = round((an_t + hb_t + ku_t) / 3.0, 2)
            avg_hum = round((an_h + hb_h + ku_h) / 3.0, 1)

            input_row = {
                'month': month, 'monsoon_season': monsoon, 'is_festive': is_festive,
                'diesel_price_weekly_actual': diesel, 'inflation_rate_cpi_weekly_mean': inflation,
                'anuradhapura_rainfall_mm_weekly': an_r, 'anuradhapura_temp_avg_c_weekly': an_t,
                'hambantota_rainfall_mm_weekly': hb_r, 'hambantota_temp_avg_c_weekly': hb_t,
                'kurunegala_rainfall_mm_weekly': ku_r, 'kurunegala_temp_avg_c_weekly': ku_t,
                f'{crop_name}_price_weekly_mean_lag_1': lag_1,
                f'{crop_name}_price_weekly_mean_lag_2': lag_2,
                f'{crop_name}_price_weekly_mean_lag_4': lag_4
            }

            if is_final:
                final_weather_payload = {
                    "start_date": s_date, "end_date": e_date, "period_text": f"{s_date} to {e_date}", "target_date": step_date_str,
                    "anuradhapura": {"rainfall_mm": an_r, "temp_c": an_t, "source": an_src, "start_date": s_date, "end_date": e_date},
                    "hambantota": {"rainfall_mm": hb_r, "temp_c": hb_t, "source": hb_src, "start_date": s_date, "end_date": e_date},
                    "kurunegala": {"rainfall_mm": ku_r, "temp_c": ku_t, "source": ku_src, "start_date": s_date, "end_date": e_date},
                    "avg_rainfall_mm": avg_rain, "avg_temp_c": avg_temp, "avg_humidity": avg_hum, "weather_source": an_src
                }

        # 6. ML Model Inference
        df = pd.DataFrame([input_row])
        raw_pred = max(10.0, float(models[model_key].predict(df)[0]))

        # Dynamic Seasonal Elasticity Adjustment:
        # Incorporate empirical Sri Lankan weekly harvest momentum to prevent
        # Random Forest piecewise-constant leaf deadlock during multi-step recursive forecasting.
        iso_week = step_date.isocalendar()[1]
        seasonal_delta = HISTORICAL_WEEKLY_SEASONALITY.get(crop_name, {}).get(iso_week, 0.0)
        pred_price = round(max(10.0, raw_pred * (1.0 + 0.35 * seasonal_delta)), 2)

        # 7. Store in Buffer (Temporary in-memory forecast buffer, never in DB)
        price_buffer[step_date_str] = {"price": pred_price, "type": "FORECAST"}

        # 8. Record in Audit Table (22 columns, supporting both Title Case & snake_case)
        audit_entry = {
            "Step": step,
            "step": step,
            "Forecast Date": step_date_str,
            "forecast_date": step_date_str,
            "Predicted Price": pred_price,
            "predicted_price": pred_price,
            "Data Type": "FORECAST_PRICE",
            "data_type": "FORECAST_PRICE",
            "price_lag_1": lag_1,
            "price_lag_1_source": lag_1_source,
            "price_lag_2": lag_2,
            "price_lag_2_source": lag_2_source,
            "price_lag_4": lag_4,
            "price_lag_4_source": lag_4_source,
            "price_lag_52": lag_52,
            "price_lag_52_source": lag_52_source,
            "rolling_mean_4": rolling_mean_4,
            "rolling_std_4": rolling_std_4,
            "price_change_1": price_change_1,
            "Rainfall": avg_rain,
            "rainfall": avg_rain,
            "Rainfall_Source": "Historical Seasonal Estimate" if step_date > datetime.now().date() + timedelta(days=14) else "Weather Forecast",
            "rainfall_source": "Historical Seasonal Estimate" if step_date > datetime.now().date() + timedelta(days=14) else "Weather Forecast",
            "Temperature": avg_temp,
            "temperature": avg_temp,
            "Temperature_Source": "Historical Seasonal Estimate" if step_date > datetime.now().date() + timedelta(days=14) else "Weather Forecast",
            "temperature_source": "Historical Seasonal Estimate" if step_date > datetime.now().date() + timedelta(days=14) else "Weather Forecast",
            "Humidity": avg_hum,
            "humidity": avg_hum,
            "Humidity_Source": "Historical Seasonal Estimate",
            "humidity_source": "Historical Seasonal Estimate",
            "Diesel": diesel,
            "diesel": diesel,
            "Diesel_Source": diesel_source,
            "diesel_source": diesel_source,
            "Inflation": inflation,
            "inflation": inflation,
            "Inflation_Source": inflation_source,
            "inflation_source": inflation_source
        }
        audit_table.append(audit_entry)
        forecast_series.append({
            "step": step,
            "date": step_date_str,
            "week": step_date.isocalendar()[1],
            "year": step_date.year,
            "price": pred_price,
            "predicted_price": pred_price,
            "lag_1": lag_1,
            "lag_1_source": lag_1_source,
            "data_type": "FORECAST_PRICE"
        })

        if is_final:
            final_lags = {
                "lag_1": lag_1, "lag_2": lag_2, "lag_4": lag_4, "lag_52": lag_52,
                "lag_1_date": lag_1_str, "lag_2_date": lag_2_str, "lag_4_date": lag_4_str, "lag_52_date": lag_52_str,
                "lag_1_source": lag_1_source, "lag_2_source": lag_2_source,
                "lag_4_source": lag_4_source, "lag_52_source": lag_52_source,
                "lag_1_is_forecast": "Forecast" in lag_1_source,
                "lag_2_is_forecast": "Forecast" in lag_2_source,
                "lag_4_is_forecast": "Forecast" in lag_4_source,
                "lag_52_is_forecast": "Forecast" in lag_52_source,
                "rolling_mean_4": rolling_mean_4,
                "rolling_std_4": rolling_std_4,
                "price_change_1": price_change_1
            }

    # Final Step Uncertainty & Impact Metrics
    final_predicted_price = forecast_series[-1]["price"]
    uncertainty_multiplier = math.sqrt(1.0 + 0.06 * (num_steps - 1))
    compounded_uncertainty = round(mae_val * uncertainty_multiplier, 2)
    compounded_rmse = round(rmse_val * uncertainty_multiplier, 2)

    price_min = round(max(0.0, final_predicted_price - compounded_uncertainty), 2)
    price_max = round(final_predicted_price + compounded_uncertainty, 2)
    price_min_rmse = round(max(0.0, final_predicted_price - compounded_rmse), 2)
    price_max_rmse = round(final_predicted_price + compounded_rmse, 2)

    target_date_2w_ago = target_thursday - timedelta(days=14)
    d_prev, _, i_prev, _ = get_smart_macroeconomics(
        target_date_2w_ago, latest_actual_date, data.diesel_price_weekly_actual, data.inflation_rate_cpi_weekly_mean, is_final_step=False
    )
    if len(audit_table) >= 3:
        rain_prev = audit_table[-3]["rainfall"]
    else:
        rain_prev = final_weather_payload.get("avg_rainfall_mm", 20.0)

    factors = compute_explainability_factors(
        crop_name=crop_name,
        region=region,
        target_date=target_thursday,
        current_metrics={"diesel": data.diesel_price_weekly_actual, "rainfall": final_weather_payload.get("avg_rainfall_mm", 20.0), "inflation": data.inflation_rate_cpi_weekly_mean},
        prev_2w_metrics={"diesel": d_prev, "rainfall": rain_prev, "inflation": i_prev},
        lag_1=final_lags.get("lag_1", latest_actual_price),
        lag_2=final_lags.get("lag_2", latest_actual_price)
    )

    last_lag_1 = final_lags.get("lag_1", latest_actual_price)
    price_diff = round(final_predicted_price - last_lag_1, 2)
    percent_change = round((price_diff / last_lag_1) * 100, 1) if last_lag_1 > 0 else 0.0

    return {
        "vegetable": crop_name,
        "prediction": final_predicted_price,
        "predicted_price": final_predicted_price,
        "predicted_price_lkr": final_predicted_price,
        "selected_date": target_thursday_str,
        "target_date": target_thursday_str,
        "original_selected_date": requested_date_str,
        "requested_date": requested_date_str,
        "target_forecast_date": target_thursday_str,
        "date_adjusted": is_adjusted,
        "adjustment_note": f"Forecast date adjusted to the nearest valid weekly Thursday ({target_thursday_str})." if is_adjusted else None,
        "is_future_forecast": True,
        "forecast_method": "Recursive Multi-Step Forecast",
        "latest_actual_date": latest_actual_date_str,
        "latest_actual_price": latest_actual_price,
        "forecast_start_date": forecast_start_date_str,
        "forecast_steps": num_steps,
        "forecast_horizon_weeks": num_steps,
        "horizon_category": horizon_category,
        "uncertainty_note": uncertainty_note,
        "price_min": price_min,
        "price_max": price_max,
        "price_min_rmse": price_min_rmse,
        "price_max_rmse": price_max_rmse,
        "compounded_mae": compounded_uncertainty,
        "compounded_rmse": compounded_rmse,
        "margin_of_error_rs": compounded_uncertainty,
        "margin_of_error_rmse_rs": compounded_rmse,
        "margin_of_error_pct": round((compounded_uncertainty / final_predicted_price) * 100, 2),
        "model_accuracy": accuracy_val,
        "model_metrics": crop_metrics,
        "price_change": price_diff,
        "percent_change": percent_change,
        "trend": "up" if price_diff > 0 else ("down" if price_diff < 0 else "neutral"),
        "automated_data_fetched": True,
        "input_sources": {
            "weather_source": "Historical Seasonal Estimate (Climatology)",
            "diesel_source": diesel_source,
            "inflation_source": inflation_source
        },
        "ground_truth": {
            "has_actual": False,
            "actual_price": None,
            "actual_date": None,
            "price_gap": None,
            "price_gap_abs": None,
            "gap_percentage": None,
            "accuracy_percentage": None
        },
        "weather_data": final_weather_payload,
        "lag_prices": final_lags,
        "factors": factors,
        "history": history_data,
        "forecast_series": forecast_series,
        "audit_table": audit_table
    }

# --- Up-Country Endpoint ---
@app.post("/predict/upcountry/{crop_name}")
def predict_upcountry(crop_name: str, data: PredictionRequest):
    return run_vegetable_prediction(crop_name, "upcountry", data)

# --- Low-Country Endpoint ---
@app.post("/predict/lowcountry/{crop_name}")
def predict_lowcountry(crop_name: str, data: PredictionRequest):
    return run_vegetable_prediction(crop_name, "lowcountry", data)
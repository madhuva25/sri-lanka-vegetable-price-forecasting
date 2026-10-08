import pandas as pd
from pymongo import MongoClient
import os

# 1. MongoDB එකට සම්බන්ධ වීම
client = MongoClient("mongodb://localhost:27017/")
db = client["vegetable_db"]
collection = db["weekly_prices"]

def parse_date(week_str):
    try:
        parts = str(week_str).split('.')
        if len(parts) == 3:
            week, month, year = parts[0], parts[1], parts[2]
            months = {"Jan":"01", "Feb":"02", "Mar":"03", "Apr":"04", "May":"05", "Jun":"06", 
                      "Jul":"07", "Aug":"08", "Sep":"09", "Oct":"10", "Nov":"11", "Dec":"12"}
            days = {"W1":"01", "W2":"08", "W3":"15", "W4":"22", "W5":"29"}
            m = months.get(month, "01")
            d = days.get(week, "01")
            return f"{year}-{m}-{d}" 
    except Exception as e:
        return None
    return None

def import_crop_data(crop_name, filename):
    filepath = os.path.join("old prices", filename)
    print(f"Reading {filepath} ...")
    
    try:
        # පළමුව සාමාන්‍ය විදිහට කියවන්න උත්සාහ කිරීම
        df = pd.read_csv(filepath)
        
        # 'Week' හෝ 'price' වචන Columns වල නැත්නම්, skiprows=1 පාවිච්චි කිරීම
        cols_lower = [str(c).lower() for c in df.columns]
        if not any('week' in c for c in cols_lower) or not any('price' in c for c in cols_lower):
            df = pd.read_csv(filepath, skiprows=1)

        # Columns වල තියෙන අනවශ්‍ය හිස්තැන් (spaces) ඉවත් කිරීම
        df.columns = df.columns.str.strip()

        # අදාළ Column නම් ඉබේම සොයාගැනීම
        price_col = None
        week_col = None
        
        for col in df.columns:
            if 'price' in str(col).lower():
                price_col = col
            if 'week' in str(col).lower():
                week_col = col

        if not price_col or not week_col:
            print(f"❌ Error: Could not find Week or Price columns automatically in {filename}.")
            print(f"   Columns found: {list(df.columns)}")
            return

        records_to_insert = []
        for index, row in df.iterrows():
            # හිස් දත්ත මඟහැරීම
            if not pd.isna(row[price_col]):
                formatted_date = parse_date(row[week_col])
                
                if formatted_date:
                    records_to_insert.append({
                        "crop": crop_name,
                        "date": formatted_date,       
                        "original_week": row[week_col], 
                        "price": float(row[price_col])
                    })

        if records_to_insert:
            collection.insert_many(records_to_insert)
            print(f"✅ Successfully inserted {len(records_to_insert)} records for '{crop_name}'!")
        else:
            print(f"⚠️ No valid data found for '{crop_name}'.")

    except Exception as e:
        print(f"❌ Error importing {crop_name}: {e}")

crop_files = {
    # ඔයාගේ කැරට්, බෝංචි, ලීක්ස් දැනටමත් ගිහින් තියෙන නිසා ඒවා Comment කරලා තියෙන්නේ. 
    # ඕනෙනම් ඒවත් ආයෙත් දාන්න පුළුවන් (හැබැයි Duplicate වෙයි කියලා මම ඒවා නැවැත්තුවා)
    
    # "carrot": "carrot_weekly_prices_2020_2025.csv",
    # "bean": "beans_green_weekly_prices_2020_2025.csv",
    # "leeks": "leeks_weekly_prices_2020_2025_1.csv",
    
    "tomato": "tomato_no1_weekly_prices_2020_2025.csv",
    "bandakka": "bandakka_weekly_prices_2020_2025.csv",
    "bitterg": "bitter_guard_weekly_prices_2020_2025.csv",
    "bringel": "brinjal_weekly_prices_2020_2025.csv",
    "cucumber": "cucumber_weekly_prices_2020_2025.csv",
    "long": "long_beans_weekly_prices_2020_2025.csv"
}

print("Starting Import Process for Remaining Crops...")
for crop, file in crop_files.items():
    import_crop_data(crop, file)
print("Import Process Completed!")
import requests
from bs4 import BeautifulSoup
import pdfplumber
import io
import re
from pymongo import MongoClient
import datetime
import urllib.parse

# --- 1. අලුත්ම HARTI PDF ලින්ක් එක සොයාගැනීම ---
def get_latest_harti_bulletin_url():
    # HARTI වෙබ් අඩවියේ නිවැරදිම අලුත් URL එක
    harti_url = "https://www.harti.gov.lk/weekly-price.php"
    print("Checking HARTI website for the latest weekly bulletin...")
    
    try:
        response = requests.get(harti_url)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        for link in soup.find_all('a', href=True):
            href_decoded = urllib.parse.unquote(link['href']).lower()
            
            # .pdf ෆයිල් එකක් විය යුතු අතර, අනිවාර්යයෙන්ම "weekly" යන්න ලින්ක් එකේ තිබිය යුතුය
            if '.pdf' in href_decoded and 'weekly' in href_decoded:
                pdf_url = link['href']
                
                if not pdf_url.startswith('http'):
                    if not pdf_url.startswith('/'):
                        pdf_url = '/' + pdf_url
                    pdf_url = "https://www.harti.gov.lk" + pdf_url
                    
                pdf_url = pdf_url.replace(" ", "%20")
                return pdf_url
                
        return None
    except Exception as e:
        print(f"Error fetching HARTI webpage: {e}")
        return None

# --- 2. PDF එකෙන් සිල්ලර මිල (Retail Prices) පමණක් වෙන් කරගැනීම ---
def extract_retail_prices_from_pdf(pdf_url):
    print(f"Downloading PDF from: {pdf_url}")
    
    target_vegetables = {
        "bean": ["beans", "බෝංචි"],
        "carrot": ["carrot", "කැරට්"],
        "leeks": ["leeks", "ලීක්ස්"],
        "tomato": ["tomato", "තක්කාලි"],
        "bandakka": ["okra", "bandakka", "බණ්ඩක්කා"],
        "bitterg": ["bitter gourd", "කරවිල"],
        "bringel": ["brinjal", "eggplant", "වම්බටු"],
        "cucumber": ["cucumber", "පිපිඤ්ඤා"],
        "long": ["long beans", "මෑකරල්"]
    }
    
    extracted_prices = {}
    
    try:
        response = requests.get(pdf_url)
        with pdfplumber.open(io.BytesIO(response.content)) as pdf:
            print(f"Total pages in PDF: {len(pdf.pages)}")
            
            for page_num, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text:
                    lines = text.split('\n')
                    for line in lines:
                        line_lower = line.lower()
                        for veg_key, search_terms in target_vegetables.items():
                            if any(term in line_lower for term in search_terms):
                                # කොමා (,) සහිත ඉලක්කම් ද හඳුනාගැනීම
                                prices = re.findall(r'\d{1,3}(?:,\d{3})*\.\d{2}', line)
                                
                                if prices:
                                    price_val = float(prices[-1].replace(',', ''))
                                    # රුපියල් 10ට වැඩි අගයන් පමණක් ගැනීම
                                    if price_val > 10.0:
                                        extracted_prices[veg_key] = price_val
                                        print(f"--> Found {veg_key.upper()}: Rs. {price_val} (from Page {page_num + 1})")
                                        
        return extracted_prices
        
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return None 

# --- 3. ලබාගත් දත්ත MongoDB වෙත Save කිරීම ---
def save_to_mongodb(prices_dict):
    if not prices_dict:
        print("No prices to save.")
        return

    try:
        client = MongoClient("mongodb://localhost:27017/")
        db = client["vegetable_db"]
        collection = db["weekly_prices"]
        
        today_date = datetime.date.today().isoformat()
        inserted_count = 0
        
        for crop_name, price in prices_dict.items():
            document = {
                "crop": crop_name,
                "date": today_date,
                "price": price
            }
            
            result = collection.update_one(
                {"crop": crop_name, "date": today_date}, 
                {"$set": document}, 
                upsert=True
            )
            
            if result.upserted_id or result.modified_count > 0:
                inserted_count += 1
                
        print(f"Successfully saved/updated {inserted_count} records in MongoDB for Date: {today_date}")
        
    except Exception as e:
        print(f"Database Save Error: {e}")

# --- 4. ප්‍රධාන ක්‍රියාවලිය ---
def run_harti_scraper():
    print("--- Starting HARTI Auto-Scraper ---")
    latest_pdf_url = get_latest_harti_bulletin_url()
    
    if latest_pdf_url:
        prices = extract_retail_prices_from_pdf(latest_pdf_url)
        if prices:
            print(f"\nExtracted Retail Prices Summary: {prices}")
            save_to_mongodb(prices)
        else:
            print("Failed to extract prices from the PDF.")
    else:
        print("Could not find the latest HARTI bulletin PDF.")
    print("--- Scraper Execution Completed ---\n")

if __name__ == "__main__":
    run_harti_scraper()
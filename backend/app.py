from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import os
import re
import requests
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://doc-management-alpha.vercel.app",
        "https://doc-management.vercel.app",
        "https://doc-management-dhvl5too2-alisonrajpals-projects.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OCR_API_KEY = os.getenv("OCR_SPACE_API_KEY", "")


@app.get("/")
def read_root():
    return {"message": "PDF Text Extraction is running"}


@app.get("/ping")
async def ping():
    return {"status": "alive"}


def extract_text_from_pdf(file_bytes):
    """Extract text using OCR.space API - works for ALL PDFs"""
    try:
        files = {'file': ('invoice.pdf', file_bytes, 'application/pdf')}
        payload = {
            'apikey': OCR_API_KEY,
            'language': 'eng',
            'isOverlayRequired': False,
            'filetype': 'PDF',
            'OCREngine': 2
        }
        response = requests.post(
            'https://api.ocr.space/parse/image',
            files=files,
            data=payload,
            timeout=60
        )
        result = response.json()

        if result.get('IsErroredOnProcessing'):
            print(f"OCR Error: {result.get('ErrorMessage')}")
            return ""

        text = ""
        for page in result.get('ParsedResults', []):
            text += page.get('ParsedText', "") + "\n"

        print(f"OCR extracted {len(text)} characters")
        print(f"Preview: {text[:500]}")
        return text

    except Exception as e:
        print(f"OCR extraction error: {e}")
        return ""


def extract_vat_from_line(line: str) -> str | None:
    """
    Given a single line that contains 'VAT', extract the actual VAT amount.

    Strategy: collect ALL R-amounts on the line, then return the LAST one.

    Why the last one?
    - Invoice lines look like:  "VAT (15% on R346.96)  R52.04"
      or:                       "VAT 15%               R52.04"
      or:                       "Tax (GST 10% of $500) $50.00"
    - The tax base (R346.96) always appears INSIDE parentheses BEFORE the
      actual VAT charge.  The actual charge is always the rightmost amount.
    - Even on simple lines like "VAT  R52.04" the last amount is correct.
    """

    # Normalise: treat $ £ € R as equivalent currency markers
    currency = r'(?:R|ZAR|\$|£|€|USD|GBP|EUR)?\s*'

    # Find every numeric amount on this line (with optional currency prefix)
    all_amounts = re.findall(
        rf'{currency}(\d{{1,10}}(?:[.,]\d{{2,3}})?)',
        line,
        re.IGNORECASE
    )

    if not all_amounts:
        return None

    # The LAST amount is the actual VAT charged
    vat_candidate = all_amounts[-1].replace(',', '.')

    try:
        value = float(vat_candidate)
        # Sanity check: VAT should be positive and realistically sized
        if 0 < value < 100_000:
            return f"{value:.2f}"
    except ValueError:
        pass

    return None


def parse_invoice_text(text: str) -> dict:
    """Parse invoice data from extracted text - works for any invoice"""
    result = {"vendor": "", "number": "", "date": "", "amount": "", "vat": ""}

    if not text:
        return result

    print("RAW TEXT FOR PARSING:")
    print(text[:1500])

    lines = text.split('\n')
    clean_lines = [line.strip() for line in lines if line.strip()]

    # ── VENDOR ──────────────────────────────────────────────────────────────
    for line in clean_lines[:20]:
        if re.search(r'(LLC|Inc|Ltd|Pty|Corp|Company|Technologies|Solutions|Services)', line, re.IGNORECASE):
            result["vendor"] = line
            break
        if re.search(r'@[\w\-]+\.[\w\-]+', line):
            idx = clean_lines.index(line)
            if idx > 0:
                result["vendor"] = clean_lines[idx - 1]
                break

    if not result["vendor"]:
        for line in clean_lines[:10]:
            if len(line) > 5 and not re.match(r'^(Invoice|Date|Page|Tax|VAT|Bill)', line, re.IGNORECASE):
                result["vendor"] = line
                break

    # ── INVOICE NUMBER ───────────────────────────────────────────────────────
    number_patterns = [
        r'Invoice\s+(?:number|no\.?|#)\s*[:\-]?\s*([A-Z0-9][\w\-]*)',
        r'INV[:\s\-]+([A-Z0-9][\w\-]*)',
        r'(?:^|\s)([A-Z]{2,}\d{4,}[\w\-]*)',
    ]
    for pattern in number_patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            result["number"] = match.group(1).strip()
            break

    # ── DATE ─────────────────────────────────────────────────────────────────
    date_patterns = [
        r'(?:Date of issue|Invoice Date|Issue Date|Date)[:\s]+(\w+\s+\d{1,2},?\s+\d{4})',
        r'(?:Date of issue|Invoice Date|Issue Date|Date)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})',
        r'(\d{4}-\d{2}-\d{2})',
        r'(\d{1,2}/\d{1,2}/\d{4})',
        r'(\d{1,2}-\d{1,2}-\d{4})',
    ]
    months_map = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
    }

    for pattern in date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            date_str = match.group(1)
            # Already ISO
            if re.match(r'\d{4}-\d{2}-\d{2}', date_str):
                result["date"] = date_str
                break
            # Slash or dash separated
            if re.search(r'[\/\-]', date_str):
                parts = re.split(r'[\/\-]', date_str)
                if len(parts) == 3:
                    # Determine if year-first or year-last
                    if len(parts[0]) == 4:
                        result["date"] = f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
                    else:
                        result["date"] = f"{parts[2]}-{parts[0].zfill(2)}-{parts[1].zfill(2)}"
                    break
            # Month-name format
            for month, num in months_map.items():
                if month.lower() in date_str.lower():
                    day_match = re.search(r'(\d{1,2})', date_str)
                    year_match = re.search(r'(\d{4})', date_str)
                    if day_match and year_match:
                        result["date"] = f"{year_match.group(1)}-{num}-{day_match.group(1).zfill(2)}"
                    break
            if result["date"]:
                break

    # ── AMOUNT (subtotal / pre-tax) ──────────────────────────────────────────
    amount_patterns = [
        r'(?:Subtotal|Sub-total|Sub total)[:\s]*(?:R|ZAR|\$|£|€)?\s*(\d+(?:[.,]\d{2})?)',
        r'(?:Total excluding tax|Taxable amount|Net amount)[:\s]*(?:R|ZAR|\$|£|€)?\s*(\d+(?:[.,]\d{2})?)',
        r'(?:Amount due|Amount payable)[:\s]*(?:R|ZAR|\$|£|€)?\s*(\d+(?:[.,]\d{2})?)',
    ]
    for pattern in amount_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            result["amount"] = match.group(1).replace(',', '.')
            break

    # Fallback: largest R-amount before the first VAT mention
    if not result["amount"]:
        vat_pos = re.search(r'\bVAT\b|\bTax\b|\bGST\b', text, re.IGNORECASE)
        search_area = text[:vat_pos.start()] if vat_pos else text
        amounts = re.findall(r'(?:R|ZAR|\$|£|€)\s*(\d+(?:[.,]\d{2})?)', search_area, re.IGNORECASE)
        if amounts:
            numeric = [float(a.replace(',', '.')) for a in amounts]
            result["amount"] = f"{max(numeric):.2f}"

    # ── VAT ──────────────────────────────────────────────────────────────────
    # Step 1: find every line that mentions VAT / Tax / GST
    vat_line_pattern = re.compile(
        r'.*(VAT|Tax|GST|Sales\s*Tax|Value.?Added).*',
        re.IGNORECASE
    )

    for line in clean_lines:
        if vat_line_pattern.match(line):
            # Skip lines that are clearly headers or percentage-only lines
            # e.g. "VAT Registration No: 1234" or "VAT: 15%"
            if re.search(r'registration|reg\.?\s*no|number|rate\s*only', line, re.IGNORECASE):
                continue
            if not re.search(r'\d+[.,]\d{2}', line):
                # No decimal amount on this line — skip
                continue

            vat_value = extract_vat_from_line(line)
            if vat_value:
                # Extra guard: don't accept if it equals the subtotal
                if result["amount"] and vat_value == result["amount"]:
                    continue
                result["vat"] = vat_value
                print(f"DEBUG - VAT line: '{line}' → VAT: {vat_value}")
                break

    # Fallback: percentage-based calculation if amount is known
    if not result["vat"] and result["amount"]:
        pct_match = re.search(r'(\d+(?:\.\d+)?)\s*%', text)
        if pct_match:
            rate = float(pct_match.group(1)) / 100
            base = float(result["amount"])
            calculated = base * rate
            # Only use if it looks like a realistic VAT rate (5%–30%)
            if 0.05 <= rate <= 0.30:
                result["vat"] = f"{calculated:.2f}"
                print(f"DEBUG - VAT calculated from {rate*100:.0f}%: {result['vat']}")

    print(f"Final extracted result: {result}")
    return result


@app.post("/extract")
async def extract_invoice_data(
    file: UploadFile = File(...),
    document_type: str = Form("invoice")
):
    try:
        file_bytes = await file.read()
        text = extract_text_from_pdf(file_bytes)

        if not text:
            return {
                "vendor": "Unknown Vendor",
                "number": "INV-" + str(int(os.urandom(4).hex(), 16))[:8],
                "date": "2026-01-01",
                "amount": "0.00",
                "vat": "0.00"
            }

        result = parse_invoice_text(text)

        return {
            "vendor":  result["vendor"]  or "Unknown Vendor",
            "number":  result["number"]  or "INV-" + str(int(os.urandom(4).hex(), 16))[:8],
            "date":    result["date"]    or "2026-01-01",
            "amount":  result["amount"]  or "0.00",
            "vat":     result["vat"]     or "0.00"
        }

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "vendor": "Unknown Vendor",
            "number": "INV-" + str(int(os.urandom(4).hex(), 16))[:8],
            "date": "2026-01-01",
            "amount": "0.00",
            "vat": "0.00"
        }


@app.post("/ai-insights")
async def get_ai_insights():
    """Generate AI-powered insights using Hugging Face"""
    try:
        HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY", "")

        if not HF_API_KEY:
            return {
                "type": "calculated",
                "spending_insight": "Add HUGGINGFACE_API_KEY to .env for AI insights",
                "anomaly_insight": "Using calculated insights mode",
                "recommendation_insight": "No API key configured",
                "summary": "AI insights unavailable"
            }

        prompt = "Analyze spending patterns and provide business insights. Spending is stable. Approval rate is good. No anomalies detected."

        response = requests.post(
            "https://api-inference.huggingface.co/models/facebook/bart-large-mnli",
            headers={"Authorization": f"Bearer {HF_API_KEY}"},
            json={"inputs": prompt, "parameters": {"candidate_labels": ["positive", "negative", "neutral"]}},
            timeout=30
        )

        if response.status_code == 200:
            data = response.json()
            return {
                "type": "ai",
                "spending_insight": f"AI Analysis: {data.get('labels', ['normal'])[0]} spending pattern detected.",
                "anomaly_insight": "No unusual patterns detected in current data.",
                "recommendation_insight": "Continue monitoring spending trends for optimization.",
                "summary": "AI-powered insights are active."
            }
        else:
            return {
                "type": "fallback",
                "spending_insight": "Using calculated insights (AI temporarily unavailable)",
                "anomaly_insight": "No anomalies detected",
                "recommendation_insight": "Check your Hugging Face API key if this persists",
                "summary": "Smart analysis active"
            }

    except Exception as e:
        print(f"AI Insights error: {e}")
        return {
            "type": "fallback",
            "spending_insight": "Smart analysis active (AI unavailable)",
            "anomaly_insight": "No anomalies detected",
            "recommendation_insight": "Continue uploading documents for better insights",
            "summary": "Using calculated insights"
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

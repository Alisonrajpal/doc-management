    # ============ AMOUNT EXTRACTION ============
    if is_credit_note:
        # For credit notes: extract the refund/subtotal amount (before VAT)
        # Look for the line item amount, not the total credit
        amount_patterns = [
            # Look for table row with description, quantity, unit price, total
            r'Refund.*?\|\s*\d+\s*\|\s*\d+(?:\.\d{2})?\s*\|\s*(\d+(?:\.\d{2})?)',
            r'Item.*?\|\s*\d+\s*\|\s*\d+(?:\.\d{2})?\s*\|\s*(\d+(?:\.\d{2})?)',
            # Look for subtotal before VAT
            r'Subtotal[\s:]*[R$]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Amount\s+Credited:\s*[R$]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Credit\s+Amount:\s*[R$]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            # Look for number in the table row (fallback)
            r'\|\s*(\d+(?:\.\d{2})?)\s*\|\s*(\d+(?:\.\d{2})?)\s*\|',
        ]
        for pattern in amount_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                # If there are multiple groups, take the last one (the total column)
                if match.lastindex and match.lastindex > 1:
                    result["amount"] = match.group(match.lastindex).replace(',', '')
                else:
                    result["amount"] = match.group(1).replace(',', '')
                break
    else:
        # For invoices: extract the total amount due
        amount_patterns = [
            r'Total\s+Due:\s*[R$]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Total\s+Amount:\s*[R$]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Grand\s+Total:\s*[R$]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Amount\s+Due:\s*[R$]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Balance\s+Due:\s*[R$]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
            r'Total[\s:]+[R$]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
        ]
        for pattern in amount_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                result["amount"] = match.group(1).replace(',', '')
                break

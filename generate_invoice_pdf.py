import os
import pandas as pd
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from PyPDF2 import PdfReader, PdfWriter
from datetime import datetime, timedelta

def format_number(value):
    """Formats a number to two decimal places."""
    return f"{value:.2f}"

def extract_row_values(row):
    """Extracts and maps values from a data row for PDF display."""
    return {
        "Code réservation": row.get('Code réservation', ''),
        "Date création": row.get('Date création', ''),
        "Montant HT Passagers": float(row.get('Montant HT Passagers', 0.0)),
        "Montant HT Vehicle": float(row.get('Montant HT Vehicle', 0.0)),
        "Montant HT Installation Cabin": float(row.get('Montant HT Installation Cabin', 0.0)),
        "Montant HT Installation Lit": float(row.get('Montant HT Installation Lit', 0.0)),
        "Montant HT Installation Facieuteil": float(row.get('Montant HT Installation Facieuteil', 0.0)),
        "Montant HT Animaux et extra": float(row.get('Montant HT Animaux et extra', 0.0)),
        "Montant HT Autres": float(row.get('Montant HT Autres', 0.0)),
        "Frais carburant vehicle": float(row.get('Frais carburant vehicle', 0.0)),
        "Frais carburant other": float(row.get('Frais carburant other', 0.0)),
        "Frais passagers": float(row.get('Frais passagers', 0.0)),
        "Frais hauturier": float(row.get('Frais hauturier', 0.0)),
        "Frais modification": float(row.get('Frais modification', 0.0)),
        "Montant HT TTC": float(row.get('Montant HT TTC', 0.0)),
        "Solde-restant du": float(row.get('Solde-restant du', 0.0)),
        "Commission calculer agent": float(row.get('Commission calculer agent', 0.0))
    }

def overlay_content(background_pdf, content_pdf, output_pdf):
    """Overlays the generated content PDF on top of the background PDF."""
    background_reader = PdfReader(background_pdf)
    content_reader = PdfReader(content_pdf)
    writer = PdfWriter()

    background_page = background_reader.pages[0]
    content_page = content_reader.pages[0]
    background_page.merge_page(content_page)
    writer.add_page(background_page)

    for i in range(1, len(content_reader.pages)):
        writer.add_page(content_reader.pages[i])

    with open(output_pdf, "wb") as output_file:
        writer.write(output_file)

def create_invoice_pdf(output_file, company_info, invoice_details, bookings_data, background_pdf=None, commission_percentage=None):
    """Creates an invoice in PDF format based on the provided details."""
    temp_output_file = "temp_invoice.pdf"
    doc = SimpleDocTemplate(temp_output_file, pagesize=landscape(letter), rightMargin=10, leftMargin=25, topMargin=80, bottomMargin=10)
    styles = getSampleStyleSheet()
    elements = []

    # Header Section
    header_style = styles["Heading1"]
    header_style.alignment = 0
    header_style.fontSize = 14
    elements.append(Paragraph("Agent Invoice", header_style))
    elements.append(Spacer(1, 8))

    subheader_style = styles["Normal"]
    subheader_style.fontSize = 10
    elements.append(Paragraph(f"Invoice No: {invoice_details['invoice_number']}", subheader_style))
    elements.append(Paragraph(f"Invoice Date: {invoice_details['invoice_date']}", subheader_style))
    elements.append(Paragraph(f"Due Date: {invoice_details['due_date']}", subheader_style))
    elements.append(Paragraph(f"Currency: {invoice_details['currency']}", subheader_style))
    elements.append(Spacer(1, 8))

    # Client Information Section
    client_info_style = styles["Normal"]
    client_info_style.fontSize = 9
    elements.append(Paragraph("<strong>Billed To:</strong>", client_info_style))
    elements.append(Paragraph(f"Agent Code: {company_info['agent_code']}", client_info_style))
    elements.append(Paragraph(f"Agent Name: {company_info['name']}", client_info_style))
    elements.append(Paragraph(f"GSA: {company_info['gsa']}", client_info_style))
    elements.append(Spacer(1, 8))

    # PDF Table Headers - mapped from source columns
    headers = [
        "Code Rés.", "Date Créa.", "PAX HT", "VEH HT", "Cabin",
        "Lit", "Facieuteil", "Animaux", "Autres", "Carb.Veh", "Carb.Other",
        "Frais PAX", "Frais Haut.", "Frais Mod.", "TTC", "Devise", "Commission"
    ]
    data = [headers]

    # Initialize totals
    totals = {col: 0.0 for col in headers if col not in ["Code Rés.", "Date Créa.", "Devise"]}
    autres_values = []  # Track Autres column values to check if all are 0

    # Process each booking row and map to PDF columns
    for row_dict in bookings_data:
        values = extract_row_values(row_dict)

        # Track Autres values
        autres_val = values["Montant HT Autres"]
        autres_values.append(autres_val)

        # Map source columns to PDF display columns
        row = [
            values["Code réservation"],
            values["Date création"],
            format_number(values["Montant HT Passagers"]),
            format_number(values["Montant HT Vehicle"]),
            format_number(values["Montant HT Installation Cabin"]),
            format_number(values["Montant HT Installation Lit"]),
            format_number(values["Montant HT Installation Facieuteil"]),
            format_number(values["Montant HT Animaux et extra"]),
            format_number(autres_val),
            format_number(values["Frais carburant vehicle"]),
            format_number(values["Frais carburant other"]),
            format_number(values["Frais passagers"]),
            format_number(values["Frais hauturier"]),
            format_number(values["Frais modification"]),
            format_number(values["Montant HT TTC"]),
            row_dict.get('Currency', invoice_details['currency']),
            format_number(values["Commission calculer agent"])
        ]
        data.append(row)

        # Accumulate totals
        totals["PAX HT"] += values["Montant HT Passagers"]
        totals["VEH HT"] += values["Montant HT Vehicle"]
        totals["Cabin"] += values["Montant HT Installation Cabin"]
        totals["Lit"] += values["Montant HT Installation Lit"]
        totals["Facieuteil"] += values["Montant HT Installation Facieuteil"]
        totals["Animaux"] += values["Montant HT Animaux et extra"]
        totals["Autres"] += autres_val
        totals["Carb.Veh"] += values["Frais carburant vehicle"]
        totals["Carb.Other"] += values["Frais carburant other"]
        totals["Frais PAX"] += values["Frais passagers"]
        totals["Frais Haut."] += values["Frais hauturier"]
        totals["Frais Mod."] += values["Frais modification"]
        totals["TTC"] += values["Montant HT TTC"]
        totals["Commission"] += values["Commission calculer agent"]

    # Check if Autres column should be removed (all values are 0)
    remove_autres = all(val == 0.0 for val in autres_values) if autres_values else False

    # Remove Autres column if all values are 0
    if remove_autres and "Autres" in headers:
        autres_idx = headers.index("Autres")
        headers.pop(autres_idx)
        # Remove from header row
        data[0] = headers
        # Remove from all data rows
        for i in range(1, len(data)):
            data[i].pop(autres_idx)

    # Add totals row
    currency = invoice_details['currency']
    totals_row = [
        "TOTALS", "",
        format_number(totals["PAX HT"]),
        format_number(totals["VEH HT"]),
        format_number(totals["Cabin"]),
        format_number(totals["Lit"]),
        format_number(totals["Facieuteil"]),
        format_number(totals["Animaux"]),
    ]

    if not remove_autres:
        totals_row.append(format_number(totals["Autres"]))

    totals_row.extend([
        format_number(totals["Carb.Veh"]),
        format_number(totals["Carb.Other"]),
        format_number(totals["Frais PAX"]),
        format_number(totals["Frais Haut."]),
        format_number(totals["Frais Mod."]),
        format_number(totals["TTC"]),
        currency,
        format_number(totals["Commission"])
    ])
    data.append(totals_row)

    # Style the table with optimized column widths for landscape
    num_cols = len(headers)
    base_width = 45
    col_widths = [base_width] * num_cols
    col_widths[0] = 45  # Code Rés.
    col_widths[1] = 50  # Date Créa.

    # Adjust last columns
    if num_cols >= 2:
        col_widths[-1] = 50  # Commission
    if num_cols >= 3:
        col_widths[-2] = 40  # Devise

    table = Table(data, repeatRows=1, colWidths=col_widths)
    table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('SPAN', (0, -1), (1, -1)),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey)
    ]))
    table.hAlign = 'LEFT'
    elements.append(table)
    elements.append(Spacer(1, 8))

    # Build the temporary PDF
    doc.build(elements)

    # Overlay the generated content on the background PDF
    if background_pdf:
        overlay_content(background_pdf, temp_output_file, output_file)
        os.remove(temp_output_file)
    else:
        os.replace(temp_output_file, output_file)

def create_dummy_data():
    """Creates dummy booking data matching the exact spreadsheet structure."""
    dummy_data = {
        'Code réservation': ['BK001', 'BK002', 'BK003'],
        'Date création': ['2026-05-10', '2026-05-11', '2026-05-12'],
        'Device': ['WEB', 'API', 'WEB'],
        'Montant HT Passagers': [300.00, 600.00, 180.00],
        'Montant HT Vehicle': [50.00, 120.00, 0.00],
        'Montant HT Installation Cabin': [0.00, 100.00, 0.00],
        'Montant HT Installation Lit': [0.00, 0.00, 0.00],
        'Montant HT Installation Facieuteil': [0.00, 0.00, 0.00],
        'Montant HT Animaux et extra': [0.00, 0.00, 0.00],
        'Montant HT Autres': [0.00, 0.00, 0.00],
        'Frais carburant vehicle': [15.00, 20.00, 10.00],
        'Frais carburant other': [0.00, 0.00, 0.00],
        'Frais passagers': [25.00, 30.00, 18.00],
        'Frais hauturier': [0.00, 15.00, 0.00],
        'Frais modification': [5.00, 0.00, 4.00],
        'Montant HT TTC': [390.00, 885.00, 212.00],
        'Solde-restant du': [0.00, 0.00, 0.00],
        'Commission': [39.00, 88.50, 21.20],
        'Agent Name': ['Travel Agency A', 'Travel Agency B', 'Travel Agency A'],
        'Agent Code': ['AG001', 'AG002', 'AG001'],
        'Currency': ['EUR', 'EUR', 'EUR']
    }
    return pd.DataFrame(dummy_data)

def main():
    """Main function to generate a sample invoice PDF."""
    # Create dummy data
    sales_data = create_dummy_data()

    # Create output directory
    os.makedirs("SAMPLE_INVOICES", exist_ok=True)

    # Select a specific agent and currency
    agent_name = "Travel Agency A"
    currency = "EUR"

    # Filter data for the agent
    agent_data = sales_data[
        (sales_data['Agent Name'] == agent_name) &
        (sales_data['Currency'] == currency)
    ]

    if agent_data.empty:
        print(f"No data found for agent {agent_name}")
        return

    # Convert to list of dictionaries for easier mapping
    bookings_list = agent_data.to_dict('records')

    # Generate invoice details
    invoice_date = datetime.now().strftime('%Y-%m-%d')
    due_date = (datetime.now() + timedelta(days=15)).strftime('%Y-%m-%d')
    date_col = 'Date création' if 'Date création' in agent_data.columns else 'Date creation'
    first_booking_date = agent_data[date_col].min().replace('-', '')
    invoice_number = f"{first_booking_date}00001"

    company_info = {
        "name": agent_name,
        "address": "123 Travel Street",
        "agent_code": agent_data['Agent Code'].iloc[0],
        "gsa": "NOURIS EUR"
    }

    invoice_details = {
        "invoice_number": invoice_number,
        "invoice_date": invoice_date,
        "due_date": due_date,
        "currency": currency
    }

    # Determine background PDF (if it exists)
    background_pdf_path = "NourisT.pdf"
    background_pdf = background_pdf_path if os.path.exists(background_pdf_path) else None

    # Generate the PDF
    output_file = os.path.join("SAMPLE_INVOICES", f"Invoice_{agent_name.replace(' ', '_')}_{invoice_date}.pdf")
    print(f"Generating invoice: {output_file}")
    print(f"Background PDF: {'Using {}'.format(background_pdf) if background_pdf else 'None (standalone PDF)'}")
    print(f"Number of bookings: {len(bookings_list)}")

    create_invoice_pdf(output_file, company_info, invoice_details, bookings_list,
                      background_pdf=background_pdf, commission_percentage=None)
    print(f"Invoice generated successfully: {output_file}")

if __name__ == "__main__":
    main()

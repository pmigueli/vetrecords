# Sample Data

This directory contains sample clinical history documents for testing.

## How to use

Place real PDF/DOCX clinical history files here for upload testing.
The seed script (`python -m app.seed`) creates a pre-processed example
in the database so reviewers can explore the full UI immediately.

## Analyzed documents

The system was designed by analyzing two real clinical history documents:

1. **Marley** (Labrador Retriever, Kivet Parque Oeste)
   - 9 pages, 25+ visits
   - Informal Spanish chronological notes
   - Casual abbreviations ("tto", "EFG", "pv")

2. **Alya** (Yorkshire Terrier, HV Costa Azahar)
   - 16 pages, 15+ visits
   - Formal structured sections
   - Lab result tables with reference ranges

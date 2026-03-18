GLOSSARIES = {
    "es": """
Common Spanish veterinary abbreviations:
- "EFG" or "EF" = Exploración física general (physical examination)
- "tto" = tratamiento (treatment)
- "pv" = peso vivo (body weight)
- "comp" = comprimido (tablet)
- "Tª" or "T:" = temperatura (temperature)
- "FC" = frecuencia cardíaca (heart rate)
- "FR" = frecuencia respiratoria (respiratory rate)
- "TRC" = tiempo de relleno capilar (capillary refill time)
- "DH" = deshidratación (dehydration)
- "Dx" = diagnóstico (diagnosis)
- "Rx" = radiografía (X-ray)
- "Eco" = ecografía (ultrasound)
- "AB" = antibiótico (antibiotic)
- "vac" = vacuna (vaccine)
- "SID" = once daily, "BID" = twice daily, "TID" = three times daily
- "SC" = subcutaneous, "IV" = intravenous, "PO" = oral, "IM" = intramuscular
- "cada Xh" = every X hours
""",
    "en": """
Common English veterinary abbreviations:
- "PE" = physical examination
- "Tx" = treatment
- "BW" = body weight
- "tab" = tablet, "cap" = capsule
- "T" or "Temp" = temperature
- "HR" = heart rate, "RR" = respiratory rate
- "CRT" = capillary refill time
- "Dx" = diagnosis, "Rx" = prescription
- "US" or "U/S" = ultrasound
- "ABx" = antibiotic
- "SID" = once daily, "BID" = twice daily, "TID" = three times daily
- "SC" / "SQ" = subcutaneous, "IV" = intravenous, "PO" = oral
- "q4h" = every 4 hours, "prn" = as needed, "NPO" = nothing by mouth
""",
    "fr": """
Common French veterinary abbreviations:
- "EG" = examen général (physical examination)
- "ttt" = traitement (treatment)
- "PV" = poids vif (body weight)
- "cp" = comprimé (tablet)
- "T°" = température (temperature)
- "FC" = fréquence cardiaque (heart rate)
- "FR" = fréquence respiratoire (respiratory rate)
- "ATB" = antibiotique (antibiotic)
- "SC" = sous-cutané, "IV" = intraveineux, "PO" = per os
- "/j" = per day (e.g., "2x/j" = twice daily)
""",
    "pt": """
Common Portuguese veterinary abbreviations:
- "EF" = exame físico (physical examination)
- "tto" = tratamento (treatment)
- "PV" = peso vivo (body weight)
- "comp" = comprimido (tablet)
- "T" = temperatura (temperature)
- "FC" = frequência cardíaca (heart rate)
- "FR" = frequência respiratória (respiratory rate)
- "Dx" = diagnóstico (diagnosis)
- "SC" = subcutâneo, "IV" = intravenoso, "VO" = via oral
- "SID" = uma vez ao dia, "BID" = duas vezes ao dia
""",
}


def get_glossary(language_code: str) -> str:
    """Return abbreviation glossary for the detected language."""
    return GLOSSARIES.get(language_code, "")

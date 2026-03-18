"""Regex-based fallback structurer for when no API key is available.

Extracts basic information using pattern matching:
- Dates from visit headers
- Weight from common patterns (4.1kg, Peso 7 kg, pv 15kg)
- Temperature from patterns (37°C, Tª 38.5, T: 39)
- Visit type heuristics (urgencia/emergency, vacuna/vaccination, etc.)

This provides a degraded but functional experience without any API calls.
"""

import logging
import re

from app.schemas.pet import PetCreate

logger = logging.getLogger(__name__)

# Weight patterns
WEIGHT_PATTERNS = [
    r"(\d+[.,]\d+)\s*kg",
    r"[Pp]eso\s*:?\s*(\d+[.,]\d+)\s*kg?",
    r"[Pp]v\s*:?\s*(\d+[.,]\d+)\s*kg?",
    r"^(\d+[.,]\d+)kg",
]

# Temperature patterns
TEMP_PATTERNS = [
    r"(\d{2}[.,]\d+)\s*[°º]?\s*[Cc]",
    r"[Tt]ª?\s*:?\s*(\d{2}[.,]\d+)",
    r"[Tt]emp(?:eratura)?\s*:?\s*(\d{2}[.,]\d+)",
]

# Visit type keywords
VISIT_TYPE_KEYWORDS = {
    "emergency": ["urgencia", "emergency", "urgente"],
    "vaccination": ["vacuna", "vaccination", "vacunacion", "vacunación"],
    "follow_up": ["revision", "revisión", "follow", "control", "seguimiento"],
    "surgery": ["cirugia", "cirugía", "surgery", "operación"],
    "phone_call": ["llamada", "phone", "teléfono", "telefónica"],
    "hospitalization": ["hospitaliz", "ingreso"],
    "lab_results": ["analítica", "analitica", "laboratorio", "lab result"],
}


class RegexStructurer:
    """Fallback structurer using regex patterns when no API key is available."""

    def extract_pet(self, header_text: str) -> PetCreate:
        """Extract basic pet info using regex from header text."""
        logger.info("Using regex fallback for pet extraction")

        name = self._extract_first(
            r"(?:nombre|name|mascota)\s*:?\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)",
            header_text,
        )
        # Try to find a prominent name (all caps word that's not a field label)
        if not name:
            caps_words = re.findall(r"\b([A-ZÁÉÍÓÚÑ]{2,})\b", header_text)
            skip = {
                "MASCOTA", "DATOS", "CLIENTE", "HISTORIAL", "COMPLETO",
                "CENTRO", "CANINA", "CANINO", "FELINA", "FELINO",
                "AVDA", "SEXO", "NOMBRE", "ESPECIE", "RAZA",
            }
            for word in caps_words:
                if word not in skip:
                    name = word.title()
                    break

        species = None
        if re.search(r"[Cc]anin[oa]", header_text):
            species = "Canine"
        elif re.search(r"[Ff]elin[oa]", header_text):
            species = "Feline"

        breed = self._extract_first(
            r"(?:raza|breed)\s*:?\s*([A-Za-záéíóúñÁÉÍÓÚÑ ]+)",
            header_text,
        )

        microchip = self._extract_first(
            r"(?:chip|microchip|nº chip)\s*:?\s*(\d{10,20})",
            header_text,
        )

        sex = None
        if re.search(r"\b[Mm]acho\b|\bSexo\s*:?\s*M\b", header_text):
            sex = "Male"
        elif re.search(r"\b[Hh]embra\b|\bSexo\s*:?\s*H\b", header_text):
            sex = "Female"

        return PetCreate(
            name=name,
            species=species,
            breed=breed,
            microchip_id=microchip,
            sex=sex,
        )

    def structure_visits(
        self,
        visit_chunks: list[dict],
        language_code: str,
        on_batch_complete: object = None,
    ) -> list[dict]:
        """Structure visits using regex patterns."""
        logger.info(f"Using regex fallback for {len(visit_chunks)} visits")
        all_visits = []

        for chunk in visit_chunks:
            visit = self._structure_single_visit(chunk)
            all_visits.append(visit)

        if on_batch_complete:
            on_batch_complete(all_visits, 0, 1)

        return all_visits

    def _structure_single_visit(self, chunk: dict) -> dict:
        """Extract basic structure from a single visit chunk."""
        text = chunk["text"]
        date_raw = chunk.get("date_raw", "unknown")

        # Parse date
        date = self._parse_date(date_raw)

        # Extract weight
        weight = None
        for pattern in WEIGHT_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                weight = float(match.group(1).replace(",", "."))
                break

        # Extract temperature
        temp = None
        for pattern in TEMP_PATTERNS:
            match = re.search(pattern, text)
            if match:
                temp = float(match.group(1).replace(",", "."))
                if 35 <= temp <= 42:  # Reasonable animal temperature range
                    break
                temp = None

        # Detect visit type
        visit_type = "consultation"
        text_lower = text.lower()
        for vtype, keywords in VISIT_TYPE_KEYWORDS.items():
            if any(kw in text_lower for kw in keywords):
                visit_type = vtype
                break

        return {
            "date": date,
            "time": None,
            "visit_type": visit_type,
            "reason": text[:200] if len(text) > 200 else text,
            "examination": None,
            "vital_signs": {
                "temperature_celsius": temp,
                "weight_kg": weight,
                "heart_rate_bpm": None,
                "respiratory_rate_rpm": None,
                "other": None,
            },
            "diagnosis": [],
            "treatment": {
                "medications": [],
                "procedures": [],
                "diet": None,
                "recommendations": [],
            },
            "lab_results": [],
            "vaccinations": [],
            "notes": None,
            "veterinarian": None,
        }

    def _parse_date(self, date_raw: str) -> str | None:
        """Convert raw date string to ISO format."""
        # Try dd/mm/yy or dd/mm/yyyy
        match = re.match(r"(\d{1,2})/(\d{1,2})/(\d{2,4})", date_raw)
        if match:
            day, month, year = match.groups()
            if len(year) == 2:
                year = f"20{year}" if int(year) < 50 else f"19{year}"
            return f"{year}-{month.zfill(2)}-{day.zfill(2)}"

        # Try yyyy-mm-dd
        match = re.match(r"(\d{4})-(\d{2})-(\d{2})", date_raw)
        if match:
            return date_raw

        return None

    def _extract_first(self, pattern: str, text: str) -> str | None:
        """Extract first regex match or return None."""
        match = re.search(pattern, text, re.IGNORECASE)
        return match.group(1).strip() if match else None

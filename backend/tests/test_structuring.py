import json
from unittest.mock import Mock

from app.services.structuring import ClaudeStructurer
from app.services.fallback import RegexStructurer


MOCK_PET_RESPONSE = json.dumps({
    "pet": {
        "name": "Marley",
        "species": "Canine",
        "breed": "Labrador Retriever",
        "date_of_birth": "2019-10-04",
        "sex": "Male",
        "microchip_id": "941000024967769",
        "coat": None,
    },
    "owner": {
        "name": "Beatriz Abarca",
        "phone": None,
        "address": "C/ Ortega y Gasset 1 Portal 3 1F, Boadilla, 28660 Madrid",
        "email": None,
    },
    "clinic": {
        "name": "Kivet Parque Oeste",
        "address": "Avda Europa, 28922 Alcorcón",
    },
})

MOCK_VISITS_RESPONSE = json.dumps([
    {
        "date": "2019-12-08",
        "time": "16:12",
        "visit_type": "emergency",
        "reason": "Emergency visit. Scab on leg.",
        "examination": "Very dehydrated. Mild hypothermia 37°C.",
        "vital_signs": {
            "temperature_celsius": 37.0,
            "weight_kg": 4.1,
            "heart_rate_bpm": None,
            "respiratory_rate_rpm": None,
            "other": None,
        },
        "diagnosis": ["Dehydration", "Intestinal parasites"],
        "treatment": {
            "medications": [
                {"name": "Cristalmina", "dosage": "topical", "frequency": "twice daily", "duration": "until healed", "route": "topical"}
            ],
            "procedures": ["Hospitalized with IV Ringer Lactate"],
            "diet": "Hill's i/d",
            "recommendations": ["Return tomorrow"],
        },
        "lab_results": [],
        "vaccinations": [],
        "notes": "Smallest of the litter.",
        "veterinarian": None,
    }
])


class TestClaudeStructurerParsing:
    """Test JSON parsing logic with mocked API responses."""

    def test_parses_pet_profile(self):
        structurer = ClaudeStructurer(api_key="fake")
        structurer._call_api = Mock(return_value=MOCK_PET_RESPONSE)

        pet = structurer.extract_pet("header text")
        assert pet.name == "Marley"
        assert pet.species == "Canine"
        assert pet.breed == "Labrador Retriever"
        assert pet.microchip_id == "941000024967769"
        assert pet.sex == "Male"
        assert pet.date_of_birth == "2019-10-04"
        assert pet.owner_name == "Beatriz Abarca"
        assert pet.clinic_name == "Kivet Parque Oeste"

    def test_parses_visit_batch(self):
        structurer = ClaudeStructurer(api_key="fake")
        structurer._call_api = Mock(return_value=MOCK_VISITS_RESPONSE)

        visits = structurer.structure_visits(
            [{"text": "visit text", "date_raw": "08/12/19"}],
            language_code="es",
        )
        assert len(visits) == 1
        assert visits[0]["date"] == "2019-12-08"
        assert visits[0]["visit_type"] == "emergency"
        assert visits[0]["vital_signs"]["weight_kg"] == 4.1
        assert len(visits[0]["diagnosis"]) == 2
        assert len(visits[0]["treatment"]["medications"]) == 1

    def test_handles_markdown_code_blocks(self):
        structurer = ClaudeStructurer(api_key="fake")
        wrapped = f"```json\n{MOCK_PET_RESPONSE}\n```"
        structurer._call_api = Mock(return_value=wrapped)

        pet = structurer.extract_pet("header text")
        assert pet.name == "Marley"

    def test_handles_missing_fields_as_none(self):
        minimal = json.dumps({
            "pet": {"name": "Luna", "species": None, "breed": None,
                    "date_of_birth": None, "sex": None,
                    "microchip_id": None, "coat": None},
            "owner": {"name": None, "phone": None, "address": None, "email": None},
            "clinic": {"name": None, "address": None},
        })
        structurer = ClaudeStructurer(api_key="fake")
        structurer._call_api = Mock(return_value=minimal)

        pet = structurer.extract_pet("minimal header")
        assert pet.name == "Luna"
        assert pet.microchip_id is None
        assert pet.owner_name is None


class TestRegexFallback:
    """Test regex-based fallback structurer."""

    def test_extracts_weight(self):
        structurer = RegexStructurer()
        visits = structurer.structure_visits(
            [{"date_raw": "08/12/19", "text": "4.1kg\nExploracion ok"}],
            language_code="es",
        )
        assert len(visits) == 1
        assert visits[0]["vital_signs"]["weight_kg"] == 4.1

    def test_extracts_temperature(self):
        structurer = RegexStructurer()
        visits = structurer.structure_visits(
            [{"date_raw": "08/12/19", "text": "37.5ºC\nExploracion ok"}],
            language_code="es",
        )
        assert visits[0]["vital_signs"]["temperature_celsius"] == 37.5

    def test_detects_emergency_type(self):
        structurer = RegexStructurer()
        visits = structurer.structure_visits(
            [{"date_raw": "08/12/19", "text": "Vienen de urgencias"}],
            language_code="es",
        )
        assert visits[0]["visit_type"] == "emergency"

    def test_detects_vaccination_type(self):
        structurer = RegexStructurer()
        visits = structurer.structure_visits(
            [{"date_raw": "04/01/20", "text": "PONGO VACUNA HEPTAVALENTE"}],
            language_code="es",
        )
        assert visits[0]["visit_type"] == "vaccination"

    def test_parses_date_dd_mm_yy(self):
        structurer = RegexStructurer()
        visits = structurer.structure_visits(
            [{"date_raw": "08/12/19", "text": "Visit notes"}],
            language_code="es",
        )
        assert visits[0]["date"] == "2019-12-08"

    def test_parses_date_dd_mm_yyyy(self):
        structurer = RegexStructurer()
        visits = structurer.structure_visits(
            [{"date_raw": "17/07/2024", "text": "Visit notes"}],
            language_code="es",
        )
        assert visits[0]["date"] == "2024-07-17"

    def test_extracts_pet_name(self):
        structurer = RegexStructurer()
        pet = structurer.extract_pet("MARLEY\nCanino\nLabrador Retriever")
        assert pet.name == "Marley"
        assert pet.species == "Canine"

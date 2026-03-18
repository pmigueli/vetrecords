"""Seed script — pre-loads a processed example so reviewers see the full UI immediately.

Usage:
    cd backend && python -m app.seed
"""

import uuid
from datetime import datetime

from app.database import SessionLocal, Base, engine
from app.models.document import Document
from app.models.pet import Pet
from app.models.visit import Visit


def seed():
    """Create Marley's record with sample visits."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if already seeded
    existing = db.query(Pet).filter(Pet.name == "Marley").first()
    if existing:
        print("Database already seeded (Marley exists). Skipping.")
        db.close()
        return

    doc_id = str(uuid.uuid4())
    pet_id = str(uuid.uuid4())

    # Create document record
    document = Document(
        id=doc_id,
        filename="clinical_history_marley.pdf",
        file_path="sample_data/clinical_history_marley.pdf",
        content_type="application/pdf",
        file_size="174.5 KB",
        detected_language="es",
        status="confirmed",
        pet_id=pet_id,
        visit_count="25",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(document)

    # Create pet
    pet = Pet(
        id=pet_id,
        document_id=doc_id,
        name="Marley",
        species="Canine",
        breed="Labrador Retriever",
        date_of_birth="2019-10-04",
        sex="Male",
        microchip_id="941000024967769",
        owner_name="Beatriz Abarca",
        owner_address="C/ Ortega y Gasset 1 Portal 3 1F, Boadilla, 28660 Madrid",
        clinic_name="Kivet Parque Oeste",
        clinic_address="Avda Europa, 28922 Alcorcón",
        status="confirmed",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(pet)

    # Sample visits
    visits_data = [
        {
            "date": "2019-12-08", "time": "16:12", "visit_type": "emergency",
            "reason": "Emergency visit. Scab on leg, suspected fungal infection. Pet apathetic since yesterday.",
            "examination": "Very dehydrated — vomited 3 times in car. Very underweight. Yellow teeth. Mild hypothermia 37°C.",
            "vital_signs": {"temperature_celsius": 37.0, "weight_kg": 4.1},
            "diagnosis": ["Dehydration", "Intestinal parasites", "Skin wound (non-fungal)"],
            "treatment": {
                "medications": [{"name": "Cristalmina", "dosage": "topical", "frequency": "twice daily", "route": "topical"}],
                "procedures": ["Hospitalized with IV Ringer Lactate"],
                "diet": "Hill's i/d — 1/2 can",
                "recommendations": ["Return tomorrow for hospitalization"],
            },
        },
        {
            "date": "2019-12-10", "time": "10:25", "visit_type": "follow_up",
            "reason": "Follow-up after emergency hospitalization.",
            "examination": "General examination normal. Wound healing.",
            "vital_signs": {"weight_kg": 4.6},
            "diagnosis": [],
            "treatment": {
                "medications": [],
                "procedures": ["Wound care"],
                "recommendations": ["Deworming tomorrow with Milpro"],
            },
            "lab_results": [{"test_name": "Copro seriado", "result": "Negative"}],
        },
        {
            "date": "2020-01-04", "time": "10:50", "visit_type": "vaccination",
            "reason": "Routine visit. Front leg trembling when sitting.",
            "examination": "Abdomen soft, no pain. No discomfort on joint palpation.",
            "vital_signs": {"temperature_celsius": 37.7, "weight_kg": 7.97},
            "diagnosis": [],
            "treatment": {"recommendations": ["Monitor leg trembling", "Supplement with Synoquin Growth if persists"]},
            "vaccinations": [{"name": "Heptavalente Novibac DHPPI+L4", "date_administered": "2020-01-04"}],
        },
        {
            "date": "2020-01-18", "time": "10:30", "visit_type": "vaccination",
            "reason": "Second vaccination and deworming.",
            "vital_signs": {"weight_kg": 10.0},
            "vaccinations": [{"name": "Heptavalente Novibac DHPPI+L4", "date_administered": "2020-01-18"}],
        },
        {
            "date": "2020-02-22", "time": "11:00", "visit_type": "vaccination",
            "reason": "Rabies vaccination.",
            "vital_signs": {"weight_kg": 15.0},
            "vaccinations": [{"name": "Rabia", "date_administered": "2020-02-22"}],
        },
        {
            "date": "2020-07-11", "visit_type": "vaccination",
            "reason": "Pasty stools, probably ate something. Papilloma on mouth. Leishmaniasis test.",
            "vital_signs": {"weight_kg": 30.0},
            "diagnosis": ["Papilloma (mouth)"],
            "treatment": {"recommendations": ["Monitor papilloma"]},
            "lab_results": [{"test_name": "Leishmaniasis test", "result": "NEGATIVE"}],
            "vaccinations": [{"name": "Letifend (Leishmaniasis)", "date_administered": "2020-07-11"}],
        },
        {
            "date": "2020-07-13", "visit_type": "emergency",
            "reason": "Hemorrhagic diarrhea for several days. Good appetite, no vomiting, very active.",
            "examination": "Dilated intestinal loops on palpation.",
            "vital_signs": {"weight_kg": 29.6},
            "diagnosis": ["Hemorrhagic gastroenteritis", "Suspected Giardia"],
            "treatment": {
                "medications": [
                    {"name": "Metronidazol", "dosage": "15 mg/kg", "route": "intravenous"},
                    {"name": "Fortiflora", "dosage": "1 sachet", "frequency": "every 24h", "duration": "10 days"},
                ],
                "diet": "i/d diet",
            },
        },
        {
            "date": "2020-08-17", "visit_type": "emergency",
            "reason": "Diarrhea since Friday with mucus. X-ray: diffuse intestinal distension.",
            "examination": "Suspected chronic enteritis from food intolerance or persistent Giardia.",
            "vital_signs": {"weight_kg": 30.0},
            "diagnosis": ["Chronic enteritis", "Suspected Giardia"],
            "treatment": {
                "medications": [{"name": "Omeprazol", "dosage": "1 tablet", "frequency": "every 24h"}],
                "procedures": ["X-ray"],
            },
            "lab_results": [{"test_name": "Giardia", "result": "Positive"}],
        },
        {
            "date": "2020-09-19", "visit_type": "consultation",
            "reason": "Follicular conjunctivitis. Giardia test positive again.",
            "vital_signs": {"weight_kg": 29.6},
            "diagnosis": ["Follicular conjunctivitis", "Giardia (recurrent)"],
            "treatment": {
                "medications": [{"name": "Tobradex", "frequency": "3 times daily", "duration": "7 days", "route": "topical"}],
            },
            "lab_results": [{"test_name": "Giardia", "result": "Positive"}],
        },
        {
            "date": "2020-10-03", "visit_type": "consultation",
            "reason": "Bilateral conjunctivitis with visible follicles. Food provocation test with previous kibble.",
            "vital_signs": {"weight_kg": 29.4},
            "diagnosis": ["Conjunctivitis bilateral", "Food intolerance (suspected)"],
            "treatment": {
                "medications": [{"name": "Tobradex", "route": "topical"}],
                "diet": "Tolerance diet",
            },
        },
    ]

    for i, vdata in enumerate(visits_data):
        visit = Visit(
            id=str(uuid.uuid4()),
            pet_id=pet_id,
            document_id=doc_id,
            date=vdata.get("date"),
            time=vdata.get("time"),
            visit_type=vdata.get("visit_type"),
            reason=vdata.get("reason"),
            examination=vdata.get("examination"),
            vital_signs=vdata.get("vital_signs"),
            diagnosis=vdata.get("diagnosis"),
            treatment=vdata.get("treatment"),
            lab_results=vdata.get("lab_results"),
            vaccinations=vdata.get("vaccinations"),
            notes=vdata.get("notes"),
            raw_text=f"[Original Spanish text for visit {i + 1}]",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(visit)

    db.commit()
    db.close()
    print(f"Seeded: Marley (Labrador Retriever) with {len(visits_data)} visits")
    print(f"  Pet ID: {pet_id}")
    print(f"  Document ID: {doc_id}")


if __name__ == "__main__":
    seed()

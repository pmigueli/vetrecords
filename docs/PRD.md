# Product Requirements Document (PRD)

## VetRecords — Intelligent Processing System for Veterinary Medical Records

---

## 1. The Problem

### Context

Veterinary clinics receive medical records from many sources: other clinics, referral centers, emergency visits, lab reports, and pet owners who bring paper documents. These come in **different formats** (PDF, scanned images, Word files), **different languages**, and **different templates** — there is no standard.

### Pain Points

| Pain Point | Impact | Who feels it |
|------------|--------|-------------|
| **Manual data entry** — Vets or assistants must read each document and manually type the information into their system | Hours of wasted time per week, risk of transcription errors | Veterinarians, Vet Assistants |
| **Inconsistent formats** — Every clinic uses different templates, abbreviations, and structures | Hard to find critical info quickly (allergies, current medications) | Veterinarians |
| **Lost context** — Paper documents get lost, scanned images are hard to search | Critical medical history unavailable during emergencies | Veterinarians, Pet Owners |
| **Language barriers** — Documents from other regions/countries may be in different languages | Misunderstandings, delayed treatment | Veterinarians |
| **No structured search** — Even digitized documents are just "files" — you can't search by diagnosis or medication | Time wasted scrolling through files to find specific information | Veterinarians, Vet Assistants |

### The Core Problem (One Sentence)

> Veterinarians waste significant time manually reading through pages of clinical history documents — containing dozens of visits in varying formats — to find specific medical information, instead of focusing on animal care.

### What We Learned from Real Documents

We analyzed two real clinical history documents:

1. **Marley (Kivet clinic)**: 9-page PDF with 25+ visits written as informal chronological notes. Casual Spanish, abbreviations ("tto", "EFG", "pv"), weight tracked informally, medications mixed into prose.

2. **Alya (HV Costa Azahar)**: 16-page PDF with 15+ visits using formal structured sections (Anamnesis, Tratamiento, Pruebas). Includes lab result tables with reference ranges, formal prescriptions, hospitalization records.

**Key insight**: These are not single-visit reports. They are **complete clinical histories** spanning months or years. One document = one pet = many visits. The system must split and structure each visit individually.

---

## 2. Personas

### Persona 1: Dr. Laura — The Veterinarian

```
👩‍⚕️ Dr. Laura Martínez
   Age: 38 | Role: Lead Veterinarian | Clinic: Medium-sized urban clinic

   Goals:
   - Quick access to a pet's complete medical history
   - Spend more time with patients, less with paperwork
   - Make informed decisions based on complete information

   Frustrations:
   - "I get referral documents in 10 different formats. I waste 15 minutes
     per patient just finding the diagnosis and current medications."
   - "Sometimes I can't read scanned documents. The quality is terrible."
   - "I need to know allergies FAST, but they're buried in page 3 of a PDF."

   Tech comfort: Medium. Uses clinic software daily, but not tech-savvy.

   Key need: Upload a document → instantly see structured medical info
```

### Persona 2: Carlos — The Veterinary Assistant

```
👨‍💼 Carlos Ruiz
   Age: 26 | Role: Veterinary Assistant / Receptionist | Clinic: Same

   Goals:
   - Process incoming documents quickly before appointments
   - Reduce errors when entering data into the system
   - Help Dr. Laura have everything ready when she sees a patient

   Frustrations:
   - "I spend the first hour every morning typing up records from yesterday."
   - "I'm not a vet — sometimes I don't know what's important in a document
     and I miss things or enter them wrong."
   - "When a pet comes in as emergency with records from another clinic,
     there's no time to process the paperwork properly."

   Tech comfort: High. Comfortable with web apps and digital tools.

   Key need: Upload documents in bulk → system does the interpretation
```

### Persona 3: Marta — The Pet Owner (Secondary)

```
🐕 Marta López
   Age: 45 | Role: Pet Owner | Pet: "Luna", Golden Retriever, 5 years

   Goals:
   - Make sure her vet has Luna's complete medical history
   - Bring documents from the previous vet when switching clinics

   Frustrations:
   - "I have a folder of papers from 3 different vets. I don't know
     what's important to bring."
   - "My previous vet gave me everything as photos on WhatsApp."

   Tech comfort: Basic. Uses smartphone, email, WhatsApp.

   Key need: (Indirect) Her documents get processed correctly regardless of format
```

---

## 3. User Stories

### Must Have (MVP)

| ID | As a... | I want to... | So that... | Acceptance Criteria |
|----|---------|-------------|-----------|-------------------|
| US-01 | Vet Assistant | Upload a clinical history document (PDF, DOCX, image) | The system can process it | File accepted, stored, processing starts. Supported: PDF, DOCX, JPG, PNG. Max size: 20MB |
| US-02 | Vet Assistant | See the upload progress and processing status | I know when a document is ready | Status shows: uploading → processing → done/error |
| US-03 | Veterinarian | See the pet's profile extracted from the document header | I can verify the pet's identity | Profile shows: name, species, breed, DOB, sex, microchip, owner, clinic of origin |
| US-04 | Veterinarian | See a timeline of all visits extracted from the document | I can browse the pet's complete history | Timeline shows each visit as a card: date, type, reason summary. Ordered chronologically |
| US-05 | Veterinarian | See structured details for each visit | I can quickly find diagnosis, treatment, and lab results | Visit detail shows: reason, examination, vital signs, diagnosis, treatment, prescriptions, lab results, follow-up |
| US-06 | Veterinarian | See the original text alongside the structured data for each visit | I can verify the extraction is correct | Collapsible raw text section per visit |
| US-07 | Veterinarian | Edit or correct any extracted field (pet profile or visit data) | I can fix mistakes in the automated extraction | All fields are editable. Changes saved. Original text preserved. Edited fields marked |
| US-08 | Vet Assistant | See a list of all pets in the system | I can find any patient quickly | List shows: pet name, breed, visit count, last visit date, status |

### Should Have (V2)

> **Note**: The MVP already displays weight, vaccinations, and recurring conditions in the Pet Profile sidebar as read-only data extracted by the LLM. The V2 features below enhance these with interactive charts, due date tracking, and automatic pattern detection — going beyond simple display.

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| US-09 | Veterinarian | See a weight chart over time for a pet | I can track growth or weight changes |
| US-10 | Veterinarian | See a vaccination timeline with next due dates | I know what vaccines are pending |
| US-11 | Veterinarian | See chronic/recurring conditions flagged automatically | I'm immediately aware of ongoing issues (e.g., "chronic Giardia") |
| US-12 | Vet Assistant | Upload a new document for an existing pet and link it | The pet's history grows over time |
| US-13 | Veterinarian | Search across all visits by diagnosis, medication, or keyword | I can find specific information fast |

### Could Have (Future)

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| US-14 | Veterinarian | See lab result trends over time (e.g., glucose, WBC) | I can spot patterns in chronic conditions |
| US-15 | Veterinarian | Export a standardized summary for a pet | I can share clean records with other vets |
| US-16 | Clinic Admin | See processing statistics (documents per day, accuracy) | I can measure the system's value |
| US-17 | Vet Assistant | Auto-match new documents to existing pets by microchip | No duplicate pets are created |

---

## 4. Functional Requirements

### FR-01: Document Upload

- Accept files via drag-and-drop or file picker
- Supported formats: PDF, DOCX, JPG, PNG
- Maximum file size: 20MB
- Store original file permanently
- Return immediate confirmation with processing status

### FR-02: Text Extraction

- Extract text from PDF documents (including multi-page)
- Extract text from DOCX documents
- Extract text from images using OCR
- Preserve the raw extracted text for reference
- Handle poor quality scans gracefully (return partial text + warning)

### FR-03: Pet Profile Extraction

- From the document header/top section, extract:
  - **Pet**: name, species, breed, date of birth, sex, microchip ID, coat/color
  - **Owner**: name, phone, address
  - **Clinic of origin**: name, address
- Handle both informal headers (Kivet style: "Datos de la Mascota") and formal headers (Costa Azahar style: structured fields)
- If a field cannot be found, mark it as "Not found" (not empty)

### FR-04: Visit Splitting

- Detect date patterns to split the document into individual visits
- Handle multiple date formats:
  - `- 08/12/19 - 16:12 -` (Kivet style)
  - `VISITA CONSULTA GENERAL DEL DÍA 17/07/2024` (Costa Azahar style)
  - Other common patterns: `dd/mm/yyyy`, `dd/mm/yy`
- Each visit gets its own extracted raw text segment
- Preserve visit ordering (chronological)

### FR-05: Visit Structuring

- For each visit, extract and structure:
  - **Date and time**
  - **Visit type** (consultation, emergency, vaccination, follow-up, phone call, hospitalization, administrative)
  - **Reason / Anamnesis**: why the pet came in
  - **Examination findings**: physical exam results
  - **Vital signs**: temperature, weight, heart rate, respiratory rate
  - **Diagnosis**: identified conditions
  - **Treatment**: medications (name, dosage, frequency, duration, route), procedures, diet recommendations
  - **Lab results**: test name, result, reference range, interpretation
  - **Vaccinations**: vaccine name, date administered, next due date
  - **Follow-up notes**: next steps, scheduled reviews
- Handle documents in Spanish (primary) and English
- Recognize medical abbreviations: "EFG", "tto", "pv", "comp", "SID", "BID", "TID", "SC", "IV", "PO"

### FR-06: Display

- **Dashboard**: Pet list with name, breed, visit count, last visit, processing status
- **Pet profile page**:
  - Left sidebar: pet details, owner info, weight history, vaccinations, chronic conditions
  - Main area: visit timeline (cards with date, type, reason summary)
- **Visit detail** (modal or page):
  - All structured fields organized in sections
  - Collapsible raw text for verification
- Status indicators: processing, completed, error

### FR-07: Editing

- All structured fields must be editable (pet profile + individual visits)
- Save changes without losing the original extracted text
- Visual indicator for fields that were manually corrected vs. auto-extracted
- Cancel editing without saving

### FR-08: Error Handling

- If text extraction fails: show error message, allow retry
- If visit splitting fails: show full extracted text, allow manual review
- If structuring fails per visit: show raw text for that visit, allow manual entry
- If file format is unsupported: clear error message with supported formats
- Network errors: retry with feedback

---

## 5. Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| Upload response time | < 2 seconds (acknowledgment) | User needs to know file was received |
| Text extraction time | < 10 seconds for typical document | Acceptable wait with progress indicator |
| Structuring time | < 15 seconds | LLM processing time, show progress |
| Supported file size | Up to 20MB | Covers high-res scans and multi-page PDFs |
| Browser support | Modern browsers (Chrome, Firefox, Safari, Edge) | Clinic computers vary |
| Accessibility | Basic keyboard navigation, readable fonts | Clinic environments, varying users |
| Deployment | Single `docker-compose up` command | Easy evaluation for reviewers |

---

## 6. Success Metrics (If This Were Production)

| Metric | Definition | Target |
|--------|-----------|--------|
| Time saved per record | Time to process a record manually vs. with system | 70% reduction |
| Extraction accuracy | % of fields correctly extracted (verified by vet) | > 85% |
| User adoption | % of incoming documents processed through system | > 60% in first month |
| Correction rate | % of fields that vets need to manually correct | < 30% |

---

## 7. Out of Scope (for this exercise)

- User authentication and authorization
- Multi-tenant (multiple clinics)
- Real-time collaboration
- Mobile app
- Integration with existing clinic management software
- HIPAA/GDPR compliance (would be critical in production)
- Billing and subscription management

---

## 8. Risks & Assumptions

### Assumptions

1. Documents contain at least some machine-readable text (or legible text for OCR)
2. An Anthropic API key is available for the LLM structuring (with regex fallback)
3. Most documents are in Spanish or English
4. A single-user scenario is sufficient for the demo

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| OCR quality is poor for handwritten documents | High | Medium | Show warning, allow manual entry |
| LLM hallucination (invents medical data) | Medium | High | Always show original text for verification, mark confidence |
| Large files slow down processing | Medium | Low | File size limit + async processing with status |
| Anthropic API unavailable | Low | High | Regex-based fallback extractor |

# User Flows

## VetRecords — Intelligent Processing System for Veterinary Medical Records

**Updated after analyzing real clinical history documents (Marley + Alya)**

---

## Flow 1: Upload a Clinical History Document

**Persona**: Carlos (Vet Assistant)
**Goal**: Upload a pet's clinical history and get structured, searchable data

```
TRIGGER: User arrives at Dashboard

 1. User clicks [Upload Document] button
    │
    ▼
 2. Upload Modal appears
    - Drag & drop zone
    - Shows accepted formats: PDF, DOCX, JPG, PNG (max 20MB)
    │
    ├── User drops/selects a file
    │   │
    │   ▼
    │  3. File validation (format + size)
    │     ├── ❌ Invalid → Error message
    │     └── ✅ Valid → Show filename + size
    │         │
    │         ▼
    │  4. User clicks [Upload & Process]
    │     │
    │     ▼
    │  5. Modal closes → Dashboard shows processing indicator
    │     │
    │     ▼
    │  6. Backend pipeline runs:
    │     a. File stored on disk
    │     b. Text extracted (PyMuPDF / python-docx / Tesseract)
    │     c. Pet profile extracted from header
    │     d. Document split into individual visits by date
    │     e. Each visit structured (diagnosis, treatment, labs, etc.)
    │     │
    │     ├── ❌ Extraction fails → Status: "Error"
    │     │   User sees error + retry option
    │     │
    │     └── ✅ Success → Draft card appears on Dashboard
    │         "Marley · Labrador · 25 visits · Ready for review"
    │         User clicks "Review" → Flow 2 (Review & Confirm)
    │
    └── User clicks [Cancel] → Nothing happens
```

---

## Flow 2: Review & Confirm Extracted Data (NEW — Critical Flow)

**Persona**: Dr. Laura (Veterinarian)
**Goal**: Verify the AI extraction is correct before it becomes the official record

```
TRIGGER: Document processing completes → dashboard shows "Ready for review"

 1. User clicks "Review" on the draft card
    │
    ▼
 2. Review page loads: split-screen layout
    ┌───────────────────┬─────────────────────────────┐
    │                   │                              │
    │   PDF Viewer      │   Extracted Data (editable)  │
    │   (original doc)  │                              │
    │                   │   Pet Profile ✏️             │
    │   Scrollable,     │   Name: [Marley]             │
    │   page by page    │   Breed: [Labrador]          │
    │                   │   ...                        │
    │                   │                              │
    │                   │   Visit 1 (Dec 8, 2019) ✏️   │
    │                   │   Visit 2 (Dec 10, 2019) ✏️  │
    │                   │   ...                        │
    │                   │                              │
    └───────────────────┴─────────────────────────────┘

 3. Vet scrolls the PDF on the left while reviewing
    extracted data on the right
    │
    ▼
 4. Vet makes corrections:
    - Fixes a misspelled diagnosis
    - Adds a medication the AI missed
    - Removes a false positive (AI hallucinated a field)
    - Corrects a date that was parsed wrong
    │
    ▼
 5. Vet clicks [Confirm & Save]
    │
    ├── Pet profile created as official record
    │   All visits saved as confirmed
    │   Redirect to Pet Profile page
    │
    └── OR: Vet clicks [Discard]
        → Confirm dialog: "This will delete all extracted data"
        → Delete document + extracted data
        → Back to dashboard

```

**Why this flow matters:**
- AI extraction is never trusted blindly
- The vet has full context (PDF visible) while editing
- Data only becomes "official" after human review
- Builds trust in the system — users feel in control

---

## Flow 3: Browse Pets & Find a Patient

**Persona**: Carlos (Vet Assistant) or Dr. Laura (Veterinarian)
**Goal**: Find a specific pet's records

```
TRIGGER: User is on Dashboard

 1. Dashboard shows all pets as cards:
    ┌──────────────────────────────────────┐
    │ Marley · Labrador · 25 visits       │
    │ Owner: Beatriz · Kivet Parque Oeste │
    │ Last visit: Oct 3, 2020     ✅      │
    ├──────────────────────────────────────┤
    │ Alya · Yorkshire · 15 visits        │
    │ Owner: Teresa · HV Costa Azahar     │
    │ Last visit: Jul 17, 2024    ✅      │
    └──────────────────────────────────────┘

 2. User can scan the list visually (MVP: small list; V2: search bar)

 3. User clicks on a pet card → Flow 4
```

---

## Flow 4: View a Pet's Profile & Visit Timeline

**Persona**: Dr. Laura (Veterinarian)
**Goal**: Review a pet's complete medical history

```
TRIGGER: User clicks on a pet from Dashboard

 1. Pet Profile page loads with two areas:

    LEFT SIDEBAR                RIGHT MAIN AREA
    ┌──────────────┐           ┌────────────────────────┐
    │ Pet Details   │           │ Visit Timeline          │
    │ Name: Marley  │           │                         │
    │ Breed: Lab    │           │ ┌─ Oct 3, 2020 ─────┐  │
    │ DOB: 04/10/19 │           │ │ Conjunctivitis     │  │
    │ Sex: Male     │           │ │ Tobradex treatment  │  │
    │ Chip: 941...  │           │ └────────────────────┘  │
    │               │           │ ┌─ Sep 19, 2020 ────┐  │
    │ Owner         │           │ │ Giardia + positive │  │
    │ Beatriz A.    │           │ │ Follicular conj.   │  │
    │               │           │ └────────────────────┘  │
    │ Weight: 29.6kg│           │ ┌─ Aug 17, 2020 ────┐  │
    │ (4.1→30 chart)│           │ │ Emergency diarrhea │  │
    │               │           │ │ X-ray, Giardia+    │  │
    │ Vaccinations  │           │ └────────────────────┘  │
    │ • Heptavalente│           │                         │
    │ • Rabia       │           │  ... 22 more visits ... │
    │ • Letifend    │           │                         │
    │               │           │                         │
    │ Chronic Issues│           │                         │
    │ • Giardia (4x)│          │                         │
    │ • Conjunctiv. │           │                         │
    └──────────────┘           └────────────────────────┘

 2. User scrolls the timeline to find a specific visit

 3. User clicks on a visit card → Flow 5

 4. User clicks [Edit] on pet profile → can correct name, breed, etc.
```

---

## Flow 5: View a Specific Visit's Details

**Persona**: Dr. Laura (Veterinarian)
**Goal**: See all structured data for one visit

```
TRIGGER: User clicks on a visit card in the timeline

 1. Visit Detail opens (modal or full page):

    ┌─────────────────────────────────────────────┐
    │ Dec 26, 2019 · Emergency            [Edit]  │
    ├─────────────────────────────────────────────┤
    │                                              │
    │ Reason                                       │
    │ Distended abdomen. Ate at 12:00.             │
    │                                              │
    │ Examination                                  │
    │ Abdomen distended with pain on palpation.    │
    │                                              │
    │ Vital Signs                                  │
    │ Weight: 7 kg                                 │
    │                                              │
    │ Diagnosis                                    │
    │ [Foreign body ingestion] [Sand/gravel]       │
    │                                              │
    │ Lab Results & Imaging                        │
    │ • X-ray: dilated intestinal loops with gas   │
    │ • Ultrasound: report attached                │
    │                                              │
    │ Treatment                                    │
    │ • Hospitalized with IV Ringer Lactate        │
    │ • Metronidazol 15mg/kg IV at 18:30           │
    │ • Vetgastril 2ml/24h before meals            │
    │ • Metrobactin 500mg 1/4 tab/12h x 7 days    │
    │ • Fortiflora 1 sachet/24h x 10 days         │
    │ • GI diet, no kibble for 24h                 │
    │                                              │
    │ Follow-up                                    │
    │ X-ray tomorrow morning. Review day 4.        │
    │                                              │
    │ ▼ Original Text (click to expand)            │
    │ ┌──────────────────────────────────────────┐ │
    │ │ Peso 7 kg. Acude de urgencia dado que... │ │
    │ └──────────────────────────────────────────┘ │
    └─────────────────────────────────────────────┘

 2. User verifies data against original text

 3. If correct → done. If wrong → Flow 6 (Edit)

 4. User closes modal → back to timeline
```

---

## Flow 6: Edit / Correct a Visit

**Persona**: Dr. Laura (Veterinarian)
**Goal**: Fix errors in the automatically extracted data

```
TRIGGER: User clicks [Edit] on a visit detail

 1. Fields become editable (input boxes, tag editors)
    - Original text stays visible for reference
    │
    ▼
 2. User makes corrections:
    - Fixes a misspelled diagnosis
    - Adds a medication that was missed
    - Corrects dosage or frequency
    - Adds a lab result the AI didn't catch
    │
    ▼
 3. User clicks [Save Changes]
    ├── ❌ Save fails → Error toast
    └── ✅ Success → Fields return to read-only
        - "Edited" indicator appears on modified fields
        - Original text unchanged

 Alternative: [Cancel] → Changes discarded
```

---

## Flow 7: Handle Processing Errors

**Persona**: Carlos (Vet Assistant)
**Goal**: Deal with a document that failed to process

```
TRIGGER: Document shows "Error" status on Dashboard

 1. User clicks on the error item
    │
    ├── Case A: Text extraction failed
    │   - Shows: "Could not extract text from this file"
    │   - Action: [Retry] or [Delete]
    │
    ├── Case B: Text extracted but visit splitting failed
    │   - Shows: Pet profile (if extracted) + full raw text
    │   - Shows: "Could not identify individual visits"
    │   - Action: [Retry] or manual review of raw text
    │
    └── Case C: Some visits structured, some failed
        - Shows: Pet profile + partial timeline
        - Failed visits show raw text with "Could not structure"
        - Action: [Edit] to manually fill in fields
```

---

## State Diagram: Document Processing Lifecycle

```
                    ┌──────────┐
    Upload file →   │ Uploading │
                    └────┬─────┘
                         │ file stored
                         ▼
                    ┌──────────────┐
                    │  Extracting  │ ← text extraction
                    └──────┬───────┘
                           │
                    ┌──────────────┐
                    │  Splitting   │ ← regex date detection
                    └──────┬───────┘
                           │
                    ┌──────────────┐
                    │ Structuring  │ ← Claude API (batched)
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌───────────────┐
        │  Error   │ │ Partial  │ │ Ready for     │
        │          │ │          │ │ Review (draft) │
        └────┬─────┘ └────┬─────┘ └───────┬───────┘
             │             │               │
             └──── Retry ──┘    Vet reviews & edits
                                           │
                                    ┌──────┴──────┐
                                    │             │
                                    ▼             ▼
                              ┌──────────┐  ┌──────────┐
                              │ Confirmed│  │ Discarded│
                              │ (official│  │ (deleted)│
                              │  record) │  │          │
                              └──────────┘  └──────────┘
```

---

## Screen Map

```
┌────────────────┐  click "Review"  ┌──────────────────┐  Confirm   ┌─────────────────┐
│   Dashboard    │ ───────────────→ │  Review Page     │ ────────→ │  Pet Profile    │
│   (/)          │                  │  (/documents/:id/│            │  (/pets/:id)    │
│                │  ← Back          │   review)        │  ← Back   │                 │
│  - Stats       │ ←───────────────│                  │ ←─────────│  - Pet sidebar  │
│  - Pets list   │                  │  - PDF viewer    │            │  - Timeline     │
│  - Drafts      │                  │    (left panel)  │            │  - Weight chart │
│  - Search      │                  │  - Pet profile   │            │  - Vaccinations │
│  - Upload btn  │                  │    (editable)    │            └───────┬─────────┘
└──────┬─────────┘                  │  - Visit timeline│                    │
       │                            │    (editable)    │             click visit
       │ click Upload               │  - [Confirm]     │                    ▼
       ▼                            │  - [Discard]     │         ┌──────────────────┐
┌──────────────┐                    └──────────────────┘         │  Visit Detail    │
│ Upload Modal │                                                 │  (modal)         │
│              │                                                 │                  │
│ - Drag/drop  │                                                 │  - Reason        │
│ - Validate   │                                                 │  - Examination   │
│ - Process    │                                                 │  - Diagnosis     │
└──────────────┘                                                 │  - Treatment     │
                                                                 │  - Lab results   │
                                                                 │  - Raw text      │
                                                                 │  - [Edit]        │
                                                                 └──────────────────┘
```

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Document has only 1 visit (single report, not a history) | Create pet + 1 visit. Works fine. |
| Document has 30+ visits (very long history) | Process all. Timeline has pagination or scroll. |
| Two documents for the same pet uploaded separately | MVP: creates duplicate pet. V2: detect by microchip and merge. |
| Visit has no date (just notes) | Assign "Unknown date", flag for review |
| Lab results are in a table format (Costa Azahar style) | Extract as structured key-value pairs with reference ranges |
| Lab results are inline text (Kivet style: "test giardia positivo") | Extract as simple result strings |
| Document is a phone call note, not an in-person visit | Detect visit type = "phone call", extract notes |
| Hospitalization spanning multiple days | One visit entry with extended notes |
| Mixed languages in same document | LLM handles; flag for review if uncertain |
| Document contains images/photos embedded | Extract text around images; note "image attached" |
| Anthropic API unavailable | Regex fallback for date splitting; basic keyword extraction for structuring |
| 0-byte file or corrupted PDF | Reject with clear error message |

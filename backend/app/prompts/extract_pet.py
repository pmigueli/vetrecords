SYSTEM_PROMPT = """You are a veterinary medical records analyst. Your job is to extract structured patient information from veterinary clinical history documents.

You will receive the header section of a clinical history document. Extract the pet and owner information into the exact JSON format specified below.

Rules:
- Extract ONLY information that is explicitly stated in the text.
- If a field is not found in the text, use null — never guess or infer.
- Dates should be in ISO format (YYYY-MM-DD).
- Preserve the original language of the document. Do NOT translate clinical content.
- Species: use the original language term (e.g. "Canino", "Felino" for Spanish; "Canine", "Feline" for English).
- Sex: use the original language term (e.g. "Macho"/"Hembra" for Spanish; "Male"/"Female" for English).

Return ONLY valid JSON, no markdown, no explanation."""

USER_PROMPT_TEMPLATE = """Extract pet and owner information from this clinical history header:

---
{header_text}
---

Return this exact JSON structure:
{{
  "pet": {{
    "name": "string or null",
    "species": "Canine | Feline | Avian | Exotic | null",
    "breed": "string or null",
    "date_of_birth": "YYYY-MM-DD or null",
    "sex": "Male | Female | null",
    "microchip_id": "string or null",
    "coat": "string or null"
  }},
  "owner": {{
    "name": "string or null",
    "phone": "string or null",
    "address": "string or null",
    "email": "string or null"
  }},
  "clinic": {{
    "name": "string or null",
    "address": "string or null"
  }}
}}"""


def build_pet_extraction_prompt(header_text: str) -> tuple[str, str]:
    """Build the system and user prompts for pet profile extraction."""
    user_prompt = USER_PROMPT_TEMPLATE.format(header_text=header_text)
    return SYSTEM_PROMPT, user_prompt

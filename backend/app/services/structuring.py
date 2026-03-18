import json
import logging
import time
from collections.abc import Callable
from typing import Protocol

import anthropic

from app.config import settings
from app.prompts.extract_pet import build_pet_extraction_prompt
from app.prompts.structure_visit import build_visit_structuring_prompt
from app.schemas.pet import PetCreate

BATCH_SIZE = 15
DELAY_BETWEEN_BATCHES = 2
MAX_RETRIES = 3
BACKOFF_FACTOR = 2

logger = logging.getLogger(__name__)


class DocumentStructurer(Protocol):
    """Interface for document structuring."""

    def extract_pet(self, header_text: str) -> PetCreate: ...

    def structure_visits(
        self,
        visit_chunks: list[dict],
        language_code: str,
        on_batch_complete: object = None,
    ) -> list[dict]: ...


class ClaudeStructurer:
    """Uses Anthropic Claude to structure veterinary documents."""

    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model

    def _call_api(
        self, system_prompt: str, user_prompt: str, max_tokens: int = 4096
    ) -> str:
        """Make a single Claude API call and return the text response."""
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return response.content[0].text

    def _parse_json(self, text: str) -> dict | list:
        """Parse JSON from Claude's response, handling markdown code blocks."""
        cleaned = text.strip()
        # Remove markdown code blocks if present
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            # Remove first line (```json) and last line (```)
            lines = [l for l in lines if not l.strip().startswith("```")]
            cleaned = "\n".join(lines)
        return json.loads(cleaned)

    def extract_pet(self, header_text: str) -> PetCreate:
        """Extract pet profile from document header using Claude."""
        system_prompt, user_prompt = build_pet_extraction_prompt(header_text)

        logger.info("Calling Claude for pet profile extraction")
        raw_response = self._call_api(system_prompt, user_prompt)
        data = self._parse_json(raw_response)

        # Flatten nested structure into PetCreate
        pet_info = data.get("pet", {})
        owner_info = data.get("owner", {})
        clinic_info = data.get("clinic", {})

        return PetCreate(
            name=pet_info.get("name"),
            species=pet_info.get("species"),
            breed=pet_info.get("breed"),
            date_of_birth=pet_info.get("date_of_birth"),
            sex=pet_info.get("sex"),
            microchip_id=pet_info.get("microchip_id"),
            coat=pet_info.get("coat"),
            owner_name=owner_info.get("name"),
            owner_phone=owner_info.get("phone"),
            owner_address=owner_info.get("address"),
            owner_email=owner_info.get("email"),
            clinic_name=clinic_info.get("name"),
            clinic_address=clinic_info.get("address"),
        )

    def structure_visits(
        self,
        visit_chunks: list[dict],
        language_code: str,
        on_batch_complete: Callable[[list[dict], int, int], None] | None = None,
    ) -> list[dict]:
        """Structure visits in batches with rate limit awareness."""
        all_visits: list[dict] = []
        batches = [
            visit_chunks[i : i + BATCH_SIZE]
            for i in range(0, len(visit_chunks), BATCH_SIZE)
        ]

        for batch_idx, batch in enumerate(batches):
            logger.info(
                f"Structuring batch {batch_idx + 1}/{len(batches)} "
                f"({len(batch)} visits)"
            )

            # Retry with exponential backoff
            for attempt in range(MAX_RETRIES):
                try:
                    visits = self._structure_batch(batch, language_code)
                    all_visits.extend(visits)

                    if on_batch_complete:
                        on_batch_complete(visits, batch_idx, len(batches))

                    break  # Success

                except anthropic.RateLimitError:
                    wait_time = DELAY_BETWEEN_BATCHES * (BACKOFF_FACTOR ** attempt)
                    logger.warning(
                        f"Rate limited on batch {batch_idx + 1}, "
                        f"retry {attempt + 1}/{MAX_RETRIES}, "
                        f"waiting {wait_time}s"
                    )
                    if attempt == MAX_RETRIES - 1:
                        raise
                    time.sleep(wait_time)

            # Delay between successful batches
            if batch_idx < len(batches) - 1:
                time.sleep(DELAY_BETWEEN_BATCHES)

        return all_visits

    def _structure_batch(
        self, visit_chunks: list[dict], language_code: str
    ) -> list[dict]:
        """Structure a single batch of visits."""
        system_prompt, user_prompt = build_visit_structuring_prompt(
            visit_chunks, language_code
        )

        # More tokens for visit batches (up to 15 visits)
        raw_response = self._call_api(system_prompt, user_prompt, max_tokens=8192)
        visits = self._parse_json(raw_response)

        if not isinstance(visits, list):
            raise ValueError(f"Expected JSON array, got {type(visits)}")

        logger.info(f"Batch structured: {len(visits)} visits parsed")
        return visits


def get_structurer() -> ClaudeStructurer | None:
    """Factory: returns Claude structurer if API key is available."""
    if settings.anthropic_api_key:
        return ClaudeStructurer(api_key=settings.anthropic_api_key)
    logger.warning("No Anthropic API key — structuring will be skipped")
    return None

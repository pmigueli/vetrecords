import logging
import re
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class SplitResult:
    header_text: str
    visit_chunks: list[dict] = field(default_factory=list)


# Date patterns found in real veterinary documents
VISIT_DATE_PATTERNS = [
    # Kivet style: "- 08/12/19 - 16:12 -"
    r"^-\s*(\d{1,2}/\d{1,2}/\d{2,4})\s*-\s*(\d{1,2}:\d{2})?\s*-?",
    # Costa Azahar style: "VISITA ... DEL DÍA 17/07/2024"
    r"VISITA\s+.*?DEL\s+D[ÍI]A\s+(\d{1,2}/\d{1,2}/\d{4})",
    # ISO format: 2024-07-17
    r"^(\d{4}-\d{2}-\d{2})\s",
    # European with dot separator: 17.07.2024
    r"^(\d{1,2}\.\d{1,2}\.\d{2,4})\s*[-:]",
    # Generic date at start of line with dash
    r"^-?\s*(\d{1,2}/\d{1,2}/\d{2,4})\s*-",
    # English style: "Visit on July 17, 2024" or "Date: 07/17/2024"
    r"(?:Visit|Date|Consultation)\s*(?:on|:)\s*(\d{1,2}/\d{1,2}/\d{4})",
    # French style: "Consultation du 17/07/2024"
    r"Consultation\s+du\s+(\d{1,2}/\d{1,2}/\d{4})",
    # Portuguese style: "Consulta em 17/07/2024"
    r"Consulta\s+em\s+(\d{1,2}/\d{1,2}/\d{4})",
]

COMBINED_PATTERN = re.compile(
    "|".join(f"(?:{p})" for p in VISIT_DATE_PATTERNS),
    re.MULTILINE | re.IGNORECASE,
)


def split_visits(raw_text: str) -> SplitResult:
    """Split document text into header + individual visit chunks.

    Uses regex date pattern detection to find where each visit starts.
    Everything before the first date is the header (pet/owner info).
    Text between consecutive dates is one visit's content.
    """
    matches = list(COMBINED_PATTERN.finditer(raw_text))

    if not matches:
        logger.warning("No date patterns found — returning entire text as one chunk")
        return SplitResult(
            header_text="",
            visit_chunks=[{"date_raw": "unknown", "text": raw_text}],
        )

    # Everything before first match is the header (pet profile, clinic info)
    header_text = raw_text[: matches[0].start()].strip()

    # Split text between consecutive date matches
    visit_chunks = []
    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(raw_text)

        # Extract the raw date string from whichever capture group matched
        date_raw = next(
            (g for g in match.groups() if g is not None),
            match.group(0),
        )

        chunk_text = raw_text[start:end].strip()
        if chunk_text:
            visit_chunks.append({"date_raw": date_raw, "text": chunk_text})

    logger.info(
        f"Split result: {len(header_text)} chars header, "
        f"{len(visit_chunks)} visits detected"
    )

    return SplitResult(header_text=header_text, visit_chunks=visit_chunks)

import logging

logger = logging.getLogger(__name__)

SUPPORTED_LANGUAGES = {
    "es": "Spanish",
    "en": "English",
    "fr": "French",
    "pt": "Portuguese",
    "de": "German",
    "it": "Italian",
}


def detect_language(text: str) -> str:
    """Detect language from text. Returns ISO 639-1 code."""
    try:
        from langdetect import detect, LangDetectException

        # Use first ~2000 chars for detection (faster, sufficient)
        lang = detect(text[:2000])
        if lang in SUPPORTED_LANGUAGES:
            logger.info(f"Language detected: {SUPPORTED_LANGUAGES[lang]} ({lang})")
            return lang
        logger.info(f"Language detected but not supported: {lang}")
        return "unknown"
    except (LangDetectException, Exception) as e:
        logger.warning(f"Language detection failed: {e}")
        return "unknown"

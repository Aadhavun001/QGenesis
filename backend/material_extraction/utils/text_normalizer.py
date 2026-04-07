"""Text normalization utilities for cleaning extracted content."""

import re
import unicodedata


def normalize_text(text: str) -> str:
    """
    Clean and normalize extracted text:
    - Fix broken lines from PDF column extraction
    - Remove excessive whitespace
    - Normalize Unicode characters
    - Remove control characters
    - Preserve paragraph structure
    """
    if not text:
        return ""

    # Normalize Unicode
    text = unicodedata.normalize("NFKC", text)

    # Remove null bytes and control characters (keep newlines/tabs)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

    # Fix hyphenated line breaks (e.g., "impor-\ntant" → "important")
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)

    # Fix broken lines within paragraphs
    # Replace single newlines (not preceded by sentence-ending punctuation) with space
    text = re.sub(r"(?<![.\n!?:;])\n(?!\n)", " ", text)

    # Collapse multiple spaces into one
    text = re.sub(r"[ \t]+", " ", text)

    # Normalize multiple blank lines into max 2
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Strip leading/trailing whitespace per line
    lines = [line.strip() for line in text.split("\n")]
    text = "\n".join(lines)

    # Final strip
    text = text.strip()

    return text


def extract_sentences(text: str) -> list[str]:
    """Split text into individual sentences."""
    # Simple sentence splitter
    sentences = re.split(r"(?<=[.!?])\s+", text)
    return [s.strip() for s in sentences if s.strip()]


def extract_keywords(text: str, top_n: int = 20) -> list[str]:
    """Extract simple keyword candidates (no AI, just frequency-based)."""
    # Remove common stop words
    stop_words = {
        "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "will", "would", "could",
        "should", "may", "might", "can", "shall", "must", "need", "dare",
        "to", "of", "in", "for", "on", "with", "at", "by", "from", "as",
        "into", "through", "during", "before", "after", "above", "below",
        "between", "under", "again", "further", "then", "once", "here",
        "there", "when", "where", "why", "how", "all", "each", "every",
        "both", "few", "more", "most", "other", "some", "such", "no",
        "not", "only", "same", "so", "than", "too", "very", "just",
        "because", "but", "and", "or", "if", "while", "about", "up",
        "out", "off", "over", "own", "its", "it", "this", "that",
        "these", "those", "he", "she", "they", "we", "you", "i", "me",
        "him", "her", "us", "them", "my", "your", "his", "our", "their",
        "what", "which", "who", "whom",
    }

    # Tokenize
    words = re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())
    
    # Count frequencies (excluding stop words)
    freq: dict[str, int] = {}
    for word in words:
        if word not in stop_words:
            freq[word] = freq.get(word, 0) + 1

    # Sort by frequency
    sorted_words = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    return [word for word, _ in sorted_words[:top_n]]


def estimate_topics(text: str) -> list[str]:
    """
    Estimate topics from text using keyword clustering.
    No AI models — pure heuristic approach.
    """
    keywords = extract_keywords(text, top_n=30)
    
    # Group keywords into pseudo-topics based on co-occurrence in sentences
    sentences = extract_sentences(text)
    topics: list[str] = []

    # Use top keywords as topic seeds
    for keyword in keywords[:10]:
        # Find sentences containing this keyword
        related = [s for s in sentences if keyword.lower() in s.lower()]
        if related and keyword.title() not in topics:
            topics.append(keyword.title())

    return topics[:8]  # Return up to 8 topics


def estimate_academic_level(text: str) -> str:
    """
    Heuristic estimate of academic level from text (no spaCy).
    Postgraduate indicators: thesis, dissertation, research, methodology, etc.
    Also use average word length and sentence length as proxies for complexity.
    """
    if not text or not text.strip():
        return "undergraduate"
    lower = text.lower()
    # Strong postgraduate indicators
    pg_phrases = [
        "thesis", "dissertation", "postgraduate", "post-graduate", "graduate program",
        "phd", "ph.d", "doctoral", "research methodology", "literature review",
        "hypothesis", "peer review", "citation index", "qualitative research",
        "quantitative research", "empirical study", "systematic review", "meta-analysis",
    ]
    for phrase in pg_phrases:
        if phrase in lower:
            return "postgraduate"
    # Word-level: average word length (longer = more academic)
    words = re.findall(r"\b[a-zA-Z]{2,}\b", text)
    if not words:
        return "undergraduate"
    avg_word_len = sum(len(w) for w in words) / len(words)
    # Sentence length (approx)
    sentences = extract_sentences(text)
    avg_sent_len = (sum(len(s.split()) for s in sentences) / len(sentences)) if sentences else 0
    if avg_word_len > 6.5 or (avg_sent_len > 25 and avg_word_len > 5.5):
        return "postgraduate"
    if avg_word_len > 5.0 or avg_sent_len > 18:
        return "undergraduate"
    return "foundation"

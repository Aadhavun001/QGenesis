"""
spaCy NLP Pipeline for deep academic material analysis.

Loads the spaCy model once at startup and provides methods for:
- Sentence segmentation
- Lemmatization & keyword extraction
- Topic / subtopic identification
- Logical chunking (unit, topic, paragraph)
- Per-chunk metadata (keywords, difficulty, entities)
- Scalable processing for large documents
"""

import re
import time
import logging
from collections import Counter
from typing import Optional

import spacy
from spacy.tokens import Doc

from .models import (
    NLPAnalysisResult,
    ContentChunk,
    ChunkMetadata,
    TopicInfo,
)

logger = logging.getLogger(__name__)

# ── Singleton pipeline ────────────────────────────────────────────

_pipeline: Optional["NLPPipeline"] = None


def get_nlp_pipeline() -> "NLPPipeline":
    """Return the singleton NLP pipeline (lazy-loaded)."""
    global _pipeline
    if _pipeline is None:
        _pipeline = NLPPipeline()
    return _pipeline


# ── Constants ─────────────────────────────────────────────────────

STOP_POS = {"PUNCT", "SPACE", "SYM", "X", "DET", "ADP", "CCONJ", "SCONJ", "PART", "AUX", "PRON", "INTJ"}

# Headings: markdown, numbered sections, chapter/unit (books), figures/diagrams/tables (OCR-friendly)
HEADING_PATTERNS = [
    re.compile(r"^#{1,6}\s+(.+)$"),                    # Markdown
    re.compile(r"^(\d+\.[\d.]*)\s+([A-Z].+)$"),        # Numbered sections (1.1, 1.2.3)
    re.compile(r"^(Chapter|Unit|Module|Section|Part)\s+\S+[:\s]+(.+)", re.I),  # "Chapter 1: Title"
    re.compile(r"^((?:Chapter|Unit|Module|Section|Part)\s+[\dIVXLC]+\.?\s*(?:.*))$", re.I),  # "Chapter 1", "Part II"
    re.compile(r"^((?:Lecture|Lesson)\s+\d+[.:]?\s*(?:.*))$", re.I),  # "Lecture 3", "Lesson 2: Intro"
    re.compile(r"^([A-Z][A-Z\s]{3,60})$"),             # ALL-CAPS titles
    re.compile(r"^(Figure|Fig\.?|Diagram|Flow\s*chart|Flowchart)\s*[\d.]*[:\s]*(.*)", re.I),
    re.compile(r"^Table\s*[\d.]*[:\s]*(.*)", re.I),
    re.compile(r"^(Box|Exhibit|Appendix)\s*[\d.]*[:\s]*(.*)", re.I),
    re.compile(r"^(\d+[.)]\s+[A-Za-z].{2,80})$"),      # "1. Introduction"
]

DIFFICULTY_KEYWORDS = {
    "hard": {"analyze", "evaluate", "synthesize", "critique", "justify", "derive",
             "prove", "theorem", "advanced", "complex", "differential", "integral",
             "algorithm", "complexity", "optimization", "formal", "axiom", "corollary",
             "convergence", "polynomial", "recursion", "recurrence"},
    "easy": {"define", "list", "identify", "name", "recall", "state", "basic",
             "introduction", "overview", "simple", "fundamental", "example", "step"},
}

# Patterns for definitions, formulas, examples (word-by-word / diagram caption friendly)
DEFINITION_PATTERNS = (
    "is defined as", "definition", "refers to", "means that", "we say that",
    "denoted by", "denote", "i.e.", "that is", "in other words", "by definition",
)
FORMULA_SYMBOLS = re.compile(r"[=∫∑∏Δ√∂∞≈≠≤≥±×÷^]|\\frac|\\sqrt|\\sum")
EXAMPLE_PATTERNS = (
    "example", "for instance", "e.g.", "such as", "consider", "illustration",
    "for example", "as an example", "see figure", "see diagram", "as shown",
)

MAX_CHUNK_WORDS = 1200  # larger chunks = fewer blocks = faster analysis
MIN_CHUNK_WORDS = 40
# Only run full spaCy on first N chunks; rest get minimal metadata (much faster for long docs)
MAX_CHUNKS_FULL_NLP = 10


class NLPPipeline:
    """Singleton spaCy-based NLP pipeline for academic material analysis."""

    def __init__(self, model_name: str = "en_core_web_sm"):
        logger.info("Loading spaCy model '%s' …", model_name)
        try:
            self.nlp = spacy.load(model_name)
        except OSError:
            logger.warning("Model '%s' not found — downloading …", model_name)
            spacy.cli.download(model_name)  # type: ignore[attr-defined]
            self.nlp = spacy.load(model_name)

        # Raise character limit for large docs (default 1 000 000)
        self.nlp.max_length = 5_000_000
        logger.info("spaCy model loaded (%s pipes).", len(self.nlp.pipe_names))

    # ── Public API ────────────────────────────────────────────────

    def analyze(self, text: str) -> NLPAnalysisResult:
        """Run the full NLP analysis pipeline on *text*."""
        start = time.time()

        # For very large docs, process in segments then merge
        doc = self._process_large_text(text)

        sentences = list(doc.sents)
        chunks = self._build_chunks(text, doc)
        topics = self._extract_topics(chunks, doc)
        global_kw = self._global_keywords(doc)
        key_phrases = self._extract_key_phrases(doc)
        entities = self._extract_entities(doc)
        vocab_richness = self._vocabulary_richness(doc)
        level = self._estimate_academic_level(doc, chunks)

        elapsed = (time.time() - start) * 1000

        return NLPAnalysisResult(
            topics=topics,
            chunks=chunks,
            global_keywords=global_kw,
            global_key_phrases=key_phrases,
            named_entities=entities,
            sentence_count=len(sentences),
            vocabulary_richness=round(vocab_richness, 4),
            estimated_academic_level=level,
            processing_time_ms=round(elapsed, 2),
        )

    # ── Text processing (scalable) ────────────────────────────────

    def _process_large_text(self, text: str) -> Doc:
        """Process text, splitting into segments if needed for memory."""
        if len(text) <= self.nlp.max_length:
            return self.nlp(text)

        # Split on double-newlines, process segments, then concatenate
        segments = text.split("\n\n")
        docs = list(self.nlp.pipe(segments, batch_size=50))
        combined = Doc.from_docs(docs)
        return combined

    # ── Chunking ──────────────────────────────────────────────────

    def _build_chunks(self, raw_text: str, doc: Doc) -> list[ContentChunk]:
        """Split material into logical chunks based on headings and paragraphs.
        Handles diagrams, flowcharts, figures (OCR text), tables, and body text."""
        lines = raw_text.split("\n")
        sections: list[dict] = []
        current: dict = {"title": "", "lines": [], "type": "paragraph"}

        for line in lines:
            stripped = line.strip()
            heading = self._detect_heading(line)
            if heading:
                # Save previous section
                if current["lines"]:
                    sections.append(current)
                current = {"title": heading, "lines": [], "type": self._classify_heading(line)}
            else:
                # Include non-empty lines (preserve OCR output, bullets, short lines)
                if stripped or (current["lines"] and current["lines"][-1].strip()):
                    current["lines"].append(line)

        if current["lines"]:
            sections.append(current)

        # Collect all blocks with section info (avoid per-block nlp() loop)
        block_list: list[tuple[str, str, str]] = []  # (block_text, chunk_type, title)
        tail_buffer: list[str] = []

        for sec in sections:
            text_block = "\n".join(sec["lines"]).strip()
            if not text_block:
                continue
            sub_blocks = self._split_if_too_large(text_block)
            for block in sub_blocks:
                if len(block.split()) < MIN_CHUNK_WORDS:
                    tail_buffer.append(block)
                    continue
                if tail_buffer:
                    block = "\n".join(tail_buffer) + "\n" + block
                    tail_buffer = []
                block_list.append((block, sec["type"], sec["title"]))

        if tail_buffer and block_list:
            block_list[-1] = (block_list[-1][0] + "\n" + "\n".join(tail_buffer), block_list[-1][1], block_list[-1][2])

        if not block_list:
            return []

        # Run full NLP only on first MAX_CHUNKS_FULL_NLP blocks for speed; rest get minimal metadata
        to_analyze = block_list[:MAX_CHUNKS_FULL_NLP]
        blocks_only = [b[0] for b in to_analyze]
        # Disable NER for chunk processing (faster; we still get keywords/sents/difficulty)
        with self.nlp.select_pipes(disable=["ner"]):
            block_docs = list(self.nlp.pipe(blocks_only, batch_size=50))

        chunks: list[ContentChunk] = []
        for chunk_id, (block_doc, (block, chunk_type, title)) in enumerate(zip(block_docs, to_analyze)):
            sents = [s.text.strip() for s in block_doc.sents]
            lemmas = [t.lemma_.lower() for t in block_doc if t.pos_ not in STOP_POS and t.is_alpha]
            meta = self._chunk_metadata(block_doc, block)
            chunks.append(ContentChunk(
                chunk_id=chunk_id,
                chunk_type=chunk_type,
                title=title,
                text=block,
                sentences=sents,
                lemmatized_tokens=lemmas,
                metadata=meta,
            ))

        # Remaining blocks: no spaCy, minimal metadata (keeps full content, much faster)
        for chunk_id in range(len(to_analyze), len(block_list)):
            block, chunk_type, title = block_list[chunk_id]
            simple_sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", block) if s.strip()]
            word_count = len(block.split())
            chunks.append(ContentChunk(
                chunk_id=chunk_id,
                chunk_type=chunk_type,
                title=title,
                text=block,
                sentences=simple_sents if simple_sents else [block[:200].strip() or block],
                lemmatized_tokens=[],
                metadata=ChunkMetadata(
                    keywords=[],
                    key_phrases=[],
                    estimated_difficulty="medium",
                    sentence_count=len(simple_sents) or 1,
                    word_count=word_count,
                    has_definitions=any(p in block.lower() for p in DEFINITION_PATTERNS),
                    has_formulas=bool(FORMULA_SYMBOLS.search(block)),
                    has_examples=any(p in block.lower() for p in EXAMPLE_PATTERNS),
                    named_entities=[],
                ),
            ))

        return chunks

    def _detect_heading(self, line: str) -> Optional[str]:
        stripped = line.strip()
        if not stripped or len(stripped) > 120:
            return None
        for pat in HEADING_PATTERNS:
            m = pat.match(stripped)
            if m:
                return m.group(m.lastindex or 0).strip()
        return None

    def _classify_heading(self, line: str) -> str:
        low = line.strip().lower()
        if re.match(r"(figure|fig\.?|diagram|flow\s*chart|flowchart)\s", low):
            return "figure"   # Diagrams, flowcharts, figures (OCR text)
        if re.match(r"table\s", low):
            return "section"  # Table captions
        if re.match(r"(chapter|unit|module)\s", low):
            return "unit"
        if re.match(r"(section|part|\d+\.)\s", low):
            return "topic"
        return "section"

    def _split_if_too_large(self, text: str) -> list[str]:
        words = text.split()
        if len(words) <= MAX_CHUNK_WORDS:
            return [text]
        # Split on double newlines or paragraph breaks first
        paras = re.split(r"\n\s*\n", text)
        if len(paras) > 1:
            return [p.strip() for p in paras if p.strip()]
        # Fall back to fixed-size word windows
        blocks: list[str] = []
        for i in range(0, len(words), MAX_CHUNK_WORDS):
            blocks.append(" ".join(words[i : i + MAX_CHUNK_WORDS]))
        return blocks

    # ── Per-chunk metadata ────────────────────────────────────────

    def _chunk_metadata(self, doc: Doc, raw: str) -> ChunkMetadata:
        kw = self._doc_keywords(doc, top_n=12)
        phrases = self._extract_key_phrases(doc, top_n=8)
        ents = list({ent.text.strip() for ent in doc.ents if len(ent.text.strip()) > 1})
        low = raw.lower()

        has_def = any(p in low for p in DEFINITION_PATTERNS)
        has_form = bool(FORMULA_SYMBOLS.search(raw))
        has_ex = any(p in low for p in EXAMPLE_PATTERNS)

        return ChunkMetadata(
            keywords=kw,
            key_phrases=phrases,
            estimated_difficulty=self._estimate_difficulty(doc, raw),
            sentence_count=len(list(doc.sents)),
            word_count=len([t for t in doc if t.is_alpha]),
            has_definitions=has_def,
            has_formulas=has_form,
            has_examples=has_ex,
            named_entities=ents[:15],
        )

    def _estimate_difficulty(self, doc: Doc, raw: str) -> str:
        lemmas = {t.lemma_.lower() for t in doc if t.is_alpha}
        hard_score = len(lemmas & DIFFICULTY_KEYWORDS["hard"])
        easy_score = len(lemmas & DIFFICULTY_KEYWORDS["easy"])
        avg_sent_len = len(list(doc)) / max(len(list(doc.sents)), 1)
        if hard_score >= 2 or avg_sent_len > 30:
            return "hard"
        if easy_score >= 2 or avg_sent_len < 15:
            return "easy"
        return "medium"

    # ── Keyword extraction ────────────────────────────────────────

    def _doc_keywords(self, doc: Doc, top_n: int = 20) -> list[str]:
        freq: Counter = Counter()
        for token in doc:
            if token.pos_ not in STOP_POS and token.is_alpha and len(token.lemma_) > 2:
                freq[token.lemma_.lower()] += 1
        return [w for w, _ in freq.most_common(top_n)]

    def _global_keywords(self, doc: Doc) -> list[str]:
        return self._doc_keywords(doc, top_n=30)

    def _extract_key_phrases(self, doc: Doc, top_n: int = 15) -> list[str]:
        """Extract noun-chunk and entity-based key phrases (good for diagrams/flowcharts)."""
        phrase_freq: Counter = Counter()
        for chunk in doc.noun_chunks:
            phrase = chunk.text.strip().lower()
            words = phrase.split()
            # 1–5 word phrases, skip pure numbers
            if 1 <= len(words) <= 5 and len(phrase) > 2 and not phrase.replace(".", "").isdigit():
                phrase_freq[phrase] += 1
        # Add notable named entities as phrases
        for ent in doc.ents:
            if ent.label_ in ("ORG", "PRODUCT", "WORK_OF_ART", "LAW", "EVENT") and 1 <= len(ent.text.split()) <= 4:
                phrase_freq[ent.text.strip().lower()] += 2
        return [p for p, _ in phrase_freq.most_common(top_n)]

    # ── Entity extraction ─────────────────────────────────────────

    def _extract_entities(self, doc: Doc) -> list[dict]:
        ent_map: dict[str, dict] = {}
        for ent in doc.ents:
            key = ent.text.strip()
            if key not in ent_map:
                ent_map[key] = {"text": key, "label": ent.label_, "count": 0}
            ent_map[key]["count"] += 1
        sorted_ents = sorted(ent_map.values(), key=lambda x: x["count"], reverse=True)
        return sorted_ents[:30]

    # ── Topic extraction ──────────────────────────────────────────

    def _normalize_topic_name(self, raw: str) -> str:
        """Strip and truncate for UI; keeps topics usable in question config."""
        s = raw.strip()
        if len(s) > 80:
            s = s[:77] + "..."
        return s or "Untitled"

    def _extract_topics(self, chunks: list[ContentChunk], doc: Doc) -> list[TopicInfo]:
        """Identify topics from chunk titles (chapters, sections) and keyword clustering.
        Whole-book PDFs: chapter/section headings become topics so users can select by topic."""
        topics: list[TopicInfo] = []
        seen: set[str] = set()

        # 1. Use chunk titles as primary topics (Chapter 1, Section 2.1, etc.)
        for ch in chunks:
            if not ch.title:
                continue
            norm = self._normalize_topic_name(ch.title).lower()
            if norm not in seen:
                seen.add(norm)
                topics.append(TopicInfo(
                    name=self._normalize_topic_name(ch.title),
                    relevance=0.9,
                    subtopics=[],
                    keywords=ch.metadata.keywords[:5],
                    chunk_ids=[ch.chunk_id],
                ))

        # 2. Cluster remaining chunks into existing topics or create new ones
        for ch in chunks:
            if ch.title:
                norm = self._normalize_topic_name(ch.title).lower()
                if norm in seen:
                    for t in topics:
                        if t.name.lower() == norm and ch.chunk_id not in t.chunk_ids:
                            t.chunk_ids.append(ch.chunk_id)
                    continue
            # Try to assign to an existing topic by keyword overlap
            best_topic = None
            best_overlap = 0
            ch_kw_set = set(ch.metadata.keywords)
            for t in topics:
                overlap = len(ch_kw_set & set(t.keywords))
                if overlap > best_overlap:
                    best_overlap = overlap
                    best_topic = t
            if best_topic and best_overlap >= 2:
                best_topic.chunk_ids.append(ch.chunk_id)
                # Add unique keywords as subtopics
                new_kw = ch_kw_set - set(best_topic.keywords)
                best_topic.subtopics.extend(list(new_kw)[:3])
            elif ch.metadata.keywords:
                topics.append(TopicInfo(
                    name=ch.metadata.keywords[0].title(),
                    relevance=0.6,
                    keywords=ch.metadata.keywords[:5],
                    chunk_ids=[ch.chunk_id],
                ))
                seen.add(ch.metadata.keywords[0].lower())

        # Calculate relevance based on chunk coverage
        total_chunks = max(len(chunks), 1)
        for t in topics:
            t.relevance = round(min(len(t.chunk_ids) / total_chunks * 3, 1.0), 2)

        return sorted(topics, key=lambda t: t.relevance, reverse=True)[:15]

    # ── Academic level estimation ─────────────────────────────────

    def _estimate_academic_level(self, doc: Doc, chunks: list[ContentChunk]) -> str:
        difficulties = [ch.metadata.estimated_difficulty for ch in chunks]
        hard_ratio = difficulties.count("hard") / max(len(difficulties), 1)
        avg_word_len = sum(len(t.text) for t in doc if t.is_alpha) / max(len([t for t in doc if t.is_alpha]), 1)

        if hard_ratio > 0.4 or avg_word_len > 7:
            return "postgraduate"
        if hard_ratio > 0.15 or avg_word_len > 5.5:
            return "undergraduate"
        return "foundation"

    # ── Vocabulary richness ───────────────────────────────────────

    def _vocabulary_richness(self, doc: Doc) -> float:
        tokens = [t.lemma_.lower() for t in doc if t.is_alpha]
        if not tokens:
            return 0.0
        return len(set(tokens)) / len(tokens)

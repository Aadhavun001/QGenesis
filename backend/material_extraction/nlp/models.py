"""Pydantic models for NLP analysis results."""

from pydantic import BaseModel, Field


class ChunkMetadata(BaseModel):
    """Metadata for a single content chunk."""
    keywords: list[str] = Field(default_factory=list)
    key_phrases: list[str] = Field(default_factory=list)
    estimated_difficulty: str = "medium"  # easy, medium, hard
    sentence_count: int = 0
    word_count: int = 0
    has_definitions: bool = False
    has_formulas: bool = False
    has_examples: bool = False
    named_entities: list[str] = Field(default_factory=list)


class ContentChunk(BaseModel):
    """A logical chunk of material suitable for question generation."""
    chunk_id: int
    chunk_type: str = "paragraph"  # unit, topic, paragraph, section
    title: str = ""
    text: str
    sentences: list[str] = Field(default_factory=list)
    lemmatized_tokens: list[str] = Field(default_factory=list)
    metadata: ChunkMetadata = Field(default_factory=ChunkMetadata)


class TopicInfo(BaseModel):
    """A detected topic with supporting evidence."""
    name: str
    relevance: float = 0.0
    subtopics: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    chunk_ids: list[int] = Field(default_factory=list)


class NLPAnalysisResult(BaseModel):
    """Complete NLP analysis output for a document."""
    topics: list[TopicInfo] = Field(default_factory=list)
    chunks: list[ContentChunk] = Field(default_factory=list)
    global_keywords: list[str] = Field(default_factory=list)
    global_key_phrases: list[str] = Field(default_factory=list)
    named_entities: list[dict] = Field(default_factory=list)
    sentence_count: int = 0
    vocabulary_richness: float = 0.0
    estimated_academic_level: str = "undergraduate"
    processing_time_ms: float = 0

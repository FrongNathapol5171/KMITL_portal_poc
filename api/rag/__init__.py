"""
RAG Engine — Tier A (§3.2, FR-A1…A7).
Retrieves relevant doc chunks and generates a grounded answer via Gemini.
"""

from typing import AsyncGenerator

import google.generativeai as genai

from api.config import settings

SYSTEM_INSTRUCTION = (
    "You are AskKMITL, a helpful academic assistant for KMITL "
    "(King Mongkut's Institute of Technology Ladkrabang) students. "
    "Answer ONLY based on the provided context. "
    "Answer in the same language the student used (Thai or English). "
    "If the context does not contain enough information, say so clearly "
    "and suggest the student contact the relevant office. "
    "Never fabricate regulations or deadlines. "
    "Always mention the source document/section at the end of your answer. "
    "Do not perform or approve any transactions; inform and route only."
)


def _configure():
    genai.configure(api_key=settings.GEMINI_API_KEY)


def _embed(text: str) -> list[float]:
    _configure()
    result = genai.embed_content(
        model=settings.EMBEDDING_MODEL,
        content=text,
        task_type="retrieval_query",
    )
    return result["embedding"]


async def retrieve_chunks(query: str, k: int = 5) -> list[dict]:
    """Retrieve top-k relevant doc chunks from pgvector."""
    import asyncpg

    embedding = _embed(query)
    vec_str = "[" + ",".join(str(x) for x in embedding) + "]"

    conn = await asyncpg.connect(settings.DATABASE_URL)
    try:
        rows = await conn.fetch(
            """
            SELECT chunk_id, doc, section, source_url, content,
                   1 - (embedding <=> $1::vector) AS similarity
            FROM   doc_chunks
            ORDER  BY embedding <=> $1::vector
            LIMIT  $2
            """,
            vec_str, k,
        )
        return [dict(r) for r in rows]
    finally:
        await conn.close()


async def answer_stream(message: str, locale: str) -> AsyncGenerator[dict, None]:
    """Stream a RAG answer for Tier-A queries using Gemini."""
    _configure()
    chunks = await retrieve_chunks(message)

    if not chunks:
        yield {
            "type": "token",
            "text": (
                "ขออภัย ไม่พบข้อมูลที่เกี่ยวข้องในเอกสารของ KMITL "
                "กรุณาติดต่อสำนักทะเบียนโดยตรงครับ"
                if locale == "th"
                else "Sorry, I couldn't find relevant information. "
                     "Please contact the Registrar's office directly."
            ),
        }
        yield {"type": "done", "escalated": True, "escalated_to": "registrar"}
        return

    context_text = "\n\n---\n\n".join(
        f"[{c['doc']} / {c['section']}]\n{c['content']}" for c in chunks
    )
    avg_conf = sum(c["similarity"] for c in chunks) / len(chunks)

    if avg_conf < 0.55:
        yield {
            "type": "token",
            "text": (
                "ไม่แน่ใจในคำตอบที่ถูกต้อง กรุณาตรวจสอบกับสำนักทะเบียน"
                if locale == "th"
                else "I'm not confident in the answer. Please verify with the Registrar."
            ),
        }
        yield {"type": "done", "escalated": True, "escalated_to": "registrar"}
        return

    prompt = f"Context:\n{context_text}\n\nQuestion: {message}"
    model = genai.GenerativeModel(
        model_name=settings.LLM_MODEL,
        system_instruction=SYSTEM_INSTRUCTION,
        generation_config={"temperature": 0.2, "max_output_tokens": 1024},
    )

    response = model.generate_content(prompt, stream=True)
    for chunk in response:
        if chunk.text:
            yield {"type": "token", "text": chunk.text}

    # Emit source chips (FR-A7)
    for c in chunks[:3]:
        yield {
            "type": "source",
            "doc": c["doc"],
            "section": c["section"],
            "url": c["source_url"],
            "conf": round(float(c["similarity"]), 3),
        }

    yield {"type": "done", "escalated": False, "conf": round(avg_conf, 3)}


async def ingest_document(
    doc_name: str,
    section: str,
    source_url: str,
    content: str,
    chunk_size: int = 700,
    overlap: int = 80,
):
    """Chunk and embed a regulation document into doc_chunks using Gemini embeddings."""
    import asyncpg

    _configure()
    words = content.split()
    chunks = []
    i = 0
    while i < len(words):
        chunks.append(" ".join(words[i: i + chunk_size]))
        i += chunk_size - overlap

    conn = await asyncpg.connect(settings.DATABASE_URL)
    try:
        for chunk_text in chunks:
            result = genai.embed_content(
                model=settings.EMBEDDING_MODEL,
                content=chunk_text,
                task_type="retrieval_document",
            )
            embedding = result["embedding"]
            vec_str = "[" + ",".join(str(x) for x in embedding) + "]"
            await conn.execute(
                """
                INSERT INTO doc_chunks (doc, section, source_url, content, embedding)
                VALUES ($1, $2, $3, $4, $5::vector)
                """,
                doc_name, section, source_url, chunk_text, vec_str,
            )
    finally:
        await conn.close()

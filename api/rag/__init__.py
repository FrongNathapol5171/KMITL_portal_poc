"""
RAG Engine — Tier A (§3.2, FR-A1…A7).
Retrieves relevant doc chunks and generates a grounded answer.
"""

from typing import AsyncGenerator
from api.config import settings

SYSTEM_PROMPT = """
You are AskKMITL, a helpful academic assistant for KMITL (King Mongkut's Institute
of Technology Ladkrabang) students. You answer ONLY based on the provided context.

Rules:
- Answer in the same language the student used (Thai or English).
- If the context does not contain enough information, say so clearly and suggest the
  student contact the relevant office. Never fabricate regulations or deadlines.
- Always mention the source document/section at the end of your answer.
- Do not perform or approve any transactions; inform and route only.
"""


async def embed_query(query: str) -> list[float]:
    """Embed query text using OpenAI embeddings."""
    from openai import OpenAI
    client = OpenAI(api_key=settings.LLM_API_KEY)
    resp = client.embeddings.create(model=settings.EMBEDDING_MODEL, input=query)
    return resp.data[0].embedding


async def retrieve_chunks(query: str, k: int = 5) -> list[dict]:
    """Retrieve top-k relevant doc chunks from pgvector."""
    import asyncpg, json

    embedding = await embed_query(query)
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
    """Stream a RAG answer for Tier-A queries."""
    import anthropic

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

    client = anthropic.Anthropic(api_key=settings.LLM_API_KEY)
    with client.messages.stream(
        model=settings.LLM_MODEL,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Context:\n{context_text}\n\nQuestion: {message}",
            }
        ],
    ) as stream:
        for text in stream.text_stream:
            yield {"type": "token", "text": text}

    # Emit source chips
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
    """Chunk and embed a regulation document into doc_chunks."""
    import asyncpg

    words = content.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk_words = words[i: i + chunk_size]
        chunks.append(" ".join(chunk_words))
        i += chunk_size - overlap

    conn = await asyncpg.connect(settings.DATABASE_URL)
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.LLM_API_KEY)
        for chunk_text in chunks:
            resp = client.embeddings.create(
                model=settings.EMBEDDING_MODEL, input=chunk_text
            )
            embedding = resp.data[0].embedding
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

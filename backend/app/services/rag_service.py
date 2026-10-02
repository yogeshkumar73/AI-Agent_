import re
import math
from typing import List, Dict, Any, Tuple
from collections import Counter

class RAGService:
    @staticmethod
    def chunk_document(pages: List[Dict[str, Any]], target_chunk_size: int = 500, overlap: int = 50) -> List[Dict[str, Any]]:
        """
        Splits pages into token/word chunks with overlap while preserving page citations.
        """
        chunks = []
        chunk_idx = 0

        for page_info in pages:
            page_num = page_info["page"]
            text = page_info["text"]
            words = text.split()
            
            if not words:
                continue

            if len(words) <= target_chunk_size:
                chunks.append({
                    "chunk_index": chunk_idx,
                    "page_number": page_num,
                    "text_content": text,
                    "token_count": len(words)
                })
                chunk_idx += 1
            else:
                step = target_chunk_size - overlap
                for i in range(0, len(words), step):
                    chunk_words = words[i:i + target_chunk_size]
                    if len(chunk_words) < 20 and i > 0:
                        continue  # Skip tiny trailing segments
                    chunks.append({
                        "chunk_index": chunk_idx,
                        "page_number": page_num,
                        "text_content": " ".join(chunk_words),
                        "token_count": len(chunk_words)
                    })
                    chunk_idx += 1
                    
        return chunks

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        return [w.lower() for w in re.findall(r'\b[a-zA-Z0-9_\$]+\b', text) if len(w) > 1]

    @classmethod
    def compute_similarity(cls, query: str, text: str) -> float:
        """
        Computes cosine term overlap similarity with phrase boosting.
        """
        q_tokens = cls._tokenize(query)
        t_tokens = cls._tokenize(text)
        
        if not q_tokens or not t_tokens:
            return 0.0

        q_counts = Counter(q_tokens)
        t_counts = Counter(t_tokens)

        # Dot product
        intersection = set(q_counts.keys()) & set(t_counts.keys())
        dot_product = sum(q_counts[x] * t_counts[x] for x in intersection)

        norm_q = math.sqrt(sum(c * c for c in q_counts.values()))
        norm_t = math.sqrt(sum(c * c for c in t_counts.values()))

        if norm_q == 0 or norm_t == 0:
            return 0.0

        score = dot_product / (norm_q * norm_t)
        
        # Exact phrase bonus
        if query.lower().strip() in text.lower():
            score += 0.5

        return score

    @classmethod
    def retrieve_relevant_chunks(
        cls, 
        query: str, 
        chunks: List[Dict[str, Any]], 
        top_k: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Retrieves top-k relevant chunks based on token-efficient similarity scoring.
        """
        scored_chunks: List[Tuple[float, Dict[str, Any]]] = []
        for ch in chunks:
            sim = cls.compute_similarity(query, ch.get("text_content", ""))
            if sim > 0.02:  # Relevancy threshold
                scored_chunks.append((sim, ch))

        # Sort descending by relevance score
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored_chunks[:top_k]]

rag_service = RAGService()

import os
from typing import List, Dict, Any
from pypdf import PdfReader
import docx

class ParserService:
    @staticmethod
    def extract_from_pdf(file_path: str) -> List[Dict[str, Any]]:
        """
        Extracts text from PDF page by page.
        Returns list of dicts: [{"page": 1, "text": "..."}]
        """
        pages = []
        try:
            reader = PdfReader(file_path)
            for idx, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                # Normalize line breaks and clean whitespace
                cleaned_text = "\n".join([line.strip() for line in text.splitlines() if line.strip()])
                pages.append({
                    "page": idx + 1,
                    "text": cleaned_text
                })
        except Exception as e:
            raise RuntimeError(f"Failed to parse PDF file: {str(e)}")
        return pages

    @staticmethod
    def extract_from_docx(file_path: str) -> List[Dict[str, Any]]:
        """
        Extracts text and table content from DOCX file.
        Groups into logical sections/pages.
        """
        pages = []
        try:
            doc = docx.Document(file_path)
            full_text = []
            
            # Extract paragraphs
            for para in doc.paragraphs:
                if para.text.strip():
                    full_text.append(para.text.strip())
            
            # Extract tables
            for table in doc.tables:
                for row in table.rows:
                    row_data = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                    if row_data:
                        full_text.append(" | ".join(row_data))
                        
            # Rough pagination simulation: ~3000 chars per page
            combined = "\n".join(full_text)
            char_limit = 2500
            if len(combined) <= char_limit:
                pages.append({"page": 1, "text": combined})
            else:
                curr_idx = 0
                page_num = 1
                while curr_idx < len(combined):
                    chunk = combined[curr_idx:curr_idx + char_limit]
                    pages.append({"page": page_num, "text": chunk})
                    curr_idx += char_limit
                    page_num += 1
        except Exception as e:
            raise RuntimeError(f"Failed to parse DOCX file: {str(e)}")
        return pages

    @classmethod
    def parse_document(cls, file_path: str, mime_type: str) -> List[Dict[str, Any]]:
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf" or "pdf" in mime_type:
            return cls.extract_from_pdf(file_path)
        elif ext in [".docx", ".doc"] or "word" in mime_type or "officedocument" in mime_type:
            return cls.extract_from_docx(file_path)
        else:
            # Fallback plain text read
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            return [{"page": 1, "text": content}]

parser_service = ParserService()

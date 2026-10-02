export interface User {
  id: string;
  email: string;
  full_name: string;
  company_name?: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ExtractedMetadata {
  entity_name?: string;
  invoice_number?: string;
  issue_date?: string;
  due_date?: string;
  currency?: string;
  total_amount?: number;
  tax_amount?: number;
  line_item_count?: number;
  key_findings?: string[];
}

export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type DocumentType = 'bill' | 'invoice' | 'report' | 'audit' | 'general';

export interface DocumentItem {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  doc_type: DocumentType;
  status: DocumentStatus;
  error_message?: string;
  page_count: number;
  summary?: string;
  extracted_metadata: ExtractedMetadata;
  created_at: string;
  updated_at: string;
}

export interface DocumentStats {
  total_documents: number;
  completed_documents: number;
  processing_documents: number;
  total_spend_extracted: number;
  doc_types: Record<string, number>;
}

export interface Citation {
  document_id: string;
  document_name: string;
  page_number: number;
  snippet: string;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: Citation[];
  token_usage: TokenUsage;
  suggested_followups: string[];
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  document_id?: string;
  last_message_at: string;
  created_at: string;
}

export interface AIInsight {
  id: string;
  user_id: string;
  document_id?: string;
  document_name?: string;
  insight_type: string;
  title: string;
  description: string;
  confidence_score: number;
  actionable_query?: string;
  created_at: string;
}

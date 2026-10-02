import {
  AuthResponse,
  User,
  DocumentItem,
  DocumentStats,
  Conversation,
  Message,
  AIInsight
} from '../types';

const API_BASE = '/api/v1';

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.dispatchEvent(new Event('auth-logout'));
      }
    }

    if (!response.ok) {
      let errorMsg = 'An unexpected error occurred';
      try {
        const errData = await response.json();
        errorMsg = errData.detail || errData.message || errorMsg;
      } catch (e) {
        errorMsg = response.statusText || errorMsg;
      }
      throw new Error(errorMsg);
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async register(full_name: string, email: string, password: string, company_name?: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ full_name, email, password, company_name })
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // Documents
  async listDocuments(query?: string, status?: string, docType?: string): Promise<DocumentItem[]> {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (status) params.append('status', status);
    if (docType) params.append('doc_type', docType);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<DocumentItem[]>(`/documents${qs}`);
  }

  async uploadDocument(file: File): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<DocumentItem>('/documents/upload', {
      method: 'POST',
      body: formData
    });
  }

  async getDocument(docId: string): Promise<DocumentItem> {
    return this.request<DocumentItem>(`/documents/${docId}`);
  }

  async deleteDocument(docId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/documents/${docId}`, {
      method: 'DELETE'
    });
  }

  async getStats(): Promise<DocumentStats> {
    return this.request<DocumentStats>('/documents/stats');
  }

  getDocumentDownloadUrl(docId: string): string {
    return `${API_BASE}/documents/${docId}/download`;
  }

  // Processing Status
  async getProcessingStatus(docId: string): Promise<{ status: string; page_count: number; error_message?: string }> {
    return this.request(`/processing/status/${docId}`);
  }

  // Chat
  async listConversations(): Promise<Conversation[]> {
    return this.request<Conversation[]>('/chat/conversations');
  }

  async createConversation(title?: string, documentId?: string): Promise<Conversation> {
    return this.request<Conversation>('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify({ title, document_id: documentId })
    });
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return this.request<Message[]>(`/chat/conversations/${conversationId}/messages`);
  }

  async sendMessage(conversationId: string, content: string, documentId?: string): Promise<Message> {
    return this.request<Message>(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, document_id: documentId })
    });
  }

  // Insights
  async getInsights(documentId?: string): Promise<AIInsight[]> {
    const qs = documentId ? `?document_id=${documentId}` : '';
    return this.request<AIInsight[]>(`/insights${qs}`);
  }
}

export const api = new ApiService();

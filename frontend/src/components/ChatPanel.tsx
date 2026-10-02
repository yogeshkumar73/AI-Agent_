import React, { useState, useEffect, useRef } from 'react';
import { DocumentItem, Conversation, Message, Citation } from '../types';
import { api } from '../services/api';
import {
  Send,
  Bot,
  User as UserIcon,
  Sparkles,
  BookOpen,
  PlusCircle,
  FileText,
  Layers,
  ChevronRight,
  Info,
  ExternalLink
} from 'lucide-react';

interface ChatPanelProps {
  documents: DocumentItem[];
  activeDocument: DocumentItem | null;
  onClearActiveDoc: () => void;
  onSelectDoc: (doc: DocumentItem) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  documents,
  activeDocument,
  onClearActiveDoc,
  onSelectDoc
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeCitationPreview, setActiveCitationPreview] = useState<Citation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    loadConversations();
  }, []);

  // When active conversation changes, load messages
  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    }
  }, [activeConvId]);

  // When activeDocument changes from outside, create or find appropriate conversation
  useEffect(() => {
    if (activeDocument) {
      const existing = conversations.find((c) => c.document_id === activeDocument.id);
      if (existing) {
        setActiveConvId(existing.id);
      } else {
        createNewConversation(activeDocument.file_name, activeDocument.id);
      }
    }
  }, [activeDocument]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const loadConversations = async () => {
    try {
      const list = await api.listConversations();
      setConversations(list);
      if (list.length > 0 && !activeConvId) {
        setActiveConvId(list[0].id);
      } else if (list.length === 0) {
        createNewConversation('General Workspace Assistant');
      }
    } catch (e) {
      console.error('Failed to load conversations', e);
    }
  };

  const createNewConversation = async (title?: string, docId?: string) => {
    try {
      const conv = await api.createConversation(
        title || (activeDocument ? `Chat: ${activeDocument.file_name}` : 'New Workspace Conversation'),
        docId || activeDocument?.id
      );
      setConversations((prev) => [conv, ...prev]);
      setActiveConvId(conv.id);
      setMessages([]);
    } catch (e) {
      console.error('Error creating conversation', e);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const msgs = await api.getMessages(convId);
      setMessages(msgs);
    } catch (e) {
      console.error('Failed to load messages', e);
    }
  };

  const handleSend = async (questionText?: string) => {
    const textToSend = questionText || inputQuestion;
    if (!textToSend.trim() || isLoading) return;

    let convId = activeConvId;
    if (!convId) {
      const conv = await api.createConversation('Workspace Query', activeDocument?.id);
      convId = conv.id;
      setConversations([conv, ...conversations]);
      setActiveConvId(convId);
    }

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: convId,
      user_id: '',
      role: 'user',
      content: textToSend,
      citations: [],
      token_usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      suggested_followups: [],
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInputQuestion('');
    setIsLoading(true);

    try {
      const assistantMsg = await api.sendMessage(convId, textToSend, activeDocument?.id);
      setMessages((prev) => [...prev.filter((m) => m.id !== tempUserMsg.id), tempUserMsg, assistantMsg]);
    } catch (err: any) {
      alert(err.message || 'Failed to get answer from AI Agent');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-color)',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      height: '680px',
      overflow: 'hidden'
    }}>
      {/* Scope & Mode Bar */}
      <div style={{
        padding: '0.85rem 1.25rem',
        borderBottom: '1px solid var(--border-color)',
        background: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        {/* Document Context Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Context Scope:
          </span>
          {activeDocument ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.25rem 0.65rem',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              fontWeight: 600,
              border: '1px solid #bfdbfe'
            }}>
              <FileText size={14} />
              <span style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeDocument.file_name}
              </span>
              <button
                onClick={onClearActiveDoc}
                title="Switch to all documents"
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  marginLeft: '0.25rem'
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.65rem',
              background: '#e0e7ff',
              color: '#4338ca',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              fontWeight: 600
            }}>
              <Layers size={14} />
              <span>All Workspace Documents ({documents.length})</span>
            </div>
          )}
        </div>

        <button
          onClick={() => createNewConversation()}
          style={{
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}
        >
          <PlusCircle size={14} />
          New Conversation
        </button>
      </div>

      {/* Messages Thread */}
      <div style={{
        flex: 1,
        padding: '1.25rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.15rem'
      }}>
        {messages.length === 0 ? (
          <div style={{
            margin: 'auto',
            textAlign: 'center',
            maxWidth: '440px',
            padding: '2rem 1rem'
          }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto'
            }}>
              <Bot size={28} />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Ask questions about your reports & bills
            </h4>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '0.4rem', lineHeight: 1.5 }}>
              The AI uses token-minimized retrieval. Ask for total expenditure, breakdown of line items, audit findings, or payment terms.
            </p>

            {/* Quick Starter Prompts */}
            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                'What is the total invoiced amount across my bills?',
                'Summarize the key findings in my latest report.',
                'List all vendors and payment due dates.'
              ].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  style={{
                    padding: '0.6rem 0.85rem',
                    background: '#f8fafc',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.82rem',
                    color: 'var(--text-main)',
                    textAlign: 'left',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                >
                  <span>{prompt}</span>
                  <ChevronRight size={14} style={{ color: 'var(--primary)' }} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                gap: '0.75rem',
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%'
              }}
            >
              {m.role !== 'user' && (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Bot size={18} />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  background: m.role === 'user' ? 'var(--primary)' : '#f8fafc',
                  color: m.role === 'user' ? 'white' : 'var(--text-main)',
                  padding: '0.85rem 1.15rem',
                  borderRadius: 'var(--radius-md)',
                  border: m.role === 'user' ? 'none' : '1px solid var(--border-color)',
                  fontSize: '0.9rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  {m.content}
                </div>

                {/* Citations / Sources */}
                {m.citations && m.citations.length > 0 && (
                  <div style={{
                    marginTop: '0.6rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Sources:
                    </span>
                    {m.citations.map((cite, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveCitationPreview(cite)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.2rem 0.55rem',
                          background: 'white',
                          border: '1px solid #bfdbfe',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.72rem',
                          color: '#1d4ed8',
                          fontWeight: 600
                        }}
                      >
                        <BookOpen size={11} />
                        {cite.document_name} (Page {cite.page_number})
                      </button>
                    ))}
                  </div>
                )}

                {/* Token Stats (Token Minimization Indicator) */}
                {m.token_usage && m.token_usage.total_tokens > 0 && (
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-light)', marginTop: '0.35rem' }}>
                    Token usage: {m.token_usage.total_tokens} tokens (Optimized via 2-tier caching)
                  </p>
                )}

                {/* Suggested Follow-ups */}
                {m.suggested_followups && m.suggested_followups.length > 0 && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {m.suggested_followups.map((sug, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => handleSend(sug)}
                        style={{
                          fontSize: '0.74rem',
                          padding: '0.25rem 0.65rem',
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          borderRadius: 'var(--radius-full)',
                          color: 'var(--text-main)',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--primary)';
                          e.currentTarget.style.color = 'var(--primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.color = 'var(--text-main)';
                        }}
                      >
                        <Sparkles size={11} style={{ color: 'var(--primary)' }} />
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {m.role === 'user' && (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#0f172a',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <UserIcon size={16} />
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bot size={18} />
            </div>
            <div style={{
              background: '#f8fafc',
              border: '1px solid var(--border-color)',
              padding: '0.7rem 1.1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Sparkles size={16} className="animate-spin" style={{ color: 'var(--primary)' }} />
              <span>Retrieving relevant chunks & formulating answer...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Citation Preview Modal */}
      {activeCitationPreview && (
        <div style={{
          padding: '0.85rem 1.25rem',
          background: '#eff6ff',
          borderTop: '1px solid #bfdbfe',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1rem',
          animation: 'fadeIn 0.15s ease'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' }}>
                Source Excerpt:
              </span>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e3a8a' }}>
                {activeCitationPreview.document_name} — Page {activeCitationPreview.page_number}
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#1e40af', marginTop: '0.2rem', fontStyle: 'italic' }}>
              "{activeCitationPreview.snippet}"
            </p>
          </div>
          <button
            onClick={() => setActiveCitationPreview(null)}
            style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Chat Input */}
      <div style={{
        padding: '0.95rem 1.25rem',
        borderTop: '1px solid var(--border-color)',
        background: 'white'
      }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          style={{ display: 'flex', gap: '0.65rem' }}
        >
          <input
            type="text"
            placeholder={activeDocument ? `Ask a question about ${activeDocument.file_name}...` : 'Ask anything across all reports and bills...'}
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              fontSize: '0.92rem'
            }}
          />
          <button
            type="submit"
            disabled={!inputQuestion.trim() || isLoading}
            style={{
              background: !inputQuestion.trim() || isLoading ? '#94a3b8' : 'var(--primary)',
              color: 'white',
              padding: '0.75rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: !inputQuestion.trim() || isLoading ? 'not-allowed' : 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <Send size={16} />
            Ask
          </button>
        </form>
      </div>
    </div>
  );
};

import React from 'react';
import { DocumentItem, DocumentType } from '../types';
import { FileText, Search, MessageSquare, Eye, Trash2, CheckCircle2, Clock, AlertTriangle, ArrowUpDown } from 'lucide-react';

interface DocumentListProps {
  documents: DocumentItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedType: string;
  onSelectType: (t: string) => void;
  onViewDoc: (doc: DocumentItem) => void;
  onChatWithDoc: (doc: DocumentItem) => void;
  onDeleteDoc: (docId: string) => void;
  onOpenUpload: () => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  searchQuery,
  onSearchChange,
  selectedType,
  onSelectType,
  onViewDoc,
  onChatWithDoc,
  onDeleteDoc,
  onOpenUpload
}) => {
  const typeFilters: { label: string; value: string }[] = [
    { label: 'All Documents', value: '' },
    { label: 'Bills', value: 'bill' },
    { label: 'Invoices', value: 'invoice' },
    { label: 'Reports', value: 'report' },
    { label: 'Audits', value: 'audit' }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.2rem 0.6rem',
            borderRadius: 'var(--radius-full)',
            background: 'var(--success-bg)',
            color: 'var(--success)',
            border: '1px solid var(--success-border)',
            fontSize: '0.74rem',
            fontWeight: 700
          }}>
            <CheckCircle2 size={12} /> Ready
          </span>
        );
      case 'processing':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.2rem 0.6rem',
            borderRadius: 'var(--radius-full)',
            background: 'var(--warning-bg)',
            color: 'var(--warning)',
            border: '1px solid var(--warning-border)',
            fontSize: '0.74rem',
            fontWeight: 700
          }}>
            <Clock size={12} className="animate-spin" /> Processing
          </span>
        );
      case 'failed':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.2rem 0.6rem',
            borderRadius: 'var(--radius-full)',
            background: 'var(--danger-bg)',
            color: 'var(--danger)',
            border: '1px solid var(--danger-border)',
            fontSize: '0.74rem',
            fontWeight: 700
          }}>
            <AlertTriangle size={12} /> Error
          </span>
        );
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.2rem 0.6rem',
            borderRadius: 'var(--radius-full)',
            background: '#f1f5f9',
            color: '#64748b',
            fontSize: '0.74rem',
            fontWeight: 600
          }}>
            Pending
          </span>
        );
    }
  };

  const getTypeBadge = (type: DocumentType) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      bill: { bg: '#e0f2fe', color: '#0369a1', label: 'Bill' },
      invoice: { bg: '#ede9fe', color: '#6d28d9', label: 'Invoice' },
      report: { bg: '#fef3c7', color: '#b45309', label: 'Report' },
      audit: { bg: '#fce7f3', color: '#be185d', label: 'Audit' },
      general: { bg: '#f1f5f9', color: '#475569', label: 'General' }
    };
    const c = map[type] || map['general'];
    return (
      <span style={{
        padding: '0.15rem 0.55rem',
        borderRadius: 'var(--radius-sm)',
        background: c.bg,
        color: c.color,
        fontSize: '0.72rem',
        fontWeight: 700,
        textTransform: 'uppercase'
      }}>
        {c.label}
      </span>
    );
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-color)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden'
    }}>
      {/* Controls Bar */}
      <div style={{
        padding: '1.15rem 1.5rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        {/* Search */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          minWidth: '260px'
        }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search documents by name..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              paddingLeft: '2.25rem',
              width: '100%',
              fontSize: '0.88rem'
            }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {typeFilters.map((tf) => (
            <button
              key={tf.value}
              onClick={() => onSelectType(tf.value)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem',
                fontWeight: 600,
                background: selectedType === tf.value ? 'var(--primary)' : 'var(--bg-card-subtle)',
                color: selectedType === tf.value ? 'white' : 'var(--text-main)',
                border: '1px solid',
                borderColor: selectedType === tf.value ? 'var(--primary)' : 'var(--border-color)'
              }}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {documents.length === 0 ? (
        <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--bg-card-subtle)',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto'
          }}>
            <FileText size={28} />
          </div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
            No documents found
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem', maxWidth: '380px', margin: '0.35rem auto 1.25rem auto' }}>
            Upload reports or bills in PDF/DOCX format to view summaries, financial extractions, and ask questions.
          </p>
          <button
            onClick={onOpenUpload}
            style={{
              padding: '0.55rem 1.15rem',
              background: 'var(--primary)',
              color: 'white',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.88rem'
            }}
          >
            Upload First Document
          </button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Document Name
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Type
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Total Invoiced
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Uploaded
                </th>
                <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const total = doc.extracted_metadata?.total_amount;
                const currency = doc.extracted_metadata?.currency || '$';

                return (
                  <tr
                    key={doc.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                  >
                    {/* Name */}
                    <td style={{ padding: '0.95rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <FileText size={17} />
                        </div>
                        <div>
                          <p style={{
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            color: 'var(--text-main)',
                            cursor: 'pointer'
                          }}
                          onClick={() => onViewDoc(doc)}
                          >
                            {doc.file_name}
                          </p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {doc.page_count} pages • {(doc.file_size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td style={{ padding: '0.95rem 1rem' }}>
                      {getTypeBadge(doc.doc_type)}
                    </td>

                    {/* Amount */}
                    <td style={{ padding: '0.95rem 1rem', fontWeight: 700, fontSize: '0.92rem', color: total ? 'var(--text-main)' : 'var(--text-light)' }}>
                      {total ? `${currency} ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '0.95rem 1rem' }}>
                      {getStatusBadge(doc.status)}
                    </td>

                    {/* Date */}
                    <td style={{ padding: '0.95rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.95rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button
                          onClick={() => onViewDoc(doc)}
                          title="View Details"
                          style={{
                            padding: '0.4rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            background: 'white',
                            color: 'var(--text-main)'
                          }}
                        >
                          <Eye size={15} />
                        </button>

                        <button
                          onClick={() => onChatWithDoc(doc)}
                          title="Chat with Document"
                          disabled={doc.status !== 'completed'}
                          style={{
                            padding: '0.4rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            background: doc.status === 'completed' ? 'var(--primary)' : '#e2e8f0',
                            color: doc.status === 'completed' ? 'white' : '#94a3b8',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            cursor: doc.status === 'completed' ? 'pointer' : 'not-allowed'
                          }}
                        >
                          <MessageSquare size={14} />
                          Chat
                        </button>

                        <button
                          onClick={() => onDeleteDoc(doc.id)}
                          title="Delete"
                          style={{
                            padding: '0.4rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            background: 'white',
                            color: 'var(--text-muted)'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

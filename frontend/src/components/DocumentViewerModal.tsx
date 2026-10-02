import React from 'react';
import { DocumentItem } from '../types';
import { api } from '../services/api';
import { X, FileText, Download, MessageSquare, Trash2, Calendar, DollarSign, Tag, Hash, Building2 } from 'lucide-react';

interface DocumentViewerModalProps {
  document: DocumentItem | null;
  onClose: () => void;
  onSelectForChat: (doc: DocumentItem) => void;
  onDeleteSuccess: (docId: string) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  onClose,
  onSelectForChat,
  onDeleteSuccess
}) => {
  if (!document) return null;

  const meta = document.extracted_metadata || {};

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${document.file_name}"? This will also remove all its indexed chunks and insights.`)) {
      try {
        await api.deleteDocument(document.id);
        onDeleteSuccess(document.id);
        onClose();
      } catch (err: any) {
        alert(err.message || 'Failed to delete document');
      }
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '1rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        boxShadow: 'var(--shadow-xl)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-card-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', maxWidth: '420px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {document.file_name}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {document.page_count} pages • {(document.file_size / 1024).toFixed(1)} KB • Uploaded {new Date(document.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '0.4rem',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-muted)'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
          {/* Status Alert if failed */}
          {document.status === 'failed' && (
            <div style={{
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger)',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.25rem',
              fontSize: '0.88rem'
            }}>
              <strong>Processing Failed:</strong> {document.error_message || 'Could not parse document structure.'}
            </div>
          )}

          {/* Structured KPI Extraction Grid */}
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            Extracted Document Information (Tier 1 Cached)
          </h4>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.85rem',
            marginBottom: '1.5rem'
          }}>
            {/* Entity / Vendor */}
            <div style={{
              padding: '0.85rem 1rem',
              background: 'var(--bg-main)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                <Building2 size={13} /> Issuer / Entity
              </p>
              <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
                {meta.entity_name || 'N/A'}
              </p>
            </div>

            {/* Total Amount */}
            <div style={{
              padding: '0.85rem 1rem',
              background: 'var(--bg-main)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                <DollarSign size={13} /> Total Amount
              </p>
              <p style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--success)', marginTop: '0.2rem' }}>
                {meta.total_amount ? `${meta.currency || '$'} ${meta.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'N/A'}
              </p>
            </div>

            {/* Reference Number */}
            <div style={{
              padding: '0.85rem 1rem',
              background: 'var(--bg-main)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                <Hash size={13} /> Reference / Inv #
              </p>
              <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
                {meta.invoice_number || 'N/A'}
              </p>
            </div>

            {/* Date */}
            <div style={{
              padding: '0.85rem 1rem',
              background: 'var(--bg-main)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                <Calendar size={13} /> Issue Date
              </p>
              <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
                {meta.issue_date || 'N/A'}
              </p>
            </div>
          </div>

          {/* AI Executive Summary */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
              Executive AI Summary
            </h4>
            <div style={{
              background: '#f8fafc',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem 1.15rem',
              color: 'var(--text-main)',
              fontSize: '0.9rem',
              lineHeight: 1.6
            }}>
              {document.summary || 'Summary is being generated in the background...'}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '1rem 1.5rem',
          background: 'var(--bg-card-subtle)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={handleDelete}
            style={{
              padding: '0.55rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              color: 'var(--danger)',
              border: '1px solid var(--danger-border)',
              background: 'white',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Trash2 size={15} />
            Delete Document
          </button>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <a
              href={api.getDocumentDownloadUrl(document.id)}
              download={document.file_name}
              target="_blank"
              rel="noreferrer"
              style={{
                textDecoration: 'none',
                padding: '0.55rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                background: 'white',
                color: 'var(--text-main)',
                fontSize: '0.88rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Download size={15} />
              Download
            </a>

            <button
              onClick={() => {
                onSelectForChat(document);
                onClose();
              }}
              style={{
                padding: '0.55rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--primary)',
                color: 'white',
                fontSize: '0.88rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 2px 5px rgba(37, 99, 235, 0.25)'
              }}
            >
              <MessageSquare size={16} />
              Chat With This Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

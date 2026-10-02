import React from 'react';
import { DocumentStats } from '../types';
import { Files, DollarSign, Clock, CheckCircle2 } from 'lucide-react';

interface StatsCardsProps {
  stats: DocumentStats | null;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '1rem',
      marginBottom: '1.5rem'
    }}>
      {/* Total Documents */}
      <div style={{
        background: 'white',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.15rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--primary-light)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Files size={22} />
        </div>
        <div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Documents</p>
          <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.1rem' }}>
            {stats?.total_documents ?? 0}
          </h3>
        </div>
      </div>

      {/* Extracted Total Spend */}
      <div style={{
        background: 'white',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.15rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--success-bg)',
          color: 'var(--success)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <DollarSign size={22} />
        </div>
        <div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Extracted Invoiced Total</p>
          <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.1rem' }}>
            ${stats?.total_spend_extracted?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}
          </h3>
        </div>
      </div>

      {/* Ready / Processed */}
      <div style={{
        background: 'white',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.15rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: 'var(--radius-md)',
          background: '#f0fdf4',
          color: '#16a34a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <CheckCircle2 size={22} />
        </div>
        <div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Ready for AI Analysis</p>
          <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.1rem' }}>
            {stats?.completed_documents ?? 0}
          </h3>
        </div>
      </div>

      {/* Processing */}
      <div style={{
        background: 'white',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.15rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--warning-bg)',
          color: 'var(--warning)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Clock size={22} />
        </div>
        <div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Queue</p>
          <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.1rem' }}>
            {stats?.processing_documents ?? 0}
          </h3>
        </div>
      </div>
    </div>
  );
};

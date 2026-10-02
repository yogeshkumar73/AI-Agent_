import React from 'react';
import { AIInsight } from '../types';
import { Sparkles, TrendingUp, AlertCircle, HelpCircle, ArrowRight } from 'lucide-react';

interface InsightsBannerProps {
  insights: AIInsight[];
  onTriggerQuery: (query: string) => void;
}

export const InsightsBanner: React.FC<InsightsBannerProps> = ({ insights, onTriggerQuery }) => {
  if (insights.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'summary':
        return <TrendingUp size={16} style={{ color: 'var(--success)' }} />;
      case 'recommendation':
        return <Sparkles size={16} style={{ color: 'var(--primary)' }} />;
      case 'anomaly':
        return <AlertCircle size={16} style={{ color: 'var(--danger)' }} />;
      default:
        return <HelpCircle size={16} style={{ color: 'var(--indigo)' }} />;
    }
  };

  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <Sparkles size={18} style={{ color: 'var(--primary)' }} />
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
          Proactive AI Insights & Discovered Anomalies
        </h3>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '0.85rem'
      }}>
        {insights.slice(0, 3).map((item) => (
          <div
            key={item.id}
            style={{
              background: 'white',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem 1.15rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-sm)',
              transition: 'border-color 0.2s ease, transform 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
                {getIcon(item.insight_type)}
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {item.title}
                </h4>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                {item.description}
              </p>
              {item.document_name && (
                <p style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '0.35rem' }}>
                  Source: {item.document_name}
                </p>
              )}
            </div>

            {item.actionable_query && (
              <button
                onClick={() => onTriggerQuery(item.actionable_query!)}
                style={{
                  marginTop: '0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.2rem 0',
                  textAlign: 'left'
                }}
              >
                <span>Ask: "{item.actionable_query}"</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

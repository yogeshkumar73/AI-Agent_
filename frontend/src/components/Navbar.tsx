import React from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, LogOut, User as UserIcon, Building2, Sparkles, RefreshCw } from 'lucide-react';

interface NavbarProps {
  onOpenUpload: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenUpload, onRefresh, isRefreshing }) => {
  const { user, logout } = useAuth();

  return (
    <header style={{
      background: 'white',
      borderBottom: '1px solid var(--border-color)',
      padding: '0.85rem 1.75rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)'
        }}>
          <FileText size={20} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em', color: '#0f172a' }}>
              DocuMind
            </span>
            <span style={{
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              color: 'white',
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '0.15rem 0.45rem',
              borderRadius: 'var(--radius-full)',
              textTransform: 'uppercase'
            }}>
              AI Agent
            </span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Multi-Tenant Document & Bill Intelligence
          </p>
        </div>
      </div>

      {/* Center Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          onClick={onRefresh}
          title="Refresh Data"
          style={{
            padding: '0.55rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            background: 'white',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-pulse' : ''} />
        </button>

        <button
          onClick={onOpenUpload}
          style={{
            background: 'var(--primary)',
            color: 'white',
            padding: '0.55rem 1.15rem',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--primary)')}
        >
          <Sparkles size={16} />
          Upload Document
        </button>
      </div>

      {/* User Session Profile & Isolation Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.35rem 0.75rem',
          background: 'var(--bg-card-subtle)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#e0e7ff',
            color: '#4338ca',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.85rem'
          }}>
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <UserIcon size={16} />}
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
              {user?.full_name || 'Client'}
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Building2 size={11} /> {user?.company_name || user?.email}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          title="Sign Out"
          style={{
            padding: '0.5rem',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-muted)',
            border: '1px solid transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--danger)';
            e.currentTarget.style.background = 'var(--danger-bg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};

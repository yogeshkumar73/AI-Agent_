import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { DocumentItem, DocumentStats, AIInsight } from '../types';
import { Navbar } from '../components/Navbar';
import { StatsCards } from '../components/StatsCards';
import { InsightsBanner } from '../components/InsightsBanner';
import { DocumentList } from '../components/DocumentList';
import { ChatPanel } from '../components/ChatPanel';
import { UploadModal } from '../components/UploadModal';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import { LayoutGrid, MessageSquare, Sparkles } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals & Panels
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [viewerDocument, setViewerDocument] = useState<DocumentItem | null>(null);
  const [chatDocument, setChatDocument] = useState<DocumentItem | null>(null);
  const [activeTab, setActiveTab] = useState<'documents' | 'chat'>('documents');

  // Load Data
  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [docs, st, ins] = await Promise.all([
        api.listDocuments(searchQuery || undefined, undefined, selectedType || undefined),
        api.getStats(),
        api.getInsights()
      ]);
      setDocuments(docs);
      setStats(st);
      setInsights(ins);
    } catch (e) {
      console.error('Error fetching dashboard data', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [searchQuery, selectedType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Polling for processing documents
  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === 'processing' || d.status === 'pending');
    if (!hasProcessing) return;

    const interval = setInterval(async () => {
      try {
        const docs = await api.listDocuments(searchQuery || undefined, undefined, selectedType || undefined);
        setDocuments(docs);
        const st = await api.getStats();
        setStats(st);
        const ins = await api.getInsights();
        setInsights(ins);
      } catch (e) {
        console.error('Status poll error', e);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [documents, searchQuery, selectedType]);

  const handleUploadSuccess = (newDoc: DocumentItem) => {
    setDocuments((prev) => [newDoc, ...prev]);
    fetchData();
  };

  const handleDeleteSuccess = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    if (chatDocument?.id === docId) {
      setChatDocument(null);
    }
    fetchData();
  };

  const handleChatWithDoc = (doc: DocumentItem) => {
    setChatDocument(doc);
    setActiveTab('chat');
  };

  const handleTriggerInsightQuery = (query: string) => {
    setActiveTab('chat');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      {/* Top Navbar */}
      <Navbar
        onOpenUpload={() => setIsUploadOpen(true)}
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

      {/* Main Container */}
      <main style={{ flex: 1, padding: '1.75rem 2rem', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
        {/* KPI Stats Overview */}
        <StatsCards stats={stats} />

        {/* AI Automated Insights Bar */}
        <InsightsBanner
          insights={insights}
          onTriggerQuery={handleTriggerInsightQuery}
        />

        {/* View Switcher Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '1.25rem',
          paddingBottom: '0.5rem'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('documents')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1.15rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.88rem',
                fontWeight: 700,
                background: activeTab === 'documents' ? 'white' : 'transparent',
                color: activeTab === 'documents' ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: activeTab === 'documents' ? 'var(--shadow-sm)' : 'none',
                border: activeTab === 'documents' ? '1px solid var(--border-color)' : '1px solid transparent'
              }}
            >
              <LayoutGrid size={16} />
              Document Vault ({documents.length})
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1.15rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.88rem',
                fontWeight: 700,
                background: activeTab === 'chat' ? 'white' : 'transparent',
                color: activeTab === 'chat' ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: activeTab === 'chat' ? 'var(--shadow-sm)' : 'none',
                border: activeTab === 'chat' ? '1px solid var(--border-color)' : '1px solid transparent'
              }}
            >
              <MessageSquare size={16} />
              AI Assistant Chat
              {chatDocument && (
                <span style={{
                  fontSize: '0.7rem',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  padding: '0.1rem 0.4rem',
                  borderRadius: 'var(--radius-full)'
                }}>
                  1 doc focused
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'documents' ? (
          <DocumentList
            documents={documents}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedType={selectedType}
            onSelectType={setSelectedType}
            onViewDoc={(doc) => setViewerDocument(doc)}
            onChatWithDoc={handleChatWithDoc}
            onDeleteDoc={(docId) => handleDeleteSuccess(docId)}
            onOpenUpload={() => setIsUploadOpen(true)}
          />
        ) : (
          <ChatPanel
            documents={documents}
            activeDocument={chatDocument}
            onClearActiveDoc={() => setChatDocument(null)}
            onSelectDoc={(doc) => setChatDocument(doc)}
          />
        )}
      </main>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      <DocumentViewerModal
        document={viewerDocument}
        onClose={() => setViewerDocument(null)}
        onSelectForChat={handleChatWithDoc}
        onDeleteSuccess={handleDeleteSuccess}
      />
    </div>
  );
};

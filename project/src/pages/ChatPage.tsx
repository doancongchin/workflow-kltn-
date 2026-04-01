import React, { useState } from 'react';
import ChatSessionsSidebar from '../components/chat/ChatSessionsSidebar';
import ChatInterface from '../components/chat/ChatInterface';
import LoginPromptModal from '../components/nodes/modals/LoginPromptModal';

interface ChatPageProps {
  isAuthenticated: boolean;
}

export default function ChatPage({ isAuthenticated }: ChatPageProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(!isAuthenticated);

  const handleSelectSession = (sessionId: string) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    setSelectedSessionId(sessionId);
  };

  // Nếu chưa đăng nhập, hiển thị modal và không cho chat
  if (!isAuthenticated) {
    return (
      <>
        <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">🔒 Cần đăng nhập</h2>
            <p className="text-slate-600 mb-6">
              Vui lòng đăng nhập để sử dụng tính năng Chatbot.
            </p>
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-6 py-2 bg-[#2b5bee] text-white rounded-lg font-semibold hover:bg-blue-600"
            >
              Đăng nhập / Đăng ký
            </button>
          </div>
        </div>
        <LoginPromptModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      </>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      <ChatSessionsSidebar
        selectedSessionId={selectedSessionId}
        onSelectSession={handleSelectSession}
        onSessionCreated={() => {}}
      />
      <div className="flex-1 p-6">
        <div className="h-full max-w-4xl mx-auto">
          <ChatInterface sessionId={selectedSessionId} />
        </div>
      </div>
    </div>
  );
}
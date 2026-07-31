'use client';

import { useState, useRef, useEffect } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('ChatWidget');

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Source {
  title: string;
  url: string;
  date: string;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: '안녕하세요! 경제뉴스 AI 어시스턴트입니다. 경제 뉴스에 대해 궁금한 점을 물어보세요.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const json = await res.json();

      if (json.success) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: json.data.answer },
        ]);
        setSources(json.data.sources || []);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: json.error || '죄송합니다. 응답을 생성할 수 없습니다.',
          },
        ]);
      }
    } catch (err) {
      log.error('Chat send error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 md:bottom-6 md:right-6 cursor-pointer"
        aria-label="AI 챗봇 열기"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col rounded-sm border border-slate-200 bg-white shadow-xl md:bottom-6 md:right-6 md:w-96">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span className="text-sm font-semibold text-white">AI 경제 어시스턴트</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-white/80 hover:text-white transition-colors cursor-pointer"
          aria-label="닫기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ maxHeight: '360px' }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-sm px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-800'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-sm px-3 py-2 bg-slate-100">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sources */}
      {sources.length > 0 && !loading && (
        <div className="border-t border-slate-100 px-3 py-2">
          <div className="text-[10px] font-medium text-slate-400 mb-1">참고 기사</div>
          <div className="flex flex-wrap gap-1">
            {sources.slice(0, 3).map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                {s.title.slice(0, 30)}...
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-slate-200 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="경제 뉴스에 대해 물어보세요..."
            disabled={loading}
            className="flex-1 h-9 px-3 text-xs border border-slate-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="h-9 px-3 bg-indigo-600 text-white text-xs font-semibold rounded-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}

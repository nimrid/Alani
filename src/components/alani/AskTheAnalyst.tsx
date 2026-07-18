'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'analyst';
  content: string;
}

interface AskTheAnalystProps {
  matchInfo: any;
  events: any[];
  playheadIdx: number | null;
}

export function AskTheAnalyst({ matchInfo, events, playheadIdx }: AskTheAnalystProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Add empty message for the analyst to stream into
    setMessages(prev => [...prev, { role: 'analyst', content: '' }]);

    // Only send events up to the playhead
    const currentEvents = playheadIdx !== null ? events.slice(0, playheadIdx + 1) : events;

    try {
      const response = await fetch('/api/analyst/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMessage,
          matchInfo,
          events: currentEvents
        })
      });

      if (!response.ok) throw new Error('API failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        setMessages(prev => {
          const newMsgs = [...prev];
          const lastMsg = newMsgs[newMsgs.length - 1];
          if (lastMsg && lastMsg.role === 'analyst') {
            lastMsg.content += chunk;
          }
          return newMsgs;
        });
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => {
        const newMsgs = [...prev];
        const lastMsg = newMsgs[newMsgs.length - 1];
        if (lastMsg && lastMsg.role === 'analyst') {
          lastMsg.content = 'Sorry, mate. Lost my train of thought. Try asking again.';
        }
        return newMsgs;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[400px] bg-bg-surface border border-border-subtle rounded-2xl overflow-hidden shadow-lg mt-6">
      <div className="bg-bg-elevated px-4 py-3 border-b border-border-subtle flex items-center gap-2">
        <Bot size={18} className="text-chain-purple" />
        <h3 className="font-display font-bold text-sm tracking-wide">Ask The Analyst</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-text-muted opacity-70">
            <Bot size={32} className="mb-2 text-chain-purple/50" />
            <p className="text-sm">Pause the replay and ask me<br/>about what just happened.</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-chain-purple text-white' : 'bg-bg-elevated text-chain-purple border border-border-subtle'
              }`}>
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === 'user' 
                  ? 'bg-chain-purple text-white rounded-tr-sm' 
                  : 'bg-bg-elevated text-text-primary border border-border-subtle rounded-tl-sm prose prose-invert prose-p:leading-relaxed prose-sm prose-a:text-chain-purple'
              }`}>
                {msg.role === 'user' ? (
                  <p>{msg.content}</p>
                ) : (
                  <ReactMarkdown>{msg.content || '...'}</ReactMarkdown>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-bg-base border-t border-border-subtle">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            placeholder="Why did that press fail?..."
            className="w-full bg-bg-elevated border border-border-subtle text-sm rounded-full pl-4 pr-12 py-2.5 focus:outline-none focus:border-chain-purple focus:ring-1 focus:ring-chain-purple transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="absolute right-1.5 top-1.5 p-1.5 bg-chain-purple text-white rounded-full hover:bg-chain-purple/80 disabled:opacity-50 disabled:hover:bg-chain-purple transition-all"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}

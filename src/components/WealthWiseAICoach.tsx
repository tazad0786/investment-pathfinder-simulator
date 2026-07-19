import React, { useState, useEffect, useRef } from 'react';
import { 
  Compass, Send, Sparkles, AlertCircle, RefreshCw, X, 
  BookOpen, Landmark, Briefcase, ChevronRight 
} from 'lucide-react';
import { ChatMessage, UserProfile } from '../types';

interface WealthWiseAICoachProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
}

export default function WealthWiseAICoach({ isOpen, onClose, userProfile }: WealthWiseAICoachProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'msg-init-1',
          role: 'assistant',
          content: `Hello! I am your **WealthWise AI Investment Coach**. 

I can guide you step-by-step on how to choose Stocks and Mutual Funds, explain financial terms simply, or suggest portfolio options.

Here are a few questions you can ask me to get started:`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedPrompts: [
            "How do I choose my first stock?",
            "Explain CAGR and Expense Ratio simply.",
            "What is a good P/E Ratio for a stock?",
            "Suggest a conservative portfolio allocation."
          ]
        }
      ]);
    }
  }, [messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          userProfile: userProfile
        })
      });

      if (!response.ok) {
        throw new Error("Failed to contact advisor backend");
      }

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        id: `msg-assistant-${Date.now()}`,
        role: 'assistant',
        content: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (error: any) {
      console.error("Advisor chatbot error:", error);
      setMessages(prev => [...prev, {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: "I am experiencing temporary server communication issues. Please try again or reference our educational tabs for instant help!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-white border-l border-slate-150 shadow-2xl flex flex-col"
      id="ai-coach-drawer"
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50" id="ai-coach-header">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-sans font-extrabold text-sm text-slate-900 flex items-center space-x-1.5">
              <span>WealthWise AI Coach</span>
              <span className="inline-block text-[9px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded uppercase">
                Active
              </span>
            </h2>
            <p className="text-[10px] text-slate-500">Live tutoring & planning guidance</p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button 
            onClick={clearChat}
            title="Reset Chat History"
            className="cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button 
            onClick={onClose}
            className="cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* Profile Awareness Ribbon */}
      <div className="bg-emerald-50/50 px-5 py-2.5 border-b border-emerald-100/30 flex items-center justify-between text-xs font-bold" id="ai-coach-profile-ribbon">
        <div className="flex items-center space-x-1 text-emerald-800">
          <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
          <span>Profile Mode:</span>
          <span className="text-emerald-700 bg-emerald-100/50 px-1.5 py-0.5 rounded">
            {userProfile.riskTolerance} / {userProfile.goal}
          </span>
        </div>
        <span className="text-[10px] text-slate-400">Context Loaded</span>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin" id="ai-messages-feed">
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex flex-col space-y-1 max-w-[85%] ${
              msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
            }`}
          >
            <div 
              className={`rounded-2xl p-3.5 text-xs leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-slate-900 text-white rounded-br-none' 
                  : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-150'
              }`}
            >
              {/* Custom simple bold renderer */}
              <div className="space-y-2 whitespace-pre-wrap">
                {msg.content.split('\n').map((para, i) => {
                  // Render basic markdown bold text **term**
                  const boldRegex = /\*\*(.*?)\*\*/g;
                  let parts = [];
                  let lastIndex = 0;
                  let match;

                  while ((match = boldRegex.exec(para)) !== null) {
                    if (match.index > lastIndex) {
                      parts.push(para.substring(lastIndex, match.index));
                    }
                    parts.push(<strong key={match.index} className="font-extrabold text-slate-950 dark:text-white">{match[1]}</strong>);
                    lastIndex = boldRegex.lastIndex;
                  }

                  if (lastIndex < para.length) {
                    parts.push(para.substring(lastIndex));
                  }

                  return (
                    <p key={i}>
                      {parts.length > 0 ? parts : para}
                    </p>
                  );
                })}
              </div>
            </div>

            {/* Timestamps & details */}
            <span className="text-[9px] font-bold text-slate-400 tracking-wide">{msg.timestamp}</span>

            {/* Quick suggested clickable responses */}
            {msg.suggestedPrompts && msg.suggestedPrompts.length > 0 && (
              <div className="flex flex-col space-y-2 pt-2" id="msg-prompts">
                {msg.suggestedPrompts.map((prompt, pIdx) => (
                  <button
                    key={pIdx}
                    onClick={() => handleSendMessage(prompt)}
                    className="cursor-pointer flex items-center justify-between text-left text-[11px] font-bold text-slate-700 bg-white border border-slate-200 p-2.5 rounded-xl hover:border-emerald-500 hover:text-emerald-600 transition-all hover:bg-slate-50"
                  >
                    <span>{prompt}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-100 p-3 rounded-xl max-w-sm mr-auto" id="ai-loading">
            <div className="flex space-x-1">
              <span className="block h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"></span>
              <span className="block h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce delay-75"></span>
              <span className="block h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce delay-150"></span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">WealthWise AI is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Disclaimers */}
      <div className="px-5 py-2.5 border-t border-slate-100 flex items-start space-x-2 bg-amber-50 text-[10px] leading-relaxed text-amber-800" id="ai-disclaimer">
        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <span>
          <strong>Education Disclaimer:</strong> WealthWise AI Coach teaches financial planning fundamentals. Mutual funds and stocks are subject to market risks. Past results do not guarantee future compounding returns.
        </span>
      </div>

      {/* Input Tray */}
      <div className="p-4 border-t border-slate-100 bg-slate-50" id="ai-input-tray">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
            placeholder="Ask about PE, CAGR, ELSS or portfolio advice..."
            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 placeholder:text-slate-400"
          />
          <button
            onClick={() => handleSendMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
            className="cursor-pointer h-9 w-9 flex items-center justify-center rounded-xl bg-slate-900 text-white transition-all hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

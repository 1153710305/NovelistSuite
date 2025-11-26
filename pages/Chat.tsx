
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Trash2, Plus, Bot, User } from 'lucide-react';
import { useI18n } from '../i18n';
import { ChatSession, ChatMessage } from '../types';
import { streamChatResponse } from '../services/geminiService';
import { getHistory, addHistoryItem, updateHistoryItem, deleteHistoryItem, STORAGE_KEYS } from '../services/storageService';
import ReactMarkdown from 'react-markdown';

export const Chat: React.FC = () => {
    const { t } = useI18n();
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [inputText, setInputText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
    
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadSessions();
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [activeSessionId, sessions, isGenerating]);

    const loadSessions = () => {
        const history = getHistory<ChatSession>(STORAGE_KEYS.HISTORY_CHAT);
        setSessions(history);
        if (history.length > 0 && !activeSessionId) {
            setActiveSessionId(history[0].id);
        }
    };

    const activeSession = sessions.find(s => s.id === activeSessionId);

    const handleNewChat = () => {
        const newSession: ChatSession = {
            id: Date.now().toString(),
            title: `${t('chat.newChat')} ${new Date().toLocaleTimeString()}`,
            messages: [],
            model: selectedModel,
            timestamp: Date.now()
        };
        addHistoryItem(STORAGE_KEYS.HISTORY_CHAT, newSession);
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
    };

    const handleDeleteSession = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const updated = deleteHistoryItem<ChatSession>(STORAGE_KEYS.HISTORY_CHAT, id);
        setSessions(updated);
        if (activeSessionId === id) setActiveSessionId(updated[0]?.id || null);
    };

    const handleSend = async () => {
        if (!inputText.trim() || !activeSessionId || isGenerating) return;

        const userMsg: ChatMessage = { role: 'user', text: inputText, timestamp: Date.now() };
        const updatedMessages = [...(activeSession?.messages || []), userMsg];
        
        // Update local state immediately
        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: updatedMessages } : s));
        updateHistoryItem<ChatSession>(STORAGE_KEYS.HISTORY_CHAT, activeSessionId, { messages: updatedMessages });
        
        setInputText('');
        setIsGenerating(true);

        try {
            // Placeholder for AI response
            const aiMsg: ChatMessage = { role: 'model', text: '', timestamp: Date.now() };
            let currentAiText = '';

            await streamChatResponse(updatedMessages, inputText, selectedModel, (chunk) => {
                currentAiText = chunk;
                setSessions(prev => prev.map(s => s.id === activeSessionId ? { 
                    ...s, 
                    messages: [...updatedMessages, { ...aiMsg, text: currentAiText }] 
                } : s));
            });

            // Final save
            updateHistoryItem<ChatSession>(STORAGE_KEYS.HISTORY_CHAT, activeSessionId, { 
                messages: [...updatedMessages, { ...aiMsg, text: currentAiText }] 
            });

        } catch (error) {
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex h-full bg-slate-50">
            {/* Sidebar */}
            <div className="w-64 border-r border-slate-200 bg-white flex flex-col">
                <div className="p-4 border-b border-slate-100">
                    <button onClick={handleNewChat} className="w-full py-2 bg-teal-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-teal-700 transition-colors shadow-sm text-sm font-medium">
                        <Plus size={16} /> {t('chat.newChat')}
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {sessions.map(s => (
                        <div 
                            key={s.id} 
                            onClick={() => setActiveSessionId(s.id)}
                            className={`p-3 rounded-lg cursor-pointer text-sm group flex justify-between items-center ${activeSessionId === s.id ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <span className="truncate w-40">{s.title}</span>
                            <button onClick={(e) => handleDeleteSession(e, s.id)} className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col h-full relative">
                {/* Header */}
                <div className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 flex-shrink-0">
                    <div className="font-bold text-slate-700">{activeSession?.title || t('chat.newChat')}</div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{t('chat.model')}</span>
                        <select 
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="text-xs border border-slate-200 rounded p-1 bg-slate-50"
                        >
                            <option value="gemini-flash-lite-latest">Flash Lite</option>
                            <option value="gemini-2.5-flash">Flash 2.5</option>
                            <option value="gemini-3-pro-preview">Pro 3.0</option>
                        </select>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
                    {!activeSession ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <MessageSquare size={48} className="opacity-20 mb-4" />
                            <p>{t('chat.empty')}</p>
                        </div>
                    ) : (
                        activeSession.messages.map((msg, idx) => (
                            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white flex-shrink-0"><Bot size={16}/></div>}
                                <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}`}>
                                    {msg.role === 'user' ? msg.text : <ReactMarkdown className="prose prose-sm prose-slate max-w-none">{msg.text}</ReactMarkdown>}
                                </div>
                                {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0"><User size={16}/></div>}
                            </div>
                        ))
                    )}
                </div>

                {/* Input */}
                <div className="p-6 bg-white border-t border-slate-200 flex-shrink-0">
                    <div className="relative max-w-4xl mx-auto">
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                            placeholder={t('chat.placeholder')}
                            disabled={!activeSessionId}
                            className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-inner h-24"
                        />
                        <button 
                            onClick={handleSend}
                            disabled={!inputText.trim() || isGenerating || !activeSessionId}
                            className="absolute right-3 bottom-3 p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:hover:bg-teal-600 transition-colors"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

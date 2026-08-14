import { useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Phone, Video, Search, MoreVertical, Send, Paperclip, Smile, 
  Mic, Image, FileText, Camera, ArrowLeft, Clock, User, Plus, 
  Activity, Check, CheckCheck, X, MessageSquare, ChevronRight, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';

import useAuth from '../../hooks/useAuth';
import { doctorApi, patientApi, staffApi, chatApi } from '../../lib/api';
import LoadingState from '../../components/common/LoadingState';

const QUICK_REPLIES = [
  'Patient Ready',
  'Next Patient',
  'Emergency',
  'Running Late',
  'Patient Checked In',
  'Lab Report Ready',
  'Prescription Printed'
];

const ChatPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const doctorIdParam = searchParams.get('doctorId');

  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState('All');
  
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeSearch, setComposeSearch] = useState('');
  const [composeTab, setComposeTab] = useState('Patients');
  const [selectedContact, setSelectedContact] = useState(null);

  const [isTyping, setIsTyping] = useState(false);
  const [typingDoctorId, setTypingDoctorId] = useState(null);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  const clinicId = user?.clinicId || user?.clinic?._id;

  // 1. Fetch conversations from TanStack Query
  const { data: conversationsRes, isLoading: loadingConvs } = useQuery({
    queryKey: ['chat-conversations', clinicId],
    queryFn: () => chatApi.getConversations(),
    enabled: !!clinicId,
    staleTime: 15000
  });

  const rawConversations = useMemo(() => {
    return conversationsRes?.conversations || conversationsRes?.data?.conversations || [];
  }, [conversationsRes]);

  // Socket IO Connection
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      auth: { token: localStorage.getItem('ai_cms_access_token') || localStorage.getItem('token') }
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (user?._id) {
        socket.emit('join_user', user._id);
      }
      if (clinicId) {
        socket.emit('join_clinic', clinicId);
      }
    });

    socket.on('receive_message', (data) => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations', clinicId] });
      if (activeConversation && activeConversation._id === data.conversationId) {
        setMessages((prev) => [...prev, data]);
        chatApi.markAsRead(data.conversationId).catch(console.error);
        socket.emit('send_message_read', { conversationId: data.conversationId, userId: user._id });
      }
    });

    socket.on('typing', (data) => {
      if (activeConversation && activeConversation._id === data.conversationId) {
        setTypingDoctorId(data.senderId);
        setIsTyping(data.isTyping);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [activeConversation, user?._id, clinicId, queryClient]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConversation) return;

    const loadMessages = async () => {
      try {
        const msgRes = await chatApi.getMessages(activeConversation._id);
        setMessages(msgRes.messages || msgRes.data?.messages || []);
        
        await chatApi.markAsRead(activeConversation._id);
        queryClient.invalidateQueries({ queryKey: ['chat-conversations', clinicId] });

        if (socketRef.current) {
          socketRef.current.emit('join_conversation', activeConversation._id);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    };

    loadMessages();
  }, [activeConversation, clinicId, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Fetch contacts for Compose Modal using TanStack queries
  const { data: doctorsListRes } = useQuery({
    queryKey: ['compose-doctors', clinicId],
    queryFn: () => doctorApi.list({ limit: 50 }),
    enabled: composeOpen && composeTab === 'Doctors'
  });
  const doctorsList = doctorsListRes?.data?.doctors || [];

  const { data: patientsListRes } = useQuery({
    queryKey: ['compose-patients', clinicId],
    queryFn: () => patientApi.list({ limit: 50 }),
    enabled: composeOpen && composeTab === 'Patients'
  });
  const patientsList = patientsListRes?.data?.patients || patientsListRes?.items || [];

  const { data: staffListRes } = useQuery({
    queryKey: ['compose-staff', clinicId],
    queryFn: () => staffApi.list({ limit: 50 }),
    enabled: composeOpen && composeTab === 'Staff'
  });
  const staffList = staffListRes?.data?.staff || [];

  // Filter contacts by search
  const filteredContacts = useMemo(() => {
    const query = composeSearch.toLowerCase();
    if (composeTab === 'Patients') {
      return patientsList.filter(p => 
        p.name?.toLowerCase().includes(query) || p.phone?.includes(query)
      );
    }
    if (composeTab === 'Doctors') {
      return doctorsList.filter(d => 
        d.fullName?.toLowerCase().includes(query) || d.specialization?.toLowerCase().includes(query)
      );
    }
    if (composeTab === 'Staff') {
      return staffList.filter(s => 
        s.fullName?.toLowerCase().includes(query) || s.role?.toLowerCase().includes(query)
      );
    }
    return [];
  }, [composeTab, composeSearch, patientsList, doctorsList, staffList]);

  // Handle compose click -> select or create conversation
  const handleStartChat = async () => {
    if (!selectedContact) return;
    try {
      // Treat ADMIN/RECEPTIONIST as receptionistId, target as doctorId
      const payload = {
        doctorId: composeTab === 'Doctors' ? selectedContact._id : '60a28f89fb0b2c1404ef7a15', // Fallback general doctor ID if starting with staff/patient
        receptionistId: user._id
      };
      
      const res = await chatApi.getOrCreateConversation(payload);
      const conversation = res.conversation || res.data?.conversation;
      
      if (conversation) {
        setActiveConversation(conversation);
        setComposeOpen(false);
        queryClient.invalidateQueries({ queryKey: ['chat-conversations', clinicId] });
      }
    } catch (err) {
      toast.error('Failed to initialize conversation');
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (socketRef.current && activeConversation) {
      socketRef.current.emit('typing', {
        conversationId: activeConversation._id,
        senderId: user._id,
        isTyping: e.target.value.length > 0
      });
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || !activeConversation) return;

    const targetReceiverId = user.role === 'DOCTOR' 
      ? (activeConversation.receptionistId?._id || activeConversation.receptionistId)
      : (activeConversation.doctorId?._id || activeConversation.doctorId);

    const messagePayload = {
      conversationId: activeConversation._id,
      receiverId: targetReceiverId,
      message: inputText.trim(),
      messageType: 'text',
      attachmentUrl: ''
    };

    try {
      const res = await chatApi.sendMessage(messagePayload);
      const newMsg = res.message || res.data?.message;
      setMessages((prev) => [...prev, newMsg]);

      if (socketRef.current) {
        socketRef.current.emit('send_message', newMsg);
      }

      setInputText('');
      queryClient.invalidateQueries({ queryKey: ['chat-conversations', clinicId] });
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  // Filter categories for the top segmented tabs
  const filteredConversations = useMemo(() => {
    return rawConversations.filter(c => {
      const otherUser = user.role === 'DOCTOR' ? c.receptionistId : c.doctorId;
      if (!otherUser) return false;

      const name = otherUser.fullName || otherUser.name || '';
      const matchesSearch = name.toLowerCase().includes(searchText.toLowerCase());

      if (activeFilterTab === 'All') return matchesSearch;
      if (activeFilterTab === 'Doctors') return matchesSearch && otherUser.role === 'DOCTOR';
      if (activeFilterTab === 'Staff') return matchesSearch && otherUser.role === 'RECEPTIONIST';
      return matchesSearch;
    });
  }, [rawConversations, searchText, activeFilterTab, user?.role]);

  // Helpers
  const getInitials = (name) => {
    if (!name) return 'US';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col xl:flex-row gap-5 h-[calc(100vh-140px)] select-none">
      
      {/* ========================================================
          LEFT PANEL: Conversations List (Image 1 layout)
          ======================================================== */}
      <div className="w-full xl:w-[380px] bg-white rounded-3xl border border-slate-150 flex flex-col h-full overflow-hidden shadow-sm relative shrink-0">
        
        {/* Messages Header & Tabs */}
        <div className="p-4 border-b border-slate-100 space-y-3 shrink-0">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Messages</h1>
            <button className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-500">
              <Filter size={16} />
            </button>
          </div>

          {/* Segmented tabs */}
          <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none pb-1.5 pt-1">
            {['All', 'Patients', 'Doctors', 'Staff'].map((tab, idx) => {
              const isActive = activeFilterTab === tab;
              const count = idx === 0 ? filteredConversations.length : (idx === 1 ? 5 : (idx === 2 ? 4 : 3));
              return (
                <button
                  key={tab}
                  onClick={() => setActiveFilterTab(tab)}
                  className={`px-3 py-1.5 rounded-full text-xs font-black transition flex items-center gap-1.5 border ${
                    isActive 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                      : 'bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100'
                  }`}
                >
                  <span>{tab}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-550 font-bold'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="relative">
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by name, role or message..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 transition font-medium placeholder:text-slate-400"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450 w-3.5 h-3.5" />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 [scrollbar-width:none]">
          {loadingConvs ? (
            <p className="text-xs text-slate-400 font-bold text-center py-12">Loading conversations...</p>
          ) : filteredConversations.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-bold">
              No conversations found
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const otherUser = user.role === 'DOCTOR' ? conv.receptionistId : conv.doctorId;
              if (!otherUser) return null;

              const isSelected = activeConversation?._id === conv._id;
              const unread = user.role === 'DOCTOR' ? conv.unreadCount?.doctor : conv.unreadCount?.receptionist;

              return (
                <div
                  key={conv._id}
                  onClick={() => setActiveConversation(conv)}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                    isSelected 
                      ? 'bg-emerald-50/40 border-emerald-500/20 shadow-xs' 
                      : 'bg-white border-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-500 text-xs overflow-hidden">
                        {getInitials(otherUser.fullName || otherUser.name)}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-extrabold text-slate-900 text-xs truncate leading-none">
                          {otherUser.fullName || otherUser.name}
                        </p>
                        <span className="text-[8px] bg-slate-100 border border-slate-200 text-slate-400 px-1.5 py-0.2 rounded font-black uppercase">
                          {otherUser.role || 'Staff'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold truncate mt-1.5">
                        {conv.lastMessage || 'Start a conversation...'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                    <span className="text-[8px] text-slate-400 font-bold">
                      {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {unread > 0 && (
                      <span className="bg-emerald-600 text-white font-bold text-[8.5px] w-4.5 h-4.5 rounded-full flex items-center justify-center">
                        {unread}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Floating compose button */}
        <button 
          onClick={() => setComposeOpen(true)}
          className="absolute bottom-4 right-4 w-12 h-12 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg transition duration-150 cursor-pointer"
        >
          <Plus size={22} />
        </button>
      </div>

      {/* ========================================================
          RIGHT PANEL: Individual Chat Feed (Image 2 layout)
          ======================================================== */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-150 flex flex-col h-full overflow-hidden shadow-sm">
        {activeConversation ? (
          <>
            {/* Header details */}
            {(() => {
              const otherUser = user.role === 'DOCTOR' ? activeConversation.receptionistId : activeConversation.doctorId;
              return (
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setActiveConversation(null)}
                      className="xl:hidden p-1 rounded-lg hover:bg-slate-100 text-slate-500 mr-1"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center font-bold text-emerald-600 text-xs">
                        {getInitials(otherUser?.fullName || otherUser?.name)}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse"></span>
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-xs leading-none">
                        {otherUser?.fullName || otherUser?.name}
                      </h4>
                      <span className="text-[9px] text-slate-400 font-bold block mt-1.5">
                        {otherUser?.role || 'Staff'} · <span className="text-emerald-600">Online</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <button className="p-2 hover:bg-slate-100 rounded-xl transition"><Phone size={14} /></button>
                    <button className="p-2 hover:bg-slate-100 rounded-xl transition"><Video size={14} /></button>
                    <button className="p-2 hover:bg-slate-100 rounded-xl transition"><MoreVertical size={14} /></button>
                  </div>
                </div>
              );
            })()}

            {/* Message List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/20 [scrollbar-width:none]">
              <div className="flex justify-center my-2">
                <span className="px-3 py-1 bg-white border border-slate-150 rounded-full text-[9px] text-slate-400 font-bold">
                  Today
                </span>
              </div>

              {messages.map((msg) => {
                const isMe = msg.senderId === user._id;
                return (
                  <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] space-y-1 ${isMe ? 'text-right' : 'text-left'}`}>
                      <div className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed shadow-xs ${
                        isMe 
                          ? 'bg-emerald-500 text-white rounded-tr-none' 
                          : 'bg-white text-slate-800 rounded-tl-none border border-slate-150'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                      </div>
                      <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400 font-bold mt-0.5">
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
                          <span>
                            {msg.isRead ? (
                              <CheckCheck size={12} className="text-emerald-500" />
                            ) : (
                              <Check size={12} />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isTyping && typingDoctorId !== user._id && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-150 p-2.5 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-sm">
                    <span className="text-[10px] text-slate-400 font-bold italic">Typing</span>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick replies */}
            <div className="px-4 py-2 border-t border-slate-100 bg-white flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none shrink-0">
              {QUICK_REPLIES.map(reply => (
                <button
                  key={reply}
                  onClick={() => setInputText(reply)}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 border border-slate-150 text-[10px] text-slate-600 hover:text-emerald-600 font-bold rounded-full transition shrink-0 cursor-pointer"
                >
                  {reply}
                </button>
              ))}
            </div>

            {/* Input Composer */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-white flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5 text-slate-400">
                <button type="button" className="p-2 hover:bg-slate-100 rounded-xl transition">
                  <Paperclip size={16} />
                </button>
              </div>
              <input
                value={inputText}
                onChange={handleInputChange}
                placeholder="Type a message..."
                className="flex-1 py-2 px-3.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 transition font-medium"
              />
              <div className="flex items-center gap-1.5 text-slate-400">
                <button type="button" className="p-2 hover:bg-slate-100 rounded-xl transition">
                  <Smile size={16} />
                </button>
              </div>
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl shadow-sm transition flex items-center justify-center cursor-pointer"
              >
                <Send size={15} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <MessageSquare size={48} className="opacity-25" />
            <p className="text-xs font-black uppercase tracking-wider">Select a conversation to start chatting</p>
          </div>
        )}
      </div>

      {/* ========================================================
          NEW MESSAGE MODAL / SHEET (Image 3 layout)
          ======================================================== */}
      <AnimatePresence>
        {composeOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50"
              onClick={() => setComposeOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[28px] max-w-lg mx-auto shadow-2xl z-50 p-6 flex flex-col gap-5 h-[80vh] border-t border-slate-100"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-black text-slate-900 uppercase">New Message</span>
                <button onClick={() => setComposeOpen(false)} className="p-1 rounded-lg hover:bg-slate-50 text-slate-500">
                  <X size={18} />
                </button>
              </div>

              {/* Search contacts */}
              <div className="relative">
                <input
                  value={composeSearch}
                  onChange={(e) => setComposeSearch(e.target.value)}
                  placeholder="Search by name, role or phone number..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 transition font-medium"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              </div>

              {/* Segmented tabs */}
              <div className="flex gap-2">
                {['Patients', 'Doctors', 'Staff'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => { setComposeTab(tab); setSelectedContact(null); }}
                    className={`flex-1 py-2 text-xs font-black rounded-xl border transition ${
                      composeTab === tab
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-250'
                        : 'bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Contacts List */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 [scrollbar-width:none]">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Recent Contacts</p>
                {filteredContacts.length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold text-center py-6">No contacts found</p>
                ) : (
                  filteredContacts.map(contact => {
                    const isSelected = selectedContact?._id === contact._id;
                    const contactName = contact.fullName || contact.name;
                    return (
                      <div
                        key={contact._id}
                        onClick={() => setSelectedContact(contact)}
                        className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                          isSelected ? 'bg-emerald-50/30 border-emerald-500/20' : 'bg-white border-slate-100 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">
                            {getInitials(contactName)}
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-slate-900 leading-none">{contactName}</p>
                            <span className="text-[9px] text-slate-400 font-bold mt-1.5 block">
                              {composeTab === 'Patients' 
                                ? `Patient • ${contact.phone || 'No phone'}` 
                                : (composeTab === 'Doctors' 
                                  ? `Doctor • ${contact.specialization || 'General'}` 
                                  : `Staff • ${contact.role || 'Receptionist'}`)}
                            </span>
                          </div>
                        </div>
                        <input
                          type="radio"
                          checked={isSelected}
                          onChange={() => setSelectedContact(contact)}
                          className="w-4 h-4 accent-emerald-600 cursor-pointer"
                        />
                      </div>
                    );
                  })
                )}
              </div>

              <button
                disabled={!selectedContact}
                onClick={handleStartChat}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-black text-xs rounded-2xl transition uppercase tracking-wider mt-2 cursor-pointer"
              >
                Start New Chat
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ChatPage;

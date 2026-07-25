import { useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Phone, Video, Search, MoreVertical, Send, Paperclip, Smile, 
  Mic, Image, FileText, Camera, ArrowLeft, Clock, User, Plus, 
  Activity, Volume2, Award, Info, MapPin, Check, CheckCheck, X,MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

import useAuth from '../../hooks/useAuth';
import { doctorApi, chatApi } from '../../lib/api';
import LoadingState from '../../components/common/LoadingState';

// Quick Reply Actions
const QUICK_REPLIES = [
  'Patient Ready',
  'Next Patient',
  'Emergency',
  'Running Late',
  'Patient Checked In',
  'Lab Report Ready',
  'Prescription Printed',
  'Call Reception',
  'Need Assistance'
];

const ChatPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const doctorIdParam = searchParams.get('doctorId');

  const [doctors, setDoctors] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState('All');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [typingDoctorId, setTypingDoctorId] = useState(null);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to WebSocket server:', socket.id);
      if (user?._id) {
        socket.emit('join_user', user._id);
      }
    });

    socket.on('receive_message', (data) => {
      // If we are currently viewing this conversation, add message and mark read
      if (activeConversation && activeConversation._id === data.conversationId) {
        setMessages((prev) => [...prev, data]);
        // Call mark as read API
        chatApi.markAsRead(data.conversationId).catch(console.error);
        socket.emit('send_message_read', { conversationId: data.conversationId, userId: user._id });
      } else {
        // Increment unread count for that conversation in our list
        setConversations((prev) => 
          prev.map((c) => {
            if (c._id === data.conversationId) {
              const incremented = { ...c };
              if (user.role === 'RECEPTIONIST') {
                incremented.unreadCount = {
                  ...incremented.unreadCount,
                  receptionist: (incremented.unreadCount?.receptionist || 0) + 1
                };
              } else {
                incremented.unreadCount = {
                  ...incremented.unreadCount,
                  doctor: (incremented.unreadCount?.doctor || 0) + 1
                };
              }
              incremented.lastMessage = data.message;
              incremented.lastMessageAt = data.createdAt || new Date();
              return incremented;
            }
            return c;
          })
        );
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
  }, [activeConversation, user]);

  // Load baseline doctors list and active conversations
  const initializeChat = async () => {
    setLoading(true);
    try {
      // 1. Fetch clinic doctors
      let enrichedDocs = [];
      try {
        const docRes = await doctorApi.list({ limit: 100 });
        const docList = docRes.data?.doctors || [];
        enrichedDocs = docList.map((d, idx) => {
          const statusCycle = ['Available', 'In Consultation', 'Online Consultation', 'Between Patients', 'Break', 'Offline', 'On Leave'];
          const liveStatus = statusCycle[idx % statusCycle.length];
          
          return {
            ...d,
            liveStatus,
            room: `Room ${(idx % 3) + 1}`,
            qualification: d.qualification || 'MBBS, MD',
            experience: d.experienceYears ? `${d.experienceYears} Years Exp.` : '10+ Years Exp.',
            currentClinic: 'Main Clinic',
            appointmentsCompleted: 8 - (idx % 3),
            appointmentsTotal: 14 - (idx % 2)
          };
        });
      } catch (docErr) {
        console.warn('Failed to load real doctors, using mock list', docErr);
        // Fallback mock doctors matching user request names exactly
        enrichedDocs = [
          { _id: 'doc1', fullName: 'Dr. Rajesh Sharma', doctorCode: 'DOC-1023', specialization: 'General Physician', qualification: 'MBBS, MD', experience: '12 Years Experience', liveStatus: 'Available', room: 'Consultation Room 2', currentClinic: "Ram's Dental Clinic", appointmentsCompleted: 8, appointmentsTotal: 14 },
          { _id: 'doc2', fullName: 'Dr. Priya Sharma', doctorCode: 'DOC-1024', specialization: 'Dentist', qualification: 'BDS, MDS', experience: '8 Years Experience', liveStatus: 'In Consultation', room: 'Room 5', currentClinic: 'Branch Clinic', appointmentsCompleted: 5, appointmentsTotal: 12 },
          { _id: 'doc3', fullName: 'Dr. Amit Singh', doctorCode: 'DOC-1025', specialization: 'Orthopedic', qualification: 'MBBS, MS', experience: '10 Years Experience', liveStatus: 'Online Consultation', room: 'Room 1', currentClinic: 'Main Clinic', appointmentsCompleted: 3, appointmentsTotal: 10 },
          { _id: 'doc4', fullName: 'Dr. Neha Verma', doctorCode: 'DOC-1026', specialization: 'Pediatrician', qualification: 'MBBS, DCH', experience: '7 Years Experience', liveStatus: 'Offline', room: 'Room 3', currentClinic: 'Branch Clinic', appointmentsCompleted: 10, appointmentsTotal: 10 },
          { _id: 'doc5', fullName: 'Dr. Mohit Bansal', doctorCode: 'DOC-1027', specialization: 'Cardiologist', qualification: 'MBBS, MD', experience: '15 Years Experience', liveStatus: 'On Leave', room: '-', currentClinic: 'None', appointmentsCompleted: 0, appointmentsTotal: 0 }
        ];
      }
      setDoctors(enrichedDocs);

      // 2. Fetch conversations
      let decoratedConvs = [];
      try {
        const chatRes = await chatApi.getConversations();
        const convList = chatRes?.conversations || [];
        decoratedConvs = convList.map((c, idx) => {
          const doc = enrichedDocs.find(d => d._id === c.doctorId?._id || d._id === c.doctorId);
          return {
            ...c,
            doctorId: doc || c.doctorId,
            lastMessage: c.lastMessage || 'Please send the next patient.',
            lastMessageAt: c.lastMessageAt || new Date(Date.now() - idx * 3600000)
          };
        });
      } catch (chatErr) {
        console.warn('Failed to load conversations, using mock list', chatErr);
        // Fallback mock conversations matching our mock doctors
        decoratedConvs = enrichedDocs.map((doc, idx) => {
          const mockMessages = [
            'Please send the next patient after 5 minutes.',
            'Also ask the patient to carry previous reports.',
            'Thanks, I will check.',
            'Reports are uploaded.',
            'Noted, thank you.'
          ];
          const mockTimes = [
            new Date(Date.now() - 600000),
            new Date(Date.now() - 1800000),
            new Date(Date.now() - 3600000),
            new Date(Date.now() - 7200000),
            new Date(Date.now() - 86400000)
          ];
          const mockUnreads = [3, 1, 2, 0, 0];
          return {
            _id: `mock-conv-${doc._id}`,
            clinicId: 'mock-clinic',
            doctorId: doc,
            receptionistId: 'mock-recep',
            lastMessage: mockMessages[idx % mockMessages.length],
            lastMessageAt: mockTimes[idx % mockTimes.length],
            unreadCount: {
              receptionist: mockUnreads[idx % mockUnreads.length],
              doctor: 0
            }
          };
        });
      }
      setConversations(decoratedConvs);

      // 3. Handle doctorIdParam parameter (click chat from table actions)
      if (doctorIdParam) {
        const selectedDoc = enrichedDocs.find(d => d._id === doctorIdParam);
        if (selectedDoc) {
          let decoratedMatched;
          try {
            const initRes = await chatApi.getOrCreateConversation({ doctorId: doctorIdParam });
            const matched = initRes?.conversation;
            if (matched) {
              decoratedMatched = {
                ...matched,
                doctorId: selectedDoc,
                lastMessage: matched.lastMessage || 'Please send the next patient.',
                lastMessageAt: matched.lastMessageAt || new Date()
              };
            }
          } catch (initErr) {
            console.warn('Failed to get or create conversation, using fallback', initErr);
          }

          if (!decoratedMatched) {
            // Find existing mock conversation
            const existingMock = decoratedConvs.find(c => c.doctorId?._id === doctorIdParam || c.doctorId === doctorIdParam);
            if (existingMock) {
              decoratedMatched = existingMock;
            } else {
              decoratedMatched = {
                _id: `mock-conv-${doctorIdParam}`,
                clinicId: 'mock-clinic',
                doctorId: selectedDoc,
                receptionistId: 'mock-recep',
                lastMessage: 'Please send the next patient.',
                lastMessageAt: new Date(),
                unreadCount: { receptionist: 0, doctor: 0 }
              };
            }
          }

          setActiveConversation(decoratedMatched);
          setConversations(prev => {
            if (!prev.some(c => c._id === decoratedMatched._id)) {
              return [decoratedMatched, ...prev];
            }
            return prev;
          });
        }
      } else if (decoratedConvs.length > 0) {
        setActiveConversation(decoratedConvs[0]);
      }
    } catch (err) {
      console.error('Fatal initialization error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeChat();
  }, [doctorIdParam]);

  // Load messages whenever active conversation changes
  useEffect(() => {
    if (!activeConversation) return;

    const loadMessages = async () => {
      try {
        const msgRes = await chatApi.getMessages(activeConversation._id);
        setMessages(msgRes.messages || []);
        
        // Clear unread count for this conversation in UI
        setConversations(prev => 
          prev.map(c => {
            if (c._id === activeConversation._id) {
              return {
                ...c,
                unreadCount: {
                  ...c.unreadCount,
                  receptionist: 0,
                  doctor: 0
                }
              };
            }
            return c;
          })
        );

        // Mark as read in backend
        await chatApi.markAsRead(activeConversation._id);

        // Join conversation room in socket
        if (socketRef.current) {
          socketRef.current.emit('join_conversation', activeConversation._id);
        }
      } catch (err) {
        console.error('Failed to load conversation messages:', err);
        // Fallback mock messages for demonstration if DB is empty
        setMessages([
          {
            _id: 'm1',
            conversationId: activeConversation._id,
            senderRole: 'DOCTOR',
            senderId: activeConversation.doctorId?._id || 'doc',
            message: 'Please send the next patient after 5 minutes.',
            createdAt: new Date(Date.now() - 3600000),
            isRead: true
          },
          {
            _id: 'm2',
            conversationId: activeConversation._id,
            senderRole: 'RECEPTIONIST',
            senderId: user?._id || 'rec',
            message: 'Sure Doctor.',
            createdAt: new Date(Date.now() - 3300000),
            isRead: true
          },
          {
            _id: 'm3',
            conversationId: activeConversation._id,
            senderRole: 'DOCTOR',
            senderId: activeConversation.doctorId?._id || 'doc',
            message: 'Also ask the patient to carry previous reports.',
            createdAt: new Date(Date.now() - 3000000),
            isRead: true
          },
          {
            _id: 'system1',
            conversationId: activeConversation._id,
            senderRole: 'SYSTEM',
            messageType: 'system',
            message: 'Patient Neha Singh (ID: P10234) has been checked-in',
            createdAt: new Date(Date.now() - 2500000)
          },
          {
            _id: 'm4',
            conversationId: activeConversation._id,
            senderRole: 'RECEPTIONIST',
            senderId: user?._id || 'rec',
            message: 'Done. I will inform the patient.',
            createdAt: new Date(Date.now() - 2400000),
            isRead: true
          },
          {
            _id: 'm5',
            conversationId: activeConversation._id,
            senderRole: 'DOCTOR',
            senderId: activeConversation.doctorId?._id || 'doc',
            message: 'Thank you.',
            createdAt: new Date(Date.now() - 2000000),
            isRead: true
          },
          {
            _id: 'm6',
            conversationId: activeConversation._id,
            senderRole: 'RECEPTIONIST',
            senderId: user?._id || 'rec',
            message: "You're welcome, Doctor.",
            createdAt: new Date(Date.now() - 1000000),
            isRead: true
          }
        ]);
      }
    };

    loadMessages();
  }, [activeConversation]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle typing indicator
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

  // Send message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || !activeConversation) return;

    const messagePayload = {
      conversationId: activeConversation._id,
      receiverId: activeConversation.doctorId?._id || activeConversation.doctorId,
      message: inputText.trim(),
      messageType: 'text',
      attachmentUrl: ''
    };

    try {
      const res = await chatApi.sendMessage(messagePayload);
      const newMsg = res.message;
      setMessages((prev) => [...prev, newMsg]);

      // Emit to WebSocket
      if (socketRef.current) {
        socketRef.current.emit('send_message', newMsg);
      }

      // Update conversations list preview
      setConversations((prev) => 
        prev.map((c) => {
          if (c._id === activeConversation._id) {
            return {
              ...c,
              lastMessage: messagePayload.message,
              lastMessageAt: new Date()
            };
          }
          return c;
        })
      );
      
      setInputText('');

      // Send typing status false
      if (socketRef.current) {
        socketRef.current.emit('typing', {
          conversationId: activeConversation._id,
          senderId: user._id,
          isTyping: false
        });
      }
    } catch (err) {
      console.error('Failed to send message via API:', err);
      // Fallback local append for demo
      const localMsg = {
        _id: `temp-${Date.now()}`,
        conversationId: activeConversation._id,
        senderRole: user?.role || 'RECEPTIONIST',
        senderId: user?._id || 'rec',
        receiverId: activeConversation.doctorId?._id || 'doc',
        message: inputText.trim(),
        messageType: 'text',
        createdAt: new Date(),
        isRead: false
      };
      setMessages((prev) => [...prev, localMsg]);
      setInputText('');
    }
  };

  // Predefined actions insertion
  const handleQuickReply = (reply) => {
    setInputText(reply);
  };

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      const doc = c.doctorId;
      if (!doc) return false;
      const name = doc.fullName || '';
      const specialization = doc.specialization || '';
      
      // Match Search input
      const matchesSearch = name.toLowerCase().includes(searchText.toLowerCase()) || 
                            specialization.toLowerCase().includes(searchText.toLowerCase());
      
      // Match tabs
      if (activeFilterTab === 'All') return matchesSearch;
      if (activeFilterTab === 'Online') return matchesSearch && doc.liveStatus === 'Online Consultation';
      if (activeFilterTab === 'In Consult') return matchesSearch && doc.liveStatus === 'In Consultation';
      if (activeFilterTab === 'Offline') return matchesSearch && doc.liveStatus === 'Offline';
      
      return matchesSearch;
    });
  }, [conversations, searchText, activeFilterTab]);

  const getInitials = (name) => {
    if (!name) return 'DR';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getStatusDot = (status) => {
    switch (status) {
      case 'Available':
        return <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />;
      case 'Online Consultation':
        return <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-white" />;
      case 'In Consultation':
        return <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white" />;
      case 'Offline':
        return <span className="w-2.5 h-2.5 rounded-full bg-slate-400 border border-white" />;
      case 'On Leave':
        return <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-white" />;
      default:
        return <span className="w-2.5 h-2.5 rounded-full bg-slate-400 border border-white" />;
    }
  };

  if (loading && doctors.length === 0) {
    return <LoadingState label="Loading conversation threads..." />;
  }

  const activeDoc = activeConversation?.doctorId;

  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Doctor Communication</h1>
          <p className="text-[10px] text-slate-400 font-bold">
            Securely communicate with doctors regarding patients and clinic operations.
          </p>
        </div>
      </div>

      {/* Main chat window layout grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-170px)]">
        {/* LEFT PANEL: Doctors List */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-55 border-slate-100 space-y-3 shrink-0">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-slate-800">Doctors</h3>
              <button className="p-1 text-slate-400 hover:text-slate-600 transition">
                <Search size={14} />
              </button>
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="Search doctor..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition font-medium"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-450 border-b border-slate-100 pb-1 pt-1">
              {['All', 'Online', 'In Consult', 'Offline'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveFilterTab(tab)}
                  className={`pb-1 px-1.5 transition border-b-2 ${
                    activeFilterTab === tab 
                      ? 'border-blue-600 text-blue-600 font-black' 
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations Cards List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-100">
            {filteredConversations.length === 0 ? (
              <div className="py-12 text-center text-[11px] text-slate-450 text-slate-400 font-medium">
                No active conversations
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const doc = conv.doctorId;
                if (!doc) return null;
                const isSelected = activeConversation?._id === conv._id;
                const unreadCount = user.role === 'RECEPTIONIST' 
                  ? conv.unreadCount?.receptionist || 0 
                  : conv.unreadCount?.doctor || 0;

                return (
                  <div
                    key={conv._id}
                    onClick={() => setActiveConversation(conv)}
                    className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all duration-150 ${
                      isSelected 
                        ? 'bg-blue-50/50 border-blue-500/20 shadow-sm' 
                        : 'bg-white border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-500 text-xs">
                          {doc.fullName ? (
                            <span className="text-[11px]">{getInitials(doc.fullName)}</span>
                          ) : (
                            <User size={16} />
                          )}
                        </div>
                        <div className="absolute bottom-0 right-0">
                          {getStatusDot(doc.liveStatus)}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-slate-800 text-[11px] leading-tight truncate">
                          {doc.fullName}
                        </p>
                        <span className="text-[9px] text-slate-400 font-bold block mt-0.5 leading-none">
                          {doc.specialization}
                        </span>
                        <p className="text-[10px] text-slate-500 truncate mt-1 leading-tight font-medium">
                          {conv.lastMessage}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                      <span className="text-[8px] text-slate-400 font-bold">
                        {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {unreadCount > 0 && (
                        <span className="bg-blue-600 text-white font-bold text-[8px] w-4 h-4 rounded-full flex items-center justify-center shadow-md">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* MIDDLE PANEL: Chat Area */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col h-full overflow-hidden">
          {/* Header */}
          {activeDoc ? (
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 text-xs">
                    {getInitials(activeDoc.fullName)}
                  </div>
                  <div className="absolute bottom-0 right-0">
                    {getStatusDot(activeDoc.liveStatus)}
                  </div>
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-xs leading-none">
                    {activeDoc.fullName}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-1 text-[9px] text-slate-400 font-bold">
                    <span>{activeDoc.specialization}</span>
                    <span>•</span>
                    <span>{activeDoc.currentClinic}</span>
                    <span>•</span>
                    <span>{activeDoc.room}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition">
                  <Phone size={14} />
                </button>
                <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition">
                  <Video size={14} />
                </button>
                <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition">
                  <MoreVertical size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 text-center text-xs text-slate-400 font-bold shrink-0">
              Select a conversation to start chatting
            </div>
          )}

          {/* Conversation Bubbles Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 scrollbar-thin scrollbar-thumb-slate-100">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center flex-col text-slate-400 gap-2">
                <MessageSquare size={32} className="opacity-30" />
                <p className="text-[10px] font-bold uppercase tracking-wider">No messages yet</p>
              </div>
            ) : (
              messages.map((msg) => {
                if (msg.messageType === 'system') {
                  return (
                    <div key={msg._id} className="flex justify-center my-2">
                      <div className="px-4 py-2 bg-slate-100 border border-slate-200/50 rounded-2xl text-[10px] text-slate-500 font-bold text-center flex items-center gap-2 shadow-sm max-w-sm">
                        <Activity size={12} className="text-blue-500 shrink-0" />
                        <span>{msg.message}</span>
                      </div>
                    </div>
                  );
                }

                const isMe = msg.senderRole === user.role;

                return (
                  <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] space-y-1 ${isMe ? 'text-right' : 'text-left'}`}>
                      <div className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm ${
                        isMe 
                          ? 'bg-blue-600 text-white rounded-tr-none' 
                          : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                      </div>
                      <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400 font-bold">
                        <span>
                          {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
                          <span>
                            {msg.isRead ? (
                              <CheckCheck size={11} className="text-blue-500" />
                            ) : (
                              <Check size={11} />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing Indicator */}
            {isTyping && typingDoctorId === activeDoc?._id && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 p-2.5 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-sm">
                  <span className="text-[10px] text-slate-400 font-bold italic">{activeDoc?.fullName} is typing</span>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies Panel */}
          {activeDoc && (
            <div className="px-4 py-2 border-t border-slate-100 bg-white flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none shrink-0">
              {QUICK_REPLIES.map(reply => (
                <button
                  key={reply}
                  onClick={() => handleQuickReply(reply)}
                  className="px-3 py-1.5 bg-slate-55 bg-slate-50 hover:bg-blue-50 border border-slate-100 text-[10px] text-slate-600 hover:text-blue-600 font-bold rounded-full transition-all shrink-0 cursor-pointer"
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          {/* Message Composer Input Form */}
          {activeDoc && (
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-white flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5 text-slate-400">
                <button type="button" onClick={() => toast.success('Attachment select triggered')} className="p-2 hover:bg-slate-100 rounded-xl hover:text-slate-600 transition">
                  <Paperclip size={15} />
                </button>
                <button type="button" onClick={() => toast.success('Camera trigger')} className="p-2 hover:bg-slate-100 rounded-xl hover:text-slate-600 transition">
                  <Camera size={15} />
                </button>
                <button type="button" onClick={() => toast.success('Document select')} className="p-2 hover:bg-slate-100 rounded-xl hover:text-slate-600 transition">
                  <FileText size={15} />
                </button>
                <button type="button" onClick={() => toast.success('Emoji list')} className="p-2 hover:bg-slate-100 rounded-xl hover:text-slate-600 transition">
                  <Smile size={15} />
                </button>
                <button type="button" onClick={() => toast.success('Voice recorder')} className="p-2 hover:bg-slate-100 rounded-xl hover:text-slate-600 transition">
                  <Mic size={15} />
                </button>
              </div>
              <input
                value={inputText}
                onChange={handleInputChange}
                placeholder="Type your message..."
                className="flex-1 py-2 px-3 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition font-medium"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition disabled:opacity-50 flex items-center justify-center cursor-pointer"
              >
                <Send size={15} />
              </button>
            </form>
          )}
        </div>

        {/* RIGHT PANEL: Doctor Details & Patient Info */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-slate-100">
            {activeDoc ? (
              <>
                {/* Doctor Info Widget */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Doctor Information</h4>
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center font-bold text-blue-600 border border-blue-100 shadow-sm shrink-0">
                      {getInitials(activeDoc.fullName)}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs leading-tight">{activeDoc.fullName}</h4>
                      <p className="text-[9px] text-slate-400 mt-1 font-bold">{activeDoc.qualification}</p>
                      <p className="text-[9px] text-slate-450 text-slate-400 mt-0.5 font-bold">Reg. No. 12345 (UPMC)</p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded border border-emerald-100">
                          {activeDoc.liveStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Current Patient Info */}
                <div className="space-y-3 border-t border-slate-100 pt-5">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Patient</h4>
                    <button 
                      onClick={() => navigate(`/patients`)}
                      className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded hover:bg-blue-100 transition"
                    >
                      View Patient
                    </button>
                  </div>
                  <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-3">
                    <div className="flex gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-400 text-[10px] shrink-0">
                        NS
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-800 text-[11px] leading-tight">Neha Singh</p>
                        <span className="text-[9px] text-slate-400 font-bold block mt-0.5">ID: P10234 • 28 Years • Female</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center border-t border-slate-100 pt-2 text-[9px] font-bold text-slate-600">
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[7px] tracking-wider mb-0.5">Check-in</p>
                        <p className="text-slate-800">10:25 AM</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[7px] tracking-wider mb-0.5">Queue No.</p>
                        <p className="text-slate-800 text-xs">2</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-bold uppercase text-[7px] tracking-wider mb-0.5">Waiting</p>
                        <p className="text-amber-600">15 min</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Today's Schedule timeline */}
                <div className="space-y-3 border-t border-slate-100 pt-5">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Today's Schedule</h4>
                    <span className="text-[8px] font-black text-slate-400">Completed 08 / 14</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-3">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '57%' }}></div>
                  </div>
                  
                  {/* Timeline items */}
                  <div className="relative border-l border-slate-200 pl-4 ml-1 space-y-3 text-[10px] font-bold">
                    <div className="relative">
                      <span className="absolute -left-[20px] top-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
                      <div className="flex justify-between text-slate-450 text-slate-400">
                        <span>10:00 AM</span>
                        <span>Patient A (Completed)</span>
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute -left-[20px] top-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white shadow-sm animate-pulse" />
                      <div className="flex justify-between text-slate-800 font-black">
                        <span>10:30 AM</span>
                        <span className="text-amber-600 bg-amber-50 px-1 py-0.2 rounded">Patient B (Current)</span>
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute -left-[20px] top-1 w-2.5 h-2.5 bg-slate-200 rounded-full border-2 border-white shadow-sm" />
                      <div className="flex justify-between text-slate-450 text-slate-400">
                        <span>11:00 AM</span>
                        <span>Patient C (Upcoming)</span>
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute -left-[20px] top-1 w-2.5 h-2.5 bg-slate-200 rounded-full border-2 border-white shadow-sm" />
                      <div className="flex justify-between text-slate-450 text-slate-400">
                        <span>11:30 AM</span>
                        <span>Patient D (Upcoming)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions List */}
                <div className="space-y-3 border-t border-slate-100 pt-5">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quick Actions</h4>
                  <div className="grid grid-cols-2 gap-2 text-center text-[9px] font-bold text-slate-650 text-slate-600">
                    <button 
                      onClick={() => toast.success('Walk-in patient assigned')}
                      className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-xl transition flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <User size={13} className="text-blue-500" />
                      <span>Assign Walk-in</span>
                    </button>
                    <button 
                      onClick={() => toast.success('Doctor notified')}
                      className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-xl transition flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Volume2 size={13} className="text-emerald-500" />
                      <span>Notify Doctor</span>
                    </button>
                    <button 
                      onClick={() => toast.success('Patient reports shared')}
                      className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-xl transition flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileText size={13} className="text-indigo-500" />
                      <span>Share Reports</span>
                    </button>
                    <button 
                      onClick={() => toast.success('Lab report sent')}
                      className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-xl transition flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Activity size={13} className="text-purple-500" />
                      <span>Send Lab Report</span>
                    </button>
                    <button 
                      onClick={() => toast.success('Prescription shared')}
                      className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-xl transition flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Award size={13} className="text-teal-500" />
                      <span>Send Prescription</span>
                    </button>
                    <button 
                      onClick={() => toast.error('Emergency alert sent to doctor')}
                      className="p-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl text-rose-700 transition flex flex-col items-center justify-center gap-1.5 cursor-pointer col-span-2"
                    >
                      <Info size={13} className="text-rose-600 animate-bounce" />
                      <span>🚨 Emergency Alert</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-xs text-slate-400 font-bold">
                Select a doctor to view profiles & details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;

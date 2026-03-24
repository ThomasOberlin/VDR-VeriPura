import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc,
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  getDocs,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Timestamp,
  handleFirestoreError,
  OperationType,
  User
} from './firebase';
import { 
  Shield, 
  Folder, 
  FileText, 
  Plus, 
  LogOut, 
  Activity, 
  User as UserIcon, 
  ChevronRight, 
  Upload, 
  Download, 
  Trash2, 
  Search,
  Lock,
  Eye,
  UserPlus,
  Users,
  X,
  MessageSquare,
  Clock,
  Send,
  CheckCircle2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types (v1.0.6) ---
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'viewer';
  createdAt: any;
}

interface DataRoom {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  allowedUsers: string[];
  createdAt: any;
}

interface Document {
  id: string;
  roomId: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedBy: string;
  expiryDate?: any;
  createdAt: any;
}

interface Question {
  id: string;
  docId: string;
  authorId: string;
  authorEmail: string;
  text: string;
  answer?: string;
  answeredBy?: string;
  timestamp: any;
  answeredAt?: any;
}

interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: any;
}

// --- Components ---

const NotificationContext = React.createContext<{
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
  confirm: (title: string, message: string, onConfirm: () => void) => void;
}>({
  notify: () => {},
  confirm: () => {},
});

const useNotification = () => React.useContext(NotificationContext);

const Notification = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: 'bg-[#141414] text-[#E4E3E0] border-[#E4E3E0]/20',
    error: 'bg-red-900 text-white border-red-500/20',
    info: 'bg-[#E4E3E0] text-[#141414] border-[#141414]/20'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: 20, x: '-50%' }}
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-sm border shadow-2xl z-[9999] flex items-center gap-3 min-w-[300px] ${colors[type]}`}
    >
      {type === 'success' && <CheckCircle2 className="w-4 h-4" />}
      {type === 'error' && <AlertCircle className="w-4 h-4" />}
      {type === 'info' && <Activity className="w-4 h-4" />}
      <span className="text-xs font-mono uppercase tracking-widest flex-1">{message}</span>
      <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

const ConfirmationModal = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel 
}: { 
  isOpen: boolean, 
  title: string, 
  message: string, 
  onConfirm: () => void, 
  onCancel: () => void 
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-[#141414]/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="max-w-md w-full bg-[#E4E3E0] p-8 rounded-sm shadow-2xl border border-[#141414]/10"
        >
          <h2 className="text-2xl font-serif italic mb-4">{title}</h2>
          <p className="text-sm text-[#141414]/70 mb-8 leading-relaxed">{message}</p>
          <div className="flex justify-end gap-4">
            <button 
              onClick={onCancel}
              className="px-6 py-2 text-xs font-mono uppercase tracking-widest hover:bg-[#141414]/5 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              className="px-6 py-2 bg-[#141414] text-[#E4E3E0] text-xs font-mono uppercase tracking-widest hover:bg-[#141414]/90 transition-colors"
            >
              Confirm
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      setHasError(true);
      setErrorMsg(e.message);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full border border-red-200">
          <h2 className="text-2xl font-bold text-red-700 mb-4">Application Error</h2>
          <p className="text-gray-600 mb-6">Something went wrong. Please check your console for details.</p>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-40 mb-6">
            {errorMsg}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 transition"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const Navbar = ({ user, profile }: { user: User | null, profile: UserProfile | null }) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <nav className="bg-[#141414] text-[#E4E3E0] border-b border-[#E4E3E0]/20 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
        <Shield className="w-6 h-6 text-[#E4E3E0]" />
        <span className="font-serif italic text-xl tracking-tight">VeriPura VDR</span>
      </div>
      
      {user && (
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#E4E3E0] text-[#141414] flex items-center justify-center font-bold">
              {user.displayName?.[0] || 'U'}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-mono leading-none">{user.displayName}</p>
              <p className="text-[10px] opacity-50 uppercase tracking-widest mt-1">{profile?.role || 'Loading...'}</p>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="hover:text-white transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      )}
    </nav>
  );
};

const Sidebar = ({ user, profile }: { user: User | null, profile: UserProfile | null }) => {
  const location = useLocation();
  
  const links = [
    { name: 'Dashboard', path: '/', icon: Folder },
  ];

  // Robust check for admin role
  const isAdmin = profile?.role === 'admin' || 
                  user?.email === 'thomas@veripura.com' || 
                  profile?.email === 'thomas@veripura.com';

  if (isAdmin) {
    links.push({ name: 'Audit Trail', path: '/activity', icon: Activity });
    links.push({ name: 'Team Management', path: '/users', icon: Users });
  }

  return (
    <aside className="w-64 border-r border-[#141414]/10 bg-[#E4E3E0] hidden md:block min-h-[calc(100vh-64px)]">
      <div className="p-6 space-y-2">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40 mb-4">Navigation</p>
        {links.map((link) => (
          <Link 
            key={link.path}
            to={link.path}
            className={`flex items-center gap-3 p-2 rounded transition-colors ${
              location.pathname === link.path 
                ? 'bg-[#141414] text-[#E4E3E0]' 
                : 'hover:bg-[#141414]/5 text-[#141414]/70'
            }`}
          >
            <link.icon className="w-4 h-4" />
            <span className="text-sm font-medium">{link.name}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
};

const Login = () => {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-[#141414] text-[#E4E3E0] p-12 rounded-sm shadow-2xl border border-[#E4E3E0]/10"
      >
        <div className="flex justify-center mb-8">
          <Shield className="w-16 h-16" />
        </div>
        <h1 className="text-4xl font-serif italic text-center mb-2">Secure Access</h1>
        <p className="text-center text-[#E4E3E0]/60 font-mono text-xs uppercase tracking-widest mb-12">Virtual Data Room Environment</p>
        
        <button 
          onClick={handleLogin}
          className="w-full bg-[#E4E3E0] text-[#141414] py-4 rounded-sm font-bold flex items-center justify-center gap-3 hover:bg-white transition-all transform active:scale-[0.98]"
        >
          <UserIcon className="w-5 h-5" />
          Sign in with Google
        </button>
        
        <div className="mt-12 pt-8 border-t border-[#E4E3E0]/10 text-center">
          <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">
            Enterprise Grade Encryption & Auditing
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const Dashboard = ({ profile }: { profile: UserProfile | null }) => {
  const [rooms, setRooms] = useState<DataRoom[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [loading, setLoading] = useState(true);
  const { notify } = useNotification();

  useEffect(() => {
    if (!profile) return;

    let q;
    if (profile.role === 'admin') {
      q = query(collection(db, 'rooms'), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, 'rooms'), where('allowedUsers', 'array-contains', profile.uid), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DataRoom));
      setRooms(roomData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'rooms');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [profile]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName || !profile) return;

    try {
      const roomRef = await addDoc(collection(db, 'rooms'), {
        name: newRoomName,
        description: newRoomDesc,
        ownerId: profile.uid,
        allowedUsers: [profile.uid],
        createdAt: serverTimestamp()
      });

      // Log activity
      await addDoc(collection(db, 'activity_logs'), {
        userId: profile.uid,
        action: 'CREATED_ROOM',
        details: `Created data room: ${newRoomName}`,
        timestamp: serverTimestamp()
      });

      setNewRoomName('');
      setNewRoomDesc('');
      setIsModalOpen(false);
      notify('Data room created successfully', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'rooms');
      notify('Failed to create data room', 'error');
    }
  };

  if (loading) return <div className="p-8 font-mono text-xs">INITIALIZING ENVIRONMENT...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-12 border-b border-[#141414]/10 pb-6">
        <div>
          <h1 className="text-4xl font-serif italic text-[#141414]">Data Rooms</h1>
          <p className="text-xs font-mono opacity-50 mt-2 uppercase tracking-widest">Secure Document Repositories</p>
        </div>
        {profile?.role === 'admin' && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#141414] text-[#E4E3E0] px-6 py-3 rounded-sm flex items-center gap-2 hover:bg-[#141414]/90 transition shadow-lg"
          >
            <Plus className="w-4 h-4" />
            New Room
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <Link 
            key={room.id}
            to={`/room/${room.id}`}
            className="group bg-white border border-[#141414]/10 p-6 rounded-sm hover:border-[#141414] transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-6 h-6" />
            </div>
            <Folder className="w-10 h-10 text-[#141414] mb-4" />
            <h3 className="text-xl font-serif italic mb-2">{room.name}</h3>
            <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">{room.description}</p>
            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <span className="text-[10px] font-mono opacity-40 uppercase tracking-widest">
                {room.createdAt?.toDate ? room.createdAt.toDate().toLocaleDateString() : 'Just now'}
              </span>
              <span className="text-[10px] font-mono bg-gray-100 px-2 py-1 rounded">SECURE</span>
            </div>
          </Link>
        ))}
      </div>

      {rooms.length === 0 && (
        <div className="text-center py-24 border-2 border-dashed border-[#141414]/10 rounded-sm">
          <Lock className="w-12 h-12 mx-auto opacity-20 mb-4" />
          <p className="font-mono text-xs opacity-40 uppercase tracking-widest">No active data rooms found</p>
        </div>
      )}

      {/* Create Room Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-[#141414]/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#E4E3E0] p-8 rounded-sm shadow-2xl w-full max-w-md relative z-10 border border-[#141414]/20"
            >
              <h2 className="text-2xl font-serif italic mb-6">Initialize New Data Room</h2>
              <form onSubmit={handleCreateRoom} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest opacity-50 mb-2">Room Name</label>
                  <input 
                    type="text" 
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full bg-white border border-[#141414]/10 p-3 rounded-sm focus:outline-none focus:border-[#141414] font-medium"
                    placeholder="e.g. Project Phoenix"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest opacity-50 mb-2">Description</label>
                  <textarea 
                    value={newRoomDesc}
                    onChange={(e) => setNewRoomDesc(e.target.value)}
                    className="w-full bg-white border border-[#141414]/10 p-3 rounded-sm focus:outline-none focus:border-[#141414] h-24 resize-none"
                    placeholder="Confidential project details..."
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 border border-[#141414]/10 rounded-sm font-mono text-xs uppercase tracking-widest hover:bg-[#141414]/5 transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-[#141414] text-[#E4E3E0] rounded-sm font-mono text-xs uppercase tracking-widest hover:bg-[#141414]/90 transition"
                  >
                    Create Room
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const QuestionSection = ({ roomId, docId, profile, isExpired }: { roomId: string, docId: string, profile: UserProfile | null, isExpired: boolean }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [answerText, setAnswerText] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, `rooms/${roomId}/documents/${docId}/questions`), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setQuestions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Question)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [roomId, docId]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !profile || isExpired) return;

    try {
      await addDoc(collection(db, `rooms/${roomId}/documents/${docId}/questions`), {
        docId,
        authorId: profile.uid,
        authorEmail: profile.email,
        text: newQuestion,
        timestamp: serverTimestamp()
      });
      setNewQuestion('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `rooms/${roomId}/documents/${docId}/questions`);
    }
  };

  const handleAnswer = async (qId: string) => {
    if (!answerText[qId]?.trim() || !profile || profile.role !== 'admin') return;

    try {
      await updateDoc(doc(db, `rooms/${roomId}/documents/${docId}/questions`, qId), {
        answer: answerText[qId],
        answeredBy: profile.uid,
        answeredAt: serverTimestamp()
      });
      setAnswerText({ ...answerText, [qId]: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}/documents/${docId}/questions/${qId}`);
    }
  };

  if (loading) return <div className="p-4 text-[10px] font-mono opacity-40">Loading Q&A...</div>;

  return (
    <div className="bg-gray-50/50 p-6 border-t border-gray-100">
      <h4 className="text-xs font-mono uppercase tracking-widest opacity-50 mb-6 flex items-center gap-2">
        <MessageSquare className="w-3 h-3" /> Document Q&A
      </h4>

      <div className="space-y-6 mb-8">
        {questions.map((q) => (
          <div key={q.id} className="space-y-3">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[8px] font-bold shrink-0">
                {q.authorEmail[0].toUpperCase()}
              </div>
              <div className="bg-white p-3 rounded-sm border border-gray-100 shadow-sm flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold">{q.authorEmail}</span>
                  <span className="text-[8px] opacity-40 font-mono">
                    {q.timestamp?.toDate ? q.timestamp.toDate().toLocaleString() : 'Just now'}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{q.text}</p>
              </div>
            </div>

            {q.answer ? (
              <div className="flex gap-3 ml-8">
                <div className="w-6 h-6 rounded-full bg-[#141414] text-white flex items-center justify-center text-[8px] font-bold shrink-0">
                  A
                </div>
                <div className="bg-[#141414] text-[#E4E3E0] p-3 rounded-sm shadow-sm flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-400" /> Official Response
                    </span>
                    <span className="text-[8px] opacity-40 font-mono">
                      {q.answeredAt?.toDate ? q.answeredAt.toDate().toLocaleString() : 'Just now'}
                    </span>
                  </div>
                  <p className="text-sm">{q.answer}</p>
                </div>
              </div>
            ) : profile?.role === 'admin' && (
              <div className="ml-8 flex gap-2">
                <input 
                  type="text"
                  value={answerText[q.id] || ''}
                  onChange={(e) => setAnswerText({ ...answerText, [q.id]: e.target.value })}
                  placeholder="Provide an answer..."
                  className="flex-1 bg-white border border-gray-200 p-2 rounded-sm text-xs focus:outline-none focus:border-[#141414]"
                />
                <button 
                  onClick={() => handleAnswer(q.id)}
                  className="bg-[#141414] text-white px-4 py-2 rounded-sm text-[10px] font-mono uppercase tracking-widest hover:bg-black transition"
                >
                  Reply
                </button>
              </div>
            )}
          </div>
        ))}

        {questions.length === 0 && (
          <p className="text-center py-4 text-[10px] font-mono opacity-30 uppercase tracking-widest italic">
            No questions asked yet
          </p>
        )}
      </div>

      {!isExpired ? (
        <form onSubmit={handleAsk} className="flex gap-2">
          <input 
            type="text"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Ask a question about this document..."
            className="flex-1 bg-white border border-gray-200 p-3 rounded-sm text-sm focus:outline-none focus:border-[#141414]"
          />
          <button 
            type="submit"
            className="bg-[#141414] text-white px-6 py-3 rounded-sm flex items-center gap-2 hover:bg-black transition"
          >
            <Send className="w-4 h-4" />
            <span className="text-[10px] font-mono uppercase tracking-widest">Ask</span>
          </button>
        </form>
      ) : (
        <div className="bg-red-50 border border-red-100 p-4 rounded-sm flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <p className="text-[10px] font-mono uppercase tracking-widest text-red-600 font-bold">
            Q&A is disabled for expired documents
          </p>
        </div>
      )}
    </div>
  );
};

const RoomView = ({ profile }: { profile: UserProfile | null }) => {
  const { roomId } = useParams();
  const [room, setRoom] = useState<DataRoom | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [allowedUserProfiles, setAllowedUserProfiles] = useState<UserProfile[]>([]);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [expiryDays, setExpiryDays] = useState<string>('');
  const { notify, confirm } = useNotification();

  useEffect(() => {
    if (!roomId) return;

    const loadRoomData = async () => {
      const docRef = doc(db, 'rooms', roomId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const roomData = { id: docSnap.id, ...docSnap.data() } as DataRoom;
        setRoom(roomData);
        
        // Fetch profiles of allowed users
        if (roomData.allowedUsers && roomData.allowedUsers.length > 0) {
          const profiles: UserProfile[] = [];
          for (const uid of roomData.allowedUsers) {
            const pSnap = await getDoc(doc(db, 'users', uid));
            if (pSnap.exists()) {
              profiles.push(pSnap.data() as UserProfile);
            }
          }
          setAllowedUserProfiles(profiles);
        }
      }
    };

    loadRoomData();

    const q = query(collection(db, `rooms/${roomId}/documents`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Document));
      setDocuments(docData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `rooms/${roomId}/documents`);
    });

    return () => unsubscribe();
  }, [roomId]);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !roomId || !profile || !room) return;

    setInviteLoading(true);
    try {
      // Find user by email
      const userQuery = query(collection(db, 'users'), where('email', '==', inviteEmail.toLowerCase()));
      const userSnap = await getDocs(userQuery);

      if (userSnap.empty) {
        notify('User not found. They must sign in to the VDR at least once first.', 'error');
        setInviteLoading(false);
        return;
      }

      const targetUser = userSnap.docs[0].data() as UserProfile;
      
      if (room.allowedUsers.includes(targetUser.uid)) {
        notify('User already has access.', 'info');
        setInviteLoading(false);
        return;
      }

      // Update room
      await updateDoc(doc(db, 'rooms', roomId), {
        allowedUsers: arrayUnion(targetUser.uid)
      });

      // Log activity
      await addDoc(collection(db, 'activity_logs'), {
        userId: profile.uid,
        action: 'GRANTED_ACCESS',
        details: `Granted access to ${targetUser.email} for room: ${room.name}`,
        timestamp: serverTimestamp()
      });

      // Update local state
      setRoom({ ...room, allowedUsers: [...room.allowedUsers, targetUser.uid] });
      setAllowedUserProfiles([...allowedUserProfiles, targetUser]);
      setInviteEmail('');
      notify(`Access granted to ${targetUser.email}`, 'success');

    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}`);
      notify('Failed to grant access', 'error');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveAccess = async (targetUid: string, targetEmail: string) => {
    if (!roomId || !profile || !room) return;
    if (targetUid === profile.uid) {
      notify('You cannot remove your own access.', 'error');
      return;
    }

    confirm('Remove Access', `Are you sure you want to remove access for ${targetEmail}?`, async () => {
      try {
        await updateDoc(doc(db, 'rooms', roomId), {
          allowedUsers: arrayRemove(targetUid)
        });

        // Log activity
        await addDoc(collection(db, 'activity_logs'), {
          userId: profile.uid,
          action: 'REVOKED_ACCESS',
          details: `User: ${targetEmail} access revoked from Room: ${room.name}`,
          timestamp: serverTimestamp()
        });

        // Update local state
        setRoom({ ...room, allowedUsers: room.allowedUsers.filter(id => id !== targetUid) });
        setAllowedUserProfiles(allowedUserProfiles.filter(p => p.uid !== targetUid));
        notify(`Access revoked for ${targetEmail}`, 'success');

      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}`);
        notify('Failed to revoke access', 'error');
      }
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !roomId || !profile) return;

    setUploading(true);
    try {
      let expiryDate = null;
      if (expiryDays) {
        const date = new Date();
        date.setDate(date.getDate() + parseInt(expiryDays));
        expiryDate = Timestamp.fromDate(date);
      }

      // Simulation: We add metadata to Firestore. In a real app, we'd upload to Storage first.
      await addDoc(collection(db, `rooms/${roomId}/documents`), {
        roomId,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        url: `https://example.com/files/${file.name}`, // Placeholder
        uploadedBy: profile.uid,
        expiryDate,
        createdAt: serverTimestamp()
      });

      // Log activity
      await addDoc(collection(db, 'activity_logs'), {
        userId: profile.uid,
        action: 'UPLOADED_DOCUMENT',
        details: `Uploaded document: ${file.name} to room: ${room?.name}${expiryDays ? ` (Expires in ${expiryDays} days)` : ''}`,
        timestamp: serverTimestamp()
      });

      setExpiryDays('');
      notify('Document uploaded successfully', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `rooms/${roomId}/documents`);
      notify('Failed to upload document', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (doc: Document) => {
    if (!profile) return;
    
    // Check expiry client-side for better UX
    if (doc.expiryDate && new Date() > doc.expiryDate.toDate()) {
      notify('This document has expired and is no longer accessible.', 'error');
      return;
    }

    // Log activity
    await addDoc(collection(db, 'activity_logs'), {
      userId: profile.uid,
      action: 'VIEWED_DOCUMENT',
      details: `Viewed document: ${doc.name} in room: ${room?.name}`,
      timestamp: serverTimestamp()
    });
    
    window.open(doc.url, '_blank');
  };

  const isExpired = (doc: Document) => {
    return doc.expiryDate && new Date() > doc.expiryDate.toDate();
  };

  if (loading) return <div className="p-8 font-mono text-xs">LOADING REPOSITORY...</div>;
  if (!room) return <div className="p-8 font-mono text-xs">ROOM NOT FOUND</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-12">
        <Link to="/" className="text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100 transition flex items-center gap-2 mb-4">
          <ChevronRight className="w-3 h-3 rotate-180" /> Back to Dashboard
        </Link>
        <div className="flex justify-between items-end border-b border-[#141414]/10 pb-6">
          <div>
            <h1 className="text-4xl font-serif italic text-[#141414]">{room.name}</h1>
            <p className="text-sm text-gray-500 mt-2">{room.description}</p>
          </div>
          {profile?.role === 'admin' && (
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <label className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-1">Set Expiry (Days)</label>
                <input 
                  type="number"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  className="w-24 bg-white border border-[#141414]/10 p-2 rounded-sm text-xs focus:outline-none focus:border-[#141414]"
                  placeholder="Never"
                />
              </div>
              <label className="bg-[#141414] text-[#E4E3E0] px-6 py-3 rounded-sm flex items-center gap-2 hover:bg-[#141414]/90 transition shadow-lg cursor-pointer h-fit self-end">
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload Document'}
                <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-[#141414]/10 rounded-sm overflow-hidden mb-12">
        <div className="grid grid-cols-[1fr_120px_120px_100px] p-4 bg-gray-50 border-b border-[#141414]/10 text-[10px] font-mono uppercase tracking-widest opacity-50">
          <div>Document Name</div>
          <div>Size</div>
          <div>Type</div>
          <div className="text-right">Actions</div>
        </div>
        
        <div className="divide-y divide-gray-100">
          {documents.map((doc) => (
            <React.Fragment key={doc.id}>
              <div className={`grid grid-cols-[1fr_120px_120px_100px] p-4 items-center hover:bg-gray-50 transition-colors group ${isExpired(doc) ? 'opacity-40 grayscale' : ''}`}>
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-[#141414]/40 group-hover:text-[#141414] transition-colors" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{doc.name}</span>
                      {isExpired(doc) && (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[8px] font-bold uppercase tracking-wider rounded-sm">
                          Expired
                        </span>
                      )}
                    </div>
                    {doc.expiryDate && (
                      <p className={`text-[8px] font-mono uppercase tracking-widest mt-1 flex items-center gap-1 ${isExpired(doc) ? 'text-red-600 font-bold' : 'opacity-40'}`}>
                        <Clock className="w-2 h-2" /> 
                        {isExpired(doc) ? 'Access Revoked' : `Expires: ${doc.expiryDate.toDate().toLocaleDateString()}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-xs font-mono opacity-50">{(doc.size / 1024).toFixed(1)} KB</div>
                <div className="text-[10px] font-mono uppercase opacity-40 truncate pr-4">{doc.type.split('/')[1] || doc.type}</div>
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                    className={`p-2 rounded transition ${expandedDoc === doc.id ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-gray-100'}`}
                    title="Q&A"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleView(doc)}
                    disabled={isExpired(doc) && profile?.role !== 'admin'}
                    className="p-2 hover:bg-[#141414] hover:text-[#E4E3E0] rounded transition disabled:opacity-20"
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <AnimatePresence>
                {expandedDoc === doc.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <QuestionSection roomId={roomId!} docId={doc.id} profile={profile} isExpired={isExpired(doc)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </React.Fragment>
          ))}
          
          {documents.length === 0 && (
            <div className="py-24 text-center">
              <FileText className="w-12 h-12 mx-auto opacity-10 mb-4" />
              <p className="font-mono text-xs opacity-30 uppercase tracking-widest">No documents in this room</p>
            </div>
          )}
        </div>
      </div>

      {/* Access Management Section */}
      {profile?.role === 'admin' && (
        <div className="mt-16">
          <div className="flex items-center gap-3 mb-8 border-b border-[#141414]/10 pb-4">
            <Users className="w-6 h-6" />
            <h2 className="text-2xl font-serif italic text-[#141414]">Access Management</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_350px] gap-12">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest opacity-50 mb-4">Authorized Users</p>
              <div className="bg-white border border-[#141414]/10 rounded-sm divide-y divide-gray-100">
                {allowedUserProfiles.map((p) => (
                  <div key={p.uid} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold">
                        {p.displayName?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{p.displayName}</p>
                        <p className="text-[10px] font-mono opacity-50">{p.email}</p>
                      </div>
                    </div>
                    {p.uid !== profile.uid && (
                      <button 
                        onClick={() => handleRemoveAccess(p.uid, p.email)}
                        className="text-red-600 hover:bg-red-50 p-2 rounded transition"
                        title="Revoke Access"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#141414] text-[#E4E3E0] p-8 rounded-sm shadow-xl">
              <h3 className="text-lg font-serif italic mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Invite Participant
              </h3>
              <p className="text-xs opacity-60 mb-6 leading-relaxed">
                Grant secure access to this data room. The user must have an existing account in VeriPura.
              </p>
              <form onSubmit={handleInviteUser} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest opacity-40 mb-2">Email Address</label>
                  <input 
                    type="email" 
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 p-3 rounded-sm focus:outline-none focus:border-white text-sm"
                    placeholder="colleague@example.com"
                    required
                  />
                </div>
                <button 
                  type="submit"
                  disabled={inviteLoading}
                  className="w-full bg-[#E4E3E0] text-[#141414] py-3 rounded-sm font-bold text-xs uppercase tracking-widest hover:bg-white transition disabled:opacity-50"
                >
                  {inviteLoading ? 'Processing...' : 'Grant Access'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ActivityView = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), where('timestamp', '!=', null));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));
      setLogs(logData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'activity_logs');
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="p-8 font-mono text-xs">RETRIEVING AUDIT TRAIL...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-12 border-b border-[#141414]/10 pb-6">
        <h1 className="text-4xl font-serif italic text-[#141414]">Audit Trail</h1>
        <p className="text-xs font-mono opacity-50 mt-2 uppercase tracking-widest">System Activity Log</p>
      </div>

      <div className="bg-white border border-[#141414]/10 rounded-sm overflow-hidden">
        <div className="grid grid-cols-[180px_150px_1fr] p-4 bg-gray-50 border-b border-[#141414]/10 text-[10px] font-mono uppercase tracking-widest opacity-50">
          <div>Timestamp</div>
          <div>Action</div>
          <div>Details</div>
        </div>
        
        <div className="divide-y divide-gray-100">
          {logs.map((log) => (
            <div key={log.id} className="grid grid-cols-[180px_150px_1fr] p-4 items-center hover:bg-gray-50 transition-colors">
              <div className="text-xs font-mono opacity-50">
                {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'Processing...'}
              </div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider">
                {log.action}
              </div>
              <div className="text-sm text-gray-600 truncate pr-4">
                {log.details}
              </div>
            </div>
          ))}
          
          {logs.length === 0 && (
            <div className="py-24 text-center">
              <Activity className="w-12 h-12 mx-auto opacity-10 mb-4" />
              <p className="font-mono text-xs opacity-30 uppercase tracking-widest">No activity recorded</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const UsersView = ({ currentProfile }: { currentProfile: UserProfile | null }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { notify, confirm } = useNotification();

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(userData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsubscribe();
  }, []);

  const toggleRole = async (targetUser: UserProfile) => {
    if (!currentProfile || currentProfile.role !== 'admin') return;
    if (targetUser.uid === currentProfile.uid) {
      notify("You cannot change your own role.", 'error');
      return;
    }

    const newRole = targetUser.role === 'admin' ? 'viewer' : 'admin';
    
    confirm('Change Role', `Are you sure you want to change ${targetUser.displayName}'s role to ${newRole}?`, async () => {
      try {
        await updateDoc(doc(db, 'users', targetUser.uid), {
          role: newRole
        });

        // Log activity
        await addDoc(collection(db, 'activity_logs'), {
          userId: currentProfile.uid,
          action: 'ROLE_CHANGED',
          details: `Changed role for ${targetUser.email} to ${newRole}`,
          timestamp: serverTimestamp()
        });

        notify(`Role updated for ${targetUser.displayName}`, 'success');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${targetUser.uid}`);
        notify('Failed to update role', 'error');
      }
    });
  };

  if (loading) return <div className="p-8 font-mono text-xs">LOADING TEAM...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-12 border-b border-[#141414]/10 pb-6">
        <Users className="w-8 h-8" />
        <div>
          <h1 className="text-4xl font-serif italic text-[#141414]">Team Management</h1>
          <p className="text-sm text-gray-500 mt-2">Manage user access levels and administrative rights.</p>
        </div>
      </div>

      <div className="bg-white border border-[#141414]/10 rounded-sm overflow-hidden">
        <div className="grid grid-cols-[1fr_200px_150px] p-4 bg-gray-50 border-b border-[#141414]/10 text-[10px] font-mono uppercase tracking-widest opacity-50">
          <div>User</div>
          <div>Role</div>
          <div className="text-right">Actions</div>
        </div>
        
        <div className="divide-y divide-gray-100">
          {users.map((u) => (
            <div key={u.uid} className="grid grid-cols-[1fr_200px_150px] p-4 items-center hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-[#141414]">
                  {u.displayName?.[0] || 'U'}
                </div>
                <div>
                  <p className="text-sm font-medium">{u.displayName}</p>
                  <p className="text-[10px] font-mono opacity-50">{u.email}</p>
                </div>
              </div>
              <div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest ${
                  u.role === 'admin' ? 'bg-[#141414] text-[#E4E3E0]' : 'bg-gray-100 text-gray-600'
                }`}>
                  {u.role}
                </span>
              </div>
              <div className="text-right">
                {u.uid !== currentProfile?.uid && (
                  <button 
                    onClick={() => toggleRole(u)}
                    className="text-[10px] font-mono uppercase tracking-widest border border-[#141414]/10 px-3 py-1 rounded-sm hover:bg-[#141414] hover:text-[#E4E3E0] transition"
                  >
                    Change Role
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Notification state
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  
  // Confirmation modal state
  const [confirmState, setConfirmState] = useState<{ 
    isOpen: boolean, 
    title: string, 
    message: string, 
    onConfirm: () => void 
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
  };

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  useEffect(() => {
    console.log("VeriPura VDR v1.0.6 Initialized");
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Check/Create Profile
        const profileRef = doc(db, 'users', currentUser.uid);
        const profileSnap = await getDoc(profileRef);
        
        if (profileSnap.exists()) {
          setProfile(profileSnap.data() as UserProfile);
        } else {
          // Bootstrap first admin
          const isAdmin = currentUser.email === 'thomas@veripura.com';
          const newProfile: UserProfile = {
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || 'User',
            role: isAdmin ? 'admin' : 'viewer',
            createdAt: serverTimestamp()
          };
          await setDoc(profileRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto animate-pulse mb-4" />
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-40">VeriPura Security Layer Initializing</p>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <ErrorBoundary>
      <NotificationContext.Provider value={{ notify, confirm: confirmAction }}>
        <Router>
          <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans">
            <Navbar user={user} profile={profile} />
            <div className="flex">
              <Sidebar user={user} profile={profile} />
              <main className="flex-1 min-h-[calc(100vh-64px)]">
                <Routes>
                  <Route path="/" element={<Dashboard profile={profile} />} />
                  <Route path="/room/:roomId" element={<RoomView profile={profile} />} />
                  <Route path="/activity" element={<ActivityView />} />
                  <Route path="/users" element={(profile?.role === 'admin' || user?.email === 'thomas@veripura.com') ? <UsersView currentProfile={profile} /> : <Dashboard profile={profile} />} />
                </Routes>
              </main>
            </div>
          </div>
        </Router>

        <AnimatePresence>
          {notification && (
            <Notification 
              message={notification.message} 
              type={notification.type} 
              onClose={() => setNotification(null)} 
            />
          )}
        </AnimatePresence>

        <ConfirmationModal 
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        />
      </NotificationContext.Provider>
    </ErrorBoundary>
  );
}

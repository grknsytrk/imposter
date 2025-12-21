import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGameStore } from './store/useGameStore';
import { useAuthStore } from './store/useAuthStore';
import { useGameSound } from './hooks/useGameSound';
import { Button } from './components/ui/button';
import { Portal } from './components/Portal';
import { RoundTable } from './components/RoundTable';
import { ThemeToggle } from './components/ThemeToggle';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { RoleReveal } from './components/RoleReveal';
import { AmbientFireworks } from './components/AmbientFireworks';
import {
  Ghost,
  Cat,
  Dog,
  Zap,
  Star,
  Heart,
  Music,
  Smile,
  Lock,
  X,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  CircleDashed,
  Users,
  Gamepad2,
  MessageSquare,
  Send,
  Swords,
  ArrowRight,
  Copy,
  Check,
  Vote,
  Trophy,
  Skull,
  Lightbulb,
  RotateCcw,
  SearchX,
  UserSearch,
  LogOut,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CATEGORIES } from '@imposter/shared';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isConnected, createRoom, joinRoom, startGame, leaveRoom, sendMessage, submitHint, submitVote, playAgain, room, player, rooms, refreshRooms, messages, toast, clearToast, gameState, disconnect } = useGameStore();
  const { signOut } = useAuthStore();
  const { t, i18n } = useTranslation();
  const { t: tGame } = useTranslation('game');
  const { playTone } = useGameSound();
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [roomIdInput, setRoomIdInput] = useState('');
  const [chatInput, setChatInput] = useState('');

  // FRIENDLY PARTY AVATARS
  const AVATARS = [
    { id: 'ghost', icon: Ghost, label: 'The Ghost' },
    { id: 'cat', icon: Cat, label: 'The Cat' },
    { id: 'dog', icon: Dog, label: 'The Dog' },
    { id: 'star', icon: Star, label: 'The Star' },
    { id: 'zap', icon: Zap, label: 'The Spark' },
    { id: 'heart', icon: Heart, label: 'The Heart' },
    { id: 'music', icon: Music, label: 'The Vibe' },
    { id: 'smile', icon: Smile, label: 'The Friend' },
  ];

  const STATUSES = [
    { id: 'online', label: 'ACTIVE', color: 'bg-emerald-500' },
    { id: 'idle', label: 'STANDBY', color: 'bg-amber-500' },
    { id: 'dnd', label: 'BUSY', color: 'bg-rose-500' },
    { id: 'invisible', label: 'OFF-GRID', color: 'bg-slate-500' },
  ];

  const CurrentAvatarIcon = AVATARS[avatarIndex].icon;

  const nextAvatar = () => setAvatarIndex((prev) => (prev + 1) % AVATARS.length);
  const prevAvatar = () => setAvatarIndex((prev) => (prev - 1 + AVATARS.length) % AVATARS.length);

  // Profile Modal State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  // Chat Widget State
  const [isChatOpen, setIsChatOpen] = useState(false);
  // Create Room Modal State
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(''); // Boş = rastgele
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  // Rules Modal State
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  // Status state
  const [statusIndex, setStatusIndex] = useState(0);
  const [customStatus, setCustomStatus] = useState('');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  // Join Password Modal State
  const [joinPasswordModal, setJoinPasswordModal] = useState<{ roomId: string; roomName: string } | null>(null);
  const [modalPasswordInput, setModalPasswordInput] = useState('');
  const [refreshRotation, setRefreshRotation] = useState(0);
  const [copiedRoomId, setCopiedRoomId] = useState(false);
  const [hintInput, setHintInput] = useState('');
  const [selectedVote, setSelectedVote] = useState<string | null>(null);

  // Pending room ID for direct link access
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(() => {
    const match = window.location.pathname.match(/^\/room\/([A-Z0-9]+)$/i);
    return match ? match[1].toUpperCase() : null;
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const categoryButtonRef = useRef<HTMLDivElement>(null);

  const [lastReadIndex, setLastReadIndex] = useState(0);

  const unreadCount = useMemo(() => {
    if (isChatOpen) return 0;
    const newMessages = messages.slice(lastReadIndex);
    return newMessages.filter(m => m.playerId !== player?.id).length;
  }, [messages, lastReadIndex, isChatOpen, player?.id]);

  useEffect(() => {
    if (isChatOpen) {
      setLastReadIndex(messages.length);
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isChatOpen, messages.length]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close category dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isCategoryOpen && categoryButtonRef.current && !categoryButtonRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCategoryOpen]);



  const handleSendMessage = () => {
    if (chatInput.trim()) {
      sendMessage(chatInput.trim());
      setChatInput('');
    }
  };

  useEffect(() => {
    if (isConnected && !room) {
      const interval = setInterval(refreshRooms, 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected, room, refreshRooms]);

  // URL Sync based on state
  useEffect(() => {
    if (!isConnected) {
      if (!pendingRoomId && location.pathname !== '/') {
        navigate('/', { replace: true });
      } else if (pendingRoomId && location.pathname !== '/') {
        navigate('/', { replace: true });
      }
    } else if (room) {
      const roomPath = `/room/${room.id}`;
      if (location.pathname !== roomPath) navigate(roomPath, { replace: true });
      if (pendingRoomId) setPendingRoomId(null);
    } else {
      if (pendingRoomId) {
        if (rooms.length === 0) return;

        const targetRoom = rooms.find((r: any) => r.id === pendingRoomId);
        if (targetRoom?.hasPassword) {
          setJoinPasswordModal({ roomId: pendingRoomId, roomName: targetRoom.name || pendingRoomId });
          setPendingRoomId(null);
        } else if (targetRoom) {
          joinRoom(pendingRoomId);
          setPendingRoomId(null);
        } else {
          joinRoom(pendingRoomId);
          setPendingRoomId(null);
        }
      } else if (location.pathname !== '/lobby') {
        navigate('/lobby', { replace: true });
      }
    }
  }, [isConnected, room, navigate, location.pathname, pendingRoomId, joinRoom, rooms]);

  const introVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    },
    exit: { opacity: 0, filter: "blur(10px)", transition: { duration: 0.5 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 24 }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative font-sans text-foreground">
      {/* Background gradient driven by CSS variables - changes with theme */}
      <div
        className="fixed inset-0 -z-20 transition-all duration-500"
        style={{
          background: `radial-gradient(circle at center, hsl(var(--gradient-start)) 0%, hsl(var(--gradient-end)) 100%)`
        }}
      />

      {/* Dynamic Ambient Fireworks */}
      <AmbientFireworks />



      <AnimatePresence mode="wait">
        {/* When App renders, user should already be connected via main.tsx */}
        {!isConnected ? (
          // Fallback - shouldn't normally reach here since main.tsx handles connection
          <motion.div
            key="fallback-loading"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-4"
          >
            <motion.div
              animate={{
                y: [0, -10, 0],
                // scale: [1, 1.1, 1],
                filter: ["brightness(1)", "brightness(1.2)", "brightness(1)"]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl border-4 border-white/20 relative"
            >
              <Ghost className="w-12 h-12 text-white drop-shadow-md" />
              <div className="absolute -bottom-2 w-16 h-4 bg-black/30 blur-md rounded-full" />
            </motion.div>
            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-white font-heading font-black uppercase tracking-[0.2em] text-lg text-shadow-sm"
            >
              {t('app.connecting')}...
            </motion.p>
          </motion.div>
        ) : !room ? (
          <motion.div
            key="lobby"
            variants={introVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-6xl z-10 grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* HEADER */}
            <motion.header variants={itemVariants} className="lg:col-span-12 flex flex-col md:flex-row justify-between items-center pb-6 mb-4 gap-6 relative z-[100]">
              {/* LEFT: BRANDING */}
              <div className="flex items-center gap-5 self-start md:self-auto">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-700 dark:from-violet-600 dark:to-purple-800 rounded-3xl flex items-center justify-center shadow-lg shadow-purple-900/30 rotate-[-3deg] border-4 border-white/20 backdrop-blur-md relative overflow-hidden group hover:rotate-0 transition-transform duration-500">
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  <UserSearch className="w-9 h-9 text-white drop-shadow-md relative z-10" />
                </div>
                <div>
                  <h2 className="text-5xl font-heading font-black text-white tracking-wide drop-shadow-md stroke-black leading-none">
                    AMONG <span className="text-primary">LIES</span>
                  </h2>
                  <div className="flex items-center gap-2 bg-purple-900/30 dark:bg-violet-900/40 backdrop-blur-md px-4 py-1.5 rounded-full w-fit mt-1 border border-white/10">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
                    <span className="text-white/90 text-[10px] font-bold uppercase tracking-widest pl-1">{t('app.tagline')}</span>
                  </div>
                </div>
              </div>

              {/* RIGHT: PROFILE & CONTROLS */}
              <div className="flex items-center gap-4 self-end md:self-auto">

                {/* PROFILE CAPSULE */}
                <div className="relative group z-50">
                  <div
                    className="flex items-center gap-3 pl-2 pr-6 py-2 bg-black/20 backdrop-blur-xl border border-white/10 rounded-full cursor-pointer hover:bg-black/30 transition-all select-none"
                    onClick={() => { playTone('click'); setIsProfileOpen(true); }}
                    onMouseEnter={() => playTone('hover')}
                  >
                    {/* Avatar Ring */}
                    <div className="relative">
                      <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center border-2 border-indigo-400/30 overflow-hidden">
                        <CurrentAvatarIcon className="w-6 h-6 text-indigo-200" />
                      </div>
                      {/* Status Indicator */}
                      <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-black rounded-full ${STATUSES[statusIndex].color} shadow-sm`} />
                    </div>

                    <div className="flex flex-col">
                      <span className="text-xs font-black text-white tracking-wide uppercase leading-none mb-0.5 max-w-[100px] truncate">{player?.name}</span>
                      <div className="flex items-center gap-1.5" onClick={(e) => { e.stopPropagation(); setIsStatusDropdownOpen(!isStatusDropdownOpen); }}>
                        <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider hover:text-white transition-colors">
                          {customStatus || STATUSES[statusIndex].label}
                        </span>
                        <ChevronRight className={`w-3 h-3 text-white/30 transition-transform ${isStatusDropdownOpen ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  </div>

                  {/* Status Dropdown (Floating) */}
                  <AnimatePresence>
                    {isStatusDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsStatusDropdownOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute top-full right-0 mt-3 w-56 bg-card border-2 border-border rounded-2xl z-50 p-2 shadow-2xl origin-top-right"
                        >
                          {STATUSES.map((status, idx) => (
                            <button
                              key={status.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setStatusIndex(idx);
                                setIsStatusDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-3 rounded-xl hover:bg-muted flex items-center justify-between transition-colors group"
                            >
                              <span className="text-xs font-bold uppercase text-muted-foreground group-hover:text-primary transition-colors">{status.label}</span>
                              <div className={`w-2 h-2 rounded-full ${status.color}`} />
                            </button>
                          ))}
                          <input
                            className="w-full bg-muted/50 border-2 border-border rounded-xl mt-2 px-4 py-2 text-xs font-bold text-card-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                            placeholder="CUSTOM STATUS..."
                            value={customStatus}
                            onClick={(e) => e.stopPropagation()}
                            onChange={e => setCustomStatus(e.target.value)}
                          />
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Unified Control Bar */}
                <div className="flex items-center p-1.5 bg-black/20 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl">
                  {/* Rules */}
                  <button
                    onClick={() => setIsRulesOpen(true)}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all"
                    title="How to Play"
                  >
                    <BookOpen className="w-5 h-5" />
                  </button>

                  {/* Vertical Divider */}
                  <div className="w-px h-4 bg-white/10 mx-1" />

                  {/* Settings Group */}
                  <div className="flex items-center gap-1">
                    <LanguageSwitcher />
                    <ThemeToggle />
                  </div>

                  {/* Vertical Divider */}
                  <div className="w-px h-4 bg-white/10 mx-1" />

                  {/* Logout - Danger Action */}
                  <button
                    onClick={() => {
                      disconnect();
                      signOut();
                    }}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.header>

            {/* LEFT COLUMN - ACTIONS */}
            <motion.div variants={itemVariants} className="lg:col-span-4 space-y-6">
              <div className="premium-card p-6 flex flex-col gap-6">
                <div className="flex items-center gap-2 mb-1">
                  <Swords className="w-6 h-6 text-card-foreground" />
                  <span className="font-heading font-black text-xl text-card-foreground tracking-wide uppercase">{t('matchmaking.title')}</span>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}

                  onMouseEnter={() => playTone('hover')}
                  onClick={() => { playTone('click'); setIsCreateRoomOpen(true); }}
                  className="group relative w-full h-32 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-3xl border-b-8 border-yellow-700 active:border-b-0 transition-all shadow-xl flex flex-col items-center justify-center overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
                  <span className="font-heading font-black text-3xl text-yellow-900 tracking-wider uppercase drop-shadow-sm flex items-center gap-2">
                    {t('matchmaking.hostGame')}
                  </span>
                  <span className="text-[10px] font-black text-yellow-900/60 uppercase tracking-widest mt-1">{t('matchmaking.createNewRoom')}</span>
                </motion.button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t-2 border-border"></div>
                  <span className="flex-shrink-0 mx-4 text-xs font-black text-muted-foreground/50 uppercase tracking-widest">{t('matchmaking.orJoin')}</span>
                  <div className="flex-grow border-t-2 border-border"></div>
                </div>

                <div className="bg-muted/50 p-4 rounded-2xl border-2 border-border relative group focus-within:border-primary focus-within:bg-card transition-all">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2 group-focus-within:text-primary transition-colors">{t('matchmaking.enterRoomCode')}</label>
                  <div className="flex gap-2">
                    <input
                      value={roomIdInput}
                      onChange={e => setRoomIdInput(e.target.value.toUpperCase())}
                      placeholder={t('matchmaking.codePlaceholder')}
                      className="flex-1 bg-transparent font-heading font-black text-2xl text-foreground placeholder:text-muted-foreground/50 outline-none uppercase"
                    />
                    <button
                      disabled={!roomIdInput}
                      onClick={() => {
                        const target = rooms.find((r: any) => r.id === roomIdInput);
                        if (target?.hasPassword) setJoinPasswordModal({ roomId: roomIdInput, roomName: roomIdInput });
                        else joinRoom(roomIdInput);
                      }}
                      className="w-12 h-12 bg-primary rounded-xl border-b-4 border-yellow-600 flex items-center justify-center text-primary-foreground shadow-lg hover:scale-110 active:scale-95 active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:grayscale"
                    >
                      <ArrowRight className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* RIGHT COLUMN - ROOM LIST */}
            <motion.div variants={itemVariants} className="lg:col-span-8">
              <div className="premium-card flex flex-col">
                {/* Tool Bar */}
                <div className="border-b-2 border-border p-6 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                      <Users className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <span className="font-heading text-lg font-black text-card-foreground uppercase">{t('arenas.title')}</span>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{rooms.length} {t('arenas.activeGames')}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      playTone('click');
                      setRefreshRotation(p => p - 360);
                      refreshRooms();
                    }}
                    onMouseEnter={() => playTone('hover')}
                    className="group relative p-3 overflow-hidden rounded-xl transition-all hover:scale-105 active:scale-95"
                  >
                    <div className="absolute inset-0 bg-muted/40 backdrop-blur-sm border-2 border-border rounded-xl group-hover:bg-primary/20 group-hover:border-primary/30 transition-all" />
                    <div
                      className="relative z-10 text-muted-foreground group-hover:text-primary transition-transform duration-1000 ease-out drop-shadow-sm"
                      style={{ transform: `rotate(${refreshRotation}deg)` }}
                    >
                      <RotateCcw className="w-5 h-5" />
                    </div>
                  </button>
                </div>

                {/* List */}
                <div className="p-6 space-y-3 bg-muted/20">
                  {rooms.length === 0 ? (
                    <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground/30 space-y-6">
                      <div className="relative">
                        <motion.div
                          animate={{
                            scale: [1, 1.1, 1],
                            opacity: [0.3, 0.6, 0.3]
                          }}
                          transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"
                        />
                        <SearchX className="w-20 h-20 relative z-10 stroke-[1.5px]" />
                      </div>
                      <span className="text-base font-black tracking-[0.2em] uppercase opacity-60 text-center">{t('arenas.noRooms')}</span>
                    </div>
                  ) : (
                    rooms.map((r) => (
                      <motion.div
                        layout
                        key={r.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring" as const, stiffness: 500, damping: 30 }}
                        onClick={() => {
                          playTone('click');
                          if (r.hasPassword) setJoinPasswordModal({ roomId: r.id, roomName: r.name });
                          else joinRoom(r.id);
                        }}
                        onMouseEnter={() => playTone('hover')}
                        className="group bg-card border-b-4 border-muted hover:border-primary p-4 rounded-2xl cursor-pointer transition-all active:scale-[0.99] flex items-center justify-between relative"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${r.hasPassword ? 'bg-amber-100' : 'bg-blue-50'}`}>
                            {r.hasPassword ? <Lock className="w-6 h-6 text-amber-500" /> : <Gamepad2 className="w-6 h-6 text-primary" />}
                          </div>
                          <div>
                            <h3 className="text-lg font-heading font-black text-card-foreground group-hover:text-primary transition-colors bg-clip-text">{r.name || r.id}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-wider">{r.id}</span>
                              {r.hasPassword && <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-600 text-[10px] font-bold uppercase tracking-wider">{t('lobby.private')}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-lg font-black text-foreground tabular-nums">{r.playerCount} / {r.maxPlayers}</div>
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('arenas.players')}</div>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                            <ChevronRight className="w-5 h-5" />
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>

          </motion.div>
        ) : (
          <motion.div
            key="room"
            variants={introVariants}
            initial="hidden"
            animate="visible"
            className="w-full max-w-7xl z-10"
          >
            {/* ROOM INTERFACE */}
            <div className="premium-card flex flex-col shadow-2xl mt-8">
              {/* Yeni kompakt header */}
              <div className="p-6 border-b-2 border-border bg-card rounded-t-3xl">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  {/* Left: Arena Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center shadow-[0_4px_0_#b45309] border-2 border-yellow-200">
                      <Gamepad2 className="w-8 h-8 text-yellow-900" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-heading font-black text-card-foreground tracking-wide uppercase leading-none drop-shadow-sm">
                        {tGame('room.arena')} {room.id}
                      </h1>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">{tGame('room.code')}: {room.id}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(room.id);
                            setCopiedRoomId(true);
                            setTimeout(() => setCopiedRoomId(false), 2000);
                          }}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          {copiedRoomId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-3">
                    {/* Category Badge */}
                    <div className="badge-category badge-glow-amber">
                      <Lightbulb className="w-4 h-4" />
                      <span>
                        {room.selectedCategory ? t(`categories.${room.selectedCategory}`) : (gameState?.category ? t(`categories.${gameState.category}`) : t('lobby.random'))}
                      </span>
                    </div>

                    <div className={`${room.status === 'PLAYING' ? 'badge-danger badge-glow-rose' : 'badge-success badge-glow-emerald'}`}>
                      <div className={`w-2 h-2 rounded-full bg-current opacity-80 ${room.status !== 'PLAYING' ? 'animate-pulse' : ''}`} />
                      <span>
                        {room.status === 'PLAYING' ? tGame('room.playing') : tGame('room.open')}
                      </span>
                    </div>

                    <div className="badge-neutral">
                      <Users className="w-4 h-4 opacity-70" />
                      <span className="tabular-nums">
                        {room.players.length}<span className="opacity-50 mx-0.5">/</span>{room.maxPlayers}
                      </span>
                    </div>

                    <Button
                      onClick={leaveRoom}
                      variant="destructive"
                      className="w-9 h-9 p-0 rounded-full shadow-md hover:shadow-lg active:translate-y-0.5 active:shadow-none transition-all border-b-4 border-red-700 hover:bg-red-500"
                      title="Leave Room"
                    >
                      <X className="w-4 h-4" />
                    </Button>

                    <LanguageSwitcher />
                    <ThemeToggle />
                  </div>
                </div>

                {/* Info Bar (Category/Word) - Only show if playing */}
                {gameState && gameState.phase !== 'LOBBY' && (
                  <div className="mt-6 flex flex-col md:flex-row items-stretch border-2 border-border rounded-2xl overflow-hidden bg-muted/20">
                    <div className="flex-1 flex items-center gap-4 p-4 border-b-2 md:border-b-0 md:border-r-2 border-border bg-card">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <Lightbulb className="w-5 h-5 text-amber-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Category</span>
                        <span className="font-heading font-black text-lg text-card-foreground uppercase leading-none">{gameState.category}</span>
                      </div>
                    </div>

                    <div className="flex-1 flex items-center justify-center p-4 bg-card relative overflow-hidden">
                      <div className="flex flex-col relative z-10 text-center">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Word</span>
                        <span className={`font-heading font-black text-lg uppercase leading-none ${gameState.isImposter ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {gameState.isImposter ? 'UNKNOWN' : gameState.word}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* GAME CONTENT - Faza göre değişir */}
              {!gameState || gameState.phase === 'LOBBY' ? (
                <>
                  {/* LOBBY CONTENT */}
                  <div className="flex-1 p-12 bg-muted/10">
                    <div className="flex items-center gap-4 mb-8">
                      <span className="font-black text-muted-foreground uppercase tracking-widest text-sm">{tGame('room.players')}</span>
                      <div className="flex-1 h-[2px] bg-border" />
                      <span className="font-mono text-sm font-bold text-muted-foreground">{room.players.length} / {room.maxPlayers}</span>
                    </div>

                    {/* PLAYER GRID */}
                    <div className="flex-1 flex items-center justify-center p-8">
                      <RoundTable
                        players={room.players}
                        currentPlayerId={player?.id}
                        phase="LOBBY"
                        avatars={AVATARS}
                        centerContent={
                          <div className="flex flex-col items-center gap-3 text-center w-full max-w-[200px]">
                            {player?.id === room.ownerId ? (
                              <>
                                <Button
                                  onClick={() => startGame(i18n.language)}
                                  disabled={room.players.length < 3}
                                  className="w-full h-14 premium-button premium-button-primary text-lg shadow-xl"
                                >
                                  {t('buttons.start')}
                                </Button>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">
                                  {room.players.length < 3
                                    ? t('game:messages.needMorePlayers', { count: 3 - room.players.length })
                                    : tGame('messages.ready')}
                                </p>
                              </>
                            ) : (
                              <>
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center animate-spin-slow">
                                  <CircleDashed className="w-6 h-6 text-primary" />
                                </div>
                                <span className="text-xs font-black text-muted-foreground uppercase tracking-wide leading-tight">{tGame('messages.waitingForHost')}</span>
                              </>
                            )}
                            <div className="mt-1 text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground font-bold border border-border">
                              {room.players.length} / {room.maxPlayers} {tGame('room.ready')}
                            </div>
                          </div>
                        }
                      />
                    </div>
                  </div>
                </>
              ) : gameState.phase === 'ROLE_REVEAL' ? (
                /* ==================== ROLE REVEAL ==================== */
                <RoleReveal
                  role={gameState.isImposter ? 'IMPOSTER' : 'CITIZEN'}
                  word={gameState.word || undefined}
                  category={gameState.category}
                />
              ) : gameState.phase === 'HINT_ROUND' ? (
                /* ==================== HINT ROUND ==================== */
                <div className="flex-1 flex flex-col items-center justify-center bg-card min-h-[400px]">
                  <RoundTable
                    players={room.players}
                    currentPlayerId={player?.id}
                    phase="HINT_ROUND"
                    turnPlayerId={gameState.turnOrder[gameState.currentTurnIndex]}
                    hints={gameState.hints}
                    avatars={AVATARS}
                    centerContent={
                      <div className="flex flex-col items-center justify-center gap-2">
                        {/* Progress Timer */}
                        <div className="relative w-16 h-16">
                          <svg className="w-16 h-16 transform -rotate-90">
                            <circle
                              cx="32" cy="32" r="28"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="4"
                              className="text-muted/30"
                            />
                            <circle
                              cx="32" cy="32" r="28"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="4"
                              strokeLinecap="round"
                              className="text-primary transition-all duration-1000 ease-linear"
                              style={{
                                strokeDasharray: 2 * Math.PI * 28,
                                strokeDashoffset: 2 * Math.PI * 28 * (1 - ((gameState.turnTimeLeft || gameState.phaseTimeLeft) / 30))
                              }}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-lg font-heading font-black text-foreground tabular-nums">
                              {gameState.turnTimeLeft || gameState.phaseTimeLeft}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-black uppercase text-muted-foreground">
                          {gameState.turnOrder[gameState.currentTurnIndex] === player?.id ? "YOUR TURN" : "WAITING..."}
                        </span>
                      </div>
                    }
                  />

                  {/* Input for Hint if MY TURN - Overlay at bottom */}
                  {gameState.turnOrder[gameState.currentTurnIndex] === player?.id && (
                    <div className="fixed bottom-32 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50">
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="flex gap-2 shadow-2xl rounded-2xl bg-card p-2 border-2 border-border"
                      >
                        <input
                          value={hintInput}
                          onChange={e => setHintInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && hintInput.trim() && submitHint(hintInput)}
                          placeholder="Type your hint..."
                          className="flex-1 bg-transparent px-4 py-3 font-bold text-card-foreground outline-none uppercase placeholder:text-muted-foreground"
                          autoFocus
                        />
                        <Button
                          onClick={() => {
                            if (hintInput.trim()) {
                              submitHint(hintInput);
                              setHintInput('');
                            }
                          }}
                          disabled={!hintInput.trim()}
                          className="rounded-xl px-6 font-black uppercase tracking-wider"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    </div>
                  )}
                </div>
              ) : gameState.phase === 'DISCUSSION' ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-card min-h-[400px]">
                  <RoundTable
                    players={room.players}
                    currentPlayerId={player?.id}
                    phase="DISCUSSION"
                    hints={gameState.hints}
                    avatars={AVATARS}
                    centerContent={
                      <div className="flex flex-col items-center justify-center gap-2">
                        {/* Progress Timer */}
                        <div className="relative w-16 h-16">
                          <svg className="w-16 h-16 transform -rotate-90">
                            <circle
                              cx="32" cy="32" r="28"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="4"
                              className="text-muted/30"
                            />
                            <circle
                              cx="32" cy="32" r="28"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="4"
                              strokeLinecap="round"
                              className="text-purple-500 transition-all duration-1000 ease-linear"
                              style={{
                                strokeDasharray: 2 * Math.PI * 28,
                                strokeDashoffset: 2 * Math.PI * 28 * (1 - (gameState.phaseTimeLeft / 60))
                              }}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-lg font-heading font-black text-purple-600 tabular-nums">
                              {gameState.phaseTimeLeft}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-black uppercase text-purple-400">
                          DISCUSS!
                        </span>
                      </div>
                    }
                  />
                  <div className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-popover/90 backdrop-blur px-6 py-3 rounded-full border-2 border-border shadow-xl text-xs font-bold text-muted-foreground uppercase tracking-widest z-50">
                    Use chat to discuss
                  </div>
                </div>
              ) : gameState.phase === 'VOTING' ? (
                /* ==================== VOTE ==================== */
                <div className="flex-1 flex flex-col items-center justify-center bg-card min-h-[400px]">
                  <RoundTable
                    players={room.players}
                    currentPlayerId={player?.id}
                    phase="VOTING"
                    hints={gameState.hints}
                    avatars={AVATARS}
                    onVote={(pid) => {
                      // Allow changing selection until vote is confirmed
                      if (!gameState.votes[player?.id || '']) {
                        setSelectedVote(selectedVote === pid ? null : pid); // Toggle or select new
                      }
                    }}
                    votes={{ ...gameState.votes, ...(selectedVote ? { [player?.id || '']: selectedVote } : {}) }}
                    centerContent={
                      <div className="flex flex-col items-center justify-center gap-2">
                        {/* Progress Timer */}
                        <div className="relative w-16 h-16">
                          <svg className="w-16 h-16 transform -rotate-90">
                            <circle
                              cx="32" cy="32" r="28"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="4"
                              className="text-muted/30"
                            />
                            <circle
                              cx="32" cy="32" r="28"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="4"
                              strokeLinecap="round"
                              className="text-rose-500 transition-all duration-1000 ease-linear"
                              style={{
                                strokeDasharray: 2 * Math.PI * 28,
                                strokeDashoffset: 2 * Math.PI * 28 * (1 - (gameState.phaseTimeLeft / 30))
                              }}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            {gameState.votes[player?.id || ''] ? (
                              <CheckCircle className="w-6 h-6 text-emerald-500" />
                            ) : (
                              <span className="text-lg font-heading font-black text-rose-600 tabular-nums">
                                {gameState.phaseTimeLeft}
                              </span>
                            )}
                          </div>
                        </div>
                        {!gameState.votes[player?.id || ''] ? (
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black uppercase text-rose-400">VOTE NOW</span>
                            {selectedVote && (
                              <Button
                                variant="destructive"
                                size="sm"
                                className="mt-2 h-7 text-[10px]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  submitVote(selectedVote);
                                  setSelectedVote(null);
                                }}
                              >
                                CONFIRM
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-black uppercase text-emerald-500">VOTED</span>
                        )}
                      </div>
                    }
                  />
                  <div className="fixed bottom-32 left-1/2 -translate-x-1/2 text-center pointer-events-none">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest drop-shadow-sm">Tap a player to select</p>
                  </div>
                </div>
              ) : gameState.phase === 'VOTE_RESULT' ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-card min-h-[400px]">
                  <RoundTable
                    players={room.players}
                    currentPlayerId={player?.id}
                    phase="VOTE_RESULT"
                    hints={gameState.hints}
                    avatars={AVATARS}
                    votes={gameState.votes}
                    eliminatedPlayerId={gameState.eliminatedPlayerId}
                    centerContent={
                      <div className="flex flex-col items-center justify-center gap-2">
                        {gameState.eliminatedPlayerId ? (
                          <>
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                            >
                              <Skull className="w-8 h-8 text-rose-500" />
                            </motion.div>
                            <div className="text-center">
                              <span className="text-[10px] font-black uppercase text-rose-400 block">ELIMINATED</span>
                              <span className="text-sm font-heading font-black text-rose-600 uppercase">
                                {room.players.find(p => p.id === gameState.eliminatedPlayerId)?.name}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <span className="text-lg">🤷</span>
                            </div>
                            <span className="text-[10px] font-black uppercase text-muted-foreground">NO ONE ELIMINATED</span>
                          </>
                        )}
                        <span className="text-xs font-bold text-muted-foreground tabular-nums bg-muted px-2 py-0.5 rounded-full mt-1">
                          {gameState.phaseTimeLeft}s
                        </span>
                      </div>
                    }
                  />
                  <div className="fixed bottom-32 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 pointer-events-none z-[200]">
                    <div className="bg-popover/95 backdrop-blur-md p-4 rounded-2xl border-2 border-border shadow-2xl text-center">
                      <h4 className="text-[10px] font-black text-popover-foreground uppercase tracking-widest mb-2">VOTE BREAKDOWN</h4>
                      <div className="flex flex-wrap justify-center gap-2">
                        <span className="text-xs font-bold text-popover-foreground/70">Check the table for details</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : gameState.phase === 'GAME_OVER' ? (
                /* ==================== OYUN BİTTİ EKRANI ==================== */
                <div className="flex-1 p-12 flex flex-col items-center justify-center bg-card">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 15 }}
                    className="text-center space-y-8"
                  >
                    {/* Kazanan ikonu */}
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className={`w-32 h-32 mx-auto rounded-3xl flex items-center justify-center shadow-2xl ${gameState.winner === 'CITIZENS'
                        ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                        : 'bg-gradient-to-br from-rose-500 to-red-600'
                        }`}
                    >
                      <Trophy className="w-16 h-16 text-white" />
                    </motion.div>

                    {/* Kazanan */}
                    <div>
                      <h2 className={`text-5xl font-heading font-black tracking-wider uppercase ${gameState.winner === 'CITIZENS' ? 'text-emerald-600' : 'text-rose-500'
                        }`}>
                        {gameState.winner === 'CITIZENS' ? 'VATANDAŞLAR' : 'IMPOSTER'}
                      </h2>
                      <p className="text-2xl font-heading font-black text-muted-foreground mt-2">WON!</p>
                    </div>

                    {/* Imposter kimdi */}
                    {gameState.imposterId && (
                      <div className="bg-card rounded-2xl p-6 border-2 border-border max-w-sm mx-auto">
                        <span className="text-sm font-black text-muted-foreground uppercase tracking-widest">Imposter</span>
                        <div className="flex items-center justify-center gap-3 mt-3">
                          {(() => {
                            const imposter = room.players.find(p => p.id === gameState.imposterId);
                            const AvatarIcon = AVATARS.find(a => a.id === imposter?.avatar)?.icon || Ghost;
                            return (
                              <>
                                <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
                                  <AvatarIcon className="w-6 h-6 text-rose-600" />
                                </div>
                                <span className="text-xl font-heading font-black text-rose-600 uppercase">
                                  {imposter?.name}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                        <div className="mt-4 pt-4 border-t border-border">
                          <span className="text-xs text-muted-foreground font-bold">Word: </span>
                          <span className="font-heading font-black text-card-foreground">{gameState.category} - {gameState.word || '?'}</span>
                        </div>
                      </div>
                    )}

                    {/* Tekrar oyna */}
                    {player?.id === room.ownerId && (
                      <Button
                        onClick={playAgain}
                        className="h-16 px-12 text-lg"
                      >
                        <RotateCcw className="w-5 h-5 mr-2" />
                        PLAY AGAIN
                      </Button>
                    )}

                    {player?.id !== room.ownerId && (
                      <p className="text-muted-foreground font-bold">Waiting for host to start a new game...</p>
                    )}
                  </motion.div>
                </div>
              ) : null
              }
            </div >
          </motion.div >
        )}
      </AnimatePresence >

      {/* CREATE ROOM MODAL */}
      <AnimatePresence>
        {
          isCreateRoomOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
              onClick={() => { setIsCreateRoomOpen(false); setSelectedCategory(''); }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="premium-card bg-card p-10 w-full max-w-md shadow-2xl relative"
              >
                {/* Close Button */}
                <button
                  onClick={() => { setIsCreateRoomOpen(false); setSelectedCategory(''); }}
                  className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-xl bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-8">
                  <div className="w-2 h-8 bg-primary rounded-full" />
                  <h3 className="text-2xl font-heading font-black text-card-foreground tracking-wider uppercase stroke-black">{t('lobby.createRoom')}</h3>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black tracking-widest text-muted-foreground uppercase ml-1">{t('lobby.roomName')}</label>
                    </div>
                    <input
                      value={newRoomName}
                      onChange={e => setNewRoomName(e.target.value.toUpperCase())}
                      className="premium-input w-full uppercase text-lg"
                      placeholder="NAME..."
                      autoFocus
                    />
                  </div>

                  {/* Kategori Seçimi - Custom Dropdown with Portal */}
                  <div className="space-y-3">
                    <label className="text-xs font-black tracking-widest text-muted-foreground uppercase ml-1">{t('lobby.category')}</label>
                    <div className="relative" ref={categoryButtonRef}>
                      <button
                        type="button"
                        onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                        className="premium-input w-full text-lg text-left cursor-pointer pr-12 uppercase font-bold flex items-center justify-between"
                      >
                        <span>{selectedCategory ? t(`categories.${selectedCategory}`) : t('lobby.random')}</span>
                        <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isCategoryOpen ? '-rotate-90' : 'rotate-90'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 border-2 border-border rounded-2xl">
                    <span className="text-sm font-black text-card-foreground uppercase tracking-wide">{t('lobby.privateRoom')}</span>
                    <button
                      onClick={() => { playTone('click'); setIsPrivateRoom(!isPrivateRoom); }}
                      className={`h-8 w-14 border-4 transition-all flex items-center px-1 rounded-full ${isPrivateRoom ? 'border-primary bg-primary' : 'border-border bg-muted'}`}
                    >
                      <motion.div
                        animate={{ x: isPrivateRoom ? 24 : 0 }}
                        className={`w-4 h-4 rounded-full shadow-sm ${isPrivateRoom ? 'bg-white' : 'bg-white'}`}
                      />
                    </button>
                  </div>

                  <AnimatePresence>
                    {isPrivateRoom && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-visible"
                      >
                        <div className="pt-4 space-y-3">
                          <label className="text-xs font-black tracking-widest text-muted-foreground uppercase ml-1">{t('lobby.password')}</label>
                          <input
                            type="password"
                            value={newRoomPassword}
                            onChange={e => setNewRoomPassword(e.target.value)}
                            className="premium-input w-full tracking-widest"
                            placeholder="••••••••"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-4 pt-4">
                    <Button onClick={() => { setIsCreateRoomOpen(false); setSelectedCategory(''); }} variant="secondary" className="flex-1 h-16 shadow-lg">{t('buttons.cancel')}</Button>
                    <Button onClick={() => {
                      const finalName = newRoomName.trim() || `ROOM #${Math.floor(Math.random() * 9000) + 1000}`;
                      createRoom(finalName, isPrivateRoom ? newRoomPassword : undefined, selectedCategory || undefined);
                      setIsCreateRoomOpen(false);
                      setNewRoomName(''); setIsPrivateRoom(false); setNewRoomPassword(''); setSelectedCategory('');
                    }} variant="default" className="flex-1 h-16 shadow-lg">{t('buttons.create')}</Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )
        }
      </AnimatePresence >

      {/* PROFILE MODAL */}
      <AnimatePresence>
        {
          isProfileOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
              onClick={() => setIsProfileOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="premium-card bg-card p-8 w-full max-w-sm shadow-2xl relative"
              >
                {/* Close Button */}
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-xl bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center justify-center gap-3 mb-8">
                  <div className="w-2 h-8 bg-primary rounded-full" />
                  <h3 className="text-2xl font-heading font-black text-card-foreground tracking-wider uppercase">{t('profile.title')}</h3>
                </div>

                <div className="flex flex-col items-center gap-8">
                  <div className="w-28 h-28 border-4 border-primary/30 rounded-3xl flex items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-50 shadow-lg">
                    <CurrentAvatarIcon className="w-14 h-14 text-primary drop-shadow-md" />
                  </div>

                  <div className="flex items-center gap-4 w-full">
                    <button onClick={prevAvatar} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-muted hover:bg-primary border-b-4 border-border hover:border-yellow-600 text-muted-foreground hover:text-white transition-all active:border-b-0 active:translate-y-1">
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex-1 text-center bg-muted py-3 rounded-xl border-2 border-border">
                      <span className="font-heading font-black text-xl uppercase text-white">{AVATARS[avatarIndex].label}</span>
                    </div>
                    <button onClick={nextAvatar} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-muted hover:bg-primary border-b-4 border-border hover:border-yellow-600 text-muted-foreground hover:text-white transition-all active:border-b-0 active:translate-y-1">
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="w-full bg-muted p-4 rounded-2xl border-2 border-border">
                    <label className="text-[10px] font-black tracking-widest text-white/60 uppercase block mb-2">{t('profile.username')}</label>
                    <div className="text-2xl font-heading font-black text-white tracking-wide uppercase">
                      {player?.name}
                    </div>
                  </div>

                  <Button
                    onClick={() => setIsProfileOpen(false)}
                    variant="default"
                    className="w-full h-14 shadow-lg"
                  >
                    {t('buttons.done')}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )
        }
      </AnimatePresence >

      {/* PASSWORD MODAL */}
      <AnimatePresence>
        {
          joinPasswordModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-xl p-4"
            >
              <div className="premium-card bg-card p-10 w-full max-w-sm border-rose-500 border-4 shadow-xl">
                <div className="flex flex-col items-center gap-6 mb-10">
                  <div className="w-20 h-20 border-4 border-rose-100 rounded-3xl flex items-center justify-center bg-rose-50">
                    <Lock className="w-10 h-10 text-rose-500" />
                  </div>
                  <h3 className="text-2xl font-heading font-black text-rose-500 tracking-wider uppercase">{tGame('room.locked')}</h3>
                </div>

                <div className="space-y-6">
                  <input
                    type="password"
                    value={modalPasswordInput}
                    onChange={e => setModalPasswordInput(e.target.value)}
                    className="premium-input w-full text-center tracking-widest text-rose-500 border-rose-200 focus:border-rose-500"
                    placeholder={t('lobby.password')}
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && modalPasswordInput && (joinRoom(joinPasswordModal.roomId, modalPasswordInput), setJoinPasswordModal(null), setModalPasswordInput(''))}
                  />

                  <div className="flex gap-4">
                    <Button onClick={() => { setJoinPasswordModal(null); setModalPasswordInput(''); }} variant="secondary" className="flex-1 h-14 font-black">{t('buttons.cancel')}</Button>
                    <Button onClick={() => {
                      joinRoom(joinPasswordModal.roomId, modalPasswordInput);
                      setJoinPasswordModal(null);
                      setModalPasswordInput('');
                    }} variant="destructive" className="flex-1 h-14 font-black shadow-lg">{t('buttons.unlock')}</Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        }
      </AnimatePresence >

      {/* Toast Notification */}
      <AnimatePresence>
        {
          toast && (
            <motion.div
              initial={{ opacity: 0, y: 30, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 20, x: '-50%', transition: { duration: 0.2 } }}
              className={`fixed bottom-12 left-1/2 z-[100] px-8 py-5 border-4 rounded-2xl shadow-2xl flex items-center gap-6 min-w-[320px] bg-card ${toast.type === 'error'
                ? 'border-rose-500 text-rose-500'
                : toast.type === 'success'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-border text-muted-foreground'
                }`}
            >
              <div className="flex-shrink-0">
                {toast.type === 'error' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : toast.type === 'success' ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <AlertCircle className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-black opacity-40 block mb-1 uppercase tracking-widest">{toast.type}_LOG</span>
                <span className="text-sm font-bold uppercase tracking-wide">{toast.message}</span>
              </div>
              <button onClick={clearToast} className="p-2 hover:bg-muted rounded-full transition-colors opacity-50 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )
        }
      </AnimatePresence >

      {/* CHAT WIDGET - Portal ile body'ye taşındı, her zaman sağ altta sabit kalır */}
      < Portal >
        <AnimatePresence>
          {room && isChatOpen && (
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="fixed right-4 bottom-24 w-[350px] h-[450px] bg-card rounded-2xl shadow-2xl z-[9999] flex flex-col overflow-hidden border-4 border-border"
            >
              <div className="p-4 border-b-2 border-primary/30 flex justify-between items-center bg-primary">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]" />
                  <span className="font-heading font-black text-primary-foreground uppercase tracking-wide">{t('chat.title')}</span>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-primary-foreground/20 rounded-xl text-primary-foreground hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-card">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 space-y-2">
                    <MessageSquare className="w-12 h-12 text-muted-foreground" />
                    <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">{t('chat.noMessages')}</span>
                  </div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex flex-col ${m.playerId === player?.id ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] px-4 py-3 rounded-2xl border-2 shadow-sm ${m.playerId === player?.id
                      ? 'bg-primary text-primary-foreground border-primary rounded-br-none'
                      : 'bg-muted text-card-foreground border-border rounded-bl-none'}`}>
                      <p className="text-sm font-bold leading-snug break-words">{m.content}</p>
                    </div>
                    <span className="text-[9px] font-black text-foreground/60 mt-1 uppercase tracking-wider mx-1">{m.playerName}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 border-t-2 border-border bg-muted">
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 bg-card border-4 border-border rounded-xl px-4 py-2 font-bold text-card-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:scale-[1.02] transition-all shadow-inner"
                    placeholder={t('chat.placeholder')}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim()}
                    size="icon"
                    className="h-12 w-12 bg-primary text-primary-foreground rounded-xl shadow-lg hover:bg-primary/90"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal >

      {/* RULES MODAL */}
      <AnimatePresence>
        {isRulesOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setIsRulesOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="premium-card bg-card p-6 w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-heading font-black text-card-foreground uppercase">{tGame('rules.title')}</h2>
                </div>
                <button
                  onClick={() => setIsRulesOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-6 text-card-foreground">
                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <Gamepad2 className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-lg text-card-foreground">{tGame('rules.theGame')}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {tGame('rules.gameDesc').split('<imposter>').map((part, i) => {
                      if (i === 0) return part;
                      const [imposterText, rest] = part.split('</imposter>');
                      return (
                        <span key={i}>
                          <span className="text-rose-500 font-bold">{imposterText}</span>
                          {rest?.split('<citizen>').map((citizenPart, j) => {
                            if (j === 0) return citizenPart;
                            const [citizenText, remaining] = citizenPart.split('</citizen>');
                            return (
                              <span key={j}>
                                <span className="text-emerald-500 font-bold">{citizenText}</span>
                                {remaining}
                              </span>
                            );
                          })}
                        </span>
                      );
                    })}
                  </p>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-5 h-5 text-amber-500" />
                    <h3 className="font-bold text-lg text-card-foreground">{tGame('rules.hintRound')}</h3>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                    {(tGame('rules.hintRules', { returnObjects: true }) as string[]).map((rule, i) => (
                      <li key={i} dangerouslySetInnerHTML={{ __html: rule.replace('<bold>', '<span class="font-bold">').replace('</bold>', '</span>') }} />
                    ))}
                  </ul>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-5 h-5 text-purple-500" />
                    <h3 className="font-bold text-lg text-card-foreground">{tGame('rules.discussion')}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {tGame('rules.discussionDesc')}
                  </p>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <Vote className="w-5 h-5 text-rose-500" />
                    <h3 className="font-bold text-lg text-card-foreground">{tGame('rules.voting')}</h3>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                    {(tGame('rules.votingRules', { returnObjects: true }) as string[]).map((rule, i) => (
                      <li key={i} dangerouslySetInnerHTML={{
                        __html: rule
                          .replace('<citizen>', '<span class="text-emerald-500 font-bold">')
                          .replace('</citizen>', '</span>')
                          .replace('<imposter>', '<span class="text-rose-500 font-bold">')
                          .replace('</imposter>', '</span>')
                      }} />
                    ))}
                  </ul>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <h3 className="font-bold text-lg text-card-foreground">{tGame('rules.tips')}</h3>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                    {(tGame('rules.tipsList', { returnObjects: true }) as string[]).map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </section>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-border">
                <Button
                  onClick={() => setIsRulesOpen(false)}
                  className="w-full h-12 font-heading font-black uppercase tracking-wider"
                >
                  {tGame('rules.gotIt')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHAT TOGGLE - Portal ile body'ye taşındı */}
      <Portal>
        {
          room && !isChatOpen && (
            <button
              onClick={() => setIsChatOpen(true)}
              className="fixed right-6 bottom-6 w-16 h-16 bg-card border-4 border-border rounded-2xl shadow-xl flex items-center justify-center transition-all z-[9998] group hover:scale-110 active:scale-95 hover:border-primary"
            >
              <MessageSquare className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
              {unreadCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="absolute -top-3 -right-3 min-w-[28px] h-7 bg-rose-500 text-white text-sm font-black flex items-center justify-center border-4 border-white rounded-full shadow-lg"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </motion.div>
              )}
            </button>
          )
        }
      </Portal >

      {/* CATEGORY DROPDOWN - Portal ile body'ye taşındı, modal dışına taşar */}
      <Portal>
        <AnimatePresence>
          {isCategoryOpen && categoryButtonRef.current && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed',
                top: categoryButtonRef.current.getBoundingClientRect().bottom + 8,
                left: categoryButtonRef.current.getBoundingClientRect().left,
                width: categoryButtonRef.current.getBoundingClientRect().width,
              }}
              className="bg-card border-4 border-border rounded-2xl shadow-2xl overflow-hidden z-[99999] max-h-[300px] overflow-y-auto custom-scrollbar"
            >
              <button
                type="button"
                onClick={() => { setSelectedCategory(''); setIsCategoryOpen(false); }}
                className={`w-full px-4 py-3 text-left text-sm font-black uppercase tracking-wide hover:bg-muted transition-colors flex items-center gap-3 ${selectedCategory === '' ? 'bg-primary/20 text-primary' : 'text-card-foreground'}`}
              >
                <Lightbulb className="w-4 h-4" />
                {t('lobby.random')}
                {selectedCategory === '' && <Check className="w-4 h-4 ml-auto" />}
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => { setSelectedCategory(cat.name); setIsCategoryOpen(false); }}
                  className={`w-full px-4 py-3 text-left text-sm font-black uppercase tracking-wide hover:bg-muted transition-colors flex items-center gap-3 ${selectedCategory === cat.name ? 'bg-primary/20 text-primary' : 'text-card-foreground'}`}
                >
                  <span className="w-2 h-2 rounded-full bg-primary/50" />
                  {t(`categories.${cat.name}`)}
                  {selectedCategory === cat.name && <Check className="w-4 h-4 ml-auto" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>

    </div >
  );
}

export default App;

import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGameStore } from './store/useGameStore';
import { Button } from './components/ui/button';
import { Portal } from './components/Portal';
import { RoundTable } from './components/RoundTable';
import { RoleReveal } from './components/RoleReveal';
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
  Clock,
  Vote,
  Trophy,
  Skull,
  Timer,
  Lightbulb,
  RotateCcw,
  Anchor
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CATEGORIES } from '@imposter/shared';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { connect, isConnected, createRoom, joinRoom, startGame, leaveRoom, sendMessage, submitHint, submitVote, playAgain, room, player, rooms, refreshRooms, messages, toast, clearToast, gameState } = useGameStore();
  const [name, setName] = useState('');
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



  const handleSendMessage = () => {
    if (chatInput.trim()) {
      sendMessage(chatInput.trim());
      setChatInput('');
    }
  };

  const handleConnect = () => {
    if (name.trim()) connect(name.trim(), AVATARS[avatarIndex].id);
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

  const introVariants: any = {
    hidden: { opacity: 0, scale: 0.98 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.8, ease: "easeOut" }
    },
    exit: { opacity: 0, filter: "blur(10px)", transition: { duration: 0.5 } }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative font-sans text-foreground">
      <div className="fixed inset-0 bg-gradient-to-b from-blue-600 to-blue-800 -z-20" />



      <AnimatePresence mode="wait">
        {!isConnected ? (
          <motion.div
            key="landing"
            variants={introVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-md z-10"
          >
            {/* LOGIN CARD */}
            <div className="premium-card p-8">
              <div className="flex flex-col items-center mb-8">
                <div className="w-20 h-20 bg-card border-4 border-black/10 rounded-3xl rotate-3 shadow-xl flex items-center justify-center mb-4 relative overflow-hidden">
                  <div className="absolute inset-0 bg-primary/20" />
                  <Gamepad2 className="w-10 h-10 text-card-foreground relative z-10" />
                </div>
                <h1 className="text-4xl font-heading font-black text-card-foreground tracking-wide uppercase">
                  Imposter
                </h1>
                <div className="px-3 py-1 rounded-full bg-primary/10 mt-2">
                  <p className="font-heading text-xs text-primary font-black tracking-widest uppercase">
                    Party Game
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-subtle font-black tracking-widest text-slate-400 ml-1">YOUR IDENTITY</label>
                  <input
                    type="text"
                    placeholder="NICKNAME..."
                    className="premium-input w-full text-lg uppercase text-slate-800 text-center"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-subtle font-black tracking-widest text-slate-400 ml-1">YOUR CHARACTER</label>
                  <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-2 border-2 border-slate-200">
                    <button onClick={prevAvatar} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-sm text-slate-400 hover:text-primary transition-all">
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col items-center gap-1">
                      <CurrentAvatarIcon className="w-8 h-8 text-primary drop-shadow-sm" />
                      <span className="font-heading text-sm font-black text-slate-700 uppercase">{AVATARS[avatarIndex].label}</span>
                    </div>
                    <button onClick={nextAvatar} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-sm text-slate-400 hover:text-primary transition-all">
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handleConnect}
                  disabled={!name.trim()}
                  variant="default"
                  size="lg"
                  className="w-full text-lg shadow-lg mt-2"
                >
                  JOIN PARTY
                </Button>
              </div>
            </div>
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
            <header className="lg:col-span-12 flex flex-col md:flex-row justify-between items-center pb-6 mb-4 gap-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-900/20 rotate-[-3deg] border-4 border-white/20 backdrop-blur-md relative overflow-hidden group hover:rotate-0 transition-transform duration-500">
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  <Anchor className="w-9 h-9 text-white drop-shadow-md relative z-10" />
                </div>
                <div>
                  <h2 className="text-5xl font-heading font-black text-white tracking-wide drop-shadow-[0_4px_0_rgba(0,0,0,0.2)] stroke-black leading-none">
                    IMPOSTER <span className="text-cyan-200">HQ</span>
                  </h2>
                  <div className="flex items-center gap-2 bg-blue-900/30 backdrop-blur-md px-4 py-1.5 rounded-full w-fit mt-1 border border-white/10">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
                    <span className="text-white/90 text-[10px] font-bold uppercase tracking-widest pl-1">Ocean Terminal Online</span>
                  </div>
                </div>
              </div>

              {/* PROFILE CARD */}
              <div className="premium-card !p-2 flex items-center gap-4 cursor-pointer hover:scale-[1.02] transition-transform min-w-[240px]" onClick={() => setIsProfileOpen(true)}>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center border-2 border-blue-200">
                  <CurrentAvatarIcon className="w-8 h-8 text-primary" />
                </div>
                <div className="flex flex-col items-start pr-4">
                  <span className="text-sm font-black text-card-foreground tracking-wide uppercase">{player?.name}</span>
                  <div className="flex items-center gap-2" onClick={(e) => { e.stopPropagation(); setIsStatusDropdownOpen(!isStatusDropdownOpen); }}>
                    <div className={`w-2 h-2 rounded-full ${STATUSES[statusIndex].color}`} />
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      {customStatus || STATUSES[statusIndex].label}
                    </span>
                  </div>
                </div>

                {/* Status Dropdown */}
                <AnimatePresence>
                  {isStatusDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsStatusDropdownOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full right-0 mt-3 w-56 bg-white border-4 border-slate-200 rounded-2xl z-50 p-2 shadow-xl"
                      >
                        {STATUSES.map((status, idx) => (
                          <button
                            key={status.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatusIndex(idx);
                              setIsStatusDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-100 flex items-center justify-between transition-colors group"
                          >
                            <span className="text-xs font-bold uppercase text-slate-600 group-hover:text-slate-900">{status.label}</span>
                            <div className={`w-2 h-2 rounded-full ${status.color}`} />
                          </button>
                        ))}
                        <input
                          className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl mt-2 px-4 py-2 text-xs font-bold text-slate-700 placeholder:text-slate-400 outline-none focus:border-primary"
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
            </header>

            {/* LEFT COLUMN - ACTIONS */}
            <div className="lg:col-span-4 space-y-6">
              <div className="premium-card p-6 flex flex-col gap-6">
                <div className="flex items-center gap-2 mb-1">
                  <Swords className="w-6 h-6 text-slate-800" />
                  <span className="font-heading font-black text-xl text-slate-800 tracking-wide uppercase">Matchmaking</span>
                </div>

                <button
                  onClick={() => setIsCreateRoomOpen(true)}
                  className="group relative w-full h-32 bg-gradient-to-b from-yellow-400 to-yellow-500 rounded-3xl border-b-8 border-yellow-700 active:border-b-0 active:translate-y-2 transition-all shadow-xl flex flex-col items-center justify-center overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
                  <span className="font-heading font-black text-3xl text-yellow-900 tracking-wider uppercase drop-shadow-sm">Host Game</span>
                  <span className="text-[10px] font-black text-yellow-900/60 uppercase tracking-widest mt-1">Create New Room</span>
                </button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t-2 border-slate-200"></div>
                  <span className="flex-shrink-0 mx-4 text-xs font-black text-slate-300 uppercase tracking-widest">OR JOIN</span>
                  <div className="flex-grow border-t-2 border-slate-200"></div>
                </div>

                <div className="bg-slate-100 p-4 rounded-2xl border-2 border-slate-200 relative group focus-within:border-primary focus-within:bg-white transition-all">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 group-focus-within:text-primary transition-colors">Enter Room Code</label>
                  <div className="flex gap-2">
                    <input
                      value={roomIdInput}
                      onChange={e => setRoomIdInput(e.target.value.toUpperCase())}
                      placeholder="CODE..."
                      className="flex-1 bg-transparent font-heading font-black text-2xl text-slate-800 placeholder:text-slate-300 outline-none uppercase"
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
            </div>

            {/* RIGHT COLUMN - ROOM LIST */}
            <div className="lg:col-span-8">
              <div className="premium-card flex flex-col">
                {/* Tool Bar */}
                <div className="border-b-2 border-slate-100 p-6 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                      <Users className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <span className="font-heading text-lg font-black text-slate-800 uppercase">Public Arenas</span>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{rooms.length} ACTIVE GAMES</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setRefreshRotation(p => p + 360);
                      refreshRooms();
                    }}
                    className="group relative p-3 overflow-hidden rounded-xl transition-all hover:scale-105 active:scale-95"
                  >
                    <div className="absolute inset-0 bg-cyan-100/50 backdrop-blur-sm border-2 border-cyan-200 rounded-xl group-hover:bg-cyan-200/50 transition-colors" />
                    <div
                      className="relative z-10 text-cyan-700 transition-transform duration-1000 ease-out drop-shadow-sm"
                      style={{ transform: `rotate(${refreshRotation}deg)` }}
                    >
                      <RotateCcw className="w-5 h-5" />
                    </div>
                  </button>
                </div>

                {/* List */}
                <div className="p-6 space-y-3 bg-slate-50/50">
                  {rooms.length === 0 ? (
                    <div className="h-[400px] flex flex-col items-center justify-center text-slate-300 space-y-6">
                      <CircleDashed className="w-16 h-16 animate-spin-slow opacity-50" />
                      <span className="text-sm font-black tracking-widest uppercase">No Rooms Found</span>
                    </div>
                  ) : (
                    rooms.map((r, i) => (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.4 }}
                        onClick={() => {
                          if (r.hasPassword) setJoinPasswordModal({ roomId: r.id, roomName: r.name });
                          else joinRoom(r.id);
                        }}
                        className="group bg-white border-b-4 border-slate-200 hover:border-primary p-4 rounded-2xl cursor-pointer transition-all active:scale-[0.99] flex items-center justify-between relative"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${r.hasPassword ? 'bg-amber-100' : 'bg-blue-50'}`}>
                            {r.hasPassword ? <Lock className="w-6 h-6 text-amber-500" /> : <Gamepad2 className="w-6 h-6 text-primary" />}
                          </div>
                          <div>
                            <h3 className="text-lg font-heading font-black text-slate-800 group-hover:text-primary transition-colors bg-clip-text">{r.name || r.id}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">{r.id}</span>
                              {r.hasPassword && <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-600 text-[10px] font-bold uppercase tracking-wider">PRIVATE</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-lg font-black text-slate-700 tabular-nums">{r.playerCount} / {r.maxPlayers}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Players</div>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                            <ChevronRight className="w-5 h-5" />
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>

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
              <div className="p-6 border-b-2 border-slate-100 bg-white rounded-t-3xl">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  {/* Left: Arena Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center shadow-[0_4px_0_#b45309] border-2 border-yellow-200">
                      <Gamepad2 className="w-8 h-8 text-yellow-900" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-heading font-black text-slate-900 tracking-wide uppercase leading-none drop-shadow-sm">
                        ARENA {room.id}
                      </h1>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">CODE: {room.id}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(room.id);
                            setCopiedRoomId(true);
                            setTimeout(() => setCopiedRoomId(false), 2000);
                          }}
                          className="text-slate-300 hover:text-primary transition-colors"
                        >
                          {copiedRoomId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-3">
                    <div className={`px-4 py-1.5 rounded-full border-2 flex items-center gap-2 ${room.status === 'PLAYING'
                      ? 'bg-rose-50 border-rose-200 text-rose-500'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-500'
                      }`}>
                      <div className={`w-2 h-2 rounded-full bg-current ${room.status !== 'PLAYING' ? 'animate-pulse' : ''}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {room.status === 'PLAYING' ? 'PLAYING' : 'OPEN'}
                      </span>
                    </div>

                    <div className="px-4 py-1.5 rounded-full border-2 border-slate-200 bg-slate-50 text-slate-500 flex items-center gap-2">
                      <Users className="w-3 h-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest tabular-nums">
                        {room.players.length}/{room.maxPlayers}
                      </span>
                    </div>

                    <Button
                      onClick={leaveRoom}
                      variant="destructive"
                      className="px-6 rounded-full font-black uppercase tracking-widest text-[10px] h-9 shadow-md hover:shadow-lg active:translate-y-0.5 active:shadow-none transition-all border-b-4 border-red-700 hover:bg-red-500"
                    >
                      <X className="w-3 h-3 mr-2" />
                      LEAVE
                    </Button>
                  </div>
                </div>

                {/* Info Bar (Category/Word) - Only show if playing */}
                {gameState && gameState.phase !== 'LOBBY' && (
                  <div className="mt-6 flex flex-col md:flex-row items-stretch border-2 border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                    <div className="flex-1 flex items-center gap-4 p-4 border-b-2 md:border-b-0 md:border-r-2 border-slate-100 bg-white">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <Lightbulb className="w-5 h-5 text-amber-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</span>
                        <span className="font-heading font-black text-lg text-slate-800 uppercase leading-none">{gameState.category}</span>
                      </div>
                    </div>

                    <div className="flex-1 flex items-center justify-between p-4 bg-white relative overflow-hidden">
                      <div className="flex flex-col relative z-10">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Word</span>
                        <span className={`font-heading font-black text-lg uppercase leading-none ${gameState.isImposter ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {gameState.isImposter ? 'UNKNOWN' : gameState.word}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-blue-50 border-2 border-blue-100 text-blue-500 relative z-10">
                        <Timer className="w-4 h-4" />
                        <span className="font-black text-sm tabular-nums">{gameState.turnTimeLeft || gameState.phaseTimeLeft}s</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* GAME CONTENT - Faza göre değişir */}
              {!gameState || gameState.phase === 'LOBBY' ? (
                <>
                  {/* LOBBY CONTENT */}
                  <div className="flex-1 p-12 bg-slate-50/30">
                    <div className="flex items-center gap-4 mb-8">
                      <span className="font-black text-slate-400 uppercase tracking-widest text-sm">PLAYERS</span>
                      <div className="flex-1 h-[2px] bg-slate-200" />
                      <span className="font-mono text-sm font-bold text-slate-400">{room.players.length} / {room.maxPlayers}</span>
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
                                  onClick={startGame}
                                  disabled={room.players.length < 3}
                                  className="w-full h-14 premium-button premium-button-primary text-lg shadow-xl"
                                >
                                  START
                                </Button>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                                  {room.players.length < 3 ? "Need 3+ Players" : "Ready!"}
                                </p>
                              </>
                            ) : (
                              <>
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center animate-spin-slow">
                                  <CircleDashed className="w-6 h-6 text-primary" />
                                </div>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-wide leading-tight">Waiting for host...</span>
                              </>
                            )}
                            <div className="mt-1 text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-500 font-bold border border-slate-200">
                              {room.players.length} / {room.maxPlayers} Ready
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
                <div className="flex-1 flex flex-col items-center justify-center bg-white min-h-[400px]">
                  <RoundTable
                    players={room.players}
                    currentPlayerId={player?.id}
                    phase="HINT_ROUND"
                    turnPlayerId={gameState.turnOrder[gameState.currentTurnIndex]}
                    hints={gameState.hints}
                    avatars={AVATARS}
                    centerContent={
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Clock className="w-8 h-8 text-slate-300 animate-pulse" />
                        <span className="text-xl font-heading font-black text-slate-50 tabular-nums">
                          {gameState.phaseTimeLeft}s
                        </span>
                        <span className="text-[10px] font-black uppercase text-slate-400">
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
                        className="flex gap-2 shadow-2xl rounded-2xl bg-white p-2 border-2 border-slate-100"
                      >
                        <input
                          value={hintInput}
                          onChange={e => setHintInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && hintInput.trim() && submitHint(hintInput)}
                          placeholder="Type your hint..."
                          className="flex-1 bg-transparent px-4 py-3 font-bold text-slate-700 outline-none uppercase placeholder:text-slate-300"
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
                <div className="flex-1 flex flex-col items-center justify-center bg-white min-h-[400px]">
                  <RoundTable
                    players={room.players}
                    currentPlayerId={player?.id}
                    phase="DISCUSSION"
                    hints={gameState.hints}
                    avatars={AVATARS}
                    centerContent={
                      <div className="flex flex-col items-center justify-center gap-2">
                        <MessageSquare className="w-8 h-8 text-purple-500 animate-pulse" />
                        <span className="text-xl font-heading font-black text-purple-600 tabular-nums">
                          {gameState.phaseTimeLeft}s
                        </span>
                        <span className="text-[10px] font-black uppercase text-purple-400">
                          DISCUSS!
                        </span>
                      </div>
                    }
                  />
                  <div className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-6 py-3 rounded-full border-2 border-slate-100 shadow-xl text-xs font-bold text-slate-500 uppercase tracking-widest z-50">
                    Use chat to discuss
                  </div>
                </div>
              ) : gameState.phase === 'VOTING' ? (
                /* ==================== VOTE ==================== */
                <div className="flex-1 flex flex-col items-center justify-center bg-white min-h-[400px]">
                  <RoundTable
                    players={room.players}
                    currentPlayerId={player?.id}
                    phase="VOTING"
                    hints={gameState.hints}
                    avatars={AVATARS}
                    onVote={(pid) => {
                      if (!gameState.votes[player?.id || '']) {
                        setSelectedVote(pid);
                      }
                    }}
                    votes={{ ...gameState.votes, ...(selectedVote ? { [player?.id || '']: selectedVote } : {}) }}
                    centerContent={
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="flex items-center gap-2">
                          <motion.div
                            animate={{ rotate: [-10, 10, -10] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                          >
                            <Vote className="w-8 h-8 text-rose-500" />
                          </motion.div>
                          {gameState.votes[player?.id || ''] && <CheckCircle className="w-6 h-6 text-emerald-500" />}
                        </div>
                        <span className="text-xl font-heading font-black text-rose-600 tabular-nums">
                          {gameState.phaseTimeLeft}s
                        </span>
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
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest drop-shadow-sm">Tap a player to select</p>
                  </div>
                </div>
              ) : gameState.phase === 'VOTE_RESULT' ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-white min-h-[400px]">
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
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                              <span className="text-lg">🤷</span>
                            </div>
                            <span className="text-[10px] font-black uppercase text-slate-400">NO ONE ELIMINATED</span>
                          </>
                        )}
                        <span className="text-xs font-bold text-slate-400 tabular-nums bg-slate-100 px-2 py-0.5 rounded-full mt-1">
                          {gameState.phaseTimeLeft}s
                        </span>
                      </div>
                    }
                  />
                  <div className="fixed bottom-32 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 pointer-events-none">
                    <div className="bg-white/90 backdrop-blur p-4 rounded-2xl border-2 border-slate-100 shadow-xl text-center">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">VOTE BREAKDOWN</h4>
                      <div className="flex flex-wrap justify-center gap-2">
                        <span className="text-xs font-bold text-slate-500">Check the table for details</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : gameState.phase === 'GAME_OVER' ? (
                /* ==================== OYUN BİTTİ EKRANI ==================== */
                <div className="flex-1 p-12 flex flex-col items-center justify-center bg-gradient-to-b from-amber-50/50 to-white">
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
                      <p className="text-2xl font-heading font-black text-slate-400 mt-2">KAZANDI!</p>
                    </div>

                    {/* Imposter kimdi */}
                    {gameState.imposterId && (
                      <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 max-w-sm mx-auto">
                        <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Imposter</span>
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
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <span className="text-xs text-slate-400 font-bold">Kelime: </span>
                          <span className="font-heading font-black text-slate-700">{gameState.category} - {gameState.word || '?'}</span>
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
                      <p className="text-slate-400 font-bold">Waiting for host to start a new game...</p>
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
                  className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-500 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-8">
                  <div className="w-2 h-8 bg-primary rounded-full" />
                  <h3 className="text-2xl font-heading font-black text-slate-800 tracking-wider uppercase stroke-black">Create Room</h3>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black tracking-widest text-slate-400 uppercase ml-1">Room Name</label>
                    </div>
                    <input
                      value={newRoomName}
                      onChange={e => setNewRoomName(e.target.value.toUpperCase())}
                      className="premium-input w-full uppercase text-lg"
                      placeholder="NAME..."
                      autoFocus
                    />
                  </div>

                  {/* Kategori Seçimi - Dropdown */}
                  <div className="space-y-3">
                    <label className="text-xs font-black tracking-widest text-slate-400 uppercase ml-1">Category</label>
                    <div className="relative">
                      <select
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                        className="premium-input w-full text-lg appearance-none cursor-pointer pr-12 uppercase font-bold"
                      >
                        <option value="">Random</option>
                        {CATEGORIES.map((cat) => (
                          <option key={cat.name} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 rotate-90 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl">
                    <span className="text-sm font-black text-slate-600 uppercase tracking-wide">Private Room</span>
                    <button
                      onClick={() => setIsPrivateRoom(!isPrivateRoom)}
                      className={`h-8 w-14 border-4 transition-all flex items-center px-1 rounded-full ${isPrivateRoom ? 'border-primary bg-primary' : 'border-slate-300 bg-slate-200'}`}
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
                        className="overflow-hidden"
                      >
                        <div className="pt-2 space-y-3">
                          <label className="text-xs font-black tracking-widest text-slate-400 uppercase ml-1">Password</label>
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
                    <Button onClick={() => { setIsCreateRoomOpen(false); setSelectedCategory(''); }} variant="secondary" className="flex-1 h-16 shadow-lg">CANCEL</Button>
                    <Button onClick={() => {
                      const finalName = newRoomName.trim() || `ROOM #${Math.floor(Math.random() * 9000) + 1000}`;
                      createRoom(finalName, isPrivateRoom ? newRoomPassword : undefined, selectedCategory || undefined);
                      setIsCreateRoomOpen(false);
                      setNewRoomName(''); setIsPrivateRoom(false); setNewRoomPassword(''); setSelectedCategory('');
                    }} variant="default" className="flex-1 h-16 shadow-lg">CREATE</Button>
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
                className="premium-card bg-white p-8 w-full max-w-sm shadow-2xl relative"
              >
                {/* Close Button */}
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-500 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center justify-center gap-3 mb-8">
                  <div className="w-2 h-8 bg-primary rounded-full" />
                  <h3 className="text-2xl font-heading font-black text-slate-800 tracking-wider uppercase">Profile</h3>
                </div>

                <div className="flex flex-col items-center gap-8">
                  <div className="w-28 h-28 border-4 border-primary/30 rounded-3xl flex items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-50 shadow-lg">
                    <CurrentAvatarIcon className="w-14 h-14 text-primary drop-shadow-md" />
                  </div>

                  <div className="flex items-center gap-4 w-full">
                    <button onClick={prevAvatar} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-100 hover:bg-primary border-b-4 border-slate-200 hover:border-yellow-600 text-slate-500 hover:text-white transition-all active:border-b-0 active:translate-y-1">
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex-1 text-center bg-slate-50 py-3 rounded-xl border-2 border-slate-200">
                      <span className="font-heading font-black text-xl uppercase text-slate-700">{AVATARS[avatarIndex].label}</span>
                    </div>
                    <button onClick={nextAvatar} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-100 hover:bg-primary border-b-4 border-slate-200 hover:border-yellow-600 text-slate-500 hover:text-white transition-all active:border-b-0 active:translate-y-1">
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="w-full bg-slate-50 p-4 rounded-2xl border-2 border-slate-200">
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase block mb-2">Username</label>
                    <div className="text-2xl font-heading font-black text-slate-800 tracking-wide uppercase">
                      {player?.name}
                    </div>
                  </div>

                  <Button
                    onClick={() => setIsProfileOpen(false)}
                    variant="default"
                    className="w-full h-14 shadow-lg"
                  >
                    DONE
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
                  <h3 className="text-2xl font-heading font-black text-rose-500 tracking-wider uppercase">Room Locked</h3>
                </div>

                <div className="space-y-6">
                  <input
                    type="password"
                    value={modalPasswordInput}
                    onChange={e => setModalPasswordInput(e.target.value)}
                    className="premium-input w-full text-center tracking-widest text-rose-500 border-rose-200 focus:border-rose-500"
                    placeholder="PASSWORD"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && modalPasswordInput && (joinRoom(joinPasswordModal.roomId, modalPasswordInput), setJoinPasswordModal(null), setModalPasswordInput(''))}
                  />

                  <div className="flex gap-4">
                    <Button onClick={() => { setJoinPasswordModal(null); setModalPasswordInput(''); }} variant="secondary" className="flex-1 h-14 font-black">CANCEL</Button>
                    <Button onClick={() => {
                      joinRoom(joinPasswordModal.roomId, modalPasswordInput);
                      setJoinPasswordModal(null);
                      setModalPasswordInput('');
                    }} variant="destructive" className="flex-1 h-14 font-black shadow-lg">UNLOCK</Button>
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
              className={`fixed bottom-12 left-1/2 z-[100] px-8 py-5 border-4 rounded-2xl shadow-2xl flex items-center gap-6 min-w-[320px] bg-white ${toast.type === 'error'
                ? 'border-rose-500 text-rose-500'
                : toast.type === 'success'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-slate-300 text-slate-600'
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
              <button onClick={clearToast} className="p-2 hover:bg-slate-100 rounded-full transition-colors opacity-50 hover:opacity-100">
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
              className="fixed right-4 bottom-24 w-[350px] h-[450px] bg-white rounded-2xl shadow-2xl z-[9999] flex flex-col overflow-hidden border-4 border-slate-200"
            >
              <div className="p-4 border-b-2 border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]" />
                  <span className="font-heading font-black text-slate-800 uppercase tracking-wide">Party Chat</span>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-rose-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 space-y-2">
                    <MessageSquare className="w-12 h-12 text-slate-400" />
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">No messages yet</span>
                  </div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex flex-col ${m.playerId === player?.id ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] px-4 py-3 rounded-2xl border-2 shadow-sm ${m.playerId === player?.id
                      ? 'bg-primary text-primary-foreground border-primary rounded-br-none'
                      : 'bg-slate-100 text-slate-800 border-slate-200 rounded-bl-none'}`}>
                      <p className="text-sm font-bold leading-snug break-words">{m.content}</p>
                    </div>
                    <span className="text-[9px] font-black text-slate-300 mt-1 uppercase tracking-wider mx-1">{m.playerName}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 border-t-2 border-slate-100 bg-slate-50">
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 premium-input h-12 text-sm bg-white"
                    placeholder="TYPE MESSAGE..."
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

      {/* CHAT TOGGLE - Portal ile body'ye taşındı */}
      <Portal>
        {
          room && !isChatOpen && (
            <button
              onClick={() => setIsChatOpen(true)}
              className="fixed right-6 bottom-6 w-16 h-16 bg-white border-4 border-slate-200 rounded-2xl shadow-xl flex items-center justify-center transition-all z-[9998] group hover:scale-110 active:scale-95 hover:border-primary"
            >
              <MessageSquare className="w-8 h-8 text-slate-400 group-hover:text-primary transition-colors" />
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

    </div >
  );
}

export default App;

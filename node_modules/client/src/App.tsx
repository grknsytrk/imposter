import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGameStore } from './store/useGameStore';
import { Button } from './components/ui/button';
import {

  RefreshCcw,
  Fingerprint,
  MessageSquare,
  Send,
  Eye,
  ShieldAlert,
  Radio,
  Activity,
  Lock,
  X,
  AlertCircle,
  CheckCircle,
  Terminal,
  Database,
  Cpu,
  Scan,
  AlertTriangle,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { connect, isConnected, createRoom, joinRoom, startGame, leaveRoom, sendMessage, room, player, rooms, refreshRooms, messages, toast, clearToast } = useGameStore();
  const [name, setName] = useState('');
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [roomIdInput, setRoomIdInput] = useState('');
  const [chatInput, setChatInput] = useState('');

  // SURVEILLANCE THEME AVATARS
  const AVATARS = [
    { id: 'eye', icon: Eye, label: 'OBSERVER' },
    { id: 'fingerprint', icon: Fingerprint, label: 'UNKNOWN' },
    { id: 'shield', icon: ShieldAlert, label: 'ENFORCER' },
    { id: 'radio', icon: Radio, label: 'SIGNAL' },
    { id: 'activity', icon: Activity, label: 'PULSE' },
    { id: 'database', icon: Database, label: 'ARCHIVE' },
    { id: 'cpu', icon: Cpu, label: 'SYSTEM' },
    { id: 'scan', icon: Scan, label: 'TARGET' },
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
  // Status state
  const [statusIndex, setStatusIndex] = useState(0);
  const [customStatus, setCustomStatus] = useState('');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  // Join Password Modal State
  const [joinPasswordModal, setJoinPasswordModal] = useState<{ roomId: string; roomName: string } | null>(null);
  const [modalPasswordInput, setModalPasswordInput] = useState('');
  const [refreshRotation, setRefreshRotation] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevMessagesLength = useRef(0);

  // Pending room ID for direct link access
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(() => {
    const match = window.location.pathname.match(/^\/room\/([A-Z0-9]+)$/i);
    return match ? match[1].toUpperCase() : null;
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });

    // Handle unread messages count
    if (messages.length > prevMessagesLength.current) {
      if (!isChatOpen) {
        setUnreadCount(prev => prev + (messages.length - prevMessagesLength.current));
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages, isChatOpen]);

  useEffect(() => {
    if (isChatOpen) {
      setUnreadCount(0);
    }
  }, [isChatOpen]);

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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* GLOBAL OVERLAY - NOISE / SCANLINES already in CSS */}
      <div className="absolute top-4 left-4 text-[10px] sm:text-xs font-mono text-white/20 select-none z-0">
        <p>SYS.VER.4.0.1</p>
        <p>SECURE CONN: ESTABLISHED</p>
        <p>{new Date().toISOString().split('T')[0]}</p>
      </div>

      <div className="absolute bottom-4 right-4 text-[10px] sm:text-xs font-mono text-white/20 select-none text-right z-0">
        <p>TERMINAL ID: T-{Math.floor(Math.random() * 9999)}</p>
        <p>ENCRYPTION: AES-256</p>
      </div>

      <AnimatePresence mode="wait">
        {!isConnected ? (
          <motion.div
            key="landing"
            variants={introVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-lg z-10"
          >
            {/* LOGIN TERMINAL */}
            <div className="terminal-card bg-black p-8 sm:p-12 border border-white/10 shadow-2xl relative">
              {/* Header Strip */}
              <div className="absolute top-0 left-0 w-full h-1 bg-white/20" />
              <div className="absolute top-0 right-0 p-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <div className="w-2 h-2 bg-white/20 rounded-full" />
                  <div className="w-2 h-2 bg-white/20 rounded-full" />
                </div>
              </div>

              <div className="mb-10 text-center space-y-2">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 border-2 border-white/80 flex items-center justify-center relative">
                    <div className="absolute inset-0 border border-white/20 scale-125" />
                    <Fingerprint className="w-10 h-10 text-white animate-pulse" />
                  </div>
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter text-white font-sans">
                  IMPOSTER<span className="text-red-600">.SYSTEM</span>
                </h1>
                <p className="text-xs tracking-[0.3em] text-white/50 font-mono mt-2">
                  IDENTITY VERIFICATION REQUIRED
                </p>
              </div>

              <div className="space-y-6 font-mono">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-white/60">Subject Identifier</label>
                  <input
                    type="text"
                    placeholder="ENTER ALIAS..."
                    className="terminal-input w-full text-white placeholder:text-white/20 uppercase"
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-white/60">Class Selection</label>
                  <div className="flex items-center justify-between border border-white/20 bg-white/5 p-2">
                    <button onClick={prevAvatar} className="p-2 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col items-center gap-1">
                      <CurrentAvatarIcon className="w-8 h-8 text-white" />
                      <span className="text-[10px] tracking-widest uppercase">{AVATARS[avatarIndex].label}</span>
                    </div>
                    <button onClick={nextAvatar} className="p-2 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handleConnect}
                  disabled={!name.trim()}
                  className="w-full text-lg h-14 terminal-button terminal-button-primary mt-4"
                >
                  AUTHENTICATE_ACCESS
                </Button>
              </div>

              <div className="mt-8 pt-4 border-t border-white/10 flex justify-between text-[9px] text-white/30 uppercase tracking-widest font-mono">
                <span>Auth Node: 04</span>
                <span>Latency: 12ms</span>
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
            <header className="lg:col-span-12 flex flex-col md:flex-row justify-between items-end border-b border-white/10 pb-4 mb-4 gap-4">
              <div>
                <div className="flex items-center gap-2 text-white/40 mb-1">
                  <Terminal className="w-4 h-4" />
                  <span className="text-xs tracking-[0.2em] font-mono">OPERATIONS CENTER</span>
                </div>
                <h2 className="text-3xl font-bold text-white tracking-tight">TACTICAL.GRID</h2>
              </div>

              {/* PROFILE CARD */}
              <div className="flex items-center gap-4 bg-white/5 p-3 pr-6 border border-white/10 relative group">
                {/* DECORATION */}
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/50" />
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/50" />

                <div
                  className="w-12 h-12 bg-black border border-white/20 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
                  onClick={() => setIsProfileOpen(true)}
                >
                  <CurrentAvatarIcon className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white tracking-wider">{player?.name}</span>
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}>
                    <div className={`w-1.5 h-1.5 rounded-full ${STATUSES[statusIndex].color}`} />
                    <span className="text-[10px] text-white/50 font-mono uppercase hover:text-white transition-colors">
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
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full right-0 mt-2 w-48 bg-black border border-white/20 z-50 p-1 shadow-2xl"
                      >
                        {STATUSES.map((status, idx) => (
                          <button
                            key={status.id}
                            onClick={() => {
                              setStatusIndex(idx);
                              setIsStatusDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-mono text-white/70 hover:bg-white/10 hover:text-white flex items-center gap-3 transition-colors"
                          >
                            <div className={`w-2 h-2 ${status.color}`} />
                            {status.label}
                          </button>
                        ))}
                        <input
                          className="w-full bg-transparent border-t border-white/10 mt-1 px-3 py-2 text-xs font-mono text-white placeholder:text-white/20 outline-none"
                          placeholder="SET_STATUS_MSG..."
                          value={customStatus}
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
              <div className="terminal-card bg-black p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-white/40 tracking-widest">INITIATE_PROTOCOL</span>
                  <AlertTriangle className="w-4 h-4 text-white/20" />
                </div>

                <button
                  onClick={() => setIsCreateRoomOpen(true)}
                  className="w-full h-16 border border-white/20 hover:border-white/60 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-1 group"
                >
                  <span className="text-sm font-bold text-white tracking-[0.2em] group-hover:tracking-[0.3em] transition-all">CREATE_SESSION</span>
                  <span className="text-[9px] text-white/40 font-mono">HOST NEW OPERATION</span>
                </button>

                <div className="h-px w-full bg-white/10" />

                <div className="space-y-4">
                  <label className="text-xs font-mono text-white/40 tracking-widest">MANUAL_OVERRIDE</label>
                  <div className="flex gap-2">
                    <input
                      value={roomIdInput}
                      onChange={e => setRoomIdInput(e.target.value.toUpperCase())}
                      placeholder="CODE"
                      className="w-24 terminal-input text-center uppercase"
                    />
                    <button
                      disabled={!roomIdInput}
                      onClick={() => {
                        const target = rooms.find((r: any) => r.id === roomIdInput);
                        if (target?.hasPassword) setJoinPasswordModal({ roomId: roomIdInput, roomName: roomIdInput });
                        else joinRoom(roomIdInput);
                      }}
                      className="flex-1 terminal-button text-xs"
                    >
                      JOIN
                    </button>
                  </div>
                </div>
              </div>

              {/* System Info Panel */}
              <div className="terminal-card bg-black p-4 space-y-2 opacity-60">
                <div className="flex justify-between text-[10px] font-mono text-white/30">
                  <span>SERVER_LOAD</span>
                  <span>12%</span>
                </div>
                <div className="w-full h-1 bg-white/10">
                  <div className="w-[12%] h-full bg-white/30" />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-white/30">
                  <span>ENCRYPTION</span>
                  <span>ACTIVE</span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - ROOM LIST */}
            <div className="lg:col-span-8">
              <div className="terminal-card bg-black min-h-[500px] flex flex-col">
                {/* Tool Bar */}
                <div className="border-b border-white/10 p-4 flex justify-between items-center bg-white/5">
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                    <span className="text-xs font-mono text-white tracking-widest">ACTIVE_SECTORS [{rooms.length}]</span>
                  </div>
                  <button
                    onClick={() => {
                      setRefreshRotation(p => p + 180);
                      refreshRooms();
                    }}
                    className="p-2 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                  >
                    <RefreshCcw className="w-4 h-4 transition-transform duration-500" style={{ transform: `rotate(${refreshRotation}deg)` }} />
                  </button>
                </div>

                {/* List */}
                <div className="flex-1 p-4 space-y-2 overflow-y-auto max-h-[500px] custom-scrollbar">
                  {rooms.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-white/20 space-y-4">
                      <Scan className="w-12 h-12 opacity-50" />
                      <span className="text-xs font-mono tracking-widest">NO ACTIVE SIGNALS DETECTED</span>
                    </div>
                  ) : (
                    rooms.map((r, i) => (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => {
                          if (r.hasPassword) setJoinPasswordModal({ roomId: r.id, roomName: r.name });
                          else joinRoom(r.id);
                        }}
                        className="bg-white/5 border border-transparent hover:border-white/20 hover:bg-white/10 p-4 cursor-pointer transition-all group flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-12 ${r.hasPassword ? 'bg-amber-500/50' : r.playerCount >= r.maxPlayers ? 'bg-rose-500/50' : 'bg-emerald-500/50'}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-white tracking-wide group-hover:text-white/90">{r.name || r.id}</h3>
                              {r.hasPassword && <Lock className="w-3 h-3 text-amber-500" />}
                            </div>
                            <p className="text-[10px] font-mono text-white/40">SECTOR_ID: {r.id}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className="text-xs font-mono text-white/60">{r.playerCount} / {r.maxPlayers}</span>
                            <p className="text-[9px] text-white/20 uppercase tracking-widest">Occupancy</p>
                          </div>
                          <div className="p-2 border border-white/10 group-hover:bg-white group-hover:text-black transition-colors text-white/40">
                            <ChevronRight className="w-4 h-4" />
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
            <div className="terminal-card bg-black min-h-[80vh] flex flex-col">
              <div className="border-b border-white/10 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <div className="flex items-center gap-2 text-white/40 mb-1">
                    <ShieldAlert className="w-4 h-4" />
                    <span className="text-xs tracking-[0.2em] font-mono">SECTOR_CONTROL</span>
                  </div>
                  <h1 className="text-4xl font-bold text-white tracking-tight">{room.name || room.id}</h1>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right hidden md:block">
                    <p className="text-[10px] uppercase text-white/30 font-mono tracking-widest">Operation Status</p>
                    <p className={`text-lg font-bold tracking-widest ${room.status === 'PLAYING' ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`}>
                      {room.status === 'PLAYING' ? 'HOT' : 'PREPARING'}
                    </p>
                  </div>
                  <button
                    onClick={leaveRoom}
                    className="border border-red-900/50 text-red-500 bg-red-950/20 px-6 py-3 hover:bg-red-900/40 transition-colors uppercase font-bold tracking-widest text-xs"
                  >
                    ABORT
                  </button>
                </div>
              </div>

              <div className="flex-1 p-8">
                {/* GAME GRID */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {room.players.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className={`relative border p-4 transition-all ${p.id === player?.id ? 'border-white bg-white/5' : 'border-white/10 bg-black'
                        }`}
                    >
                      {/* CORNER MARKERS */}
                      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/50" />
                      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/50" />
                      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/50" />
                      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/50" />

                      <div className="flex flex-col items-center gap-4 py-4">
                        <div className={`w-16 h-16 flex items-center justify-center border ${p.id === player?.id ? 'border-white/40' : 'border-white/10'}`}>
                          {(() => {
                            const AvatarIcon = AVATARS.find(a => a.id === p.avatar)?.icon || Fingerprint;
                            return <AvatarIcon className="w-8 h-8 text-white/80" />;
                          })()}
                        </div>
                        <div className="text-center">
                          <div className="text-xs font-mono text-white/40 mb-1">{p.id === room.ownerId ? 'HOST_UNIT' : 'UNIT'}</div>
                          <div className="text-sm font-bold text-white tracking-widest uppercase">{p.name}</div>
                        </div>
                      </div>

                      {p.id === player?.id && <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-black text-[9px] font-bold px-2 py-0.5 uppercase tracking-widest">YOU</div>}
                    </motion.div>
                  ))}

                  {/* Empty Slots */}
                  {Array.from({ length: Math.max(0, room.maxPlayers - room.players.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="border border-white/5 bg-transparent p-4 flex items-center justify-center opacity-30">
                      <div className="w-16 h-16 border border-dashed border-white/30 flex items-center justify-center">
                        <span className="text-xs text-white/30 font-mono">VACANT</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 border-t border-white/10 flex justify-center">
                {player?.id === room.ownerId ? (
                  <button
                    onClick={startGame}
                    disabled={room.players.length < 3}
                    className="bg-white text-black px-12 py-4 font-bold text-xl tracking-[0.3em] uppercase hover:bg-gray-200 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    COMMENCE_OPERATION
                  </button>
                ) : (
                  <div className="text-white/40 font-mono text-xs uppercase tracking-widest animate-pulse">
                    AWAITING HOST COMMAND...
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CREATE ROOM MODAL */}
      <AnimatePresence>
        {isCreateRoomOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          >
            <div className="terminal-card bg-black p-8 w-full max-w-md border border-white/30 shadow-2xl">
              <h3 className="text-xl font-bold text-white tracking-widest uppercase mb-6 border-l-4 border-red-500 pl-4">Create Session</h3>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-mono text-white/50 block mb-2">SESSION_ID</label>
                  <input
                    value={newRoomName}
                    onChange={e => setNewRoomName(e.target.value)}
                    className="terminal-input w-full bg-white/5"
                    placeholder="NAME..."
                    autoFocus
                  />
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsPrivateRoom(!isPrivateRoom)}
                    className={`h-6 w-12 border ${isPrivateRoom ? 'border-red-500 bg-red-500/10' : 'border-white/20'} flex items-center px-1 transition-all`}
                  >
                    <div className={`w-4 h-4 bg-white transition-all ${isPrivateRoom ? 'translate-x-6' : ''}`} />
                  </button>
                  <span className="text-xs font-mono text-white/70">ENCRYPTED (PRIVATE)</span>
                </div>

                {isPrivateRoom && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}>
                    <input
                      type="password"
                      value={newRoomPassword}
                      onChange={e => setNewRoomPassword(e.target.value)}
                      className="terminal-input w-full bg-white/5"
                      placeholder="ACCESS_KEY..."
                    />
                  </motion.div>
                )}

                <div className="flex gap-4 pt-4">
                  <button onClick={() => setIsCreateRoomOpen(false)} className="flex-1 terminal-button py-3 text-xs">ABORT</button>
                  <button onClick={() => {
                    if (!newRoomName.trim()) return;
                    createRoom(newRoomName, isPrivateRoom ? newRoomPassword : undefined);
                    setIsCreateRoomOpen(false);
                    setNewRoomName(''); setIsPrivateRoom(false); setNewRoomPassword('');
                  }} className="flex-1 terminal-button terminal-button-primary py-3">INITIALIZE</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PROFILE MODAL */}
      <AnimatePresence>
        {isProfileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={() => setIsProfileOpen(false)}
          >
            <div
              onClick={e => e.stopPropagation()}
              className="terminal-card bg-black p-8 w-full max-w-sm border border-white/20 shadow-2xl"
            >
              <h3 className="text-center font-bold tracking-[0.3em] uppercase text-white mb-6">UNIT IDENTITY</h3>
              <div className="flex flex-col items-center gap-6">
                <div className="w-24 h-24 border-2 border-white/20 flex items-center justify-center relative bg-white/5">
                  <CurrentAvatarIcon className="w-12 h-12 text-white" />
                  <div className="absolute inset-0 border border-white/10 animate-pulse" />
                </div>

                <div className="flex items-center gap-4">
                  <button onClick={prevAvatar} className="p-2 border border-white/20 hover:bg-white/10 text-white">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="font-mono text-xs uppercase tracking-widest text-white/60">{AVATARS[avatarIndex].label}</span>
                  <button onClick={nextAvatar} className="p-2 border border-white/20 hover:bg-white/10 text-white">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="w-full">
                  <label className="text-[10px] text-white/30 uppercase tracking-widest font-mono">ALIAS</label>
                  <div className="text-lg font-bold text-white tracking-wider border-b border-white/40 pb-1 w-full text-center">
                    {player?.name}
                  </div>
                </div>

                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="w-full terminal-button py-3 mt-4"
                >
                  CONFIRM_UPDATE
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PASSWORD MODAL */}
      <AnimatePresence>
        {joinPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          >
            <div className="terminal-card bg-black p-8 w-full max-w-sm border border-red-500/50 shadow-red-900/20 shadow-2xl">
              <div className="flex items-center justify-center mb-6">
                <Lock className="w-12 h-12 text-red-500 animate-pulse" />
              </div>
              <h3 className="text-center text-white font-mono tracking-widest text-sm mb-6">RESTRICTED ACCESS</h3>

              <input
                type="password"
                value={modalPasswordInput}
                onChange={e => setModalPasswordInput(e.target.value)}
                className="terminal-input w-full bg-white/5 text-center text-red-100"
                placeholder="ENTER KEY"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && modalPasswordInput && (joinRoom(joinPasswordModal.roomId, modalPasswordInput), setJoinPasswordModal(null), setModalPasswordInput(''))}
              />

              <div className="flex gap-4 mt-6">
                <button onClick={() => { setJoinPasswordModal(null); setModalPasswordInput(''); }} className="flex-1 terminal-button py-3 text-xs">CANCEL</button>
                <button onClick={() => {
                  joinRoom(joinPasswordModal.roomId, modalPasswordInput);
                  setJoinPasswordModal(null);
                  setModalPasswordInput('');
                }} className="flex-1 terminal-button border-red-500 text-red-500 hover:bg-red-500 hover:text-white py-3">UNLOCK</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={`fixed bottom-10 left-1/2 z-[100] px-8 py-4 border-l-4 shadow-2xl flex items-center gap-4 font-mono text-xs tracking-widest ${toast.type === 'error'
              ? 'bg-red-950/90 border-red-500 text-red-100'
              : toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-100'
                : 'bg-zinc-900/90 border-white text-white'
              }`}
          >
            {toast.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            ) : toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{toast.message.toUpperCase()}</span>
            <button onClick={clearToast} className="ml-2 opacity-50 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHAT WIDGET */}
      <AnimatePresence>
        {room && isChatOpen && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            className="fixed right-0 top-0 bottom-0 w-80 bg-black border-l border-white/10 z-50 flex flex-col shadow-2xl"
          >
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <span className="text-xs font-mono text-white/60 tracking-widest">ENCRYPTED_COMMS</span>
              <button onClick={() => setIsChatOpen(false)} className="text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs custom-scrollbar">
              {messages.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.playerId === player?.id ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] p-3 ${m.playerId === player?.id ? 'bg-white/10 border border-white/20' : 'bg-black border border-white/10'}`}>
                    <p className="text-white/90 break-words">{m.content}</p>
                  </div>
                  <span className="text-[9px] text-white/30 mt-1 uppercase">{m.playerName}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 bg-white/5 border border-white/10 p-2 text-white text-xs outline-none focus:border-white/40 font-mono"
                  placeholder="MSG..."
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim()}
                  className="p-2 border border-white/10 hover:bg-white text-white hover:text-black transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHAT TOGGLE */}
      {room && !isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed right-6 bottom-6 w-12 h-12 border border-white/20 bg-black hover:bg-white/10 flex items-center justify-center transition-all z-40 group"
        >
          <MessageSquare className="w-5 h-5 text-white/70 group-hover:text-white" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-[10px] text-white flex items-center justify-center font-bold">
              {unreadCount}
            </div>
          )}
        </button>
      )}
    </div>
  );
}

export default App;

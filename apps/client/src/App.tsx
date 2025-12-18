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
  ChevronLeft,
  CircleDashed,
  Binary,
  Layers
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
      {/* Atmos Overlay */}
      <div className="scanline-overlay" />

      <div className="absolute top-6 left-6 flex flex-col gap-1 z-0 opacity-20 pointer-events-none">
        <div className="flex items-center gap-2">
          <Layers className="w-3 h-3" />
          <span className="system-label">PROTOCOL.OMEGA [v4.0.1]</span>
        </div>
        <span className="font-mono text-[9px] tracking-thinner">UPLINK: SECURED // OFFSET_TOKEN: 0x8F2A</span>
      </div>

      <div className="absolute top-6 right-6 z-0 opacity-20 pointer-events-none text-right">
        <span className="system-label">{new Date().toISOString().replace('T', ' ').split('.')[0]}</span>
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
            {/* LOGIN TERMINAL */}
            <div className="premium-card bg-card/60 backdrop-blur-xl p-10 sm:p-16 border-white/5 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden group">
              {/* Subtle top edge highlighting */}
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              <div className="mb-12 text-center space-y-4">
                <div className="flex justify-center mb-8">
                  <motion.div
                    animate={{ opacity: [1, 0.5, 1], scale: [1, 0.98, 1] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="w-24 h-24 border border-white/10 flex items-center justify-center relative bg-white/[0.02]"
                  >
                    <div className="absolute inset-2 border border-white/5" />
                    <Fingerprint className="w-10 h-10 text-white/40" />
                  </motion.div>
                </div>

                <div className="space-y-1">
                  <h1 className="text-5xl font-heading font-bold tracking-tighter text-white uppercase">
                    Council<span className="text-primary/40">_</span>Internal
                  </h1>
                  <p className="system-label tracking-[0.4em] text-white/30">
                    Security Clearance Required
                  </p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="system-label text-white/40">Credential_Alias</label>
                  <input
                    type="text"
                    placeholder="Input Identity..."
                    className="premium-input w-full uppercase tracking-wider placeholder:text-white/10"
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                    autoFocus
                  />
                </div>

                <div className="space-y-3">
                  <label className="system-label text-white/40">Node_Assignment</label>
                  <div className="flex items-center justify-between border border-white/10 bg-white/[0.03] p-3">
                    <button onClick={prevAvatar} className="p-2 hover:bg-white/5 text-white/30 hover:text-white transition-colors">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col items-center gap-2">
                      <CurrentAvatarIcon className="w-8 h-8 text-white/80" />
                      <span className="font-mono text-[9px] tracking-widest text-white/40 uppercase">{AVATARS[avatarIndex].label}</span>
                    </div>
                    <button onClick={nextAvatar} className="p-2 hover:bg-white/5 text-white/30 hover:text-white transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handleConnect}
                  disabled={!name.trim()}
                  variant="premium"
                  size="lg"
                  className="w-full"
                >
                  ESTABLISH_CONNECTION
                </Button>
              </div>

              <div className="mt-12 flex justify-between items-center">
                <div className="flex gap-4">
                  <div className="flex flex-col">
                    <span className="text-[8px] text-white/20 uppercase font-mono">Uplink</span>
                    <span className="text-[9px] text-emerald-500/60 font-mono">STABLE</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-white/20 uppercase font-mono">Encr</span>
                    <span className="text-[9px] text-white/40 font-mono">AES_256</span>
                  </div>
                </div>
                <CircleDashed className="w-4 h-4 text-white/10 animate-spin" />
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
            <header className="lg:col-span-12 flex flex-col md:flex-row justify-between items-center border-b border-white/5 pb-8 mb-4 gap-6">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 border border-white/10 flex items-center justify-center bg-white/[0.02]">
                  <Terminal className="w-6 h-6 text-white/60" />
                </div>
                <div>
                  <h2 className="text-3xl font-heading font-bold text-white tracking-tight uppercase">Tactical_Grid</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="system-label">Signal_Strength: 98%</span>
                  </div>
                </div>
              </div>

              {/* PROFILE CARD */}
              <div className="flex items-center gap-5 bg-white/[0.02] p-3 pl-5 border border-white/5 relative group cursor-pointer hover:bg-white/[0.04] transition-colors" onClick={() => setIsProfileOpen(true)}>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-white tracking-widest uppercase">{player?.name}</span>
                  <div className="flex items-center gap-2" onClick={(e) => { e.stopPropagation(); setIsStatusDropdownOpen(!isStatusDropdownOpen); }}>
                    <span className="text-[9px] text-white/30 font-mono uppercase tracking-tighter">
                      {customStatus || STATUSES[statusIndex].label}
                    </span>
                    <div className={`w-1.5 h-1.5 ${STATUSES[statusIndex].color.replace('bg-', 'bg-')}`} />
                  </div>
                </div>

                <div className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center">
                  <CurrentAvatarIcon className="w-6 h-6 text-white/60" />
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
                        className="absolute top-full right-0 mt-3 w-56 bg-card border border-white/10 z-50 p-2 shadow-2xl backdrop-blur-xl"
                      >
                        {STATUSES.map((status, idx) => (
                          <button
                            key={status.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatusIndex(idx);
                              setIsStatusDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2.5 text-[10px] font-mono text-white/50 hover:bg-white/5 hover:text-white flex items-center justify-between transition-colors group"
                          >
                            <span>{status.label}</span>
                            <div className={`w-1.5 h-1.5 ${status.color}`} />
                          </button>
                        ))}
                        <input
                          className="w-full bg-white/[0.03] border-t border-white/5 mt-2 px-4 py-3 text-[10px] font-mono text-white placeholder:text-white/10 outline-none"
                          placeholder="SET_OVERRIDE_MSG..."
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
              <div className="premium-card bg-white/[0.02] p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <span className="system-label">Initialization_Sequence</span>
                  <Binary className="w-4 h-4 text-white/10" />
                </div>

                <button
                  onClick={() => setIsCreateRoomOpen(true)}
                  className="w-full h-20 border border-white/10 hover:border-white/30 hover:bg-white/[0.04] transition-all flex flex-col items-center justify-center gap-1 group active:scale-[0.98]"
                >
                  <span className="text-xs font-heading font-bold text-white tracking-[0.3em] group-hover:tracking-[0.4em] transition-all uppercase">New_Operation</span>
                  <span className="text-[8px] text-white/20 font-mono tracking-widest">HOST_ENCRYPTED_SESSION</span>
                </button>

                <div className="h-[1px] w-full bg-white/5" />

                <div className="space-y-4">
                  <label className="system-label">Portal_Override</label>
                  <div className="flex gap-3">
                    <input
                      value={roomIdInput}
                      onChange={e => setRoomIdInput(e.target.value.toUpperCase())}
                      placeholder="HEX_ID"
                      className="w-32 premium-input text-center text-xs"
                    />
                    <Button
                      disabled={!roomIdInput}
                      onClick={() => {
                        const target = rooms.find((r: any) => r.id === roomIdInput);
                        if (target?.hasPassword) setJoinPasswordModal({ roomId: roomIdInput, roomName: roomIdInput });
                        else joinRoom(roomIdInput);
                      }}
                      variant="premium"
                      className="flex-1"
                    >
                      JOIN_SIGNAL
                    </Button>
                  </div>
                </div>
              </div>

              {/* System Info Panel */}
              <div className="premium-card bg-white/[0.01] p-6 space-y-4 border-dashed border-white/5">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[9px] font-mono">
                    <span className="text-white/20">NETWORK_SYNCHRONIZATION</span>
                    <span className="text-emerald-500/60">PASSIVE</span>
                  </div>
                  <div className="w-full h-[2px] bg-white/[0.03]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "65%" }}
                      className="h-full bg-white/10"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-[9px] font-mono text-white/20">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-3 h-3" />
                    <span>ENCRYPTION_MODULE</span>
                  </div>
                  <span className="text-white/40">READY</span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - ROOM LIST */}
            <div className="lg:col-span-8">
              <div className="premium-card bg-white/[0.02] min-h-[600px] flex flex-col">
                {/* Tool Bar */}
                <div className="border-b border-white/5 p-6 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)] animate-pulse" />
                    <span className="text-xs font-heading font-bold text-white/80 tracking-widest uppercase">Detected_Sectors [{rooms.length}]</span>
                  </div>
                  <button
                    onClick={() => {
                      setRefreshRotation(p => p + 180);
                      refreshRooms();
                    }}
                    className="p-3 hover:bg-white/5 text-white/20 hover:text-white transition-colors border border-white/5 group"
                  >
                    <RefreshCcw className="w-3.5 h-3.5 transition-transform duration-700 ease-out" style={{ transform: `rotate(${refreshRotation}deg)` }} />
                  </button>
                </div>

                {/* List */}
                <div className="flex-1 p-6 space-y-3 overflow-y-auto max-h-[600px] custom-scrollbar">
                  {rooms.length === 0 ? (
                    <div className="h-[400px] flex flex-col items-center justify-center text-white/10 space-y-6">
                      <CircleDashed className="w-16 h-16 animate-spin-slow opacity-20" />
                      <span className="text-xs font-mono tracking-[0.4em] uppercase">Scanning_Static...</span>
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
                        className="group bg-white/[0.02] border border-white/5 hover:border-white/20 p-5 cursor-pointer transition-all flex items-center justify-between relative overflow-hidden"
                      >
                        <div className="flex items-center gap-6">
                          <div className={`w-1 h-10 ${r.hasPassword ? 'bg-amber-500/30' : r.playerCount >= r.maxPlayers ? 'bg-rose-500/30' : 'bg-primary/30'}`} />
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <h3 className="text-base font-heading font-bold text-white/80 group-hover:text-white transition-colors uppercase tracking-wide">{r.name || r.id}</h3>
                              {r.hasPassword && <Lock className="w-3 h-3 text-amber-500/60" />}
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-[9px] font-mono text-white/20 uppercase tracking-tighter">SIG_ID: {r.id}</span>
                              <span className="text-[9px] font-mono text-white/20 uppercase tracking-tighter">•</span>
                              <span className="text-[9px] font-mono text-white/20 uppercase tracking-tighter">LATENCY: {Math.floor(Math.random() * 50) + 10}ms</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-10">
                          <div className="text-right space-y-1">
                            <div className="text-sm font-mono text-white/60 tabular-nums">{r.playerCount.toString().padStart(2, '0')} / {r.maxPlayers.toString().padStart(2, '0')}</div>
                            <div className="system-label opacity-50">Units</div>
                          </div>
                          <div className="w-10 h-10 border border-white/5 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
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
            <div className="premium-card bg-card/40 backdrop-blur-xl min-h-[85vh] flex flex-col border-white/5">
              <div className="border-b border-white/5 p-10 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-8 text-center md:text-left">
                  <div className="w-20 h-20 border border-white/10 flex items-center justify-center bg-white/[0.02] relative">
                    <ShieldAlert className="w-8 h-8 text-white/20" />
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20" />
                  </div>
                  <div>
                    <span className="system-label mb-2 block">Sector_Designation</span>
                    <h1 className="text-5xl font-heading font-bold text-white tracking-tighter uppercase">{room.name || room.id}</h1>
                  </div>
                </div>

                <div className="flex items-center gap-10 bg-white/[0.02] p-6 border border-white/5">
                  <div className="text-right">
                    <p className="system-label mb-1">Sector_Status</p>
                    <p className={`text-xl font-heading font-bold tracking-[0.2em] uppercase ${room.status === 'PLAYING' ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {room.status === 'PLAYING' ? 'Hot_Zone' : 'Preparatory'}
                    </p>
                  </div>
                  <div className="w-[1px] h-10 bg-white/5" />
                  <Button
                    onClick={leaveRoom}
                    variant="destructive"
                    size="sm"
                    className="h-12 px-8"
                  >
                    DISCONNECT
                  </Button>
                </div>
              </div>

              <div className="flex-1 p-12 overflow-y-auto">
                <div className="flex items-center gap-4 mb-8">
                  <span className="system-label">Assigned_Units</span>
                  <div className="flex-1 h-[1px] bg-white/5" />
                  <span className="font-mono text-[10px] text-white/40">{room.players.length} / {room.maxPlayers}</span>
                </div>

                {/* GAME GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {room.players.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className={`group relative p-6 border transition-all duration-500 ${p.id === player?.id
                        ? 'border-primary/30 bg-primary/[0.03]'
                        : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.02] hover:border-white/10'
                        }`}
                    >
                      <div className="flex flex-col items-center gap-5">
                        <div className={`w-16 h-16 flex items-center justify-center border transition-colors duration-500 ${p.id === player?.id ? 'border-primary/50' : 'border-white/10 group-hover:border-white/20'}`}>
                          {(() => {
                            const AvatarIcon = AVATARS.find(a => a.id === p.avatar)?.icon || Fingerprint;
                            return <AvatarIcon className={`w-7 h-7 ${p.id === player?.id ? 'text-white' : 'text-white/40'}`} />;
                          })()}
                        </div>
                        <div className="text-center space-y-1">
                          <span className="font-mono text-[8px] tracking-[0.3em] text-white/20 uppercase">
                            {p.id === room.ownerId ? 'Cmd_Unit' : 'Sub_Unit'}
                          </span>
                          <div className={`text-sm font-heading font-bold tracking-widest uppercase ${p.id === player?.id ? 'text-white' : 'text-white/70'}`}>
                            {p.name}
                          </div>
                        </div>
                      </div>

                      {p.id === player?.id && (
                        <div className="absolute -top-px left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[8px] font-bold px-3 py-1 uppercase tracking-[0.3em]">
                          YOU
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {/* Empty Slots */}
                  {Array.from({ length: Math.max(0, room.maxPlayers - room.players.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="border border-white/5 border-dashed p-6 flex items-center justify-center opacity-10">
                      <div className="flex flex-col items-center gap-3">
                        <CircleDashed className="w-8 h-8" />
                        <span className="text-[8px] font-mono tracking-widest uppercase">Vacant_Node</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-12 border-t border-white/5 flex flex-col items-center gap-6 bg-white/[0.01]">
                {player?.id === room.ownerId ? (
                  <div className="flex flex-col items-center gap-6 w-full max-w-md">
                    <Button
                      onClick={startGame}
                      disabled={room.players.length < 3}
                      variant="premium"
                      size="lg"
                      className="w-full"
                    >
                      INCEPT_OPERATION
                    </Button>
                    <p className="system-label text-center">Minimum 3 units required for tactical viability</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <CircleDashed className="w-4 h-4 animate-spin text-white/20" />
                    <span className="system-label tracking-[0.4em] animate-pulse">Waiting_For_Commander_Signal...</span>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
          >
            <div className="premium-card bg-card p-10 w-full max-w-md border-white/10 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-1 h-6 bg-primary" />
                <h3 className="text-xl font-heading font-bold text-white tracking-[0.2em] uppercase">Initialize_Session</h3>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="system-label">Sector_Alias</label>
                  <input
                    value={newRoomName}
                    onChange={e => setNewRoomName(e.target.value.toUpperCase())}
                    className="premium-input w-full uppercase"
                    placeholder="ENTER_NAME..."
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5">
                  <span className="system-label">Security_Encryption</span>
                  <button
                    onClick={() => setIsPrivateRoom(!isPrivateRoom)}
                    className={`h-6 w-12 border transition-all flex items-center px-1 ${isPrivateRoom ? 'border-primary bg-primary/20' : 'border-white/10'}`}
                  >
                    <motion.div
                      animate={{ x: isPrivateRoom ? 24 : 0 }}
                      className={`w-4 h-4 ${isPrivateRoom ? 'bg-white' : 'bg-white/20'}`}
                    />
                  </button>
                </div>

                {isPrivateRoom && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
                    <div className="pt-2 space-y-3">
                      <label className="system-label">Access_Key</label>
                      <input
                        type="password"
                        value={newRoomPassword}
                        onChange={e => setNewRoomPassword(e.target.value)}
                        className="premium-input w-full"
                        placeholder="••••••••"
                      />
                    </div>
                  </motion.div>
                )}

                <div className="flex gap-4 pt-4">
                  <Button onClick={() => setIsCreateRoomOpen(false)} variant="secondary" className="flex-1 h-12">ABORT</Button>
                  <Button onClick={() => {
                    if (!newRoomName.trim()) return;
                    createRoom(newRoomName, isPrivateRoom ? newRoomPassword : undefined);
                    setIsCreateRoomOpen(false);
                    setNewRoomName(''); setIsPrivateRoom(false); setNewRoomPassword('');
                  }} variant="premium" className="flex-1 h-12">INITIALIZE</Button>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
            onClick={() => setIsProfileOpen(false)}
          >
            <div
              onClick={e => e.stopPropagation()}
              className="premium-card bg-card p-10 w-full max-w-sm border-white/10 shadow-2xl"
            >
              <h3 className="system-label text-center mb-10 tracking-[0.4em]">Unit_Identity_Protocol</h3>
              <div className="flex flex-col items-center gap-10">
                <div className="w-28 h-28 border border-white/10 flex items-center justify-center relative bg-white/[0.02] group">
                  <CurrentAvatarIcon className="w-12 h-12 text-white/60 group-hover:text-white transition-colors" />
                  <div className="absolute inset-2 border border-white/5" />
                </div>

                <div className="flex items-center gap-6">
                  <button onClick={prevAvatar} className="p-3 border border-white/5 hover:bg-white/5 text-white/40 hover:text-white transition-all">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="text-center w-32">
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">{AVATARS[avatarIndex].label}</span>
                  </div>
                  <button onClick={nextAvatar} className="p-3 border border-white/5 hover:bg-white/5 text-white/40 hover:text-white transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="w-full space-y-2">
                  <label className="system-label text-center block">Current_Alias</label>
                  <div className="text-xl font-heading font-bold text-white tracking-[0.2em] border-b border-white/10 pb-4 w-full text-center uppercase">
                    {player?.name}
                  </div>
                </div>

                <Button
                  onClick={() => setIsProfileOpen(false)}
                  variant="premium"
                  className="w-full h-14"
                >
                  SAVE_CHANGES
                </Button>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-xl p-4"
          >
            <div className="premium-card bg-card p-10 w-full max-w-sm border-rose-500/20 shadow-[0_0_50px_rgba(244,63,94,0.1)]">
              <div className="flex flex-col items-center gap-6 mb-10">
                <div className="w-16 h-16 border border-rose-500/20 flex items-center justify-center bg-rose-500/5">
                  <Lock className="w-8 h-8 text-rose-500/60" />
                </div>
                <h3 className="system-label text-rose-500 tracking-[0.4em]">Access_Denied</h3>
              </div>

              <div className="space-y-6">
                <input
                  type="password"
                  value={modalPasswordInput}
                  onChange={e => setModalPasswordInput(e.target.value)}
                  className="premium-input w-full text-center tracking-widest bg-rose-500/[0.02] border-rose-500/10 focus:border-rose-500/40"
                  placeholder="AUTHORIZATION_KEY"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && modalPasswordInput && (joinRoom(joinPasswordModal.roomId, modalPasswordInput), setJoinPasswordModal(null), setModalPasswordInput(''))}
                />

                <div className="flex gap-4">
                  <Button onClick={() => { setJoinPasswordModal(null); setModalPasswordInput(''); }} variant="secondary" className="flex-1 h-12 text-[10px]">CANCEL</Button>
                  <Button onClick={() => {
                    joinRoom(joinPasswordModal.roomId, modalPasswordInput);
                    setJoinPasswordModal(null);
                    setModalPasswordInput('');
                  }} variant="destructive" className="flex-1 h-12 text-[10px] border-rose-500/40 text-rose-500 hover:bg-rose-500 hover:text-white">UNLOCK</Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%', transition: { duration: 0.2 } }}
            className={`fixed bottom-12 left-1/2 z-[100] px-8 py-5 border bg-card/90 backdrop-blur-xl shadow-2xl flex items-center gap-6 min-w-[320px] ${toast.type === 'error'
              ? 'border-rose-500/30 text-rose-300'
              : toast.type === 'success'
                ? 'border-emerald-500/30 text-emerald-300'
                : 'border-white/10 text-white/80'
              }`}
          >
            <div className="flex-shrink-0">
              {toast.type === 'error' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : toast.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1">
              <span className="system-label block mb-1 opacity-40">{toast.type?.toUpperCase()}_LOG</span>
              <span className="text-[10px] font-mono tracking-widest uppercase">{toast.message}</span>
            </div>
            <button onClick={clearToast} className="p-1 hover:bg-white/5 transition-colors opacity-30 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHAT WIDGET */}
      <AnimatePresence>
        {room && isChatOpen && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-[400px] bg-card/60 backdrop-blur-2xl border-l border-white/5 z-50 flex flex-col shadow-2xl"
          >
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
                <span className="system-label tracking-[0.3em]">Encrypted_Link_Active</span>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/5 text-white/20 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-10 space-y-4">
                  <MessageSquare className="w-12 h-12" />
                  <span className="system-label tracking-widest">No_Transmission_Data</span>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.playerId === player?.id ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] p-4 ${m.playerId === player?.id
                    ? 'bg-primary/10 border-l-2 border-primary/40'
                    : 'bg-white/[0.02] border-l-2 border-white/10'}`}>
                    <p className="text-xs font-mono text-white/80 leading-relaxed break-words">{m.content}</p>
                  </div>
                  <span className="system-label text-[8px] mt-2 tracking-widest opacity-30">{m.playerName} // {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-8 border-t border-white/5 bg-white/[0.01]">
              <div className="flex gap-3">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 premium-input bg-background/40 h-12"
                  placeholder="ENCRYPT_MESSAGE..."
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim()}
                  variant="premium"
                  className="w-12 h-12 p-0 flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHAT TOGGLE */}
      {room && !isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed right-10 bottom-10 w-16 h-16 border border-white/5 bg-card/80 backdrop-blur-xl hover:border-white/20 flex items-center justify-center transition-all z-40 group shadow-2xl"
        >
          <div className="relative">
            <MessageSquare className="w-6 h-6 text-white/40 group-hover:text-white transition-colors" />
            {unreadCount > 0 && (
              <div className="absolute -top-3 -right-3 min-w-[20px] h-5 bg-primary text-[9px] text-primary-foreground flex items-center justify-center font-bold px-1 rounded-none shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                {unreadCount}
              </div>
            )}
          </div>
        </button>
      )}
    </div>
  );
}

export default App;

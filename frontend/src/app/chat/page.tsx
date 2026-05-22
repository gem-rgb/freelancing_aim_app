'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiService } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { EncryptionService } from '@/utils/encryption';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  ShieldCheck, 
  Lock, 
  Key, 
  Send, 
  Search, 
  User, 
  Headset, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  X,
  MoreVertical,
  Paperclip,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

/* ── Types ─────────────────────────────────────────────────── */
interface Message {
  id: string; sender: string; sender_username?: string;
  encrypted_message: string; message_type: string; timestamp: string; created_at?: string;
}
interface Room {
  id: string; type?: string; name?: string;
  other_user?: { id: string; username: string; public_key: string };
  unread_count: number;
  last_message?: { sender: string; encrypted_message: string; created_at: string };
}

type ChatTab = 'messages' | 'support';

/* ── Chat Page Inner ─────────────────────────────────────────── */
function ChatPageInner() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTab]               = useState<ChatTab>('messages');
  const [rooms, setRooms]           = useState<Room[]>([]);
  const [supportRoom, setSupportRoom] = useState<Room | null>(null);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState('');
  const [ws, setWs]                 = useState<WebSocket | null>(null);
  const [wsReady, setWsReady]       = useState(false);
  const [decrypted, setDecrypted]   = useState<Record<string, string>>({});
  const [privateKey, setPrivateKey] = useState('');
  const [pkInput, setPkInput]       = useState('');
  const [showPkModal, setShowPkModal]     = useState(false);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [creatingRoom, setCreatingRoom]   = useState(false);
  const [loadingSupport, setLoadingSupport] = useState(false);
  const [roomError, setRoomError]   = useState('');

  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!authLoading && !isAuthenticated) router.replace('/login'); }, [authLoading, isAuthenticated, router]);
  useEffect(() => { if (!authLoading && isAuthenticated && user?.is_staff) router.replace('/admin/dashboard'); }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (!user) return;
    const pk = localStorage.getItem(`private_key_${user.id}`) || '';
    setPrivateKey(pk);
    apiService.getChatRooms().then(r => {
      const all: Room[] = r.data.results || r.data;
      setRooms(all.filter(r => r.type !== 'support'));
      const sup = all.find(r => r.type === 'support');
      if (sup) setSupportRoom(sup);
    }).catch(() => {});
  }, [user]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    const withUser = searchParams?.get('with');
    if (!withUser || !user || creatingRoom) return;

    const existing = rooms.find(r => r.other_user?.username === withUser);
    if (existing) { selectRoom(existing); return; }

    const createRoom = async () => {
      setCreatingRoom(true);
      setRoomError('');
      try {
        const userRes = await apiService.getChatUserByUsername(withUser);
        const { id: participantId } = userRes.data;
        const roomRes = await apiService.createChatRoom({ participant_id: participantId, room_type: 'direct' });
        const newRoom: Room = roomRes.data;
        setRooms(prev => {
          const already = prev.find(r => r.id === newRoom.id);
          return already ? prev : [newRoom, ...prev];
        });
        selectRoom(newRoom);
      } catch (e: any) {
        setRoomError(e.response?.data?.error || `Could not open chat with ${withUser}.`);
      } finally { setCreatingRoom(false); }
    };
    if (rooms.length > 0 || !creatingRoom) createRoom();
  }, [searchParams, rooms, user, creatingRoom]);

  const connectWS = useCallback((room: Room) => {
    ws?.close();
    setWsReady(false);
    const token  = localStorage.getItem('access_token') || '';
    const socket = new WebSocket(`ws://localhost:8000/ws/chat/${room.id}/?token=${token}`);
    socket.onopen  = () => setWsReady(true);
    socket.onclose = () => setWsReady(false);
    socket.onerror = () => setWsReady(false);
    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'message') {
          const msg: Message = {
            id: data.message_id || String(Date.now()),
            sender: data.sender,
            sender_username: data.sender,
            encrypted_message: data.encrypted_message,
            message_type: data.message_type || 'text',
            timestamp: data.timestamp || new Date().toISOString(),
          };
          setMessages(prev => [...prev, msg]);
        }
      } catch {}
    };
    setWs(socket);
    return socket;
  }, [ws]);

  const selectRoom = async (room: Room) => {
    setActiveRoom(room);
    setMessages([]);
    setDecrypted({});
    setLoadingMsgs(true);
    try {
      const res = await apiService.getMessages(room.id);
      const msgs: Message[] = res.data.results || res.data;
      setMessages(msgs);
      msgs.forEach(m => {
        if (m.sender !== user?.username && m.sender_username !== user?.username) {
          apiService.markMessageRead(m.id).catch(() => {});
        }
      });
    } catch {}
    finally { setLoadingMsgs(false); }
    connectWS(room);
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const openSupportRoom = async () => {
    if (supportRoom) { setTab('support'); selectRoom(supportRoom); return; }
    setLoadingSupport(true);
    try {
      const res = await apiService.createSupportRoom();
      const room: Room = res.data;
      setSupportRoom(room);
      setTab('support');
      selectRoom(room);
    } catch (e: any) {
      setRoomError(e.response?.data?.error || 'Could not open support chat.');
    } finally { setLoadingSupport(false); }
  };

  const tryDecrypt = (msg: Message): string => {
    const key = msg.id;
    if (decrypted[key]) return decrypted[key];
    if (!privateKey) return '🔒 [Load private key to decrypt]';
    try {
      const plain = EncryptionService.decryptRSA(msg.encrypted_message, privateKey);
      setDecrypted(prev => ({ ...prev, [key]: plain }));
      return plain;
    } catch { return msg.encrypted_message.length < 200 ? msg.encrypted_message : '🔒 [Decryption failed — check your private key]'; }
  };

  const sendMessage = () => {
    if (!input.trim() || !ws || !wsReady || !activeRoom) return;
    let encrypted = input;
    if (activeRoom.other_user?.public_key) {
      try { encrypted = EncryptionService.encryptRSA(input, activeRoom.other_user.public_key); }
      catch { /* fallback to plain */ }
    }
    ws.send(JSON.stringify({ type: 'message', encrypted_message: encrypted, message_type: 'text' }));
    setMessages(prev => [...prev, {
      id: `tmp-${Date.now()}`,
      sender: user?.username ?? '',
      encrypted_message: input,
      message_type: 'text',
      timestamp: new Date().toISOString(),
    }]);
    setInput('');
  };

  const savePrivateKey = () => {
    if (!pkInput.trim() || !user) return;
    localStorage.setItem(`private_key_${user.id}`, pkInput.trim());
    setPrivateKey(pkInput.trim());
    setShowPkModal(false);
    setPkInput('');
    setDecrypted({});
  };

  if (authLoading || !isAuthenticated) return null;

  const otherName = activeRoom?.type === 'support' ? 'AIM Support' : (activeRoom?.other_user?.username ?? 'Terminal');

  return (
    <main className="flex h-screen bg-background overflow-hidden animate-fade-in pt-[50px] group-[.is-dashboard]:pt-0">
      <Dialog open={showPkModal} onOpenChange={setShowPkModal}>
        <DialogContent className="glass border-white/10 sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <Key className="w-6 h-6 text-blue-500" />
                Initialize Decryption
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
                Enter RSA Private Key for E2EE Access
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                Paste the private key (.pem) you downloaded during registration. This key never leaves your browser and is only used to decrypt incoming messages locally.
            </p>
            <textarea 
                value={pkInput} 
                onChange={e => setPkInput(e.target.value)}
                placeholder="-----BEGIN RSA PRIVATE KEY-----"
                className="w-full h-40 bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-mono text-xs focus:outline-none focus:border-blue-500/50 resize-none transition-all shadow-inner"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setShowPkModal(false)}>Cancel</Button>
            <Button className="rounded-xl bg-blue-500 hover:bg-blue-600 font-black" onClick={savePrivateKey}>Decipher Securely</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sidebar */}
      <div className="w-80 border-r border-white/5 bg-white/5 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-white/5 space-y-6">
            <h1 className="text-xl font-black text-white tracking-tight">Comms <span className="text-blue-500">Node</span></h1>
            <div className="flex gap-1 p-1 bg-black/20 rounded-xl">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className={cn("flex-1 rounded-lg text-[10px] font-black uppercase tracking-widest h-9", tab === 'messages' ? "bg-white/10 text-white" : "text-muted-foreground")}
                    onClick={() => setTab('messages')}
                >
                    Messages
                </Button>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className={cn("flex-1 rounded-lg text-[10px] font-black uppercase tracking-widest h-9", tab === 'support' ? "bg-white/10 text-white" : "text-muted-foreground")}
                    onClick={() => { setTab('support'); openSupportRoom(); }}
                >
                    Support
                </Button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 p-3">
            {tab === 'messages' ? (
                rooms.length === 0 ? (
                    <div className="py-20 text-center space-y-4 px-6">
                        <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto opacity-10" />
                        <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">No Active Nodes</p>
                    </div>
                ) : (
                    rooms.map(room => (
                        <button 
                            key={room.id}
                            onClick={() => selectRoom(room)}
                            className={cn(
                                "w-full p-4 rounded-2xl flex items-center gap-4 transition-all group",
                                activeRoom?.id === room.id ? "bg-blue-500/10 border border-blue-500/20" : "hover:bg-white/5 border border-transparent"
                            )}
                        >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-500/10">
                                {room.other_user?.username?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <div className="flex justify-between items-center mb-0.5">
                                    <p className={cn("font-bold text-sm truncate", activeRoom?.id === room.id ? "text-white" : "text-muted-foreground group-hover:text-white")}>@{room.other_user?.username}</p>
                                    {room.unread_count > 0 && <Badge className="h-4 px-1.5 min-w-[16px] text-[8px] bg-blue-500">{room.unread_count}</Badge>}
                                </div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight truncate">🔒 E2EE Link Secured</p>
                            </div>
                        </button>
                    ))
                )
            ) : (
                <button 
                    onClick={openSupportRoom}
                    className={cn(
                        "w-full p-4 rounded-2xl flex items-center gap-4 transition-all group",
                        activeRoom?.id === supportRoom?.id ? "bg-blue-500/10 border border-blue-500/20" : "hover:bg-white/5 border border-transparent"
                    )}
                >
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-500/10">
                        <Headset className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                        <p className={cn("font-bold text-sm truncate", activeRoom?.id === supportRoom?.id ? "text-white" : "text-muted-foreground group-hover:text-white")}>AIM Network Support</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight truncate">Official Protocol Help</p>
                    </div>
                </button>
            )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-black/40">
        {activeRoom ? (
            <>
                <header className="h-20 border-b border-white/5 bg-white/5 px-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-xl shadow-blue-500/10",
                            activeRoom.type === 'support' ? "bg-blue-600 shadow-blue-500/10" : "bg-gradient-to-br from-blue-600 to-cyan-500 shadow-blue-500/10"
                        )}>
                            {activeRoom.type === 'support' ? <Headset className="w-6 h-6" /> : otherName[0]?.toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="font-black text-white tracking-tight">{otherName}</h2>
                                {activeRoom.type === 'support' && <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[8px] h-4">OFFICIAL</Badge>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", wsReady ? "bg-green-500" : "bg-muted-foreground")} />
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{wsReady ? "Network Active" : "Initializing..."}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {!privateKey ? (
                            <Button variant="outline" className="h-10 rounded-xl border-blue-500/30 bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest px-6" onClick={() => setShowPkModal(true)}>
                                <Key className="w-3.5 h-3.5 mr-2" /> Load Private Key
                            </Button>
                        ) : (
                            <Badge variant="outline" className="h-10 rounded-xl border-green-500/30 bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest px-6">
                                <ShieldCheck className="w-3.5 h-3.5 mr-2" /> Cipher Active
                            </Badge>
                        )}
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white rounded-xl">
                            <MoreVertical className="w-5 h-5" />
                        </Button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    {loadingMsgs ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Decrypting Local Ledger...</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 opacity-20">
                            <Lock className="w-16 h-16 text-white" />
                            <p className="font-bold text-white uppercase text-xs tracking-widest">Secure Channel Initialized</p>
                        </div>
                    ) : (
                        messages.map((msg, i) => {
                            const isMine = (msg.sender === user?.username) || (msg.sender_username === user?.username);
                            const text = isMine ? msg.encrypted_message : tryDecrypt(msg);
                            const time = new Date(msg.timestamp || msg.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            
                            return (
                                <div key={i} className={cn("flex items-end gap-3", isMine ? "flex-row-reverse" : "flex-row")}>
                                    <div className={cn(
                                        "max-w-[70%] p-4 rounded-3xl text-sm font-medium leading-relaxed shadow-lg transition-all",
                                        isMine 
                                            ? "bg-gradient-to-br from-blue-600 to-cyan-500 text-white rounded-br-none shadow-blue-500/10" 
                                            : "bg-white/5 border border-white/5 text-muted-foreground rounded-bl-none shadow-black/20"
                                    )}>
                                        <p className="whitespace-pre-wrap">{text}</p>
                                        <p className={cn("text-[9px] font-bold uppercase tracking-widest mt-2", isMine ? "text-white/60" : "text-muted-foreground/40")}>{time}</p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={endRef} />
                </div>

                <footer className="p-6 bg-white/5 border-t border-white/5 px-8">
                    <div className="max-w-4xl mx-auto flex items-center gap-4 bg-black/40 p-2 pl-4 rounded-2xl border border-white/5 focus-within:border-blue-500/50 transition-all">
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white rounded-xl">
                            <Paperclip className="w-5 h-5" />
                        </Button>
                        <Input 
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                            placeholder={wsReady ? "Transmit encrypted data..." : "Re-establishing connection..."}
                            className="bg-transparent border-none focus-visible:ring-0 text-white font-medium h-12"
                            disabled={!wsReady}
                        />
                        <Button 
                            onClick={sendMessage}
                            disabled={!input.trim() || !wsReady}
                            className="w-12 h-12 rounded-xl bg-blue-500 hover:bg-blue-600 shadow-xl shadow-blue-500/20 transition-all"
                        >
                            <Send className="w-5 h-5" />
                        </Button>
                    </div>
                </footer>
            </>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center space-y-8 p-12 text-center animate-in fade-in duration-700">
                <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-white/10 group transition-all">
                    <MessageSquare className="w-10 h-10 text-muted-foreground group-hover:scale-110 group-hover:text-blue-500 transition-all" />
                </div>
                <div className="max-w-md space-y-4">
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Comms <span className="text-gradient">Hub</span></h2>
                    <p className="text-muted-foreground font-medium leading-relaxed">
                        Secure, zero-knowledge communication node. All transmissions are RSA-encrypted before broadcast. Select a peer to begin decryption.
                    </p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" className="rounded-2xl h-12 px-8 border-white/10 font-black uppercase text-xs tracking-widest" asChild>
                        <Link href="/listings">Browse Market</Link>
                    </Button>
                    <Button className="rounded-2xl h-12 px-8 bg-blue-600 hover:bg-blue-700 font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20" onClick={openSupportRoom}>
                        <Headset className="w-4 h-4 mr-2" /> Support Node
                    </Button>
                </div>
            </div>
        )}
      </div>
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  );
}

'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiService } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { EncryptionService } from '@/utils/encryption';

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

/* ── Small helpers ─────────────────────────────────────────── */
function Avatar({ name, size = 36, gradient = 'linear-gradient(135deg,#f79a32,#dc3d22)' }: { name: string; size?: number; gradient?: string }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: gradient, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * 0.38, color: '#fff' }}>
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

function StatusDot({ connected }: { connected: boolean }) {
  return <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: connected ? '#a0b85e' : '#5c4228', boxShadow: connected ? '0 0 6px rgba(160,184,94,0.6)' : 'none', flexShrink: 0 }} />;
}

/* ── Room item in sidebar ──────────────────────────────────── */
function RoomItem({ room, isActive, onClick, currentUser }: { room: Room; isActive: boolean; onClick: () => void; currentUser: string }) {
  const label   = room.type === 'support' ? '🛟 Support' : (room.other_user?.username ?? 'Unknown');
  const gradient = room.type === 'support' ? 'linear-gradient(135deg,#39adb5,#2c7a80)' : isActive ? 'linear-gradient(135deg,#f79a32,#dc3d22)' : 'linear-gradient(135deg,#4b3422,#3c2818)';
  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1.125rem', borderBottom: '1px solid rgba(75,52,34,0.25)', background: isActive ? 'rgba(247,154,50,0.07)' : 'transparent', borderLeft: `3px solid ${isActive ? '#f79a32' : 'transparent'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.65rem', transition: 'all 0.12s ease' }}>
      <Avatar name={room.type === 'support' ? 'S' : label} size={34} gradient={gradient} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isActive ? '#f79a32' : '#c0a472', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          {room.unread_count > 0 && <span style={{ background: '#39adb5', color: '#fff', fontSize: '0.62rem', fontWeight: 700, padding: '0.1rem 0.42rem', borderRadius: '999px', flexShrink: 0 }}>{room.unread_count}</span>}
        </div>
        <p style={{ fontSize: '0.7rem', color: '#5c4228', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {room.last_message ? '🔒 Encrypted message' : 'No messages yet'}
        </p>
      </div>
    </button>
  );
}

/* ── Main chat page ─────────────────────────────────────────── */
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

  /* ── Auth guard ── */
  useEffect(() => { if (!authLoading && !isAuthenticated) router.replace('/login'); }, [authLoading, isAuthenticated]);

  /* ── Staff guard — admin messaging lives in /admin/dashboard ── */
  useEffect(() => { if (!authLoading && isAuthenticated && user?.is_staff) router.replace('/admin/dashboard'); }, [authLoading, isAuthenticated, user]);

  /* ── Load private key + rooms ── */
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

  /* ── Scroll ── */
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  /* ── Handle ?with=username query — open or create a DM ── */
  useEffect(() => {
    const withUser = searchParams?.get('with');
    if (!withUser || !user || creatingRoom) return;

    // Already have room with this user?
    const existing = rooms.find(r => r.other_user?.username === withUser);
    if (existing) { selectRoom(existing); return; }

    // Create it
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
    if (rooms.length > 0 || !creatingRoom) createRoom(); // only after rooms loaded
  }, [searchParams, rooms, user]);

  /* ── WebSocket ── */
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
      // Mark unread
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
    // For support room encrypt with admin's key if available, otherwise send plain
    if (activeRoom.other_user?.public_key) {
      try { encrypted = EncryptionService.encryptRSA(input, activeRoom.other_user.public_key); }
      catch { /* fallback to plain */ }
    }

    ws.send(JSON.stringify({ type: 'message', encrypted_message: encrypted, message_type: 'text' }));

    // Optimistic local message
    setMessages(prev => [...prev, {
      id: `tmp-${Date.now()}`,
      sender: user?.username ?? '',
      encrypted_message: input, // show plain for sender
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

  if (authLoading || !isAuthenticated) return (
    <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: '28px', height: '28px' }} />
    </main>
  );

  const displayRooms = tab === 'support' ? (supportRoom ? [supportRoom] : []) : rooms;
  const otherName    = activeRoom?.type === 'support' ? 'AIM Support' : (activeRoom?.other_user?.username ?? '');
  const avatarGrad   = activeRoom?.type === 'support' ? 'linear-gradient(135deg,#39adb5,#2c7a80)' : 'linear-gradient(135deg,#f79a32,#dc3d22)';

  return (
    <main style={{ display: 'flex', height: 'calc(100vh - 50px)', overflow: 'hidden', background: 'rgba(26,18,10,0.97)' }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: '270px', flexShrink: 0, borderRight: '1px solid rgba(75,52,34,0.5)', background: 'rgba(34,26,15,0.7)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Tab switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(75,52,34,0.4)', flexShrink: 0 }}>
          {(['messages', 'support'] as ChatTab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); if (t === 'support') openSupportRoom(); }}
              style={{ flex: 1, padding: '0.65rem', fontSize: '0.775rem', fontWeight: tab === t ? 700 : 500, color: tab === t ? '#f79a32' : '#5c4228', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === t ? '#f79a32' : 'transparent'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
              {t === 'messages' ? '💬 Messages' : '🛟 Help & Support'}
            </button>
          ))}
        </div>

        {/* Room list or support */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'messages' && (
            <>
              {rooms.length === 0 && !creatingRoom ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🤝</p>
                  <p style={{ fontSize: '0.775rem', color: '#5c4228', lineHeight: 1.6 }}>
                    No conversations yet.<br />
                    Visit a <Link href="/listings" style={{ color: '#f79a32' }}>listing</Link> and click<br />
                    <strong style={{ color: '#d3af86' }}>Message Seller</strong> to start.
                  </p>
                </div>
              ) : creatingRoom ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <div className="spinner" style={{ width: '18px', height: '18px', margin: '0 auto 0.5rem' }} />
                  <p style={{ fontSize: '0.75rem', color: '#5c4228' }}>Opening conversation…</p>
                </div>
              ) : (
                rooms.map(r => <RoomItem key={r.id} room={r} isActive={activeRoom?.id === r.id} onClick={() => selectRoom(r)} currentUser={user?.username ?? ''} />)
              )}
              {roomError && <p style={{ fontSize: '0.72rem', color: '#f2704a', padding: '0.5rem 1rem' }}>⚠️ {roomError}</p>}
            </>
          )}

          {tab === 'support' && (
            loadingSupport ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div className="spinner" style={{ width: '18px', height: '18px', margin: '0 auto 0.5rem' }} />
                <p style={{ fontSize: '0.75rem', color: '#5c4228' }}>Connecting to support…</p>
              </div>
            ) : supportRoom ? (
              <RoomItem room={supportRoom} isActive={activeRoom?.id === supportRoom.id} onClick={() => selectRoom(supportRoom)} currentUser={user?.username ?? ''} />
            ) : (
              <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🛟</p>
                <p style={{ fontSize: '0.775rem', color: '#5c4228', lineHeight: 1.6, marginBottom: '0.75rem' }}>Send a message to the AIM support team for help with your account or transactions.</p>
                <button onClick={openSupportRoom} className="btn btn-primary btn-sm">Start Support Chat</button>
              </div>
            )
          )}
        </div>
      </aside>

      {/* ── Main panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeRoom ? (
          <>
            {/* Header */}
            <header style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(75,52,34,0.4)', background: 'rgba(34,26,15,0.85)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
              <Avatar name={activeRoom.type === 'support' ? 'S' : otherName[0] ?? '?'} size={38} gradient={avatarGrad} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {activeRoom.type === 'support' ? (
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#d3af86' }}>AIM Support Team</span>
                  ) : (
                    <Link href={`/seller/${otherName}`} style={{ fontSize: '0.9rem', fontWeight: 700, color: '#d3af86', textDecoration: 'none' }}>{otherName}</Link>
                  )}
                  {activeRoom.type === 'support' && <span style={{ fontSize: '0.65rem', padding: '0.12rem 0.45rem', borderRadius: '999px', background: 'rgba(57,173,181,0.12)', border: '1px solid rgba(57,173,181,0.25)', color: '#39adb5' }}>Official Support</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.1rem' }}>
                  <StatusDot connected={wsReady} />
                  <span style={{ fontSize: '0.68rem', color: wsReady ? '#a0b85e' : '#5c4228' }}>
                    {wsReady ? 'Connected · end-to-end encrypted' : 'Connecting…'}
                  </span>
                </div>
              </div>

              {/* Private key button */}
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                {activeRoom.type !== 'support' && (
                  !privateKey ? (
                    <button onClick={() => setShowPkModal(true)}
                      style={{ padding: '0.3rem 0.7rem', borderRadius: '7px', background: 'rgba(247,154,50,0.1)', border: '1px solid rgba(247,154,50,0.25)', color: '#f79a32', fontSize: '0.72rem', cursor: 'pointer' }}>
                      🔑 Load Key
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem', borderRadius: '999px', background: 'rgba(136,155,74,0.1)', border: '1px solid rgba(136,155,74,0.25)', color: '#a0b85e' }}>🔓 Key loaded</span>
                  )
                )}
              </div>
            </header>

            {/* Messages */}
            <section aria-label="Messages" aria-live="polite"
              style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {loadingMsgs ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="spinner" style={{ width: '20px', height: '20px' }} />
                </div>
              ) : messages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <p style={{ fontSize: '2rem' }}>{activeRoom.type === 'support' ? '🛟' : '🔐'}</p>
                  <p style={{ fontSize: '0.8rem', color: '#5c4228' }}>
                    {activeRoom.type === 'support' ? 'Describe your issue and our team will respond shortly.' : 'No messages yet — say hello!'}
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMine = (msg.sender === user?.username) || (msg.sender_username === user?.username);
                  const text   = isMine ? (msg.encrypted_message.length < 500 ? msg.encrypted_message : '[Sent encrypted]') : tryDecrypt(msg);
                  const ts     = msg.timestamp || msg.created_at || '';
                  const time   = ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                  return (
                    <article key={msg.id + idx} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', gap: '0.45rem', alignItems: 'flex-end' }}>
                      {!isMine && <Avatar name={activeRoom.type === 'support' ? 'S' : otherName} size={26} gradient={avatarGrad} />}
                      <div style={{
                        maxWidth: '64%',
                        borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        padding: '0.6rem 0.9rem',
                        background: isMine ? 'linear-gradient(135deg,#f79a32,#c85a1a)' : 'rgba(60,40,24,0.92)',
                        border: isMine ? 'none' : '1px solid rgba(75,52,34,0.5)',
                      }}>
                        <p style={{ fontSize: '0.85rem', color: isMine ? '#fff' : '#d3af86', lineHeight: 1.55, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{text}</p>
                        <p style={{ fontSize: '0.62rem', color: isMine ? 'rgba(255,255,255,0.6)' : '#5c4228', marginTop: '0.2rem', textAlign: 'right' }}>{time}</p>
                      </div>
                      {isMine && <Avatar name={user?.username ?? ''} size={26} />}
                    </article>
                  );
                })
              )}
              <div ref={endRef} />
            </section>

            {/* Input bar */}
            <footer style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid rgba(75,52,34,0.4)', background: 'rgba(34,26,15,0.92)', display: 'flex', gap: '0.6rem', alignItems: 'center', flexShrink: 0 }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={wsReady ? (activeRoom.type === 'support' ? 'Describe your issue…' : 'Message… (enter to send)') : 'Connecting…'}
                disabled={!wsReady}
                style={{ flex: 1, borderRadius: '12px', fontSize: '0.875rem', opacity: wsReady ? 1 : 0.5 }}
                aria-label="Type a message"
                id="chat-message-input"
              />
              <button
                id="chat-send-btn"
                onClick={sendMessage}
                disabled={!input.trim() || !wsReady}
                aria-label="Send message"
                style={{
                  width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0, border: 'none',
                  background: !input.trim() || !wsReady ? 'rgba(75,52,34,0.4)' : 'linear-gradient(135deg,#f79a32,#dc3d22)',
                  cursor: !input.trim() || !wsReady ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease',
                }}
              >
                <svg style={{ width: '18px', height: '18px', color: '#fff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </footer>
          </>
        ) : (
          /* Empty state */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem' }}>💬</div>
            <h2 style={{ fontSize: '1.125rem', marginBottom: '0.2rem' }}>Your Messages</h2>
            <p style={{ fontSize: '0.85rem', color: '#8a7359', maxWidth: '300px', lineHeight: 1.65 }}>
              Select a conversation on the left, or visit a{' '}
              <Link href="/listings" style={{ color: '#f79a32' }}>listing</Link> and click{' '}
              <strong style={{ color: '#d3af86' }}>Message Seller</strong> to start a secure chat.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link href="/listings" className="btn btn-primary btn-sm">🛒 Browse Listings</Link>
              <button onClick={openSupportRoom} disabled={loadingSupport} className="btn btn-secondary btn-sm">
                {loadingSupport ? '…' : '🛟 Contact Support'}
              </button>
            </div>
            <div style={{ marginTop: '0.75rem', padding: '0.6rem 1rem', background: 'rgba(57,173,181,0.07)', border: '1px solid rgba(57,173,181,0.2)', borderRadius: '8px', fontSize: '0.72rem', color: '#39adb5', maxWidth: '320px' }}>
              🔒 Every message is RSA-encrypted end-to-end before leaving your device.
            </div>
          </div>
        )}
      </div>

      {/* ── Private Key Modal ── */}
      {showPkModal && (
        <div onClick={() => setShowPkModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div onClick={e => e.stopPropagation()} className="card" style={{ maxWidth: '440px', width: '100%', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.4rem' }}>🔑 Load Private Key</h3>
            <p style={{ fontSize: '0.775rem', color: '#8a7359', marginBottom: '1rem', lineHeight: 1.6 }}>
              Paste the private key (.pem) you downloaded during registration. It stays in your browser only — never uploaded.
            </p>
            <textarea value={pkInput} onChange={e => setPkInput(e.target.value)}
              placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
              rows={6} style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.72rem', resize: 'vertical', marginBottom: '0.75rem' }} />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setShowPkModal(false)} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
              <button onClick={savePrivateKey} disabled={!pkInput.trim()} className="btn btn-primary" style={{ flex: 2, justifyContent: 'center', opacity: pkInput.trim() ? 1 : 0.4 }}>
                🔓 Load & Decrypt
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" style={{ width: '28px', height: '28px' }} /></main>}>
      <ChatPageInner />
    </Suspense>
  );
}

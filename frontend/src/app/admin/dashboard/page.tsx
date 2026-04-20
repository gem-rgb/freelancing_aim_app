'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { apiService } from '@/utils/api';

/* ── Types ────────────────────────────────────────────────── */
interface AdminUser { id: number; username: string; user_type: string; email?: string; is_verified: boolean; is_suspended: boolean; is_active: boolean; is_staff: boolean; reputation_score: number; stake_balance: number; wallet_balance?: number; total_listings?: number; date_joined: string; suspension_reason?: string; suspended_until?: string; termination_reason?: string; }
interface Dispute { id: string; transaction: string; initiated_by_username: string; buyer_username?: string; seller_username?: string; status: string; buyer_claim: string; seller_response: string; resolution: string | null; resolution_details?: string; created_at: string; }
interface Listing { id: string; title: string; status: string; price: number; seller_username: string; category_name: string; verification_status?: string; preview_content?: string; description?: string; created_at: string; }
interface TxnItem { id: string; listing_title?: string; buyer_username: string; seller_username: string; status: string; amount: number; created_at: string; }
interface Demo { id: string; listing: string; listing_title?: string; demo_category: string; is_approved: boolean; seller_username?: string; created_at: string; }
interface ChatRoom { id: string; type?: string; name?: string; other_user?: { id: string; username: string }; unread_count: number; last_message?: { sender: string; encrypted_message: string; created_at: string }; participants?: { id: number; username: string }[]; }
interface Message { id: string; sender: string; sender_username?: string; encrypted_message: string; message_type: string; timestamp: string; created_at?: string; }
interface PlatformStats { users?: { total: number; buyers: number; sellers: number; suspended: number }; listings?: { total: number; active: number; flagged: number }; transactions?: { total: number; escrow: number; released: number; disputed: number }; disputes?: { open: number }; platform_revenue?: number; }

const SECTIONS = ['overview','messages','listings','transactions','disputes','users','antiscam'] as const;
type Section = typeof SECTIONS[number];

/* ── Helpers ─────────────────────────────────────────────── */
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'});
const fmtAge = (d: string) => { const s=Math.floor((Date.now()-new Date(d).getTime())/1000); if(s<3600) return `${Math.floor(s/60)}m ago`; if(s<86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`; };
const pill = (status: string) => {
  const map: Record<string,string> = { active:'#a0b85e',verified:'#a0b85e',approved:'#a0b85e',released:'#a0b85e',resolved:'#a0b85e',open:'#f79a32',pending:'#f79a32',pending_verification:'#f79a32',investigating:'#39adb5',escrow:'#39adb5',disputed:'#f2704a',cancelled:'#8a7359',removed:'#8a7359',draft:'#8a7359',suspended:'#f2704a',terminated:'#dc3d22',refunded:'#39adb5' };
  const bgMap: Record<string,string> = { active:'rgba(136,155,74,0.15)',verified:'rgba(136,155,74,0.15)',approved:'rgba(136,155,74,0.15)',released:'rgba(136,155,74,0.15)',resolved:'rgba(136,155,74,0.15)',open:'rgba(247,154,50,0.15)',pending:'rgba(247,154,50,0.15)',pending_verification:'rgba(247,154,50,0.15)',investigating:'rgba(57,173,181,0.15)',escrow:'rgba(57,173,181,0.15)',disputed:'rgba(242,112,74,0.15)',cancelled:'rgba(90,60,40,0.3)',removed:'rgba(90,60,40,0.3)',draft:'rgba(90,60,40,0.3)',suspended:'rgba(220,61,34,0.15)',terminated:'rgba(220,61,34,0.2)',refunded:'rgba(57,173,181,0.15)' };
  const col = map[status]||'#8a7359'; const bg = bgMap[status]||'rgba(90,60,40,0.3)';
  return <span style={{padding:'0.12rem 0.5rem',borderRadius:'999px',fontSize:'0.66rem',fontWeight:600,background:bg,color:col,whiteSpace:'nowrap'}}>{status.replace(/_/g,' ')}</span>;
};
const C = ({children,style={}}:{children:React.ReactNode;style?:React.CSSProperties}) => <div className="card" style={{padding:'1.1rem',...style}}>{children}</div>;
const Label = ({children}:{children:React.ReactNode}) => <p style={{fontSize:'0.68rem',color:'#5c4228',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',margin:'0 0 0.3rem'}}>{children}</p>;

/* ── Sidebar ──────────────────────────────────────────────── */
const ICONS: Record<Section,string> = { overview:'🏠', messages:'📨', listings:'📋', transactions:'💸', disputes:'⚖️', users:'👥', antiscam:'🛡️' };
function Sidebar({active,onChange,badges}:{active:Section;onChange:(s:Section)=>void;badges:Record<string,number>}) {
  return (
    <aside style={{width:'190px',flexShrink:0,display:'flex',flexDirection:'column',gap:'0.15rem'}}>
      <div style={{padding:'0.3rem 0.75rem',marginBottom:'0.4rem',fontSize:'0.6rem',fontWeight:700,color:'#5c4228',textTransform:'uppercase',letterSpacing:'0.08em'}}>⚡ Command Centre</div>
      {SECTIONS.map(s => {
        const on = s===active; const badge = badges[s];
        return (
          <button key={s} onClick={()=>onChange(s)} style={{display:'flex',alignItems:'center',gap:'0.55rem',padding:'0.42rem 0.75rem',borderRadius:'7px',background:on?'rgba(247,154,50,0.1)':'transparent',border:`1px solid ${on?'rgba(247,154,50,0.25)':'transparent'}`,color:on?'#f79a32':'#8a7359',fontSize:'0.8rem',fontWeight:on?600:400,cursor:'pointer',textAlign:'left',width:'100%',transition:'all 0.15s'}}>
            <span style={{fontSize:'0.88rem',width:'16px',textAlign:'center'}}>{ICONS[s]}</span>
            <span style={{flex:1,textTransform:'capitalize'}}>{s==='antiscam'?'Anti-Scam':s}</span>
            {badge>0 && <span style={{minWidth:'16px',height:'16px',borderRadius:'999px',background:'#dc3d22',color:'#fff',fontSize:'0.6rem',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 3px'}}>{badge>99?'99+':badge}</span>}
          </button>
        );
      })}
    </aside>
  );
}

/* ── Main ─────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<Section>('overview');

  // data
  const [stats,       setStats]       = useState<PlatformStats>({});
  const [disputes,    setDisputes]    = useState<Dispute[]>([]);
  const [listings,    setListings]    = useState<Listing[]>([]);
  const [txns,        setTxns]        = useState<TxnItem[]>([]);
  const [demos,       setDemos]       = useState<Demo[]>([]);
  const [users,       setUsers]       = useState<AdminUser[]>([]);
  const [rooms,       setRooms]       = useState<ChatRoom[]>([]);
  const [loading,     setLoading]     = useState(true);

  // new anti-scam logs & states
  const [stakeLogs,   setStakeLogs]   = useState<any[]>([]);
  const [escrowLogs,  setEscrowLogs]  = useState<any[]>([]);
  const [antiscamSubView, setAntiscamSubView] = useState<'main'|'suspensions'|'stakes'|'escrow'|'verified'>('main');
  const [suspendForm, setSuspendForm] = useState<{user:AdminUser|null, days:number, reason:string}>({user:null, days:7, reason:''});
  const [terminateForm, setTerminateForm] = useState<{user:AdminUser|null, reason:string}>({user:null, reason:''});

  // dispute
  const [selDispute,  setSelDispute]  = useState<Dispute|null>(null);
  const [resolveForm, setResolveForm] = useState({resolution:'no_action',resolution_details:'',admin_notes:'',slash_stake:false});
  const [resolving,   setResolving]   = useState(false);
  const [postAction,  setPostAction]  = useState('');

  // listing edit
  const [editListing, setEditListing] = useState<Listing|null>(null);
  const [editForm,    setEditForm]    = useState({title:'',price:'',status:'',preview_content:''});
  const [editSaving,  setEditSaving]  = useState(false);

  // messages
  const [activeRoom,    setActiveRoom]    = useState<ChatRoom|null>(null);
  const [messages,      setMessages]      = useState<Message[]>([]);
  const [msgInput,      setMsgInput]      = useState('');
  const [ws,            setWs]            = useState<WebSocket|null>(null);
  const [wsReady,       setWsReady]       = useState(false);
  const [composeOpen,   setComposeOpen]   = useState(false);
  const [composeTarget, setComposeTarget] = useState('');
  const [composeMsg,    setComposeMsg]    = useState('');
  const [composeSending,setComposeSending]= useState(false);
  const [composeErr,    setComposeErr]    = useState('');
  const [loadingMsgs,   setLoadingMsgs]   = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);

  // guards
  useEffect(()=>{ if(!isAuthenticated){router.replace('/admin/login');return;} if(user&&!user.is_staff){router.replace('/dashboard');} },[isAuthenticated,user]);

  // fetch — guarded against StrictMode double-mount
  const fetchedRef = useRef(false);
  useEffect(()=>{
    if(!isAuthenticated || fetchedRef.current) return;
    fetchedRef.current = true;
    Promise.allSettled([
      apiService.adminPlatformStats().then(r=>setStats(r.data)),
      apiService.getDisputes().then(r=>setDisputes(r.data.results||r.data||[])),
      apiService.adminGetAllListings().then(r=>setListings(r.data.results||r.data||[])),
      apiService.adminGetAllTransactions().then(r=>setTxns(r.data.results||r.data||[])),
      apiService.get('/v1/verification/demos/').then((r:any)=>setDemos(r.data.results||r.data||[])),
      apiService.adminListUsers().then(r=>setUsers(r.data||[])),
      apiService.adminGetAllConversations().then(r=>setRooms(r.data||[])),
      apiService.adminStakeLogs().then(r=>setStakeLogs(r.data||[])),
      apiService.adminEscrowLogs().then(r=>setEscrowLogs(r.data||[])),
    ]).finally(()=>setLoading(false));
  },[isAuthenticated]);

  useEffect(()=>{ msgEndRef.current?.scrollIntoView({behavior:'smooth'}); },[messages]);

  const openDisputes   = disputes.filter(d=>d.status==='open'||d.status==='investigating');
  const pendingDemos   = demos.filter(d=>!d.is_approved);
  const suspendedUsers = users.filter(u=>u.is_suspended);

  const badges: Record<string,number> = {
    disputes: openDisputes.length, messages: rooms.reduce((a,r)=>a+(r.unread_count||0),0),
    listings: listings.filter(l=>l.verification_status==='pending_verification').length,
    users: suspendedUsers.length, antiscam: pendingDemos.length,
  };

  /* handlers */
  const resolveDispute = useCallback(async()=>{
    if(!selDispute) return; setResolving(true);
    try { await apiService.resolveDispute(selDispute.id,resolveForm); setDisputes(p=>p.map(d=>d.id===selDispute.id?{...d,status:'resolved',resolution:resolveForm.resolution}:d)); }
    catch(e:any){ alert(e.response?.data?.error||'Failed'); } finally { setResolving(false); }
  },[selDispute,resolveForm]);

  const suspendUser = useCallback((u:AdminUser)=>{
    setSuspendForm({user:u, days:7, reason:'Suspended for platform violations.'});
    setSection('antiscam');
    setAntiscamSubView('suspensions');
  },[]);
  
  const executeSuspension = useCallback(async()=>{
    if(!suspendForm.user || !suspendForm.reason) return;
    try { 
      await apiService.adminSuspendUser(suspendForm.user.id, suspendForm.reason, suspendForm.days); 
      setUsers(p=>p.map(x=>x.id===suspendForm.user!.id?{...x,is_suspended:true}:x)); 
      setSuspendForm({user:null, days:7, reason:''});
    } catch(e:any){ alert(e.response?.data?.error||'Failed'); }
  },[suspendForm]);

  const unsuspendUser = useCallback(async(u:AdminUser)=>{
    try { await apiService.adminUnsuspendUser(u.id); setUsers(p=>p.map(x=>x.id===u.id?{...x,is_suspended:false,suspension_reason:undefined,suspended_until:undefined}:x)); }
    catch(e:any){ alert(e.response?.data?.error||'Failed'); }
  },[]);

  const terminateUser = useCallback((u:AdminUser)=>{
    setTerminateForm({user:u, reason:'Permanent ban initiated by Security Command. Account locked at DB level; cannot log in.'});
    setSection('antiscam');
    setAntiscamSubView('suspensions');
  },[]);

  const executeTermination = useCallback(async()=>{
    if(!terminateForm.user || !terminateForm.reason) return;
    try { 
      await apiService.adminTerminateUser(terminateForm.user.id, terminateForm.reason); 
      setUsers(p=>p.map(x=>x.id===terminateForm.user!.id?{...x,is_active:false,termination_reason:terminateForm.reason}:x)); 
      setTerminateForm({user:null, reason:''});
    } catch(e:any){ alert(e.response?.data?.error||'Failed'); }
  },[terminateForm]);

  const terminateListing = useCallback(async(id:string)=>{
    if(!confirm('Remove this listing from the marketplace?')) return;
    try { await apiService.adminTerminateListing(id); setListings(p=>p.map(l=>l.id===id?{...l,status:'removed'}:l)); }
    catch(e:any){ alert(e.response?.data?.error||'Failed'); }
  },[]);

  const openEditListing = (l:Listing) => { setEditListing(l); setEditForm({title:l.title,price:String(l.price),status:l.status,preview_content:l.preview_content||''}); };
  const saveEditListing = async() => {
    if(!editListing) return; setEditSaving(true);
    try { await apiService.adminEditListing(editListing.id,{title:editForm.title,price:Number(editForm.price),status:editForm.status,preview_content:editForm.preview_content}); setListings(p=>p.map(l=>l.id===editListing.id?{...l,...editForm,price:Number(editForm.price)}:l)); setEditListing(null); }
    catch(e:any){ alert(e.response?.data?.error||'Failed'); } finally { setEditSaving(false); }
  };

  const refundTxn = useCallback(async(id:string)=>{
    const reason = prompt('Refund reason (shown in audit log):'); if(!reason) return;
    try { await apiService.adminRefundTransaction(id,reason); setTxns(p=>p.map(t=>t.id===id?{...t,status:'refunded'}:t)); }
    catch(e:any){ alert(e.response?.data?.error||'Failed'); }
  },[]);

  const approveDemo = useCallback(async(id:string)=>{
    try { await apiService.post(`/v1/verification/demos/${id}/review/`,{action:'approve',admin_notes:'Approved'}); setDemos(p=>p.map(d=>d.id===id?{...d,is_approved:true}:d)); } catch { alert('Failed'); }
  },[]);
  const rejectDemo = useCallback(async(id:string)=>{
    const r=prompt('Rejection reason:'); if(!r) return;
    try { await apiService.post(`/v1/verification/demos/${id}/review/`,{action:'reject',rejection_reason:r,admin_notes:r}); setDemos(p=>p.filter(d=>d.id!==id)); } catch { alert('Failed'); }
  },[]);

  /* messages */
  const connectWS = useCallback((room:ChatRoom)=>{
    ws?.close(); setWsReady(false);
    const token=localStorage.getItem('access_token')||'';
    const s=new WebSocket(`ws://localhost:8000/ws/chat/${room.id}/?token=${token}`);
    s.onopen=()=>setWsReady(true); s.onclose=()=>setWsReady(false);
    s.onmessage=(e)=>{ try { const d=JSON.parse(e.data); if(d.type==='message') setMessages(prev=>[...prev,{id:d.message_id||String(Date.now()),sender:d.sender,sender_username:d.sender,encrypted_message:d.encrypted_message,message_type:'text',timestamp:d.timestamp||new Date().toISOString()}]); } catch{} };
    setWs(s);
  },[ws]);

  const selectRoom = async(room:ChatRoom)=>{
    setActiveRoom(room); setMessages([]); setLoadingMsgs(true);
    try { const r=await apiService.getMessages(room.id); setMessages(r.data.results||r.data||[]); } catch{}
    finally { setLoadingMsgs(false); }
    connectWS(room);
  };

  const sendMsg = ()=>{
    if(!msgInput.trim()||!wsReady||!activeRoom) return;
    ws?.send(JSON.stringify({type:'message',encrypted_message:msgInput,message_type:'text'}));
    setMessages(p=>[...p,{id:`tmp-${Date.now()}`,sender:user?.username??'',encrypted_message:msgInput,message_type:'text',timestamp:new Date().toISOString()}]);
    setMsgInput('');
  };

  const sendCompose = async()=>{
    if(!composeMsg.trim()||!composeTarget.trim()) return;
    setComposeSending(true); setComposeErr('');
    try {
      const r=await apiService.adminSendMessage({target_username:composeTarget.trim(),message:composeMsg.trim()});
      const roomId=r.data.room_id;
      const newRoom=rooms.find(x=>x.id===roomId)||{id:roomId,type:'support',name:`Admin ↔ ${composeTarget}`,unread_count:0};
      if(!rooms.find(x=>x.id===roomId)) setRooms(p=>[newRoom,...p]);
      setComposeOpen(false); setComposeTarget(''); setComposeMsg('');
      selectRoom(newRoom as ChatRoom);
    } catch(e:any){ setComposeErr(e.response?.data?.error||'Failed to send'); } finally { setComposeSending(false); }
  };

  const getRoomLabel = (r:ChatRoom) => {
    if(r.name) return r.name;
    const other=r.participants?.find(p=>p.username!==user?.username);
    return other?.username ?? r.id.slice(0,8);
  };

  /* ── Render ── */
  const TH = ({children}:{children:React.ReactNode}) => <div style={{fontSize:'0.63rem',fontWeight:700,color:'#5c4228',textTransform:'uppercase',letterSpacing:'0.05em',padding:'0.25rem 0'}}>{children}</div>;

  return (
    <main style={{minHeight:'100vh',padding:'1.1rem 0 3rem'}}>
      <div className="container" style={{maxWidth:'1250px'}}>

        {/* Header */}
        <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem',paddingBottom:'0.9rem',borderBottom:'1px solid rgba(75,52,34,0.4)'}}>
          <div style={{display:'flex',alignItems:'center',gap:'0.65rem'}}>
            <div style={{width:'30px',height:'30px',borderRadius:'7px',background:'linear-gradient(135deg,#f79a32,#dc3d22)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.9rem'}}>⚡</div>
            <div>
              <h1 style={{fontSize:'1rem',margin:0,fontWeight:700}}>AIM <span className="text-gradient">Command Centre</span></h1>
              <p style={{fontSize:'0.68rem',color:'#5c4228',margin:0}}>Platform Administration · {user?.username}</p>
            </div>
          </div>
          <div style={{display:'flex',gap:'0.4rem',alignItems:'center'}}>
            <span style={{padding:'0.25rem 0.6rem',borderRadius:'6px',background:'rgba(220,61,34,0.1)',border:'1px solid rgba(220,61,34,0.2)',color:'#f2704a',fontSize:'0.7rem',fontWeight:600}}>🔒 Admin Only</span>
          </div>
        </header>

        {/* Layout */}
        <div style={{display:'flex',gap:'1.25rem',alignItems:'flex-start'}}>
          <Sidebar active={section} onChange={setSection} badges={badges}/>

          <div style={{flex:1,minWidth:0}}>

            {/* ══ OVERVIEW ═══════════════════════════════════════ */}
            {section==='overview' && (
              <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
                <h2 style={{fontSize:'0.8rem',fontWeight:600,color:'#8a7359',textTransform:'uppercase',letterSpacing:'0.05em',margin:0}}>Platform Overview</h2>
                {loading ? <div style={{height:'120px',borderRadius:'10px',background:'rgba(60,40,24,0.5)'}}/>
                : <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.65rem'}}>
                    {[
                      {label:'Total Users',value:stats.users?.total??'—',icon:'👥',color:'#39adb5'},
                      {label:'Active Listings',value:stats.listings?.active??'—',icon:'📋',color:'#a0b85e'},
                      {label:'Open Disputes',value:stats.disputes?.open??'—',icon:'⚖️',color:'#f79a32'},
                      {label:'Platform Revenue',value:`₦${(stats.platform_revenue??0).toLocaleString(undefined,{maximumFractionDigits:0})}`,icon:'💰',color:'#f79a32'},
                      {label:'Buyers',value:stats.users?.buyers??'—',icon:'🛒',color:'#39adb5'},
                      {label:'Sellers',value:stats.users?.sellers??'—',icon:'🏪',color:'#a0b85e'},
                      {label:'Suspended Users',value:stats.users?.suspended??'—',icon:'🚫',color:'#f2704a'},
                      {label:'Escrow Txns',value:stats.transactions?.escrow??'—',icon:'🔐',color:'#39adb5'},
                    ].map(s=>(
                      <C key={s.label} style={{padding:'0.85rem'}}>
                        <div style={{fontSize:'1rem',marginBottom:'0.3rem'}}>{s.icon}</div>
                        <div style={{fontSize:'1.3rem',fontWeight:800,color:s.color,marginBottom:'0.1rem'}}>{s.value}</div>
                        <div style={{fontSize:'0.7rem',color:'#8a7359'}}>{s.label}</div>
                      </C>
                    ))}
                  </div>
                }
                {/* Quick summaries */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
                  <C>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.6rem'}}>
                      <h3 style={{margin:0,fontSize:'0.8rem'}}>⚖️ Open Disputes</h3>
                      <button onClick={()=>setSection('disputes')} style={{fontSize:'0.68rem',color:'#f79a32',background:'none',border:'none',cursor:'pointer'}}>View all →</button>
                    </div>
                    {openDisputes.length===0 ? <p style={{fontSize:'0.78rem',color:'#5c4228'}}>No open disputes 🎉</p>
                    : openDisputes.slice(0,4).map(d=>(
                      <div key={d.id} onClick={()=>{setSelDispute(d);setSection('disputes');}} style={{padding:'0.45rem 0.6rem',borderRadius:'6px',background:'#3c2818',borderLeft:'3px solid #f79a32',marginBottom:'0.35rem',cursor:'pointer'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:'0.75rem',color:'#d3af86',fontWeight:600}}>{d.initiated_by_username}</span>{pill(d.status)}</div>
                        <p style={{fontSize:'0.7rem',color:'#8a7359',margin:'0.15rem 0 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.buyer_claim}</p>
                      </div>
                    ))}
                  </C>
                  <C>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.6rem'}}>
                      <h3 style={{margin:0,fontSize:'0.8rem'}}>🛡️ Anti-Scam Alerts</h3>
                      <button onClick={()=>setSection('antiscam')} style={{fontSize:'0.68rem',color:'#f79a32',background:'none',border:'none',cursor:'pointer'}}>Full panel →</button>
                    </div>
                    {[
                      {label:'Pending Demo Reviews',value:pendingDemos.length,warn:pendingDemos.length>0},
                      {label:'Suspended Users',value:stats.users?.suspended??0,warn:(stats.users?.suspended??0)>0},
                      {label:'Disputed Transactions',value:stats.transactions?.disputed??0,warn:(stats.transactions?.disputed??0)>0},
                      {label:'Flagged/Removed Listings',value:listings.filter(l=>l.status==='removed'||l.status==='flagged').length,warn:false},
                    ].map(item=>(
                      <div key={item.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.35rem 0',borderBottom:'1px solid rgba(75,52,34,0.15)'}}>
                        <span style={{fontSize:'0.75rem',color:'#8a7359'}}>{item.label}</span>
                        <span style={{fontSize:'0.8rem',fontWeight:700,color:item.warn&&item.value>0?'#f2704a':'#a0b85e'}}>{item.value}</span>
                      </div>
                    ))}
                  </C>
                </div>
              </div>
            )}

            {/* ══ MESSAGES (ADMIN INBOX) ══════════════════════════ */}
            {section==='messages' && (
              <div style={{display:'flex',gap:'0.75rem',height:'calc(100vh - 185px)',overflow:'hidden'}}>
                {/* Room list */}
                <div style={{width:'260px',flexShrink:0,display:'flex',flexDirection:'column',gap:'0',overflowY:'auto',background:'rgba(34,26,15,0.6)',borderRadius:'10px',border:'1px solid rgba(75,52,34,0.4)'}}>
                  <div style={{padding:'0.65rem 0.9rem',borderBottom:'1px solid rgba(75,52,34,0.3)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
                    <span style={{fontSize:'0.78rem',fontWeight:700,color:'#d3af86'}}>📨 Conversations</span>
                    <button onClick={()=>setComposeOpen(true)} style={{padding:'0.22rem 0.55rem',borderRadius:'6px',background:'rgba(247,154,50,0.12)',border:'1px solid rgba(247,154,50,0.25)',color:'#f79a32',fontSize:'0.68rem',cursor:'pointer',fontWeight:600}}>+ New</button>
                  </div>
                  {loading ? <div style={{padding:'1.5rem',textAlign:'center',color:'#5c4228',fontSize:'0.78rem'}}>Loading…</div>
                  : rooms.length===0 ? <div style={{padding:'1.5rem',textAlign:'center',color:'#5c4228',fontSize:'0.78rem'}}>No conversations yet.<br/>Use + New to start one.</div>
                  : rooms.map(r=>{
                    const isAct=activeRoom?.id===r.id;
                    return (
                      <button key={r.id} onClick={()=>selectRoom(r)} style={{width:'100%',textAlign:'left',padding:'0.65rem 0.9rem',borderBottom:'1px solid rgba(75,52,34,0.2)',background:isAct?'rgba(247,154,50,0.07)':'transparent',borderLeft:`3px solid ${isAct?'#f79a32':'transparent'}`,cursor:'pointer',display:'block',transition:'all 0.12s'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.15rem'}}>
                          <span style={{fontSize:'0.78rem',fontWeight:600,color:isAct?'#f79a32':'#c0a472',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'160px'}}>{getRoomLabel(r)}</span>
                          {(r.unread_count??0)>0 && <span style={{background:'#dc3d22',color:'#fff',fontSize:'0.6rem',padding:'0.08rem 0.35rem',borderRadius:'999px',fontWeight:700}}>{r.unread_count}</span>}
                        </div>
                        <p style={{fontSize:'0.68rem',color:'#5c4228',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.last_message?'🔒 Encrypted message':'No messages yet'}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Chat panel */}
                <div style={{flex:1,display:'flex',flexDirection:'column',background:'rgba(26,18,10,0.95)',borderRadius:'10px',border:'1px solid rgba(75,52,34,0.4)',overflow:'hidden'}}>
                  {!activeRoom ? (
                    <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'0.5rem'}}>
                      <div style={{fontSize:'2.5rem'}}>📨</div>
                      <p style={{color:'#5c4228',fontSize:'0.82rem'}}>Select a conversation or start a new one</p>
                      <button onClick={()=>setComposeOpen(true)} className="btn btn-primary btn-sm">+ Compose New Message</button>
                    </div>
                  ) : (
                    <>
                      <div style={{padding:'0.75rem 1rem',borderBottom:'1px solid rgba(75,52,34,0.35)',background:'rgba(34,26,15,0.8)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
                        <div>
                          <span style={{fontSize:'0.875rem',fontWeight:700,color:'#d3af86'}}>{getRoomLabel(activeRoom)}</span>
                          <div style={{fontSize:'0.65rem',color:wsReady?'#a0b85e':'#5c4228',marginTop:'0.1rem'}}>{wsReady?'● Connected':'○ Connecting…'}</div>
                        </div>
                        <span style={{fontSize:'0.65rem',padding:'0.15rem 0.45rem',borderRadius:'999px',background:'rgba(247,154,50,0.1)',border:'1px solid rgba(247,154,50,0.2)',color:'#f79a32'}}>Admin Channel</span>
                      </div>
                      <div style={{flex:1,overflowY:'auto',padding:'1rem',display:'flex',flexDirection:'column',gap:'0.55rem'}}>
                        {loadingMsgs ? <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}><div className="spinner" style={{width:'20px',height:'20px'}}/></div>
                        : messages.length===0 ? <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'#5c4228',fontSize:'0.8rem'}}>No messages yet</div>
                        : messages.map((msg,i)=>{
                          const mine=msg.sender===user?.username||msg.sender_username===user?.username;
                          const ts=msg.timestamp||msg.created_at||'';
                          const time=ts?new Date(ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'';
                          return (
                            <div key={msg.id+i} style={{display:'flex',justifyContent:mine?'flex-end':'flex-start'}}>
                              <div style={{maxWidth:'68%',borderRadius:mine?'14px 14px 4px 14px':'14px 14px 14px 4px',padding:'0.55rem 0.8rem',background:mine?'linear-gradient(135deg,#f79a32,#c85a1a)':'rgba(60,40,24,0.9)',border:mine?'none':'1px solid rgba(75,52,34,0.5)'}}>
                                <p style={{fontSize:'0.82rem',color:mine?'#fff':'#d3af86',lineHeight:1.5,wordBreak:'break-word',whiteSpace:'pre-wrap',margin:0}}>{msg.encrypted_message}</p>
                                <p style={{fontSize:'0.6rem',color:mine?'rgba(255,255,255,0.55)':'#5c4228',marginTop:'0.15rem',textAlign:'right'}}>{time}</p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={msgEndRef}/>
                      </div>
                      <div style={{padding:'0.75rem 1rem',borderTop:'1px solid rgba(75,52,34,0.35)',background:'rgba(34,26,15,0.85)',display:'flex',gap:'0.5rem',flexShrink:0}}>
                        <input value={msgInput} onChange={e=>setMsgInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();}}} placeholder={wsReady?'Admin message…':'Connecting…'} disabled={!wsReady} style={{flex:1,borderRadius:'8px',fontSize:'0.85rem',opacity:wsReady?1:0.5}}/>
                        <button onClick={sendMsg} disabled={!msgInput.trim()||!wsReady} style={{width:'38px',height:'38px',borderRadius:'8px',border:'none',background:!msgInput.trim()||!wsReady?'rgba(75,52,34,0.4)':'linear-gradient(135deg,#f79a32,#dc3d22)',cursor:!msgInput.trim()||!wsReady?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <svg style={{width:'16px',height:'16px',color:'#fff'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            {/* ══ LISTINGS ══════════════════════════════════════ */}
            {section==='listings' && (
              <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
                <h2 style={{margin:'0 0 0.4rem',fontSize:'0.78rem',fontWeight:600,color:'#8a7359',textTransform:'uppercase',letterSpacing:'0.05em'}}>All Listings ({listings.length})</h2>
                {/* header row */}
                <div style={{display:'grid',gridTemplateColumns:'3fr 1fr 1fr 1fr 1.2fr',gap:'0.5rem',padding:'0 1rem',marginBottom:'0.1rem'}}>
                  {['Title / Seller','Status','Verified','Price','Actions'].map(h=><TH key={h}>{h}</TH>)}
                </div>
                {loading ? <div style={{height:'200px',borderRadius:'10px',background:'rgba(60,40,24,0.5)'}}/>
                : listings.length===0 ? <p style={{color:'#5c4228'}}>No listings.</p>
                : listings.map(l=>(
                  <C key={l.id} style={{padding:'0.7rem 1rem'}}>
                    <div style={{display:'grid',gridTemplateColumns:'3fr 1fr 1fr 1fr 1.2fr',gap:'0.5rem',alignItems:'center'}}>
                      <div>
                        <p style={{margin:0,fontSize:'0.78rem',fontWeight:600,color:l.status==='removed'?'#5c4228':'#d3af86',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textDecoration:l.status==='removed'?'line-through':'none'}}>{l.title}</p>
                        <p style={{margin:0,fontSize:'0.68rem',color:'#5c4228'}}>{l.seller_username} · {l.category_name}</p>
                      </div>
                      <div>{pill(l.status)}</div>
                      <div>{l.verification_status?pill(l.verification_status):<span style={{color:'#5c4228',fontSize:'0.7rem'}}>—</span>}</div>
                      <div style={{fontSize:'0.78rem',color:'#f79a32',fontWeight:600}}>₦{Number(l.price).toLocaleString()}</div>
                      <div style={{display:'flex',gap:'0.3rem'}}>
                        {l.status!=='removed' && <>
                          <button onClick={()=>openEditListing(l)} style={{padding:'0.22rem 0.5rem',borderRadius:'5px',background:'rgba(57,173,181,0.1)',border:'1px solid rgba(57,173,181,0.25)',color:'#39adb5',fontSize:'0.68rem',cursor:'pointer',fontWeight:600}}>✏️ Edit</button>
                          <button onClick={()=>terminateListing(l.id)} style={{padding:'0.22rem 0.5rem',borderRadius:'5px',background:'rgba(220,61,34,0.08)',border:'1px solid rgba(220,61,34,0.2)',color:'#f2704a',fontSize:'0.68rem',cursor:'pointer',fontWeight:600}}>🗑️ Remove</button>
                        </>}
                        {l.status==='removed' && <span style={{fontSize:'0.68rem',color:'#5c4228'}}>Removed</span>}
                      </div>
                    </div>
                  </C>
                ))}
              </div>
            )}

            {/* ══ TRANSACTIONS ══════════════════════════════════ */}
            {section==='transactions' && (
              <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
                <h2 style={{margin:'0 0 0.4rem',fontSize:'0.78rem',fontWeight:600,color:'#8a7359',textTransform:'uppercase',letterSpacing:'0.05em'}}>All Transactions ({txns.length})</h2>
                <div style={{display:'grid',gridTemplateColumns:'2.5fr 1fr 1fr 1fr 1fr 0.9fr',gap:'0.5rem',padding:'0 1rem',marginBottom:'0.1rem'}}>
                  {['Parties','Amount','Fee (15%)','Status','Date','Action'].map(h=><TH key={h}>{h}</TH>)}
                </div>
                {loading ? <div style={{height:'200px',borderRadius:'10px',background:'rgba(60,40,24,0.5)'}}/>
                : txns.length===0 ? <p style={{color:'#5c4228'}}>No transactions.</p>
                : txns.map(t=>(
                  <C key={t.id} style={{padding:'0.65rem 1rem'}}>
                    <div style={{display:'grid',gridTemplateColumns:'2.5fr 1fr 1fr 1fr 1fr 0.9fr',gap:'0.5rem',alignItems:'center'}}>
                      <div>
                        <p style={{margin:0,fontSize:'0.77rem',fontWeight:600,color:'#d3af86',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.buyer_username} → {t.seller_username}</p>
                        <p style={{margin:0,fontSize:'0.67rem',color:'#5c4228'}}>{t.id.slice(0,12)}…</p>
                      </div>
                      <div style={{fontSize:'0.78rem',color:'#f79a32',fontWeight:700}}>₦{Number(t.amount).toLocaleString()}</div>
                      <div style={{fontSize:'0.72rem',color:'#8a7359'}}>₦{(Number(t.amount)*0.15).toLocaleString(undefined,{maximumFractionDigits:0})}</div>
                      <div>{pill(t.status)}</div>
                      <div style={{fontSize:'0.68rem',color:'#5c4228'}}>{fmtDate(t.created_at)}</div>
                      <div>
                        {t.status!=='refunded' && t.status!=='released' && (
                          <button onClick={()=>refundTxn(t.id)} style={{padding:'0.22rem 0.5rem',borderRadius:'5px',background:'rgba(57,173,181,0.1)',border:'1px solid rgba(57,173,181,0.25)',color:'#39adb5',fontSize:'0.68rem',cursor:'pointer',fontWeight:600}}>💰 Refund</button>
                        )}
                        {t.status==='released' && (
                          <button onClick={()=>refundTxn(t.id)} style={{padding:'0.22rem 0.5rem',borderRadius:'5px',background:'rgba(220,61,34,0.08)',border:'1px solid rgba(220,61,34,0.2)',color:'#f2704a',fontSize:'0.68rem',cursor:'pointer',fontWeight:600}}>↩ Override Refund</button>
                        )}
                        {t.status==='refunded' && <span style={{fontSize:'0.68rem',color:'#39adb5'}}>Refunded ✓</span>}
                      </div>
                    </div>
                  </C>
                ))}
              </div>
            )}

            {/* ══ DISPUTES ════════════════════════════════════════ */}
            {section==='disputes' && (
              <div style={{display:'flex',gap:'0.75rem',height:'calc(100vh - 185px)',overflow:'hidden'}}>
                {/* List */}
                <div style={{width:'300px',flexShrink:0,display:'flex',flexDirection:'column',gap:'0.35rem',overflowY:'auto'}}>
                  <h2 style={{margin:'0 0 0.25rem',fontSize:'0.78rem',fontWeight:600,color:'#8a7359',textTransform:'uppercase',letterSpacing:'0.05em'}}>All Disputes ({disputes.length})</h2>
                  {loading ? <div style={{height:'200px',background:'#3c2818',borderRadius:'10px'}}/> :
                   disputes.length===0 ? <p style={{color:'#5c4228',fontSize:'0.8rem'}}>No disputes.</p> :
                   disputes.map(d=>(
                    <button key={d.id} onClick={()=>{setSelDispute(d);setResolveForm({resolution:'no_action',resolution_details:'',admin_notes:'',slash_stake:false});setPostAction('');}}
                      style={{width:'100%',textAlign:'left',padding:'0.7rem',borderRadius:'8px',background:selDispute?.id===d.id?'rgba(247,154,50,0.08)':'#3c2818',border:`1px solid ${selDispute?.id===d.id?'rgba(247,154,50,0.3)':'#4b3422'}`,cursor:'pointer',transition:'all 0.15s'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.25rem'}}>
                        <span style={{fontSize:'0.75rem',fontWeight:600,color:'#d3af86',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'140px'}}>{d.initiated_by_username}</span>
                        {pill(d.status)}
                      </div>
                      <p style={{fontSize:'0.7rem',color:'#8a7359',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.buyer_claim}</p>
                      <p style={{fontSize:'0.63rem',color:'#5c4228',margin:'0.2rem 0 0'}}>{fmtDate(d.created_at)}</p>
                    </button>
                  ))}
                </div>
                {/* Detail */}
                <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:'0.65rem'}}>
                  {!selDispute ? (
                    <C style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'180px'}}>
                      <p style={{color:'#5c4228',fontSize:'0.8rem'}}>Select a dispute to review</p>
                    </C>
                  ) : (<>
                    <C>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.65rem'}}>
                        <h3 style={{margin:0,fontSize:'0.88rem'}}>Dispute — <span style={{color:'#8a7359'}}>{selDispute.transaction.slice(0,16)}…</span></h3>
                        {pill(selDispute.status)}
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:'0.65rem'}}>
                        <div><Label>Buyer's Claim</Label><div style={{padding:'0.65rem',background:'#3c2818',borderRadius:'7px',fontSize:'0.78rem',color:'#c0a472',lineHeight:1.6}}>{selDispute.buyer_claim}</div></div>
                        {selDispute.seller_response && <div><Label>Seller's Response</Label><div style={{padding:'0.65rem',background:'#3c2818',borderRadius:'7px',fontSize:'0.78rem',color:'#8a7359',lineHeight:1.6}}>{selDispute.seller_response}</div></div>}
                      </div>
                    </C>

                    {selDispute.status==='resolved' ? (
                      <>
                        <C style={{background:'rgba(136,155,74,0.06)',borderColor:'rgba(136,155,74,0.2)'}}>
                          <p style={{color:'#a0b85e',fontSize:'0.82rem',fontWeight:600,margin:'0 0 0.3rem'}}>✅ Resolved: {selDispute.resolution?.replace(/_/g,' ')}</p>
                          {selDispute.resolution_details && <p style={{color:'#8a7359',fontSize:'0.78rem',margin:0}}>{selDispute.resolution_details}</p>}
                        </C>
                        {/* Post-resolution actions */}
                        <C style={{borderColor:'rgba(220,61,34,0.2)'}}>
                          <h3 style={{margin:'0 0 0.65rem',fontSize:'0.85rem',color:'#f2704a'}}>⚠️ Post-Resolution Account Actions</h3>
                          <p style={{fontSize:'0.75rem',color:'#8a7359',marginBottom:'0.75rem'}}>After resolving this dispute, you may take additional action against either party involved.</p>
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
                            {[
                              {label:'Suspend Buyer',who:'buyer',action:'suspend'},
                              {label:'Suspend Seller',who:'seller',action:'suspend'},
                              {label:'Terminate Buyer',who:'buyer',action:'terminate'},
                              {label:'Terminate Seller',who:'seller',action:'terminate'},
                            ].map(btn=>{
                              const uname = btn.who==='buyer' ? selDispute.buyer_username||selDispute.initiated_by_username : selDispute.seller_username||'';
                              const target = users.find(u=>u.username===uname);
                              if(!uname) return null;
                              const isTerminate = btn.action==='terminate';
                              return (
                                <button key={btn.label} onClick={async()=>{ if(target){ if(isTerminate) await terminateUser(target); else await suspendUser(target); }else{ alert(`User ${uname} not found in user list.`); } }}
                                  style={{padding:'0.45rem 0.75rem',borderRadius:'7px',background:isTerminate?'rgba(220,61,34,0.08)':'rgba(247,154,50,0.08)',border:`1px solid ${isTerminate?'rgba(220,61,34,0.2)':'rgba(247,154,50,0.2)'}`,color:isTerminate?'#f2704a':'#f79a32',fontSize:'0.75rem',fontWeight:600,cursor:'pointer',textAlign:'left'}}>
                                  {isTerminate?'🗑️':'🚫'} {btn.label}<br/><span style={{fontSize:'0.65rem',opacity:0.7,fontWeight:400}}>{uname}</span>
                                </button>
                              );
                            })}
                          </div>
                        </C>
                      </>
                    ) : (
                      <C>
                        <h3 style={{margin:'0 0 0.65rem',fontSize:'0.85rem'}}>⚖️ Resolution Panel</h3>
                        <div style={{display:'flex',flexDirection:'column',gap:'0.6rem'}}>
                          <div><Label>Verdict</Label>
                            <select value={resolveForm.resolution} onChange={e=>setResolveForm(p=>({...p,resolution:e.target.value}))} style={{width:'100%'}}>
                              <option value="buyer_favor">Buyer Favor — full refund</option>
                              <option value="seller_favor">Seller Favor — release funds</option>
                              <option value="partial_refund">Partial Refund</option>
                              <option value="full_refund">Full Refund</option>
                              <option value="no_action">No Action</option>
                            </select>
                          </div>
                          <div><Label>Resolution Details (visible to both parties)</Label><textarea rows={3} value={resolveForm.resolution_details} onChange={e=>setResolveForm(p=>({...p,resolution_details:e.target.value}))} placeholder="Explain the resolution…" style={{width:'100%',resize:'none'}}/></div>
                          <div><Label>Admin Notes (internal audit trail only)</Label><textarea rows={2} value={resolveForm.admin_notes} onChange={e=>setResolveForm(p=>({...p,admin_notes:e.target.value}))} placeholder="Internal notes…" style={{width:'100%',resize:'none'}}/></div>
                          <label style={{display:'flex',alignItems:'center',gap:'0.5rem',cursor:'pointer',fontSize:'0.78rem',color:'#f2704a'}}>
                            <input type="checkbox" checked={resolveForm.slash_stake} onChange={e=>setResolveForm(p=>({...p,slash_stake:e.target.checked}))} style={{accentColor:'#dc3d22'}}/>
                            Slash seller stake (financial penalty for scam)
                          </label>
                          <button onClick={resolveDispute} disabled={resolving} className="btn btn-primary" style={{justifyContent:'center',opacity:resolving?0.6:1}}>
                            {resolving?<><span className="spinner" style={{width:'13px',height:'13px',borderWidth:'2px'}}/> Resolving…</>:'⚖️ Resolve Dispute'}
                          </button>
                        </div>
                      </C>
                    )}
                  </>)}
                </div>
              </div>
            )}

            {/* ══ USERS ════════════════════════════════════════════ */}
            {section==='users' && (
              <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.4rem'}}>
                  <h2 style={{margin:0,fontSize:'0.78rem',fontWeight:600,color:'#8a7359',textTransform:'uppercase',letterSpacing:'0.05em'}}>User Management ({users.length} users)</h2>
                  <div style={{display:'flex',gap:'0.4rem',fontSize:'0.7rem'}}>
                    <span style={{padding:'0.2rem 0.5rem',borderRadius:'5px',background:'rgba(220,61,34,0.1)',color:'#f2704a'}}>🚫 {suspendedUsers.length} suspended</span>
                    <span style={{padding:'0.2rem 0.5rem',borderRadius:'5px',background:'rgba(136,155,74,0.1)',color:'#a0b85e'}}>✓ {users.filter(u=>u.is_verified).length} verified</span>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'2fr 0.8fr 0.8fr 0.8fr 0.8fr 1.5fr',gap:'0.5rem',padding:'0 1rem',marginBottom:'0.1rem'}}>
                  {['User / Joined','Type','Verified','Status','Wallet','Actions'].map(h=><TH key={h}>{h}</TH>)}
                </div>
                {loading ? <div style={{height:'200px',borderRadius:'10px',background:'rgba(60,40,24,0.5)'}}/> :
                 users.length===0 ? <p style={{color:'#5c4228'}}>No users.</p> :
                 users.map(u=>(
                  <C key={u.id} style={{padding:'0.6rem 1rem',borderColor:!u.is_active?'rgba(220,61,34,0.25)':u.is_suspended?'rgba(247,154,50,0.2)':''}}>
                    <div style={{display:'grid',gridTemplateColumns:'2fr 0.8fr 0.8fr 0.8fr 0.8fr 1.5fr',gap:'0.5rem',alignItems:'center'}}>
                      <div>
                        <p style={{margin:0,fontSize:'0.78rem',fontWeight:600,color:u.is_staff?'#f79a32':u.is_suspended?'#8a7359':'#d3af86'}}>{u.username}{u.is_staff&&' 👑'}</p>
                        <p style={{margin:0,fontSize:'0.65rem',color:'#5c4228'}}>{fmtDate(u.date_joined)} · rep {Number(u.reputation_score).toFixed(1)}</p>
                      </div>
                      <div>{pill(u.user_type)}</div>
                      <div><span style={{fontSize:'0.72rem',color:u.is_verified?'#a0b85e':'#8a7359'}}>{u.is_verified?'✓ Yes':'✗ No'}</span></div>
                      <div>{!u.is_active?pill('terminated'):u.is_suspended?pill('suspended'):pill('active')}</div>
                      <div style={{fontSize:'0.75rem',color:'#f79a32',fontWeight:600}}>₦{(u.wallet_balance??0).toLocaleString()}</div>
                      <div style={{display:'flex',gap:'0.25rem',flexWrap:'wrap'}}>
                        {!u.is_staff && u.is_active && !u.is_suspended && (
                          <button onClick={()=>suspendUser(u)} style={{padding:'0.18rem 0.45rem',borderRadius:'5px',background:'rgba(247,154,50,0.1)',border:'1px solid rgba(247,154,50,0.25)',color:'#f79a32',fontSize:'0.65rem',cursor:'pointer',fontWeight:600}}>🚫 Suspend</button>
                        )}
                        {!u.is_staff && u.is_suspended && u.is_active && (
                          <button onClick={()=>unsuspendUser(u)} style={{padding:'0.18rem 0.45rem',borderRadius:'5px',background:'rgba(136,155,74,0.1)',border:'1px solid rgba(136,155,74,0.25)',color:'#a0b85e',fontSize:'0.65rem',cursor:'pointer',fontWeight:600}}>✓ Lift</button>
                        )}
                        {!u.is_staff && u.is_active && (
                          <button onClick={()=>terminateUser(u)} style={{padding:'0.18rem 0.45rem',borderRadius:'5px',background:'rgba(220,61,34,0.08)',border:'1px solid rgba(220,61,34,0.2)',color:'#f2704a',fontSize:'0.65rem',cursor:'pointer',fontWeight:600}}>🗑️ Terminate</button>
                        )}
                        <button onClick={()=>{setComposeTarget(u.username);setComposeOpen(true);setSection('messages');}} style={{padding:'0.18rem 0.45rem',borderRadius:'5px',background:'rgba(57,173,181,0.08)',border:'1px solid rgba(57,173,181,0.2)',color:'#39adb5',fontSize:'0.65rem',cursor:'pointer',fontWeight:600}}>✉ Msg</button>
                      </div>
                    </div>
                  </C>
                ))}
              </div>
            )}

            {/* ══ ANTI-SCAM ════════════════════════════════════════ */}
            {section==='antiscam' && (
              <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
                <h2 style={{margin:0,fontSize:'0.78rem',fontWeight:600,color:'#8a7359',textTransform:'uppercase',letterSpacing:'0.05em'}}>🛡️ Anti-Scam & Fraud Prevention Panel</h2>
                <p style={{fontSize:'0.78rem',color:'#8a7359',margin:'0 0 0.5rem',lineHeight:1.6}}>All security and fraud prevention measures implemented on the platform, surfaced here for rapid admin oversight.</p>

                {/* Metric cards */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.65rem'}}>
                  {[
                    {label:'Sellers with Active Stake',value:users.filter(u=>u.user_type==='seller'&&Number(u.stake_balance)>0).length,total:users.filter(u=>u.user_type==='seller').length,icon:'🔐',color:'#a0b85e',good:true,desc:'Stake = financial skin-in-game deterrent'},
                    {label:'Sellers with 0 Stake',value:users.filter(u=>u.user_type==='seller'&&Number(u.stake_balance)===0).length,total:users.filter(u=>u.user_type==='seller').length,icon:'⚠️',color:'#f79a32',good:false,desc:'At-risk: no financial accountability'},
                    {label:'Email-Verified Users',value:users.filter(u=>u.is_verified).length,total:users.length,icon:'✉️',color:'#a0b85e',good:true,desc:'OTP email verification completed'},
                    {label:'Pending Demo Reviews',value:pendingDemos.length,total:demos.length,icon:'🎯',color:pendingDemos.length>0?'#f2704a':'#a0b85e',good:pendingDemos.length===0,desc:'Seller demo submissions awaiting admin approval'},
                    {label:'Open/Investigating Disputes',value:openDisputes.length,total:disputes.length,icon:'⚖️',color:openDisputes.length>0?'#f79a32':'#a0b85e',good:openDisputes.length===0,desc:'Active escrow disputes in review'},
                    {label:'Suspended Accounts',value:suspendedUsers.length,total:users.length,icon:'🚫',color:suspendedUsers.length>0?'#f2704a':'#a0b85e',good:suspendedUsers.length===0,desc:'Accounts suspended by admin action'},
                  ].map(m=>(
                    <C key={m.label} style={{padding:'0.9rem'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.4rem'}}>
                        <span style={{fontSize:'1.1rem'}}>{m.icon}</span>
                        <span style={{fontSize:'0.65rem',color:'#5c4228'}}>{m.total!==undefined?`/ ${m.total} total`:''}</span>
                      </div>
                      <div style={{fontSize:'1.45rem',fontWeight:800,color:m.color,marginBottom:'0.15rem'}}>{m.value}</div>
                      <div style={{fontSize:'0.72rem',fontWeight:600,color:'#c0a472',marginBottom:'0.2rem'}}>{m.label}</div>
                      <div style={{fontSize:'0.65rem',color:'#5c4228',lineHeight:1.4}}>{m.desc}</div>
                    </C>
                  ))}
                </div>

                {/* ── Sub Views ── */}
                {antiscamSubView === 'main' ? (
                  <C>
                    <h3 style={{fontSize:'0.85rem',margin:'0 0 0.85rem'}}>🔒 Fraud Prevention & Oversight Engines</h3>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
                      <div className="card" onClick={()=>setAntiscamSubView('suspensions')} style={{padding:'0.8rem',cursor:'pointer',border:'1px solid rgba(247,154,50,0.4)',background:'rgba(247,154,50,0.05)'}}>
                        <h4 style={{margin:'0 0 0.2rem',fontSize:'0.8rem',color:'#f79a32'}}>🚫 Suspension Engine</h4>
                        <p style={{margin:0,fontSize:'0.65rem',color:'#8a7359'}}>View active suspensions, timers, drafted user alerts, and penalize accounts.</p>
                      </div>
                      <div className="card" onClick={()=>setAntiscamSubView('stakes')} style={{padding:'0.8rem',cursor:'pointer',border:'1px solid rgba(160,184,94,0.4)',background:'rgba(160,184,94,0.05)'}}>
                        <h4 style={{margin:'0 0 0.2rem',fontSize:'0.8rem',color:'#a0b85e'}}>💰 Seller Stake Proceedings</h4>
                        <p style={{margin:0,fontSize:'0.65rem',color:'#8a7359'}}>Audit all stake locks, releases, and dispute-slashes.</p>
                      </div>
                      <div className="card" onClick={()=>setAntiscamSubView('escrow')} style={{padding:'0.8rem',cursor:'pointer',border:'1px solid rgba(57,173,181,0.4)',background:'rgba(57,173,181,0.05)'}}>
                        <h4 style={{margin:'0 0 0.2rem',fontSize:'0.8rem',color:'#39adb5'}}>🤝 Escrow Transparency</h4>
                        <p style={{margin:0,fontSize:'0.65rem',color:'#8a7359'}}>Audit transaction escrow statuses, forced releases, and auto-releases.</p>
                      </div>
                      <div className="card" onClick={()=>setAntiscamSubView('verified')} style={{padding:'0.8rem',cursor:'pointer',border:'1px solid rgba(136,184,94,0.4)',background:'rgba(136,184,94,0.05)'}}>
                        <h4 style={{margin:'0 0 0.2rem',fontSize:'0.8rem',color:'#a0b85e'}}>✉️ Verified Users Registry</h4>
                        <p style={{margin:0,fontSize:'0.65rem',color:'#8a7359'}}>List of all platform users who have successfully passed OTP validation.</p>
                      </div>
                      <div className="card" onClick={()=>setSection('disputes')} style={{padding:'0.8rem',cursor:'pointer',border:'1px solid rgba(220,61,34,0.4)',background:'rgba(220,61,34,0.05)'}}>
                        <h4 style={{margin:'0 0 0.2rem',fontSize:'0.8rem',color:'#f2704a'}}>⚖️ Dispute Arbitrations</h4>
                        <p style={{margin:0,fontSize:'0.65rem',color:'#8a7359'}}>Resolve active fraud claims between buyers and sellers.</p>
                      </div>
                    </div>
                  </C>
                ) : antiscamSubView === 'suspensions' ? (
                  <C>
                    <button onClick={()=>setAntiscamSubView('main')} style={{background:'none',border:'none',color:'#a0b85e',fontSize:'0.75rem',cursor:'pointer',padding:0,marginBottom:'1rem'}}>← Back to Oversight Settings</button>
                    <h3 style={{fontSize:'0.9rem',margin:'0 0 0.85rem',color:'#f79a32'}}>🚫 Active Suspensions Engine</h3>
                    {/* Active Form */}
                    {suspendForm.user && (
                      <div style={{background:'rgba(247,154,50,0.1)',border:'1px solid rgba(247,154,50,0.3)',padding:'1rem',borderRadius:'8px',marginBottom:'1rem'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.5rem'}}>
                          <h4 style={{margin:0,color:'#f79a32',fontSize:'0.8rem'}}>Initiate Suspension for {suspendForm.user.username}</h4>
                          <button onClick={()=>setSuspendForm({user:null,days:7,reason:''})} style={{background:'none',border:'none',color:'#a0b85e',fontSize:'0.7rem',cursor:'pointer'}}>Cancel</button>
                        </div>
                        <div style={{display:'grid',gap:'0.5rem'}}>
                          <div><Label>Duration (Days)</Label><input type="number" min="1" value={suspendForm.days} onChange={e=>setSuspendForm(p=>({...p,days:Number(e.target.value)}))} style={{width:'100%',background:'rgba(0,0,0,0.2)',border:'1px solid #4b3422',color:'#d3af86',padding:'0.4rem'}}/></div>
                          <div><Label>Reason (Sent to user & logged)</Label><textarea value={suspendForm.reason} onChange={e=>setSuspendForm(p=>({...p,reason:e.target.value}))} style={{width:'100%',background:'rgba(0,0,0,0.2)',border:'1px solid #4b3422',color:'#d3af86',padding:'0.4rem',resize:'none',height:'60px'}}/></div>
                          <button onClick={executeSuspension} style={{padding:'0.5rem',background:'#f2704a',color:'#fff',border:'none',borderRadius:'5px',cursor:'pointer',fontWeight:700}}>Execute Suspension</button>
                        </div>
                      </div>
                    )}
                    {/* Termination Form */}
                    {terminateForm.user && (
                      <div style={{background:'rgba(220,61,34,0.1)',border:'1px solid rgba(220,61,34,0.3)',padding:'1rem',borderRadius:'8px',marginBottom:'1rem'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.5rem'}}>
                          <h4 style={{margin:0,color:'#dc3d22',fontSize:'0.8rem'}}>Initiate Permanent Termination for {terminateForm.user.username}</h4>
                          <button onClick={()=>setTerminateForm({user:null,reason:''})} style={{background:'none',border:'none',color:'#a0b85e',fontSize:'0.7rem',cursor:'pointer'}}>Cancel</button>
                        </div>
                        <div style={{display:'grid',gap:'0.5rem'}}>
                          <div><Label>Termination Reason</Label><textarea value={terminateForm.reason} onChange={e=>setTerminateForm(p=>({...p,reason:e.target.value}))} style={{width:'100%',background:'rgba(0,0,0,0.2)',border:'1px solid #4b3422',color:'#d3af86',padding:'0.4rem',resize:'none',height:'60px'}}/></div>
                          <button onClick={executeTermination} style={{padding:'0.5rem',background:'#dc3d22',color:'#fff',border:'none',borderRadius:'5px',cursor:'pointer',fontWeight:700}}>Permanently Terminate Account</button>
                        </div>
                      </div>
                    )}

                    {/* Quick Initiate Selection */}
                    {!suspendForm.user && !terminateForm.user && (
                      <div style={{background:'rgba(60,40,24,0.5)',border:'1px solid rgba(75,52,34,0.4)',padding:'0.75rem',borderRadius:'5px',marginBottom:'1rem',display:'flex',gap:'0.5rem',alignItems:'center'}}>
                        <Label>Target Action:</Label>
                        <select id="scam-target-select" style={{background:'rgba(0,0,0,0.2)',border:'1px solid #4b3422',color:'#d3af86',padding:'0.3rem',flex:1}}>
                          <option value="">-- Select an active user --</option>
                          {users.filter(u=>!u.is_staff && u.is_active).map(u => (
                            <option key={u.id} value={u.id}>{u.username} {u.is_suspended ? '(Already Suspended)' : ''}</option>
                          ))}
                        </select>
                        <button onClick={()=>{
                          const el = document.getElementById('scam-target-select') as HTMLSelectElement;
                          if(!el.value) return; const t = users.find(x=>x.id.toString()===el.value);
                          if(t) suspendUser(t);
                        }} style={{padding:'0.3rem 0.6rem',background:'rgba(247,154,50,0.2)',color:'#f79a32',border:'1px solid rgba(247,154,50,0.4)',borderRadius:'5px',cursor:'pointer',fontSize:'0.7rem'}}>🚫 Draft Suspension</button>
                        <button onClick={()=>{
                          const el = document.getElementById('scam-target-select') as HTMLSelectElement;
                          if(!el.value) return; const t = users.find(x=>x.id.toString()===el.value);
                          if(t) terminateUser(t);
                        }} style={{padding:'0.3rem 0.6rem',background:'rgba(220,61,34,0.1)',color:'#dc3d22',border:'1px solid rgba(220,61,34,0.4)',borderRadius:'5px',cursor:'pointer',fontSize:'0.7rem'}}>🗑️ Draft Termination</button>
                      </div>
                    )}

                    {/* List */}
                    <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
                      {suspendedUsers.length===0 && users.filter(u=>!u.is_active).length===0 ? <p style={{color:'#8a7359'}}>No active suspensions or terminations.</p> : null}
                      
                      {/* Suspended */}
                      {suspendedUsers.filter(u=>u.is_active).map(u => (
                        <div key={u.id} style={{padding:'0.75rem',background:'rgba(0,0,0,0.2)',border:'1px solid rgba(247,154,50,0.3)',borderRadius:'5px'}}>
                          <div style={{display:'flex',justifyContent:'space-between'}}>
                            <strong style={{color:'#f79a32'}}>🚫 {u.username} <span style={{fontSize:'0.65rem',opacity:0.6}}>(Suspended)</span></strong>
                            <button onClick={()=>unsuspendUser(u)} style={{background:'none',border:'none',color:'#a0b85e',cursor:'pointer',fontSize:'0.7rem',textDecoration:'underline'}}>Lift Suspension</button>
                          </div>
                          <div style={{fontSize:'0.7rem',color:'#8a7359',marginTop:'0.3rem'}}>
                            <div><strong>Cause:</strong> {u.suspension_reason || 'Admin action'}</div>
                            {u.suspended_until && <div><strong>Time Remaining:</strong> Auto-lifts on {new Date(u.suspended_until).toLocaleString()}</div>}
                            <div style={{marginTop:'0.4rem',padding:'0.4rem',background:'rgba(255,255,255,0.05)',fontStyle:'italic',borderLeft:'2px solid #5c4228'}}>
                              &quot;🚨 YOUR ACCOUNT HAS BEEN SUSPENDED 🚨<br/>Reason: {u.suspension_reason || 'Admin action'}&quot; <span style={{color:'#39adb5',fontSize:'0.6rem'}}>(Drafted message sent to Inbox)</span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Terminated */}
                      {users.filter(u=>!u.is_active).map(u => (
                        <div key={u.id} style={{padding:'0.75rem',background:'rgba(220,61,34,0.05)',border:'1px solid rgba(220,61,34,0.3)',borderRadius:'5px'}}>
                          <div style={{display:'flex',justifyContent:'space-between'}}>
                            <strong style={{color:'#dc3d22'}}>🗑️ {u.username} <span style={{fontSize:'0.65rem',opacity:0.6}}>(Terminated)</span></strong>
                          </div>
                          <div style={{fontSize:'0.7rem',color:'#f2704a',marginTop:'0.3rem'}}>
                            <div><strong>Cause:</strong> {u.termination_reason || 'Permanent ban initiated by Security Command. Account locked at DB level; cannot log in.'}</div>
                            <div style={{marginTop:'0.4rem'}}><strong>Total Listings Purged:</strong> {u.total_listings || 0}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </C>
                ) : antiscamSubView === 'stakes' ? (
                  <C>
                    <button onClick={()=>setAntiscamSubView('main')} style={{background:'none',border:'none',color:'#a0b85e',fontSize:'0.75rem',cursor:'pointer',padding:0,marginBottom:'1rem'}}>← Back to Oversight Settings</button>
                    <h3 style={{fontSize:'0.9rem',margin:'0 0 0.85rem',color:'#a0b85e'}}>💰 Seller Stake Proceedings</h3>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 2fr 1.5fr',gap:'0.5rem',padding:'0 0.5rem',borderBottom:'1px solid #4b3422',paddingBottom:'0.5rem',marginBottom:'0.5rem',fontSize:'0.7rem',fontWeight:700,color:'#8a7359'}}>
                      <div>Log Date</div><div>Seller</div><div>Event/Reason</div><div>Amount / Status</div>
                    </div>
                    {stakeLogs.length===0 ? <p style={{color:'#8a7359'}}>No stake logs found.</p> : stakeLogs.map(s => (
                      <div key={s.id} style={{display:'grid',gridTemplateColumns:'1fr 1fr 2fr 1.5fr',gap:'0.5rem',padding:'0.5rem',borderBottom:'1px solid rgba(75,52,34,0.3)',fontSize:'0.75rem',color:'#d3af86',alignItems:'center'}}>
                        <div>{fmtDate(s.created_at)}</div>
                        <div style={{color:'#f79a32'}}>{s.user}</div>
                        <div>{s.lock_reason} {s.transaction_id&&<span style={{opacity:0.5}}>(Txn {s.transaction_id.slice(0,6)})</span>}</div>
                        <div style={{fontWeight:600}}>{s.is_locked?<span style={{color:'#dc3d22'}}>-₦{s.amount.toLocaleString()} (Locked)</span>:<span style={{color:'#a0b85e'}}>+₦{s.amount.toLocaleString()} (Released)</span>}</div>
                      </div>
                    ))}
                  </C>
                ) : antiscamSubView === 'escrow' ? (
                  <C>
                    <button onClick={()=>setAntiscamSubView('main')} style={{background:'none',border:'none',color:'#a0b85e',fontSize:'0.75rem',cursor:'pointer',padding:0,marginBottom:'1rem'}}>← Back to Oversight Settings</button>
                    <h3 style={{fontSize:'0.9rem',margin:'0 0 0.85rem',color:'#39adb5'}}>🤝 Escrow Releases Audit Log</h3>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1.5fr 1fr 1fr',gap:'0.5rem',padding:'0 0.5rem',borderBottom:'1px solid #4b3422',paddingBottom:'0.5rem',marginBottom:'0.5rem',fontSize:'0.7rem',fontWeight:700,color:'#8a7359'}}>
                      <div>Date</div><div>Transaction ID</div><div>Triggered By</div><div>Method</div>
                    </div>
                    {escrowLogs.length===0 ? <p style={{color:'#8a7359'}}>No escrow actions logged.</p> : escrowLogs.map(e => (
                      <div key={e.id} style={{display:'grid',gridTemplateColumns:'1fr 1.5fr 1fr 1fr',gap:'0.5rem',padding:'0.5rem',borderBottom:'1px solid rgba(75,52,34,0.3)',fontSize:'0.75rem',color:'#d3af86',alignItems:'center'}}>
                        <div>{fmtDate(e.released_at)}</div>
                        <div style={{color:'#5c4228'}}>{e.transaction_id}</div>
                        <div style={{color:'#f79a32'}}>{e.released_by}</div>
                        <div><span style={{padding:'0.1rem 0.3rem',background:'rgba(57,173,181,0.1)',color:'#39adb5',borderRadius:'4px'}}>{e.release_type}</span></div>
                      </div>
                    ))}
                  </C>
                ) : antiscamSubView === 'verified' ? (
                  <C>
                    <button onClick={()=>setAntiscamSubView('main')} style={{background:'none',border:'none',color:'#a0b85e',fontSize:'0.75rem',cursor:'pointer',padding:0,marginBottom:'1rem'}}>← Back to Oversight Settings</button>
                    <h3 style={{fontSize:'0.9rem',margin:'0 0 0.85rem',color:'#a0b85e'}}>✉️ Validated User Integrity Registry</h3>
                    <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
                      {users.filter(u=>u.is_verified).length===0 ? <p style={{color:'#8a7359'}}>No verified users yet.</p> : 
                        users.filter(u=>u.is_verified).map(u => (
                          <div key={u.id} style={{padding:'0.5rem 0.8rem',borderRadius:'999px',background:'rgba(136,155,74,0.1)',border:'1px solid rgba(136,155,74,0.3)',color:'#a0b85e',fontSize:'0.75rem',display:'flex',alignItems:'center',gap:'0.4rem'}}>
                            <span>✓</span> <strong>{u.username}</strong>
                            <span style={{opacity:0.6, fontSize:'0.65rem'}}>({u.user_type})</span>
                          </div>
                      ))}
                    </div>
                  </C>
                ) : null}

                {/* Pending demos */}
                {pendingDemos.length>0 && (
                  <C style={{borderColor:'rgba(220,61,34,0.2)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.65rem'}}>
                      <h3 style={{margin:0,fontSize:'0.85rem',color:'#f2704a'}}>🎯 Pending Demo Reviews ({pendingDemos.length})</h3>
                      <span style={{padding:'0.18rem 0.5rem',borderRadius:'999px',background:'rgba(220,61,34,0.12)',border:'1px solid rgba(220,61,34,0.2)',color:'#f2704a',fontSize:'0.68rem',fontWeight:600}}>{pendingDemos.length} awaiting</span>
                    </div>
                    {pendingDemos.map(d=>(
                      <div key={d.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.5rem 0.7rem',borderRadius:'7px',background:'#3c2818',border:'1px solid rgba(75,52,34,0.5)',marginBottom:'0.35rem'}}>
                        <div>
                          <span style={{fontSize:'0.78rem',fontWeight:600,color:'#d3af86'}}>{d.listing_title||`Listing ${d.listing}`}</span>
                          <p style={{margin:0,fontSize:'0.68rem',color:'#8a7359'}}>Category: {d.demo_category}{d.seller_username&&` · ${d.seller_username}`} · {fmtAge(d.created_at)}</p>
                        </div>
                        <div style={{display:'flex',gap:'0.35rem'}}>
                          <button onClick={()=>approveDemo(d.id)} style={{padding:'0.3rem 0.65rem',borderRadius:'6px',background:'rgba(136,155,74,0.15)',border:'1px solid rgba(136,155,74,0.35)',color:'#a0b85e',fontSize:'0.72rem',fontWeight:600,cursor:'pointer'}}>✓ Approve</button>
                          <button onClick={()=>rejectDemo(d.id)} style={{padding:'0.3rem 0.65rem',borderRadius:'6px',background:'rgba(220,61,34,0.08)',border:'1px solid rgba(220,61,34,0.2)',color:'#f2704a',fontSize:'0.72rem',fontWeight:600,cursor:'pointer'}}>✗ Reject</button>
                        </div>
                      </div>
                    ))}
                  </C>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Listing Edit Modal ── */}
      {editListing && (
        <div onClick={()=>setEditListing(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.72)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:'1.5rem'}}>
          <div onClick={e=>e.stopPropagation()} className="card" style={{maxWidth:'480px',width:'100%',padding:'1.5rem'}}>
            <h3 style={{fontSize:'0.95rem',marginBottom:'0.75rem'}}>✏️ Edit Listing</h3>
            <div style={{display:'flex',flexDirection:'column',gap:'0.6rem'}}>
              <div><Label>Title</Label><input value={editForm.title} onChange={e=>setEditForm(p=>({...p,title:e.target.value}))} style={{width:'100%'}}/></div>
              <div><Label>Price (₦)</Label><input type="number" value={editForm.price} onChange={e=>setEditForm(p=>({...p,price:e.target.value}))} style={{width:'100%'}}/></div>
              <div><Label>Status</Label>
                <select value={editForm.status} onChange={e=>setEditForm(p=>({...p,status:e.target.value}))} style={{width:'100%'}}>
                  {['active','draft','pending_verification','removed','flagged'].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><Label>Preview Content</Label><textarea rows={3} value={editForm.preview_content} onChange={e=>setEditForm(p=>({...p,preview_content:e.target.value}))} style={{width:'100%',resize:'none'}}/></div>
            </div>
            <div style={{display:'flex',gap:'0.5rem',marginTop:'0.85rem'}}>
              <button onClick={()=>setEditListing(null)} className="btn btn-ghost" style={{flex:1,justifyContent:'center'}}>Cancel</button>
              <button onClick={saveEditListing} disabled={editSaving} className="btn btn-primary" style={{flex:2,justifyContent:'center',opacity:editSaving?0.6:1}}>
                {editSaving?'Saving…':'✏️ Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Compose Modal ── */}
      {composeOpen && (
        <div onClick={()=>setComposeOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:'1.5rem'}}>
          <div onClick={e=>e.stopPropagation()} className="card" style={{maxWidth:'420px',width:'100%',padding:'1.5rem'}}>
            <h3 style={{fontSize:'0.95rem',marginBottom:'0.35rem'}}>📨 New Admin Message</h3>
            <p style={{fontSize:'0.75rem',color:'#8a7359',marginBottom:'1rem'}}>Send a direct admin message to any user (buyer, seller, or specific username).</p>
            <Label>Recipient Username</Label>
            <input value={composeTarget} onChange={e=>setComposeTarget(e.target.value)} placeholder="e.g. silent_trader_123" style={{width:'100%',marginBottom:'0.75rem'}}/>
            <Label>Message</Label>
            <textarea value={composeMsg} onChange={e=>setComposeMsg(e.target.value)} rows={4} placeholder="Type your admin message…" style={{width:'100%',resize:'none',marginBottom:'0.5rem'}}/>
            {composeErr && <p style={{fontSize:'0.72rem',color:'#f2704a',marginBottom:'0.5rem'}}>⚠️ {composeErr}</p>}
            <div style={{display:'flex',gap:'0.5rem'}}>
              <button onClick={()=>setComposeOpen(false)} className="btn btn-ghost" style={{flex:1,justifyContent:'center'}}>Cancel</button>
              <button onClick={sendCompose} disabled={composeSending||!composeTarget.trim()||!composeMsg.trim()} className="btn btn-primary" style={{flex:2,justifyContent:'center',opacity:composeSending||!composeTarget.trim()||!composeMsg.trim()?0.5:1}}>
                {composeSending?'Sending…':'📨 Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

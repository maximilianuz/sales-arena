import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import {
  Shuffle, Copy, ChessKnight, BookOpen,
  Zap, History, Target, TrendingUp, Theater, Eye,
  ArrowRight, CheckCircle2, LogOut, BarChart2, Users, User, X, Trophy, Briefcase, Target as TargetIcon,
  FileText, Lock, Shield
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSubscriptionContext } from '../contexts/SubscriptionContext';
import { GROUP_ONLY_MODE } from '../config/appMode';
import { signOutUser } from '../utils/auth';
import { joinCohort } from '../utils/cohort';
import { auth, db } from '../utils/db';
import HistoryPage from './History';
import TrainerAnalytics from './TrainerAnalytics';
import Leaderboard from './Leaderboard';
import Scouting from './Scouting';
import ScoutingModal from '../components/ScoutingModal';
import LevelCard from '../components/LevelCard';
import ProgressPath from '../components/ProgressPath';
// Carga diferida: SoloPractice arrastra la librería de avatares (DiceBear); solo
// se baja cuando el usuario abre "Practicar solo".
const SoloPractice = lazy(() => import('./SoloPractice'));
// Generador de Propuestas VIP: módulo aparte que se abre desde el Lobby.
const ProposalGenerator = lazy(() => import('../modules/proposals/ProposalGenerator'));
// Panel de Administración: solo para admins
const AdminPanel = lazy(() => import('./AdminPanel'));

const ROLE_META = {
  Facilitador: { icon: <Target size={22} />, color: '#6366f1', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  Closer:      { icon: <TrendingUp size={22} />, color: '#30d158', gradient: 'linear-gradient(135deg,#30d158,#06b6d4)' },
  Lead:        { icon: <Theater size={22} />, color: '#ff9f0a', gradient: 'linear-gradient(135deg,#ff9f0a,#ff453a)' },
  Observador:  { icon: <Eye size={22} />, color: '#8b5cf6', gradient: 'linear-gradient(135deg,#8b5cf6,#ff375f)' }
};

// Encabezado de sección del Lobby: etiqueta uppercase + chip opcional + línea.
// El chip (badge) distingue de un vistazo lo INDIVIDUAL de lo GRUPAL.
function SectionLabel({ children, badge, badgeAccent = '139,92,246' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.9rem' }}>
      <span style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{children}</span>
      {badge && (
        <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.12rem 0.55rem', borderRadius: '2rem', background: `rgba(${badgeAccent},0.12)`, border: `1px solid rgba(${badgeAccent},0.35)`, color: `rgb(${badgeAccent})`, whiteSpace: 'nowrap' }}>{badge}</span>
      )}
      <span style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
    </div>
  );
}

function FeatureButton({ icon, label, accent, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        padding: '0.65rem 1.25rem 0.65rem 0.65rem',
        borderRadius: '2rem', cursor: 'pointer',
        background: hover
          ? `linear-gradient(135deg, rgba(${accent},0.28), rgba(${accent},0.14))`
          : `rgba(${accent},0.08)`,
        border: `1px solid rgba(${accent},${hover ? 0.6 : 0.3})`,
        color: 'white', fontSize: '0.9rem', fontWeight: '700',
        boxShadow: hover ? `0 8px 24px rgba(${accent},0.35)` : `0 2px 8px rgba(0,0,0,0.2)`,
        transform: hover ? 'translateY(-2px)' : 'none',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        backdropFilter: 'blur(12px)'
      }}
    >
      <span style={{
        width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(135deg, rgb(${accent}), rgba(${accent},0.6))`,
        color: 'white', boxShadow: `0 2px 10px rgba(${accent},0.4)`
      }}>
        {icon}
      </span>
      {label}
    </button>
  );
}

export default function Lobby() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isFree, isPaid, tier, openPlans } = useSubscriptionContext() || {};
  const [showHistory, setShowHistory] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showScouting, setShowScouting] = useState(false);
  const [showScoutingModal, setShowScoutingModal] = useState(false);
  const [showSolo, setShowSolo] = useState(false);
  const [showProposals, setShowProposals] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showJoinCohort, setShowJoinCohort] = useState(false);
  const [cohortCodeInput, setCohortCodeInput] = useState('');
  const [joinMsg, setJoinMsg] = useState('');
  const [joining, setJoining] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [roomId, setRoomId] = useState('');
  const [copied, setCopied] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  // Espacio de trabajo: '' = todavía no eligió (muestra las 2 tarjetas grandes),
  // 'individual' | 'team'. Se persiste para aterrizar siempre donde trabaja,
  // con un switcher para cambiar. Así no se ve TODO en una misma pantalla.
  const [workspace, setWorkspace] = useState(() => {
    // Modo solo-grupal: siempre se aterriza en "Equipos"; no hay espacio individual.
    if (GROUP_ONLY_MODE) return 'team';
    try { return localStorage.getItem('lobbyWorkspace') || ''; } catch { return ''; }
  });
  const chooseWorkspace = (w) => {
    if (GROUP_ONLY_MODE) return; // en modo solo-grupal no se cambia de espacio
    setWorkspace(w);
    try { localStorage.setItem('lobbyWorkspace', w); } catch { /* sin storage */ }
  };

  const isEn = i18n.language?.startsWith('en');

  const handleJoinCohort = async () => {
    if (!cohortCodeInput.trim()) return;
    setJoining(true); setJoinMsg('');
    try {
      await joinCohort(cohortCodeInput);
      setJoinMsg(isEn ? '✓ Joined! Your sessions will be shared with your trainer.' : '✓ ¡Te uniste! Tus sesiones se compartirán con tu trainer.');
      setCohortCodeInput('');
      setTimeout(() => setShowJoinCohort(false), 2000);
    } catch (e) {
      const msg = e.message === 'code_not_found' ? (isEn ? 'Code not found.' : 'Código no encontrado.')
        : e.message === 'cant_join_own' ? (isEn ? "You can't join your own cohort." : 'No podés unirte a tu propio cohorte.')
        : e.message;
      setJoinMsg('⚠️ ' + msg);
    } finally {
      setJoining(false);
    }
  };

  const roles = [
    { id: 'Facilitador', label: t('lobby.roles.Facilitador'), desc: t('lobby.roles.FacilitadorDesc') },
    { id: 'Closer',      label: t('lobby.roles.Closer'),      desc: t('lobby.roles.CloserDesc') },
    { id: 'Lead',        label: t('lobby.roles.Lead'),        desc: t('lobby.roles.LeadDesc') },
    { id: 'Observador',  label: t('lobby.roles.Observador'),  desc: t('lobby.roles.ObservadorDesc') }
  ];

  // Navegación con teclado dentro del grupo de roles (patrón radiogroup):
  // ← ↑ anterior, → ↓ siguiente, Home/End extremos. Selecciona al mover.
  const handleRoleKeyDown = (e, idx) => {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (e.key in keys) {
      e.preventDefault();
      const next = (idx + keys[e.key] + roles.length) % roles.length;
      setRole(roles[next].id);
      document.getElementById(`role-opt-${roles[next].id}`)?.focus();
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const target = e.key === 'Home' ? 0 : roles.length - 1;
      setRole(roles[target].id);
      document.getElementById(`role-opt-${roles[target].id}`)?.focus();
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!name || !role || !roomId) return;
    localStorage.setItem('sales_arena_userName', name);
    localStorage.setItem('sales_arena_role', role);
    localStorage.setItem('sales_arena_roomId', roomId);
    navigate(`/room/${roomId}`);
  };

  const generateRoomId = () => setRoomId(`sala-${Math.floor(Math.random() * 90000) + 10000}`);

  const copyRoomId = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!auth.currentUser) return;
    const adminRef = ref(db, `admin/admins/${auth.currentUser.uid}`);
    const unsub = onValue(adminRef, (snap) => {
      setIsAdmin(snap.exists());
    }, () => {
      setIsAdmin(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (window.particlesJS) {
      window.particlesJS("lobby-particles", {
        particles: {
          number: { value: 50, density: { enable: true, value_area: 900 } },
          color: { value: ["#6366f1", "#30d158", "#8b5cf6"] },
          shape: { type: "circle" },
          opacity: { value: 0.3 },
          size: { value: 2.5, random: true },
          line_linked: { enable: true, distance: 140, color: "#6366f1", opacity: 0.15, width: 1 },
          move: { enable: true, speed: 0.9, direction: "top", random: true, out_mode: "out" }
        },
        interactivity: {
          detect_on: "canvas",
          events: { onhover: { enable: true, mode: "grab" }, onclick: { enable: true, mode: "push" }, resize: true },
          modes: { grab: { distance: 160, line_linked: { opacity: 0.5 } }, push: { particles_nb: 2 } }
        },
        retina_detect: true
      });
    }
  }, []);

  const canSubmit = name && role && roomId;

  // Returns condicionales DESPUÉS de todos los hooks (regla de hooks de React).
  if (showHistory) return <HistoryPage onBack={() => setShowHistory(false)} />;
  if (showAnalytics) return <TrainerAnalytics onBack={() => setShowAnalytics(false)} />;
  if (showLeaderboard) return <Leaderboard onBack={() => setShowLeaderboard(false)} />;
  if (showScouting) return <Scouting onBack={() => setShowScouting(false)} />;
  if (showSolo) return (
    <Suspense fallback={<div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--text-muted)' }}>{isEn ? 'Loading…' : 'Cargando…'}</p></div>}>
      <SoloPractice onBack={() => setShowSolo(false)} />
    </Suspense>
  );
  if (showProposals) return (
    <Suspense fallback={<div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--text-muted)' }}>{isEn ? 'Loading…' : 'Cargando…'}</p></div>}>
      <ProposalGenerator onBack={() => setShowProposals(false)} />
    </Suspense>
  );
  if (showAdmin && isAdmin) return (
    <Suspense fallback={<div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--text-muted)' }}>{isEn ? 'Loading…' : 'Cargando…'}</p></div>}>
      <AdminPanel user={auth.currentUser} onBack={() => setShowAdmin(false)} />
    </Suspense>
  );

  return (
    <div className="app-container" style={{ alignItems: 'center', overflowY: 'auto', position: 'relative', padding: '1.5rem 1rem 3rem' }}>
      <div id="lobby-particles" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      {/* ── Top navigation bar ─────────────────────────────── */}
      <nav className="lobby-nav" style={{
        position: 'absolute', top: '1rem', left: '1rem', right: '1rem', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        {/* Left: plan badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {(isFree || isPaid) && (
            <span style={{
              fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.08em',
              padding: '0.2rem 0.75rem', borderRadius: '2rem', textTransform: 'uppercase',
              background: isPaid ? 'rgba(48,209,88,0.15)' : 'rgba(255,255,255,0.06)',
              border: isPaid ? '1px solid rgba(48,209,88,0.4)' : '1px solid rgba(255,255,255,0.12)',
              color: isPaid ? 'var(--success)' : 'var(--text-muted)'
            }}>
              {isPaid ? '⚡ Pro' : isEn ? 'Free plan' : 'Plan Gratis'}
            </span>
          )}
        </div>

        {/* Right: utility actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {!GROUP_ONLY_MODE && isFree && openPlans && (
            <button onClick={openPlans} style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: 'white', border: 'none', padding: '0.35rem 0.9rem',
              borderRadius: '2rem', cursor: 'pointer', fontSize: '0.82rem',
              fontWeight: '700', boxShadow: '0 4px 14px rgba(100,210,255,0.45)'
            }}>
              <Zap size={13} /> {isEn ? 'Upgrade' : 'Mejorar Plan'}
            </button>
          )}
          {isAdmin && (
            <button onClick={() => setShowAdmin(true)} title={isEn ? 'Admin panel' : 'Panel de admin'} style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'rgba(139,92,246,0.1)', color: 'rgba(255,255,255,0.9)',
              border: '1px solid rgba(139,92,246,0.35)', padding: '0.35rem 0.8rem',
              borderRadius: '2rem', cursor: 'pointer', textDecoration: 'none', fontSize: '0.82rem'
            }}>
              <Shield size={13} /> {isEn ? 'Admin' : 'Admin'}
            </button>
          )}
          <a href={isEn ? "/presentacion_en.html" : "/presentacion.html"} target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'rgba(48,209,88,0.1)', color: 'rgba(255,255,255,0.9)',
              border: '1px solid rgba(48,209,88,0.35)', padding: '0.35rem 0.8rem',
              borderRadius: '2rem', cursor: 'pointer', textDecoration: 'none', fontSize: '0.82rem'
            }}>
            <BookOpen size={13} /> {isEn ? 'Guide' : 'Guía'}
          </a>
          <select aria-label={isEn ? 'Change language' : 'Cambiar idioma'} onChange={e => i18n.changeLanguage(e.target.value)} value={(i18n.language || 'es').split('-')[0]}
            style={{
              background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)',
              border: '1px solid var(--glass-border)', padding: '0.35rem 0.6rem',
              borderRadius: '2rem', cursor: 'pointer', fontSize: '0.82rem'
            }}>
            <option value="es" style={{ background: '#1e1e2f' }}>🇪🇸 ES</option>
            <option value="en" style={{ background: '#1e1e2f' }}>🇺🇸 EN</option>
          </select>
          <button onClick={signOutUser} title={isEn ? 'Sign out' : 'Cerrar sesión'}
            style={{
              background: 'rgba(255,69,58,0.07)', border: '1px solid rgba(255,69,58,0.2)',
              color: 'rgba(255,255,255,0.6)', borderRadius: '2rem', padding: '0.35rem 0.6rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.75rem', gap: '0.3rem'
            }}>
            <LogOut size={13} /> {isEn ? 'Exit' : 'Salir'}
          </button>
        </div>
      </nav>

      {/* ── Marca (movida fuera de la tarjeta de salas) ────── */}
      <div style={{ position: 'relative', zIndex: 1, marginTop: '4.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.7rem' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '16px',
          background: 'linear-gradient(135deg,#0a84ff 0%,#5e5ce6 55%,#4d4ad9 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)'
        }}>
          <ChessKnight size={36} color="white" strokeWidth={1.5} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.4rem', fontWeight: '700', margin: 0, lineHeight: 1, letterSpacing: '-0.03em', color: 'white' }}>
            Sales Arena
          </h1>
          <p style={{ margin: '0.45rem 0 0', fontSize: '0.72rem', fontWeight: '600', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            AI · Multiplayer · Roleplay
          </p>
        </div>
      </div>

      {/* ── Elegí tu espacio: Individual o Equipos ──────────
          Primera vez: dos tarjetas grandes. Después: switcher de pestañas.
          Solo se muestra el contenido del espacio elegido.
          En modo solo-grupal NO se muestra el selector: se entra directo a Equipos. */}
      {!GROUP_ONLY_MODE && (
      <div style={{ position: 'relative', zIndex: 1, marginTop: '2.75rem', width: '100%', maxWidth: '720px', marginLeft: 'auto', marginRight: 'auto', padding: '0 1rem', boxSizing: 'border-box' }}>
        {!workspace ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {[
              { id: 'individual', icon: <TargetIcon size={26} />, accent: '48,209,88', title: isEn ? 'Individual Work' : 'Trabajo Individual', desc: isEn ? 'Practice against the AI buyer at your own pace: as closer, lead or observer.' : 'Practicá contra el comprador IA a tu ritmo: como closer, lead u observador.' },
              { id: 'team', icon: <Users size={26} />, accent: '139,92,246', title: isEn ? 'Team Work' : 'Trabajo en Equipos', desc: isEn ? 'Live multiplayer role-plays with your team: Closer, Lead, Observer and Facilitator.' : 'Role-plays multijugador en vivo con tu equipo: Closer, Lead, Observador y Facilitador.' },
            ].map(c => (
              <button key={c.id} onClick={() => chooseWorkspace(c.id)} style={{
                textAlign: 'left', cursor: 'pointer', padding: '1.5rem 1.4rem', borderRadius: '1.1rem',
                background: `linear-gradient(160deg, rgba(${c.accent},0.13), rgba(15,15,30,0.6))`,
                border: `1px solid rgba(${c.accent},0.35)`, color: 'white', font: 'inherit',
                boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
              }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, rgb(${c.accent}), rgba(${c.accent},0.55))`, marginBottom: '0.8rem', boxShadow: `0 4px 14px rgba(${c.accent},0.4)`, color: 'white' }}>
                  {c.icon}
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.3rem' }}>{c.title}</div>
                <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>{c.desc}</div>
                <div style={{ marginTop: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 700, color: `rgb(${c.accent})` }}>
                  {isEn ? 'Enter' : 'Entrar'} <ArrowRight size={14} />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(0,0,0,0.25)', borderRadius: '0.9rem', padding: '0.3rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { id: 'individual', icon: <User size={15} />, l: isEn ? 'Individual Work' : 'Trabajo Individual' },
              { id: 'team', icon: <Users size={15} />, l: isEn ? 'Team Work' : 'Trabajo en Equipos' },
            ].map(tab => {
              const active = workspace === tab.id;
              return (
                <button key={tab.id} onClick={() => chooseWorkspace(tab.id)} style={{
                  flex: 1, padding: '0.6rem 0.5rem', borderRadius: '0.65rem', cursor: 'pointer', font: 'inherit',
                  fontSize: '0.88rem', fontWeight: 700, border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem',
                  background: active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
                  color: active ? 'white' : 'var(--text-muted)',
                }}>
                  {tab.icon} {tab.l}
                </button>
              );
            })}
          </div>
        )}
      </div>
      )}

      {!GROUP_ONLY_MODE && workspace === 'individual' && (<>
      {/* ── Sección: Práctica individual ───────────────────── */}
      <div style={{ position: 'relative', zIndex: 1, marginTop: '2rem', width: '100%', maxWidth: '720px', marginLeft: 'auto', marginRight: 'auto', padding: '0 1rem', boxSizing: 'border-box' }}>
        <SectionLabel badge={isEn ? '👤 1 player' : '👤 1 jugador'} badgeAccent="48,209,88">
          {isEn ? 'Individual practice' : 'Práctica individual'}
        </SectionLabel>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <FeatureButton
            icon={<TargetIcon size={16} />}
            label={isEn ? 'Practice solo' : 'Practicar solo'}
            accent="48,209,88"
            onClick={() => setShowSolo(true)}
          />
          {isPaid && (
            <FeatureButton
              icon={<History size={16} />}
              label={isEn ? 'History' : 'Historial'}
              accent="100,210,255"
              onClick={() => setShowHistory(true)}
            />
          )}
          {tier === 'trainer' && (
            <FeatureButton
              icon={<BarChart2 size={16} />}
              label="Analytics"
              accent="139,92,246"
              onClick={() => setShowAnalytics(true)}
            />
          )}
        </div>
      </div>

      {/* ── Sección: Herramientas de venta ─────────────────── */}
      <div style={{ position: 'relative', zIndex: 1, marginTop: '2rem', width: '100%', maxWidth: '720px', marginLeft: 'auto', marginRight: 'auto', padding: '0 1rem', boxSizing: 'border-box' }}>
        <SectionLabel>{isEn ? 'Sales tools' : 'Herramientas de venta'}</SectionLabel>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Propuestas VIP: función Pro — para free abre el modal de planes. */}
          <FeatureButton
            icon={isFree ? <Lock size={16} /> : <FileText size={16} />}
            label={(isEn ? 'VIP Proposals' : 'Propuestas VIP') + (isFree ? ' 🔒' : '')}
            accent="94,92,230"
            onClick={() => (isFree ? openPlans?.() : setShowProposals(true))}
          />
        </div>
      </div>

      {/* ── Sección: Comunidad y carrera ───────────────────── */}
      <div style={{ position: 'relative', zIndex: 1, marginTop: '2rem', width: '100%', maxWidth: '720px', marginLeft: 'auto', marginRight: 'auto', padding: '0 1rem', boxSizing: 'border-box' }}>
        <SectionLabel>{isEn ? 'Community & career' : 'Comunidad y carrera'}</SectionLabel>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <FeatureButton
            icon={<Trophy size={16} />}
            label={isEn ? 'Leaderboard' : 'Ranking'}
            accent="255,159,10"
            onClick={() => setShowLeaderboard(true)}
          />
          {tier === 'trainer' ? (
            <FeatureButton
              icon={<Briefcase size={16} />}
              label={isEn ? 'Scouting' : 'Cantera'}
              accent="255,55,95"
              onClick={() => setShowScouting(true)}
            />
          ) : (
            <FeatureButton
              icon={<Briefcase size={16} />}
              label={isEn ? 'Job offers' : 'Ofertas laborales'}
              accent="255,55,95"
              onClick={() => setShowScoutingModal(true)}
            />
          )}
        </div>
      </div>

      {/* ── Tarjeta de nivel / progreso (gamificación) ─────── */}
      <LevelCard />

      {/* ── Camino del Closer (progresión Novato→Pro) ──────── */}
      <ProgressPath />
      </>)}

      {workspace === 'team' && (<>
      {/* ── Sección: Sesión en equipo ──────────────────────── */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '720px', margin: '2rem auto 0', padding: '0 1rem', boxSizing: 'border-box' }}>
        <SectionLabel badge={isEn ? '👥 Multiplayer' : '👥 Multijugador'} badgeAccent="139,92,246">
          {isEn ? 'Group practice' : 'Práctica grupal'}
        </SectionLabel>
        {/* Cohorte: pertenece al mundo grupal (código del trainer → progreso compartido) */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <FeatureButton
            icon={<Users size={16} />}
            label={isEn ? 'Join cohort' : 'Unirme a cohorte'}
            accent="48,209,88"
            onClick={() => setShowJoinCohort(true)}
          />
        </div>
      </div>

      {/* ── Main card ──────────────────────────────────────── */}
      <div style={{
        margin: 'auto', marginTop: '0.25rem', maxWidth: '720px', width: 'calc(100% - 2rem)',
        position: 'relative', zIndex: 1,
        background: 'var(--bg-card)',
        backdropFilter: 'blur(12px)',
        borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: 'var(--shadow-lg)',
        padding: '2rem 2rem 1.75rem',
        animation: 'modalIn 0.4s ease-out'
      }}>

        {/* Encabezado de la zona de equipo */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: 'white' }}>
            {isEn ? 'Create or join a room' : 'Creá o unite a una sala'}
          </h2>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {isEn
              ? 'Live multiplayer role-plays with your team: Closer, Lead, Observer and Facilitator.'
              : 'Role-plays multijugador en vivo con tu equipo: Closer, Lead, Observador y Facilitador.'}
          </p>
        </div>

        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          {/* Step 1 — Nombre */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(100,210,255,0.2)', border: '1px solid rgba(100,210,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#a5b4fc', flexShrink: 0 }}>1</span>
              <label style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t('lobby.yourName')}</label>
            </div>
            <input
              type="text" required value={name} onChange={e => setName(e.target.value)}
              className="form-input" placeholder={t('lobby.namePlaceholder')}
              style={{ fontSize: '1rem', fontWeight: '500' }}
            />
          </div>

          {/* Step 2 — Sala */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(100,210,255,0.2)', border: '1px solid rgba(100,210,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#a5b4fc', flexShrink: 0 }}>2</span>
              <label style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t('lobby.roomId')}</label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text" required value={roomId} onChange={e => setRoomId(e.target.value)}
                className="form-input" placeholder={t('lobby.roomIdPlaceholder')}
                style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.95rem', letterSpacing: '0.05em' }}
              />
              <button type="button" onClick={generateRoomId} aria-label={isEn ? 'Generate random room ID' : 'Generar ID de sala al azar'} title={isEn ? 'Generate random ID' : 'Generar ID al azar'}
                style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', cursor: 'pointer', color: 'rgba(255,255,255,0.74)', transition: 'all 0.2s' }}>
                <Shuffle size={18} />
              </button>
              <button type="button" onClick={copyRoomId} disabled={!roomId} aria-label={isEn ? 'Copy room ID' : 'Copiar ID de sala'} title={isEn ? 'Copy ID' : 'Copiar ID'}
                style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.6rem 0.8rem', background: copied ? 'rgba(48,209,88,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${copied ? 'rgba(48,209,88,0.5)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '0.75rem', cursor: copied || roomId ? 'pointer' : 'not-allowed', color: copied ? 'var(--success)' : 'rgba(255,255,255,0.5)', transition: 'all 0.2s' }}>
                {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          {/* Step 3 — Rol */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(100,210,255,0.2)', border: '1px solid rgba(100,210,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#a5b4fc', flexShrink: 0 }}>3</span>
              <label style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t('lobby.chooseRole')}</label>
            </div>
            <div role="radiogroup" aria-label={isEn ? 'Choose your role' : 'Elegí tu rol'} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              {roles.map((r, idx) => {
                const meta = ROLE_META[r.id] || { icon: <Target size={20} />, color: '#6366f1', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' };
                const isActive = role === r.id;
                // Roving tabindex: solo el rol activo (o el primero si no hay
                // ninguno) es tabbable; el resto se navega con flechas.
                const isTabbable = role ? isActive : idx === 0;
                return (
                  <button
                    type="button"
                    key={r.id}
                    id={`role-opt-${r.id}`}
                    role="radio"
                    aria-checked={isActive}
                    tabIndex={isTabbable ? 0 : -1}
                    onClick={() => setRole(r.id)}
                    onKeyDown={(e) => handleRoleKeyDown(e, idx)}
                    style={{
                      textAlign: 'left', font: 'inherit', width: '100%',
                      padding: '1rem 1rem 0.85rem',
                      borderRadius: '1rem', cursor: 'pointer',
                      border: `1px solid ${isActive ? meta.color : 'rgba(255,255,255,0.07)'}`,
                      background: isActive ? `color-mix(in srgb, ${meta.color} 12%, rgba(10,10,20,0.9))` : 'rgba(255,255,255,0.02)',
                      boxShadow: isActive ? `0 0 20px color-mix(in srgb, ${meta.color} 25%, transparent), inset 0 1px 0 rgba(255,255,255,0.07)` : 'none',
                      transform: isActive ? 'translateY(-2px) scale(1.01)' : 'none',
                      transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                      position: 'relative', overflow: 'hidden'
                    }}
                  >
                    {isActive && (
                      <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', width: '16px', height: '16px', borderRadius: '50%', background: meta.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle2 size={11} color="white" strokeWidth={3} />
                      </div>
                    )}
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '0.65rem', marginBottom: '0.6rem',
                      background: isActive ? meta.gradient : 'rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: isActive ? 'white' : 'rgba(255,255,255,0.3)',
                      boxShadow: isActive ? `0 4px 12px color-mix(in srgb, ${meta.color} 35%, transparent)` : 'none',
                      transition: 'all 0.25s'
                    }}>
                      {meta.icon}
                    </div>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', color: isActive ? 'white' : 'rgba(255,255,255,0.7)', marginBottom: '0.2rem' }}>
                      {r.label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: isActive ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.58)', lineHeight: '1.3' }}>
                      {r.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              width: '100%', padding: '0.9rem',
              background: canSubmit ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)',
              color: canSubmit ? 'white' : 'rgba(255,255,255,0.2)',
              border: canSubmit ? 'none' : '1px solid rgba(255,255,255,0.07)',
              borderRadius: '0.875rem', cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontWeight: '700', fontSize: '1rem', letterSpacing: '0.02em',
              boxShadow: canSubmit ? '0 8px 24px rgba(100,210,255,0.4)' : 'none',
              transition: 'all 0.3s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
            }}
          >
            {t('lobby.continue')}
            {canSubmit && <ArrowRight size={18} />}
          </button>
        </form>
      </div>
      </>)}

      {/* ── Join cohort modal ──────────────────────────────── */}
      {showScoutingModal && <ScoutingModal onClose={() => setShowScoutingModal(false)} />}

      {showJoinCohort && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ maxWidth: '400px', width: '100%', background: 'rgba(15,15,30,0.95)', backdropFilter: 'blur(24px)', borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.08)', padding: '2rem', position: 'relative' }}>
            <button onClick={() => { setShowJoinCohort(false); setJoinMsg(''); }} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Users size={20} color="var(--primary)" />
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>{isEn ? 'Join a cohort' : 'Unirme a un cohorte'}</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              {isEn ? 'Enter the code your trainer gave you. Your session results will be shared with them so they can track your progress.' : 'Ingresá el código que te dio tu trainer. Tus resultados de sesión se compartirán con él para que siga tu progreso.'}
            </p>
            <input
              value={cohortCodeInput}
              onChange={e => setCohortCodeInput(e.target.value.toUpperCase())}
              placeholder="COACH-XXXX"
              className="form-input"
              style={{ fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '0.1em', textAlign: 'center', marginBottom: '0.75rem' }}
            />
            {joinMsg && (
              <div style={{ fontSize: '0.85rem', marginBottom: '0.75rem', color: joinMsg.startsWith('✓') ? 'var(--success)' : 'var(--danger)' }}>{joinMsg}</div>
            )}
            <button
              onClick={handleJoinCohort}
              disabled={joining || !cohortCodeInput.trim()}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer', opacity: (joining || !cohortCodeInput.trim()) ? 0.5 : 1 }}
            >
              {joining ? (isEn ? 'Joining...' : 'Uniéndome...') : (isEn ? 'Join' : 'Unirme')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

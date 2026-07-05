import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shuffle, Copy, ChessKnight, BookOpen, Smartphone,
  Zap, History, Target, TrendingUp, Theater, Eye,
  ArrowRight, CheckCircle2, LogOut, BarChart2, Users, X, Trophy, Briefcase, Target as TargetIcon,
  FileText
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSubscriptionContext } from '../contexts/SubscriptionContext';
import { signOutUser } from '../utils/auth';
import { joinCohort } from '../utils/cohort';
import { auth } from '../utils/db';
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

const ROLE_META = {
  Facilitador: { icon: <Target size={22} />, color: '#6366f1', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  Closer:      { icon: <TrendingUp size={22} />, color: '#30d158', gradient: 'linear-gradient(135deg,#30d158,#06b6d4)' },
  Lead:        { icon: <Theater size={22} />, color: '#ff9f0a', gradient: 'linear-gradient(135deg,#ff9f0a,#ff453a)' },
  Observador:  { icon: <Eye size={22} />, color: '#8b5cf6', gradient: 'linear-gradient(135deg,#8b5cf6,#ff375f)' }
};

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
  const [showJoinCohort, setShowJoinCohort] = useState(false);
  const [cohortCodeInput, setCohortCodeInput] = useState('');
  const [joinMsg, setJoinMsg] = useState('');
  const [joining, setJoining] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [roomId, setRoomId] = useState('');
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="app-container" style={{ alignItems: 'center', overflowY: 'auto', position: 'relative', padding: '1.5rem 1rem 3rem' }}>
      <div id="lobby-particles" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      {/* ── Top navigation bar ─────────────────────────────── */}
      <nav style={{
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
          {isFree && openPlans && (
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
          <a href={isEn ? "/presentacion_en.html" : "/presentacion.html"} target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'rgba(48,209,88,0.1)', color: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(48,209,88,0.35)', padding: '0.35rem 0.8rem',
              borderRadius: '2rem', cursor: 'pointer', textDecoration: 'none', fontSize: '0.82rem'
            }}>
            <BookOpen size={13} /> {isEn ? 'Guide' : 'Guía'}
          </a>
          <select onChange={e => i18n.changeLanguage(e.target.value)} value={(i18n.language || 'es').split('-')[0]}
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
              color: 'rgba(255,255,255,0.35)', borderRadius: '2rem', padding: '0.35rem 0.6rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.75rem', gap: '0.3rem'
            }}>
            <LogOut size={13} /> {isEn ? 'Exit' : 'Salir'}
          </button>
        </div>
      </nav>

      {/* ── Feature buttons (centered, premium) ───────────── */}
      <div style={{
        position: 'relative', zIndex: 1, marginTop: '4.5rem',
        display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap', width: '100%'
      }}>
        <FeatureButton
          icon={<TargetIcon size={16} />}
          label={isEn ? 'Practice solo' : 'Practicar solo'}
          accent="48,209,88"
          onClick={() => setShowSolo(true)}
        />
        <FeatureButton
          icon={<FileText size={16} />}
          label={isEn ? 'VIP Proposals' : 'Propuestas VIP'}
          accent="94,92,230"
          onClick={() => setShowProposals(true)}
        />
        {tier === 'trainer' && (
          <FeatureButton
            icon={<BarChart2 size={16} />}
            label="Analytics"
            accent="139,92,246"
            onClick={() => setShowAnalytics(true)}
          />
        )}
        {isPaid && (
          <FeatureButton
            icon={<History size={16} />}
            label={isEn ? 'History' : 'Historial'}
            accent="100,210,255"
            onClick={() => setShowHistory(true)}
          />
        )}
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

        <FeatureButton
          icon={<Users size={16} />}
          label={isEn ? 'Join cohort' : 'Unirme a cohorte'}
          accent="48,209,88"
          onClick={() => setShowJoinCohort(true)}
        />
      </div>

      {/* ── Tarjeta de nivel / progreso (gamificación) ─────── */}
      <LevelCard />

      {/* ── Camino del Closer (progresión Novato→Pro) ──────── */}
      <ProgressPath />

      {/* ── Main card ──────────────────────────────────────── */}
      <div style={{
        margin: 'auto', marginTop: '1.5rem', maxWidth: '580px', width: '100%',
        position: 'relative', zIndex: 1,
        background: 'rgba(15,15,30,0.75)',
        backdropFilter: 'blur(24px)',
        borderRadius: '1.5rem',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(100,210,255,0.08)',
        padding: '2.5rem 2.5rem 2rem',
        animation: 'modalIn 0.4s ease-out'
      }}>

        {/* Hero */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem', gap: '0.75rem' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '1.25rem',
            background: 'linear-gradient(135deg,#0a84ff 0%,#5e5ce6 55%,#4d4ad9 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px rgba(94,92,230,0.45), 0 8px 24px rgba(0,0,0,0.3)'
          }}>
            <ChessKnight size={40} color="white" strokeWidth={1.5} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              fontSize: '2.8rem', fontWeight: '900', margin: 0, lineHeight: 1,
              letterSpacing: '-0.04em',
              background: 'linear-gradient(135deg, #fff 40%, #a5b4fc)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>
              Sales Arena
            </h1>
            <p style={{
              margin: '0.5rem 0 0', fontSize: '0.78rem', fontWeight: '700',
              letterSpacing: '0.18em', textTransform: 'uppercase',
              color: 'rgba(165,180,252,0.6)'
            }}>
              AI · Multiplayer · Roleplay
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)', marginBottom: '2rem' }} />

        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          {/* Step 1 — Nombre */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(100,210,255,0.2)', border: '1px solid rgba(100,210,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '800', color: '#a5b4fc', flexShrink: 0 }}>1</span>
              <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t('lobby.yourName')}</label>
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
              <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(100,210,255,0.2)', border: '1px solid rgba(100,210,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '800', color: '#a5b4fc', flexShrink: 0 }}>2</span>
              <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t('lobby.roomId')}</label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text" required value={roomId} onChange={e => setRoomId(e.target.value)}
                className="form-input" placeholder={t('lobby.roomIdPlaceholder')}
                style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.95rem', letterSpacing: '0.05em' }}
              />
              <button type="button" onClick={generateRoomId} title={isEn ? 'Generate random ID' : 'Generar ID al azar'}
                style={{ padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', transition: 'all 0.2s' }}>
                <Shuffle size={18} />
              </button>
              <button type="button" onClick={copyRoomId} disabled={!roomId} title={isEn ? 'Copy ID' : 'Copiar ID'}
                style={{ padding: '0.6rem 0.8rem', background: copied ? 'rgba(48,209,88,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${copied ? 'rgba(48,209,88,0.5)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '0.75rem', cursor: 'pointer', color: copied ? 'var(--success)' : 'rgba(255,255,255,0.5)', transition: 'all 0.2s' }}>
                {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          {/* Step 3 — Rol */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(100,210,255,0.2)', border: '1px solid rgba(100,210,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '800', color: '#a5b4fc', flexShrink: 0 }}>3</span>
              <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t('lobby.chooseRole')}</label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              {roles.map(r => {
                const meta = ROLE_META[r.id] || { icon: <Target size={20} />, color: '#6366f1', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' };
                const isActive = role === r.id;
                return (
                  <div
                    key={r.id} onClick={() => setRole(r.id)}
                    style={{
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
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', lineHeight: '1.3' }}>
                      {r.desc}
                    </div>
                  </div>
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

      {/* ── Mobile app QR ──────────────────────────────────── */}
      <div style={{
        marginTop: '1.5rem', maxWidth: '580px', width: '100%',
        position: 'relative', zIndex: 1,
        background: 'rgba(15,15,30,0.55)', backdropFilter: 'blur(16px)',
        borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.05)',
        padding: '1.25rem 1.75rem',
        display: 'flex', alignItems: 'center', gap: '1.5rem'
      }}>
        <a href="https://sales-arena-mobile.netlify.app/" target="_blank" rel="noopener noreferrer"
          style={{ background: 'white', padding: '0.5rem', borderRadius: '0.65rem', display: 'inline-block', position: 'relative', flexShrink: 0 }}>
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=https://sales-arena-mobile.netlify.app/&ecc=H"
            alt="QR" style={{ display: 'block', width: '80px', height: '80px' }}
          />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'white', padding: '3px', borderRadius: '3px', display: 'flex' }}>
            <ChessKnight size={20} color="black" strokeWidth={2} />
          </div>
        </a>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Smartphone size={16} color="rgba(165,180,252,0.7)" />
            <span style={{ fontWeight: '700', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
              {isEn ? 'Mobile App' : 'App Móvil'}
            </span>
          </div>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', lineHeight: '1.4' }}>
            {isEn ? 'Scan to participate from your phone as Lead or Observer.' : 'Escaneá para participar desde tu celular como Lead u Observador.'}
          </p>
        </div>
      </div>

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

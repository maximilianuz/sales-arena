import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Briefcase, Mail, MapPin, Target, CheckCircle2, Star } from 'lucide-react';
import { listScouting } from '../utils/scouting';
import { tierFromEarnings, tierLabel, formatMoney } from '../utils/gamification';

// Cantera de closers para Trainers/empresas (requiere plan Trainer — el
// servidor lo valida). Los stats de cada perfil los escribe la plataforma:
// lo que ves es desempeño real, no autopercepción.

function ProspectCard({ p, isEn, lng }) {
  const { tier } = tierFromEarnings(p.totalEarnings || 0);
  return (
    <div className="glass-panel" style={{ marginBottom: '0.75rem', padding: '1.1rem', border: `1px solid ${tier.color}33` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
        <div style={{
          width: '46px', height: '46px', borderRadius: '0.8rem', flexShrink: 0,
          background: `linear-gradient(135deg, ${tier.color}, ${tier.color}88)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'white', fontSize: '1.1rem'
        }}>
          {(p.name || 'C')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '600' }}>{p.name || 'Closer'}</span>
            <span style={{
              fontSize: '0.68rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em',
              color: tier.color, background: `${tier.color}1f`, border: `1px solid ${tier.color}55`,
              padding: '0.1rem 0.5rem', borderRadius: '2rem'
            }}>
              {tierLabel(tier, lng)}
            </span>
          </div>
          {p.headline && <div style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{p.headline}</div>}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.55rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span style={{ fontWeight: '600', color: 'white' }}>{formatMoney(p.totalEarnings || 0)}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <CheckCircle2 size={12} color="var(--success)" /> {p.closesCount || 0} {isEn ? 'closes' : 'cierres'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Target size={12} /> {p.sessionsCompleted || 0} {isEn ? 'sessions' : 'sesiones'}
            </span>
            {(p.bestScore || 0) > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Star size={12} color="var(--accent)" /> {p.bestScore}/10
              </span>
            )}
            {p.country && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <MapPin size={12} /> {p.country}
              </span>
            )}
          </div>
        </div>
        <a
          href={`mailto:${p.contactEmail}?subject=${encodeURIComponent(isEn ? 'Job opportunity — Sales Arena' : 'Oportunidad laboral — Sales Arena')}`}
          className="btn btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', flexShrink: 0, textDecoration: 'none' }}
        >
          <Mail size={14} /> {isEn ? 'Contact' : 'Contactar'}
        </a>
      </div>
    </div>
  );
}

export default function Scouting({ onBack }) {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const [profiles, setProfiles] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listScouting()
      .then(d => setProfiles(d.profiles || []))
      .catch(e => { setError(e.message); setProfiles([]); });
  }, []);

  return (
    <div className="app-container" style={{ alignItems: 'center', overflowY: 'auto', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '720px', width: '100%', margin: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <button className="btn btn-outline" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={16} /> {isEn ? 'Back' : 'Volver'}
          </button>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '600', flex: 1, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Briefcase size={24} color="var(--accent)" /> {isEn ? 'Scouting' : 'Cantera'}
          </h1>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1.5rem' }}>
          {isEn
            ? 'Closers open to job offers, ranked by verified performance on the platform.'
            : 'Closers abiertos a ofertas laborales, rankeados por desempeño verificado en la plataforma.'}
        </p>

        {profiles === null && <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>{isEn ? 'Loading...' : 'Cargando...'}</p>}

        {error && (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: 'var(--danger)', margin: 0 }}>
              {error === 'trainer_plan_required'
                ? (isEn ? 'Scouting requires an active Trainer plan.' : 'La cantera requiere plan Trainer activo.')
                : error}
            </p>
          </div>
        )}

        {profiles && profiles.length === 0 && !error && (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '2.5rem' }}>
            <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>🔭</p>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              {isEn ? 'No closers open to offers yet.' : 'Todavía no hay closers abiertos a ofertas.'}
            </p>
          </div>
        )}

        {profiles && profiles.map(p => <ProspectCard key={p.uid} p={p} isEn={isEn} lng={i18n.language} />)}
      </div>
    </div>
  );
}

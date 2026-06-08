import { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE } from './config/api.js';
import { AppAmbientBackground, DynamicHeroBackground } from './components/DynamicBackground.jsx';
import logo from './assets/logo-official.png';
import heroBg1 from './assets/hero-bg-1.jpg';
import heroBg2 from './assets/hero-bg-2.jpg';
import heroBg3 from './assets/hero-bg-3.jpg';
import heroBg4 from './assets/hero-bg-4.jpg';
import heroBg5 from './assets/hero-bg-5.jpg';
import legendHadjiImg from './assets/legend_hadji.png';

const HERO_SLIDES = [heroBg1, heroBg2, heroBg3, heroBg4, heroBg5];

const USER_ID_DEFAULT = 'guest';
const AVATAR_STATES = ['idle', 'listening', 'thinking', 'neutral', 'tense', 'frustrated', 'euphoric', 'celebrating', 'heartbroken'];

const LANGUAGES = [
  { id: 'fr', label: 'Français', short: 'FR' },
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'ar', label: 'العربية', short: 'AR' },
];

const CHAT_PLACEHOLDERS = {
  fr: 'Écrivez en français, darija, arabe ou anglais…',
  en: 'Write in English, French, Darija, or Arabic…',
  ar: 'اكتب بالعربية أو الدارجة أو الفرنسية…',
};

function requestUrl(path) {
  return `${API_BASE}${path}`;
}

/** Backend static assets — proxied in dev via Vite, absolute in production. */
function staticAssetUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
}

async function requestJson(path, options = {}) {
  const response = await fetch(requestUrl(path), {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.detail || payload?.error || `Request failed (${response.status})`);
  }
  return payload;
}

function formatBadgeText(badge) {
  if (typeof badge === 'string') return badge;
  return badge?.name || badge?.label || 'Badge';
}

function sanitizeList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.leaderboard)) return value.leaderboard;
  return [];
}

/* ── Icons (inline SVG, no emojis) ──────────────────────────── */
function IconSpeaker({ active }) {
  return (
    <svg className="speaker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      {active ? (
        <>
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </>
      ) : (
        <>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </>
      )}
    </svg>
  );
}

function IconFullscreen() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function IconTrophy() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function IconBall() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m4.93 4.93 4.24 4.24" />
      <path d="m14.83 9.17 4.24-4.24" />
      <path d="m14.83 14.83 4.24 4.24" />
      <path d="m9.17 14.83-4.24 4.24" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

/* ── Primitive UI atoms ──────────────────────────────────── */
function Pill({ children, tone = 'neutral' }) {
  return <span className={`pill tone-${tone}`}>{children}</span>;
}

function LivePill() {
  return <span className="pill pill-live">LIVE</span>;
}

function GoldRule() {
  return <div className="gold-rule" />;
}

function SectionLabel({ children }) {
  return (
    <div className="section-label">
      <div className="section-label-rule" />
      <span className="section-label-text">{children}</span>
    </div>
  );
}

function LabelValue({ label, value }) {
  return (
    <div className="label-value">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({ children }) {
  return <div className="empty-state">{children}</div>;
}

function LanguagePanel({ value, onChange }) {
  return (
    <div className="lang-panel" role="group" aria-label="Choose language">
      <span className="lang-panel-label">Language</span>
      <div className="lang-panel-options">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.id}
            type="button"
            className={`lang-btn${value === lang.id ? ' active' : ''}`}
            aria-pressed={value === lang.id}
            onClick={() => onChange(lang.id)}
            title={lang.label}
          >
            {lang.short}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Nav button ───────────────────────────────────────────── */
function NavButton({ active, children, onClick, id }) {
  return (
    <button
      id={id}
      className={`screen-button${active ? ' active' : ''}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

/* ── Stream Panel (Live Match streaming area) ─────────────── */
function StreamPanel({ matchState, isMuted, onToggleMute, onTalkToLegend, legendName }) {
  return (
    <div className="stream-panel">
      <DynamicHeroBackground images={HERO_SLIDES} />
      <div className="stream-play-indicator" aria-hidden="true">
        <span className="stream-play-ring" />
        <span className="stream-play-dot" />
      </div>
      <div className="stream-content">
        <div className="stream-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <LivePill />
            <span className="stream-eyebrow">World Cup 2030 — Match Day</span>
          </div>
          <div className="stream-title">
            {matchState?.home_team || 'Morocco'} vs {matchState?.away_team || 'Portugal'}
          </div>
          <div className="stream-sub">
            {matchState?.status || 'Waiting for match data'} · {matchState?.minute != null ? `${matchState.minute}'` : '-'}
          </div>
        </div>
        <div className="stream-controls">
          <button
            id="voice-toggle-btn"
            className={`voice-btn${isMuted ? '' : ' active'}`}
            type="button"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute legend voice' : 'Mute legend voice'}
          >
            <IconSpeaker active={!isMuted} />
            {isMuted ? 'Legend Voice Off' : 'Legend Voice On'}
          </button>
          <button
            id="talk-to-legend-btn"
            className="btn btn-gold btn-sm"
            type="button"
            onClick={onTalkToLegend}
          >
            Talk to {legendName?.split(' ').pop() || 'Legend'}
          </button>
          <button
            className="stream-fullscreen-btn"
            type="button"
            aria-label="Fullscreen"
            onClick={() => {
              const el = document.querySelector('.stream-panel');
              if (el?.requestFullscreen) el.requestFullscreen();
            }}
          >
            <IconFullscreen />
          </button>
        </div>
      </div>
    </div>
  );
}

function IconLock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

/* ── Legend card ──────────────────────────────────────────── */
function LegendCard({ legend, selected, onSelect, onUnlock }) {
  const locked = Boolean(legend.locked);
  const imgSrc = legend.idle_avatar?.url
    ? staticAssetUrl(legend.idle_avatar.url)
    : legendHadjiImg;

  return (
    <button
      id={`legend-card-${legend.id}`}
      className={`legend-card${selected ? ' selected' : ''}${locked ? ' legend-card--locked' : ''}`}
      type="button"
      onClick={() => {
        if (locked) { onUnlock?.(legend); return; }
        onSelect?.(legend);
      }}
      aria-pressed={selected}
      aria-label={`Select ${legend.name}${locked ? ` — costs ${legend.unlock_cost_coins} coins` : ''}`}
    >
      <div className="legend-card-photo">
        <img
          className="legend-card-img"
          src={imgSrc}
          alt={legend.name}
          loading="eager"
          decoding="sync"
          fetchPriority="high"
        />
        <div className="legend-card-badges">
          {locked
            ? <Pill tone="locked"><IconLock /> {legend.unlock_cost_coins} coins</Pill>
            : <Pill tone="blue">Free</Pill>}
          {selected && !locked && <Pill tone="gold">Watching</Pill>}
        </div>
        {locked && <div className="legend-card-lock-veil" aria-hidden="true" />}
      </div>
      <div className="legend-card-info">
        <div className="legend-card-name">{legend.name}</div>
        <div className="legend-card-arabic">{legend.arabic_name}</div>
        <div className="legend-card-archetype">
          {legend.archetype} · {legend.years}
        </div>
        <div className="legend-card-footer">
          {locked
            ? `Unlock — ${legend.unlock_cost_coins} coins`
            : 'Watch together'}
        </div>
      </div>
    </button>
  );
}

/* ── Main App ─────────────────────────────────────────────── */
export default function App() {
  const [userId, setUserId] = useState(USER_ID_DEFAULT);
  const [screen, setScreen] = useState('home');
  const [legends, setLegends] = useState([]);
  const [selectedLegendId, setSelectedLegendId] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [matchState, setMatchState] = useState(null);
  const [matchFeed, setMatchFeed] = useState([]);
  const [currentAvatar, setCurrentAvatar] = useState(null);
  const [legendNotice, setLegendNotice] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [predictionLegend, setPredictionLegend] = useState(null);
  const [predictionInputs, setPredictionInputs] = useState({ home: '', away: '' });
  const [predictionResult, setPredictionResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [quizResult, setQuizResult] = useState(null);
  const [whatHeSaidRound, setWhatHeSaidRound] = useState(null);
  const [whatHeSaidGuess, setWhatHeSaidGuess] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quizCountdown, setQuizCountdown] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem('gta_language') || 'fr';
    } catch {
      return 'fr';
    }
  });
  const audioRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem('gta_language', language);
    } catch { /* ignore */ }
  }, [language]);

  const selectedLegend = useMemo(
    () => legends.find((l) => l.id === selectedLegendId) || legends[0] || null,
    [legends, selectedLegendId],
  );

  const activeAvatar = currentAvatar || selectedLegend?.idle_avatar || null;

  /* ── audio ──────────────────────────────────────────────── */
  function playAudio(audioUrl) {
    if (!audioUrl || isMuted) return;
    try {
      const audio = audioRef.current || new Audio();
      audioRef.current = audio;
      audio.pause();
      audio.src = audioUrl;
      audio.currentTime = 0;
      audio.play().catch(() => null);
    } catch { /* ignore autoplay */ }
  }

  /* ── feed helper ─────────────────────────────────────────── */
  function pushFeedItem(payload, source) {
    setMatchFeed((cur) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        source,
        text: payload?.text || payload?.tease || 'Legend reacted.',
        audio_url: payload?.audio_url || null,
        avatar: payload?.avatar || null,
        match_context: payload?.match_context || null,
        ts: new Date().toISOString(),
      },
      ...cur,
    ].slice(0, 12));

    if (payload?.avatar) setCurrentAvatar(payload.avatar);
    if (payload?.audio_url) playAudio(payload.audio_url);
  }

  /* ── API loaders ─────────────────────────────────────────── */
  async function loadLegends() {
    const payload = await requestJson(`/legends?user_id=${encodeURIComponent(userId)}`);
    const next = payload?.legends || [];
    setLegends(next);
    if (!selectedLegendId && next.length > 0) {
      const free = next.find((l) => !l.locked) || next[0];
      setSelectedLegendId(free.id);
      setCurrentAvatar(free.idle_avatar || null);
    }
  }

  async function loadWallet() {
    const payload = await requestJson(`/wallet?user_id=${encodeURIComponent(userId)}`);
    setWallet(payload);
  }

  async function loadMatchState() {
    const payload = await requestJson('/match-state');
    setMatchState(payload);
  }

  async function loadPredictionLegend() {
    const query = new URLSearchParams({ user_id: userId });
    if (selectedLegendId) query.set('legend_id', selectedLegendId);
    const payload = await requestJson(`/prediction/legend?${query.toString()}`);
    setPredictionLegend(payload);
  }

  async function loadLeaderboard() {
    const payload = await requestJson('/leaderboard');
    setLeaderboard(sanitizeList(payload));
  }

  async function loadQuizNext() {
    const payload = await requestJson('/quiz/next');
    setQuiz(payload);
    setQuizResult(null);
    setQuizCountdown(null);
  }

  async function refreshCoreData() {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadLegends(), loadWallet(), loadMatchState(), loadPredictionLegend(), loadLeaderboard(), loadQuizNext()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load live data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refreshCoreData(); }, [userId]); // eslint-disable-line

  useEffect(() => {
    const t = window.setInterval(() => {
      loadMatchState().catch((e) => setError(e instanceof Error ? e.message : 'Match refresh failed.'));
    }, 10000);
    return () => window.clearInterval(t);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (screen !== 'quiz') return;
    if (!quiz) loadQuizNext().catch((e) => setError(e instanceof Error ? e.message : 'Quiz load failed.'));
  }, [quiz, screen]); // eslint-disable-line

  useEffect(() => {
    if (screen !== 'predictions') return;
    loadPredictionLegend().catch((e) => setError(e instanceof Error ? e.message : 'Prediction load failed.'));
  }, [screen, selectedLegendId, userId]); // eslint-disable-line

  useEffect(() => {
    if (!quiz?.remaining_today || quiz.remaining_today <= 0) { setQuizCountdown(null); return; }
    setQuizCountdown(quiz.timer_seconds > 0 ? quiz.timer_seconds : null);
  }, [quiz]);

  useEffect(() => {
    if (quizCountdown == null || quizCountdown <= 0) return;
    const t = window.setTimeout(() => setQuizCountdown((c) => (c == null ? c : Math.max(c - 1, 0))), 1000);
    return () => window.clearTimeout(t);
  }, [quizCountdown]);

  /* ── handlers ────────────────────────────────────────────── */
  async function handleUnlockLegend(legend) {
    setStatusMessage('');
    try {
      await requestJson(`/legends/${legend.id}/unlock`, { method: 'POST', body: JSON.stringify({ user_id: userId }) });
      setStatusMessage(`${legend.name} unlocked.`);
      await loadLegends();
      await loadWallet();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unlock failed.');
    }
  }

  async function handleTwinPassActivate() {
    setStatusMessage('');
    try {
      await requestJson('/twin-pass/activate', { method: 'POST', body: JSON.stringify({ user_id: userId }) });
      setStatusMessage('Twin Pass activated!');
      await loadWallet();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Activation failed.');
    }
  }

  async function sendReact(type, teamOverride) {
    setStatusMessage('');
    try {
      await requestJson('/simulate', { method: 'POST', body: JSON.stringify({ type, user_id: userId, legend_id: selectedLegendId }) });
      const payload = await requestJson('/react', {
        method: 'POST',
        body: JSON.stringify({
          type,
          team: teamOverride || matchState?.home_team || 'home',
          scorer: matchState?.scorer || null,
          minute: matchState?.minute || 0,
        }),
      });
      pushFeedItem(payload, `react:${type}`);
      setStatusMessage(`Legend reacted to ${type.toLowerCase().replaceAll('_', ' ')}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reaction failed.');
    }
  }

  async function sendChat(event) {
    event.preventDefault();
    if (!chatMessage.trim()) return;
    try {
      const payload = await requestJson('/chat', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          message: chatMessage.trim(),
          preferred_language: language,
        }),
      });
      pushFeedItem(payload, 'chat');
      setChatMessage('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chat failed.');
    }
  }

  async function submitPrediction(event) {
    event.preventDefault();
    if (predictionInputs.home === '' || predictionInputs.away === '') return;
    try {
      const payload = await requestJson('/prediction/submit', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          match_id: predictionLegend?.match_id || matchState?.match_id || 'current',
          home_score: Number(predictionInputs.home),
          away_score: Number(predictionInputs.away),
        }),
      });
      setPredictionResult(payload);
      await loadLeaderboard();
      await loadWallet();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Prediction failed.');
    }
  }

  async function answerQuiz(optionIndex) {
    if (!quiz) return;
    try {
      const payload = await requestJson('/quiz/answer', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, legend_id: selectedLegend?.id, question_id: quiz.question_id, answer_index: optionIndex }),
      });
      setQuizResult(payload);
      await loadWallet();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Quiz answer failed.');
    }
  }

  async function openWhatHeSaid(type) {
    try {
      const payload = await requestJson('/what-he-said/open', {
        method: 'POST',
        body: JSON.stringify({ type, team: matchState?.home_team || 'home', minute: matchState?.minute || 0 }),
      });
      setWhatHeSaidRound(payload);
      setWhatHeSaidGuess(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'What He Said failed.');
    }
  }

  async function guessWhatHeSaid(choiceIndex) {
    if (!whatHeSaidRound) return;
    try {
      const payload = await requestJson('/what-he-said/guess', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, round_id: whatHeSaidRound.round_id, choice_index: choiceIndex }),
      });
      setWhatHeSaidGuess(payload);
      await loadWallet();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Guess failed.');
    }
  }

  function selectLegend(legend) {
    setSelectedLegendId(legend.id);
    setCurrentAvatar(legend.idle_avatar || null);
    setScreen('match');
    setLegendNotice(`${legend.name} is now watching the match with you.`);
  }

  /* ── Wallet chip bar ─────────────────────────────────────── */
  function renderWalletChips() {
    if (!wallet) return <Pill tone="neutral">Loading…</Pill>;
    return (
      <div className="wallet-chips">
        <Pill tone="warning">{wallet.coins ?? 0} coins</Pill>
        <Pill tone={wallet.is_pro ? 'success' : 'neutral'}>{wallet.is_pro ? 'Pro' : 'Free'}</Pill>
        {(wallet.badges || []).length > 0 && (
          <Pill tone="neutral">{wallet.badges.length} badges</Pill>
        )}
        <Pill tone="neutral">{wallet.quiz_remaining_today ?? 0} quiz left</Pill>
      </div>
    );
  }

  /* ── Avatar panel ────────────────────────────────────────── */
  function renderAvatar() {
    if (!activeAvatar?.url) {
      return <div className="avatar-fallback">Legend avatar appears here</div>;
    }
    const url = staticAssetUrl(activeAvatar.url);
    return (
      <div className="avatar-stage">
        <img
          key={`${url}-${activeAvatar.state || 'idle'}`}
          className="avatar-image"
          src={url}
          alt={activeAvatar.label || 'Legend avatar'}
          loading="eager"
          decoding="sync"
        />
        <div className="avatar-caption">{activeAvatar.label || activeAvatar.state || 'idle'}</div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════ */
  return (
    <div className="app-shell">
      <AppAmbientBackground />

      <div className="app-content">
      {/* ── TOPBAR ──────────────────────────────────────────── */}
      <header className="topbar">
        <div className="brand-block">
          <img src={logo} alt="Ghost Twin Arena" className="brand-logo" />
        </div>

        <nav className="screen-nav" aria-label="Main navigation">
          <NavButton id="nav-home"        active={screen === 'home'}        onClick={() => setScreen('home')}>Legends</NavButton>
          <NavButton id="nav-match"       active={screen === 'match'}       onClick={() => setScreen('match')}>Live Match</NavButton>
          <NavButton id="nav-community"   active={screen === 'community'}   onClick={() => setScreen('community')}>Community</NavButton>
          <NavButton id="nav-predictions" active={screen === 'predictions'} onClick={() => setScreen('predictions')}>Predictions</NavButton>
          <NavButton id="nav-quiz"        active={screen === 'quiz'}        onClick={() => setScreen('quiz')}>Quiz</NavButton>
          <NavButton id="nav-leaderboard" active={screen === 'leaderboard'} onClick={() => setScreen('leaderboard')}>Leaderboard</NavButton>
        </nav>

        <div className="topbar-actions">
          <LanguagePanel value={language} onChange={setLanguage} />
          {renderWalletChips()}
          <label className="user-chip" htmlFor="user-id-input">
            <span>User</span>
            <input
              id="user-id-input"
              value={userId}
              onChange={(e) => setUserId(e.target.value || USER_ID_DEFAULT)}
            />
          </label>
        </div>
      </header>

      {/* ── BANNERS ─────────────────────────────────────────── */}
      <div className="main-grid">
        {error         && <div className="banner error-banner"  role="alert">{error}</div>}
        {statusMessage && <div className="banner status-banner">{statusMessage}</div>}
        {legendNotice  && <div className="banner notice-banner">{legendNotice}</div>}
      </div>

      {/* ═══════════════════════════════════════════════════════
          HOME — Hero + Stat Bar + About + Legend Grid + CTA
      ═══════════════════════════════════════════════════════ */}
      {screen === 'home' && (
        <>
          {/* Hero */}
          <section className="hero" aria-label="Hero banner">
            <DynamicHeroBackground images={HERO_SLIDES} />
            <div className="hero-content">
              <div className="hero-eyebrow">
                <div className="hero-eyebrow-rule" />
                <span className="hero-eyebrow-label">Ghost Twin Arena · World Cup 2030</span>
              </div>
              <h2 className="hero-headline">
                Experience<br />My Football<br />Legends
              </h2>
              <p className="hero-sub">
                Pick a Moroccan football legend who watches every match live with you —
                reacting to every goal, red card, and VAR call. Predict scores, win
                quizzes, climb the fan leaderboard.
              </p>
              <div className="hero-ctas">
                <button
                  id="hero-cta-choose"
                  className="btn btn-primary"
                  type="button"
                  onClick={() => document.getElementById('legends-section')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Choose a Legend
                </button>
                <button
                  id="hero-cta-match"
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => setScreen('match')}
                >
                  Live Match
                </button>
              </div>
            </div>
          </section>

          {/* Stat Bar */}
          <div className="stat-bar">
            <div className="stat-bar-item">
              <div className="stat-bar-icon"><IconTrophy /></div>
              <div className="stat-bar-value">World Cup</div>
              <div className="stat-bar-label">Tournament 2030</div>
            </div>
            <div className="stat-bar-item">
              <div className="stat-bar-icon"><IconBall /></div>
              <div className="stat-bar-value">1986 &amp; 1998</div>
              <div className="stat-bar-label">WC Appearances</div>
            </div>
            <div className="stat-bar-item">
              <div className="stat-bar-icon"><IconStar /></div>
              <div className="stat-bar-value">AFCON 2025</div>
              <div className="stat-bar-label">Africa Champions</div>
            </div>
            <div className="stat-bar-item">
              <div className="stat-bar-icon"><IconUsers /></div>
              <div className="stat-bar-value">{AVATAR_STATES.length} Moods</div>
              <div className="stat-bar-label">Legend States</div>
            </div>
          </div>

          {/* About */}
          <section className="about-section">
            <div className="about-inner">
              <div>
                <SectionLabel>About Us</SectionLabel>
                <h2 className="about-title">
                  The Premier Destination for Football Enthusiasts
                </h2>
                <p className="about-body">
                  Ghost Twin Arena lets you relive iconic Moroccan football moments through
                  the eyes of the legends themselves. Choose your ghost twin, watch matches
                  together, and feel the passion of the Atlas Lions.
                </p>
                <div style={{ marginTop: 28 }}>
                  <button
                    id="about-cta-join"
                    className="btn btn-primary"
                    type="button"
                    onClick={() => document.getElementById('legends-section')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    Join Now
                  </button>
                </div>
              </div>
              <div className="about-portrait-wrap">
                <img
                  className="about-portrait"
                  src={legendHadjiImg}
                  alt="Mustapha Hadji"
                  loading="lazy"
                  decoding="async"
                />
                <div className="about-portrait-caption">
                  <strong>Mustapha Hadji</strong>
                  <span>African Footballer of the Year 1998</span>
                </div>
              </div>
            </div>
          </section>
          <section id="legends-section" className="section-wrap" aria-label="Choose your legend">
            <SectionLabel>Our Team</SectionLabel>
            <div className="section-heading-row">
              <div>
                <h2 className="section-title section-title-light">Team Legends</h2>
                <p className="section-desc">
                  Select a Moroccan football legend to watch the match with you — live reactions, voice, and personality.
                </p>
              </div>
              <button
                id="btn-view-all-legends"
                className="btn btn-ghost-dark btn-sm"
                type="button"
              >
                View All
              </button>
            </div>

            {legends.length === 0
              ? <EmptyState>No legends loaded — check backend connection.</EmptyState>
              : (
                <div className="legend-grid">
                  {legends.map((legend) => (
                    <LegendCard
                      key={legend.id}
                      legend={legend}
                      selected={legend.id === selectedLegend?.id}
                      onSelect={selectLegend}
                      onUnlock={handleUnlockLegend}
                    />
                  ))}
                </div>
              )}
          </section>

          {/* CTA Band */}
          <div className="cta-band">
            <h2>Come Join Us And Don't Miss Your Best Matches</h2>
            <p>
              Ghost Twin Arena puts you inside the mind of a legend. React to every moment,
              test your football knowledge, and rise up the fan leaderboard.
            </p>
            <button
              id="cta-band-join"
              className="btn btn-gold"
              type="button"
              onClick={() => document.getElementById('legends-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Join Now
            </button>
          </div>

          {/* Footer */}
          <footer className="site-footer">
            <div>
              <div className="footer-brand">Ghost Twin Arena</div>
              <div className="footer-copy" style={{ marginTop: 4 }}>
                Football Professionals · World Cup 2030
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <span className="footer-copy">Privacy</span>
              <span className="footer-copy">Terms</span>
            </div>
          </footer>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          MATCH SCREEN
      ═══════════════════════════════════════════════════════ */}
      {screen === 'match' && (
        <div className="match-layout">
          {/* Left column */}
          <div className="match-left">

            {/* STREAMING PANEL */}
            <StreamPanel
              matchState={matchState}
              isMuted={isMuted}
              onToggleMute={() => setIsMuted((m) => !m)}
              onTalkToLegend={() => document.getElementById('chat-input')?.focus()}
              legendName={selectedLegend?.name}
            />

            {/* Scoreboard card */}
            <div className="card">
              <div className="card-body">
                <div className="section-header compact">
                  <div>
                    <LivePill />
                    <h2 style={{ marginTop: 8 }}>
                      {matchState?.home_team || 'Morocco'} vs {matchState?.away_team || 'Portugal'}
                    </h2>
                    <p>{matchState?.status || 'Waiting for match state'}</p>
                  </div>
                  {matchState?.minute != null && (
                    <span className="score-minute">{matchState.minute}'</span>
                  )}
                </div>

                <div className="scoreboard">
                  <div className="score-team">{matchState?.home_team || 'Home'}</div>
                  <div className="score-line">
                    <span className="score-digit">{matchState?.home_score ?? 0}</span>
                    <span className="score-sep">:</span>
                    <span className="score-digit">{matchState?.away_score ?? 0}</span>
                  </div>
                  <div className="score-team">{matchState?.away_team || 'Away'}</div>
                </div>

                <div className="stat-grid" style={{ marginTop: 18 }}>
                  <LabelValue label="Emotional state" value={matchState?.emotional_state || 'idle'} />
                  <LabelValue label="Avatar state"    value={matchState?.avatar_state    || 'idle'} />
                  <LabelValue label="Legend"          value={selectedLegend?.name        || 'Pick a legend'} />
                </div>

                <div className="reaction-toolbar">
                  <button id="react-goal"     className="btn btn-primary btn-sm" type="button" onClick={() => sendReact('GOAL')}>Goal</button>
                  <button id="react-red-card" className="btn btn-danger btn-sm"  type="button" onClick={() => sendReact('RED_CARD')}>Red Card</button>
                  <button id="react-var"      className="btn btn-dark btn-sm"    type="button" onClick={() => sendReact('VAR')}>VAR</button>
                  <button id="react-penalty"  className="btn btn-dark btn-sm"    type="button" onClick={() => sendReact('PENALTY')}>Penalty</button>
                  <button id="react-whs"      className="btn btn-ghost btn-sm"   type="button" onClick={() => openWhatHeSaid('REACT')}>What He Said</button>
                </div>
              </div>
            </div>

            {/* Feed card */}
            <div className="card">
              <div className="card-body">
                <div className="section-header compact">
                  <div>
                    <h3>Live Reaction Feed</h3>
                    <p>Latest reactions from the legend and your chat.</p>
                  </div>
                </div>
                <div className="feed-list">
                  {matchFeed.length === 0
                    ? <EmptyState>Reactions appear here as the match changes.</EmptyState>
                    : matchFeed.map((item) => (
                      <article className="feed-item" key={item.id}>
                        {item.avatar?.url ? (
                          <img
                            className="feed-avatar-img"
                            src={staticAssetUrl(item.avatar.url)}
                            alt={item.avatar.label || 'Legend'}
                          />
                        ) : (
                          <div className="feed-avatar">{item.avatar?.label?.slice(0, 2) || 'GT'}</div>
                        )}
                        <div>
                          <div className="feed-source">{item.source}</div>
                          <p>{item.text}</p>
                          {item.audio_url && (
                            <button
                              id={`play-audio-${item.id}`}
                              className="btn btn-dark btn-sm"
                              type="button"
                              onClick={() => playAudio(item.audio_url)}
                              style={{ marginTop: 8 }}
                            >
                              <IconSpeaker active={false} />
                              Play audio
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="match-right">
            {/* Avatar card */}
            <div className="card">
              <div className="card-body">
                <div className="section-header compact">
                  <div>
                    <h3>{selectedLegend?.name || 'Legend'}</h3>
                    <p>{matchState?.emotional_state || 'idle'}</p>
                  </div>
                </div>
                {renderAvatar()}
              </div>
            </div>

            {/* Voice / Speaker card */}
            <div className="card">
              <div className="card-body">
                <div className="section-header compact">
                  <div>
                    <h3>Legend Voice</h3>
                    <p>Toggle live commentary audio.</p>
                  </div>
                </div>
                <button
                  id="match-voice-btn"
                  className={`voice-btn${isMuted ? '' : ' active'}`}
                  type="button"
                  style={{ width: '100%', justifyContent: 'center', padding: '14px 20px' }}
                  onClick={() => setIsMuted((m) => !m)}
                >
                  <IconSpeaker active={!isMuted} />
                  {isMuted ? 'Legend Voice Off — Click to Enable' : 'Legend Voice Active'}
                </button>
              </div>
            </div>

            {/* Chat card */}
            <div className="card">
              <div className="card-body">
                <div className="section-header compact">
                  <div>
                    <h3>Legend Chat</h3>
                    <p>Multilingual — French, Darija, Arabic, English.</p>
                  </div>
                </div>
                <form id="chat-form" className="chat-form" onSubmit={sendChat}>
                  <textarea
                    id="chat-input"
                    rows={4}
                    placeholder={CHAT_PLACEHOLDERS[language] || CHAT_PLACEHOLDERS.fr}
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                  />
                  <button id="chat-submit" className="btn btn-primary" type="submit">Send Message</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          COMMUNITY SCREEN
      ═══════════════════════════════════════════════════════ */}
      {screen === 'community' && (
        <>
          <div className="community-header">
            <SectionLabel>Fan Hub</SectionLabel>
            <h2 className="section-title">Community</h2>
            <p className="section-desc">Connect with fellow supporters of the Atlas Lions.</p>
          </div>
          <div className="community-grid">
            {[
              { title: 'Fan Leaderboard', desc: 'See who tops the weekly fan rankings.', action: () => setScreen('leaderboard') },
              { title: 'Quiz Room', desc: 'Test your Morocco football knowledge.', action: () => setScreen('quiz') },
              { title: 'Prediction League', desc: 'Submit your scoreline and battle other fans.', action: () => setScreen('predictions') },
              { title: 'What He Said', desc: 'Guess the real legend reaction to key moments.', action: () => setScreen('match') },
            ].map((item) => (
              <div key={item.title} className="card community-card" onClick={item.action} onKeyDown={(e) => e.key === 'Enter' && item.action()} role="button" tabIndex={0}>
                <div className="card-body">
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} type="button">
                    Enter
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          PREDICTIONS SCREEN
      ═══════════════════════════════════════════════════════ */}
      {screen === 'predictions' && (
        <div className="two-column-layout">
          {/* Prediction form */}
          <div className="card">
            <div className="card-body">
              <div className="section-header compact">
                <div>
                  <Pill tone="success">Fan vs Fan</Pill>
                  <h2 style={{ marginTop: 8 }}>Prediction League</h2>
                  <p>{predictionLegend?.legend_comment || 'The legend is ready to make a call.'}</p>
                </div>
              </div>

              <GoldRule />

              <div className="prediction-callout">
                <strong>{predictionLegend?.your_prediction || 'Legend prediction pending…'}</strong>
                <p>{predictionLegend?.legend_comment || 'Submit your scoreline to join the league.'}</p>
              </div>

              <form id="prediction-form" className="prediction-form" onSubmit={submitPrediction}>
                <label htmlFor="pred-home">
                  <span>{matchState?.home_team || 'Home'} goals</span>
                  <input
                    id="pred-home"
                    type="number"
                    min="0"
                    value={predictionInputs.home}
                    onChange={(e) => setPredictionInputs((c) => ({ ...c, home: e.target.value }))}
                  />
                </label>
                <label htmlFor="pred-away">
                  <span>{matchState?.away_team || 'Away'} goals</span>
                  <input
                    id="pred-away"
                    type="number"
                    min="0"
                    value={predictionInputs.away}
                    onChange={(e) => setPredictionInputs((c) => ({ ...c, away: e.target.value }))}
                  />
                </label>
                <button id="pred-submit" className="btn btn-primary" type="submit">Submit Scoreline</button>
              </form>

              {predictionResult && (
                <div className="result-box">
                  <pre>{JSON.stringify(predictionResult, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="card">
            <div className="card-body">
              <div className="section-header compact">
                <div>
                  <h3>Leaderboard</h3>
                  <p>Fan vs Fan league standings.</p>
                </div>
              </div>
              <div className="leaderboard-list">
                {leaderboard.length === 0
                  ? <EmptyState>Leaderboard data appears here.</EmptyState>
                  : leaderboard.map((entry) => (
                    <div className="leaderboard-row" key={`${entry.rank}-${entry.user_id}`}>
                      <div className="leaderboard-rank">#{entry.rank}</div>
                      <div className="leaderboard-user">{entry.user_id}</div>
                      <div className="leaderboard-coins">{entry.coins}c</div>
                      <div className="leaderboard-streak">{entry.streak} streak</div>
                      <div className="leaderboard-badges">
                        {Array.isArray(entry.badges) ? entry.badges.map(formatBadgeText).join(', ') : ''}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          QUIZ SCREEN
      ═══════════════════════════════════════════════════════ */}
      {screen === 'quiz' && (
        <div className="quiz-layout">
          <div className="card" style={{ maxWidth: 780, margin: '0 auto', width: '100%' }}>
            <div className="card-body">
              <div className="section-header compact">
                <div>
                  <Pill tone="warning">Quiz Room</Pill>
                  <h2 style={{ marginTop: 10 }}>{quiz?.lead_in || 'The legend is testing you'}</h2>
                  <p>{quiz?.locked ? 'This quiz is locked.' : 'Answer quickly — streak is everything.'}</p>
                </div>
                {quizCountdown != null && (
                  <span className="score-minute">{quizCountdown}s</span>
                )}
              </div>

              <div className="stat-grid">
                <LabelValue label="Remaining today" value={quiz?.remaining_today ?? wallet?.quiz_remaining_today ?? 0} />
                <LabelValue label="Points"          value={quiz?.points ?? 0} />
                <LabelValue label="Difficulty"      value={quiz?.difficulty || 'n/a'} />
              </div>

              <GoldRule />

              {quiz?.locked && <EmptyState>Free tier quiz limit reached — upgrade to Twin Pass for unlimited quizzes.</EmptyState>}

              {quiz?.question && (
                <h3 className="quiz-question">{quiz.question}</h3>
              )}

              <div className="quiz-options">
                {(quiz?.options || []).map((option, idx) => (
                  <button
                    id={`quiz-option-${idx}`}
                    key={`${option}-${idx}`}
                    className="btn btn-dark"
                    type="button"
                    onClick={() => answerQuiz(idx)}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {quizResult && (
                <div className="quiz-result-box" style={{ marginTop: 16 }}>
                  <div className="quiz-result-grid">
                    <LabelValue label="Correct"       value={quizResult.correct ? 'Yes' : 'No'} />
                    <LabelValue label="Correct index"  value={quizResult.correct_index} />
                    <LabelValue label="Coins awarded"  value={quizResult.coins_awarded} />
                    <LabelValue label="Streak"         value={quizResult.streak} />
                  </div>
                  <p style={{ marginTop: 12, color: 'var(--muted)' }}>{quizResult.explanation}</p>
                </div>
              )}

              {quizResult && (
                <button
                  id="quiz-next-btn"
                  className="btn btn-primary"
                  type="button"
                  style={{ marginTop: 16 }}
                  onClick={() => loadQuizNext().catch(() => null)}
                >
                  Next Question
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          LEADERBOARD / WALLET SCREEN
      ═══════════════════════════════════════════════════════ */}
      {screen === 'leaderboard' && (
        <div className="two-column-layout leaderboard-screen">
          {/* Wallet card */}
          <div className="card">
            <div className="card-body">
              <div className="section-header compact">
                <div>
                  <Pill tone="warning">Wallet</Pill>
                  <h2 style={{ marginTop: 8 }}>Player Balance</h2>
                  <p>Coins, badges, pro status, and unlocks.</p>
                </div>
              </div>

              <div className="wallet-detail-grid">
                <LabelValue label="Coins"             value={wallet?.coins ?? 0} />
                <LabelValue label="Pro"               value={wallet?.is_pro ? 'Yes' : 'No'} />
                <LabelValue label="Streak"            value={wallet?.streak ?? 0} />
                <LabelValue label="Unlocked legends"  value={Array.isArray(wallet?.unlocked_legends) ? wallet.unlocked_legends.length : 0} />
              </div>

              <div className="badge-list">
                {(wallet?.badges || []).map((badge, idx) => (
                  <span className="badge-chip" key={`${formatBadgeText(badge)}-${idx}`}>
                    {formatBadgeText(badge)}
                  </span>
                ))}
                {(!wallet?.badges || wallet.badges.length === 0) && (
                  <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No badges yet</span>
                )}
              </div>

              <div className="action-row">
                <button id="btn-activate-pass"   className="btn btn-gold"    type="button" onClick={handleTwinPassActivate}>Activate Twin Pass</button>
                <button id="btn-refresh-data"    className="btn btn-ghost"   type="button" onClick={refreshCoreData}>Refresh Live Data</button>
              </div>
            </div>
          </div>

          {/* Legend unlocks */}
          <div className="card">
            <div className="card-body">
              <div className="section-header compact">
                <div>
                  <h3>Legend Unlocks</h3>
                  <p>Tap a locked card on the home screen to pay the unlock cost.</p>
                </div>
              </div>
              <div className="unlock-summary">
                {legends.map((legend) => (
                  <div className="unlock-row" key={legend.id}>
                    <div>
                      <strong>{legend.name}</strong>
                      <p>{legend.arabic_name}</p>
                    </div>
                    <div>{legend.locked ? `${legend.unlock_cost_coins} coins` : <Pill tone="success">Unlocked</Pill>}</div>
                  </div>
                ))}
                {legends.length === 0 && <EmptyState>No legends found.</EmptyState>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          WHAT HE SAID OVERLAY
      ═══════════════════════════════════════════════════════ */}
      {whatHeSaidRound && (
        <div className="overlay-backdrop" role="dialog" aria-modal="true" aria-label="What He Said game">
          <div className="overlay-panel">
            <div className="overlay-header">
              <div>
                <Pill tone="warning">What He Said</Pill>
                <div className="overlay-title" style={{ marginTop: 10 }}>{whatHeSaidRound.prompt}</div>
                <p style={{ color: 'var(--muted)', marginTop: 6 }}>
                  {quizCountdown != null ? `${quizCountdown}s remaining` : `${whatHeSaidRound.timer_seconds || 30}s timer`}
                </p>
              </div>
              <button
                id="overlay-close"
                type="button"
                className="close-button"
                onClick={() => setWhatHeSaidRound(null)}
              >
                Close
              </button>
            </div>

            <div className="overlay-options">
              {(whatHeSaidRound.options || []).map((option, idx) => (
                <button
                  id={`whs-option-${idx}`}
                  key={`${option}-${idx}`}
                  className="btn btn-dark"
                  type="button"
                  onClick={() => guessWhatHeSaid(idx)}
                >
                  {option}
                </button>
              ))}
            </div>

            {whatHeSaidGuess && (
              <div className="result-box quiz-result-box" style={{ marginTop: 16 }}>
                <LabelValue label="Correct"       value={whatHeSaidGuess.correct ? 'Yes' : 'No'} />
                <LabelValue label="Real index"    value={whatHeSaidGuess.real_index} />
                <LabelValue label="Coins awarded" value={whatHeSaidGuess.coins_awarded} />
                <p style={{ marginTop: 10, color: 'var(--muted)' }}>
                  {whatHeSaidGuess.correct ? 'Nice call.' : whatHeSaidGuess.tease}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Global loading indicator ─────────────────────────── */}
      {loading && (
        <div className="loading-strip" role="status" aria-live="polite">
          <div className="loading-spinner" />
          Refreshing live data…
        </div>
      )}
      </div>
    </div>
  );
}
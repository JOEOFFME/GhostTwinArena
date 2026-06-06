import { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE } from './config/api.js';

// ── Assets ─────────────────────────────────────────────────
import logoMark      from './assets/logo_mark.png';
import heroStadium   from './assets/hero_stadium.png';
import stadiumAerial from './assets/stadium_aerial.png';
import streamPitch   from './assets/stream_pitch.png';
import playerHadji   from './assets/player_hadji.png';
import playerNaybet  from './assets/player_naybet.png';
import playerZaki    from './assets/player_zaki.png';
import matchAction   from './assets/match_action.png';
import newsTraining  from './assets/news_training.png';

const USER_ID_DEFAULT = 'guest';
const AVATAR_STATES = ['idle','listening','thinking','neutral','tense','frustrated','euphoric','celebrating','heartbroken'];
const PLAYER_IMAGES = [playerHadji, playerNaybet, playerZaki, playerHadji];

// ── Demo community data ────────────────────────────────────
const DEMO_POSTS = [
  { id: 1, type: 'post',      user: 'FanKing_MA',  avatar: 'FK', time: '2 min ago', text: 'Morocco vs Portugal is going to be insane. Hadji would have started and changed everything in the second half.', likes: 14, comments: 3 },
  { id: 2, type: 'challenge', user: 'AtlasTwin',    avatar: 'AT', time: '5 min ago', text: 'I challenge FanKing_MA — my prediction: Morocco 2-1 Portugal. Let\'s go!', opponent: 'FanKing_MA', bet: '50 coins', likes: 7,  comments: 1 },
  { id: 3, type: 'whs',       user: 'NayebFanatic', avatar: 'NF', time: '8 min ago', text: '🗣 Naybet reacted to the red card: "In my time, that was a straight boot in the back — you earned the card."', likes: 22, comments: 6 },
  { id: 4, type: 'post',      user: 'Maghreb1986',  avatar: 'M8', time: '11 min ago', text: 'Absolutely unbelievable that we are in the World Cup final. The legends would be proud of this generation. #AtlasLions', likes: 38, comments: 9 },
  { id: 5, type: 'challenge', user: 'ZakiGoalkeeper', avatar: 'ZG', time: '14 min ago', text: 'Open challenge! Who dares to predict Morocco vs Spain? My call: 3-0 Morocco. 100 coins on the line.', opponent: 'Anyone', bet: '100 coins', likes: 11, comments: 4 },
];

const DEMO_ONLINE = [
  { id: 'u1', name: 'FanKing_MA',   status: 'Watching Match',  avatar: 'FK' },
  { id: 'u2', name: 'AtlasTwin',    status: 'In Quiz Room',    avatar: 'AT' },
  { id: 'u3', name: 'NayebFanatic', status: 'Predicting',      avatar: 'NF' },
  { id: 'u4', name: 'Maghreb1986',  status: 'Community Chat',  avatar: 'M8' },
  { id: 'u5', name: 'ZakiKeeper',   status: 'Active',          avatar: 'ZK' },
];

const DEMO_CHALLENGES = [
  { id: 'c1', userA: 'AtlasTwin',    userB: 'FanKing_MA',    predA: 'MAR 2-1', predB: 'MAR 1-0', bet: '50 coins', status: 'open' },
  { id: 'c2', userA: 'ZakiKeeper',   userB: 'Anyone',        predA: 'MAR 3-0', predB: '?',       bet: '100 coins', status: 'open' },
  { id: 'c3', userA: 'Maghreb1986',  userB: 'NayebFanatic',  predA: 'MAR 2-2', predB: 'MAR 1-1', bet: '25 coins', status: 'active' },
];

// ── API ─────────────────────────────────────────────────────
async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.detail || payload?.error || `HTTP ${response.status}`);
  return payload;
}
function sanitizeList(v) {
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.leaderboard)) return v.leaderboard;
  return [];
}
function formatBadgeText(b) {
  if (typeof b === 'string') return b;
  return b?.name || b?.label || 'Badge';
}

// ── Primitive UI ────────────────────────────────────────────
function Pill({ children, tone = 'neutral' }) {
  return <span className={`pill tone-${tone}`}>{children}</span>;
}
function LabelValue({ label, value }) {
  return (
    <div className="label-value">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

// ── Inline SVG icons ────────────────────────────────────────
const Icons = {
  Play:       () => <svg viewBox="0 0 16 16" fill="currentColor"><path d="M3 2l10 6L3 14V2z"/></svg>,
  Pause:      () => <svg viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="4" height="12" rx="1"/><rect x="9" y="2" width="4" height="12" rx="1"/></svg>,
  Volume:     () => <svg viewBox="0 0 16 16" fill="currentColor"><path d="M1 5h3l5-3v12l-5-3H1V5z"/><path d="M12 5.5a4 4 0 010 5M14 3.5a7 7 0 010 9" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Fullscreen: () => <svg viewBox="0 0 16 16" fill="currentColor"><path d="M1 1h5V3H3v3H1V1zM10 1h5v5h-2V3h-3V1zM1 10h2v3h3v2H1v-5zM14 10h2v5h-5v-2h3v-3z"/></svg>,
  Mic:        () => <svg viewBox="0 0 16 16" fill="currentColor"><rect x="5" y="1" width="6" height="9" rx="3"/><path d="M2 7a6 6 0 0012 0M8 13v2M5 15h6" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Speaker:    () => <svg viewBox="0 0 16 16" fill="currentColor"><path d="M1 5h3l5-3v12l-5-3H1V5z"/><path d="M12 5.5a4 4 0 010 5" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Heart:      () => <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 13.5C8 13.5 1 9 1 4.5A3.5 3.5 0 018 2.5 3.5 3.5 0 0115 4.5C15 9 8 13.5 8 13.5z"/></svg>,
  Chat:       () => <svg viewBox="0 0 16 16" fill="currentColor"><path d="M1 2h14v9H9l-3 3v-3H1V2z"/></svg>,
  Challenge:  () => <svg viewBox="0 0 16 16" fill="currentColor"><path d="M5 1L1 5l7 10 7-10L11 1H5z"/></svg>,
  Bell:       () => <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a5 5 0 00-5 5v3l-1 2h12l-1-2V6a5 5 0 00-5-5zM6 13a2 2 0 004 0H6z"/></svg>,
  Trophy:     () => <svg viewBox="0 0 40 40" fill="none"><path d="M20 28c-5.523 0-10-4.477-10-10V8h20v10c0 5.523-4.477 10-10 10Z" fill="rgba(0,48,113,0.9)"/><path d="M10 10H5c0 4.418 2.239 8 5 9.5V10ZM30 10h5c0 4.418-2.239 8-5 9.5V10Z" fill="rgba(0,48,113,0.5)"/><rect x="14" y="28" width="12" height="3" rx="1" fill="rgba(0,48,113,0.8)"/><rect x="10" y="31" width="20" height="3" rx="1.5" fill="rgba(0,48,113,0.9)"/></svg>,
  Shield:     () => <svg viewBox="0 0 40 40" fill="none"><path d="M20 5L7 10v10c0 7.18 5.6 13.9 13 15 7.4-1.1 13-7.82 13-15V10L20 5Z" fill="rgba(255,255,255,0.9)"/><path d="M14 20l4 4 8-8" stroke="rgba(0,48,113,0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Medal:      () => <svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="26" r="10" fill="rgba(255,255,255,0.9)"/><circle cx="20" cy="26" r="6" fill="rgba(0,48,113,0.5)"/><path d="M16 8h8l-4 10-4-10Z" fill="rgba(255,255,255,0.7)"/></svg>,
  Star:       () => <svg viewBox="0 0 40 40" fill="none"><path d="M20 5l3.09 9.51H33l-8.09 5.88 3.09 9.52L20 24.97l-7.99 5.94 3.09-9.52L7 15.51h9.91L20 5Z" fill="rgba(255,255,255,0.9)"/></svg>,
  Quote:      () => <svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 3C2.34 3 1 4.34 1 6v4h4V6H3c0-.55.45-1 1-1V3zm8 0c-1.66 0-3 1.34-3 3v4h4V6h-2c0-.55.45-1 1-1V3z"/></svg>,
};

// ── Voice wave ───────────────────────────────────────────────
function VoiceWave({ active }) {
  return (
    <div className={`voice-wave${active ? ' speaking' : ''}`}>
      {Array.from({ length: 12 }, (_, i) => <div key={i} className="voice-bar" />)}
    </div>
  );
}

// ── Legend Card ─────────────────────────────────────────────
function LegendCard({ legend, index, selected, onSelect, onUnlock }) {
  const locked = Boolean(legend.locked);
  const imgSrc = legend.idle_avatar?.url || PLAYER_IMAGES[index % PLAYER_IMAGES.length];
  return (
    <button
      className={`legend-card${selected ? ' selected' : ''}`}
      id={`legend-card-${legend.id}`}
      type="button"
      aria-label={`Select ${legend.name}`}
      onClick={() => locked ? onUnlock?.(legend) : onSelect?.(legend)}
    >
      <div className="legend-card-img-wrap">
        <img alt={legend.name} className="legend-card-img" src={imgSrc}
          onError={(e) => { e.currentTarget.src = PLAYER_IMAGES[index % 3]; }} />
        <div className="legend-card-strip" />
        <div className="legend-card-badge-row">
          {locked ? <Pill tone="neutral">Locked</Pill> : <Pill tone="navy">Free</Pill>}
          {selected && <Pill tone="success">Watching</Pill>}
        </div>
      </div>
      <div className="legend-card-body">
        <div className="legend-card-name">{legend.name}</div>
        {legend.arabic_name && <div className="legend-card-arabic">{legend.arabic_name}</div>}
        <div className="legend-card-archetype">{legend.archetype}</div>
        <div className="legend-card-desc">{legend.archetype_desc || legend.description}</div>
        <div className="legend-card-footer">
          <span className="legend-card-cta">{locked ? 'Unlock' : 'Select'}</span>
          {locked && <span className="legend-card-cost">{legend.unlock_cost_coins} coins</span>}
        </div>
      </div>
    </button>
  );
}

// ── Quiz Spot Widget ─────────────────────────────────────────
function QuizSpot({ quiz, onAnswer, wallet, quizCountdown }) {
  if (!quiz?.question) {
    return (
      <div className="quiz-spot">
        <div className="quiz-spot-body">
          <div className="quiz-spot-label">Daily Quiz</div>
          <div className="quiz-spot-question">No question available — check back soon</div>
        </div>
      </div>
    );
  }
  return (
    <div className="quiz-spot">
      <div className="quiz-spot-body">
        <div className="quiz-spot-label">Daily Legend Quiz · {quiz.remaining_today ?? wallet?.quiz_remaining_today ?? 0} remaining</div>
        <div className="quiz-spot-question">{quiz.question}</div>
        <div className="quiz-spot-options">
          {(quiz.options || []).map((opt, idx) => (
            <button
              key={`${opt}-${idx}`}
              id={`qs-option-${idx}`}
              className="quiz-spot-option"
              type="button"
              onClick={() => onAnswer(idx)}
            >
              <span className="quiz-spot-option-letter">{String.fromCharCode(65 + idx)}.</span>
              {opt}
            </button>
          ))}
        </div>
        <div className="quiz-spot-footer">
          <span className="quiz-spot-meta">{quiz.points ?? 0} pts · {quiz.difficulty || 'Standard'}</span>
          {quizCountdown != null && (
            <span className="quiz-spot-timer" style={{ color: quizCountdown <= 10 ? '#c42b2b' : 'var(--white)' }}>
              {quizCountdown}s
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── WHS Notification Spot ────────────────────────────────────
function WHSNotificationSpot({ round, onGuess, guess }) {
  if (!round) {
    return (
      <div className="whs-notification">
        <div className="whs-notification-header">
          <div className="whs-icon"><Icons.Quote /></div>
          <div>
            <div className="whs-title">What He Said</div>
            <div className="whs-sub">Legend quotes appear here during the match</div>
          </div>
        </div>
        <div className="whs-quote" style={{ opacity: 0.5 }}>
          "Trigger a match event and the legend will say something unforgettable..."
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Guess what the legend said for bonus coins
        </div>
      </div>
    );
  }
  return (
    <div className="whs-notification">
      <div className="whs-notification-header">
        <div className="whs-icon"><Icons.Quote /></div>
        <div>
          <div className="whs-title">What He Said</div>
          <div className="whs-sub">Guess the legend's reaction</div>
        </div>
      </div>
      <div className="whs-quote">"{round.prompt}"</div>
      {!guess ? (
        <div className="whs-options-row">
          {(round.options || []).map((opt, idx) => (
            <button key={`${opt}-${idx}`} id={`whs-spot-${idx}`} className="whs-option-btn" type="button" onClick={() => onGuess(idx)}>
              <span className="whs-option-letter">{String.fromCharCode(65 + idx)}.</span>
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ padding: '12px 14px', borderRadius: 8, background: guess.correct ? '#f0faf4' : '#fff0f0', border: `1px solid ${guess.correct ? 'rgba(26,122,74,0.25)' : 'rgba(196,43,43,0.25)'}` }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: guess.correct ? 'var(--success)' : 'var(--danger)', marginBottom: 4 }}>
            {guess.correct ? 'Correct!' : 'Wrong Answer'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>+{guess.coins_awarded} coins awarded</div>
        </div>
      )}
    </div>
  );
}

// ── Community Post ───────────────────────────────────────────
function CommunityPost({ post, userId }) {
  const [liked, setLiked] = useState(false);
  return (
    <article className={`community-post ${post.type === 'challenge' ? 'post-challenge' : post.type === 'whs' ? 'post-whs' : ''}`}>
      <div className="post-header">
        <div className="post-user-avatar">{post.avatar}</div>
        <div style={{ flex: 1 }}>
          <div className="post-user-name">{post.user}</div>
          <div className="post-user-meta">{post.time}
            {post.type === 'challenge' && <> · <span style={{ color: 'var(--navy)', fontWeight: 700 }}>Challenge</span></>}
            {post.type === 'whs'       && <> · <span style={{ color: '#c09a20', fontWeight: 700 }}>What He Said</span></>}
          </div>
        </div>
        {post.type === 'challenge' && <Pill tone="navy">vs {post.opponent}</Pill>}
        {post.type === 'whs'       && <Pill tone="warning">Legend Quote</Pill>}
      </div>
      <div className="post-body">{post.text}</div>
      {post.type === 'challenge' && (
        <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: 'var(--navy-light)', border: '1px solid var(--border-navy)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--navy)' }}>Bet: {post.bet}</span>
          <button type="button" className="btn btn-primary btn-sm" style={{ padding: '6px 14px' }}>Accept Challenge</button>
        </div>
      )}
      <div className="post-footer">
        <button type="button" className="post-action-btn" style={{ color: liked ? 'var(--danger)' : undefined }} onClick={() => setLiked((v) => !v)}>
          <Icons.Heart /> {post.likes + (liked ? 1 : 0)}
        </button>
        <button type="button" className="post-action-btn">
          <Icons.Chat /> {post.comments}
        </button>
        {post.type !== 'challenge' && (
          <button type="button" className="post-action-btn">
            <Icons.Challenge /> Challenge
          </button>
        )}
      </div>
    </article>
  );
}

/* ═══════════════════════════════════════════════════════════
   APP ROOT
   ═══════════════════════════════════════════════════════════ */
export default function App() {
  const [userId, setUserId]                       = useState(USER_ID_DEFAULT);
  const [screen, setScreen]                       = useState('home');
  const [legends, setLegends]                     = useState([]);
  const [selectedLegendId, setSelectedLegendId]   = useState(null);
  const [wallet, setWallet]                       = useState(null);
  const [matchState, setMatchState]               = useState(null);
  const [matchFeed, setMatchFeed]                 = useState([]);
  const [currentAvatar, setCurrentAvatar]         = useState(null);
  const [legendNotice, setLegendNotice]           = useState('');
  const [chatMessage, setChatMessage]             = useState('');
  const [predictionLegend, setPredictionLegend]   = useState(null);
  const [predictionInputs, setPredictionInputs]   = useState({ home: '', away: '' });
  const [predictionResult, setPredictionResult]   = useState(null);
  const [leaderboard, setLeaderboard]             = useState([]);
  const [quiz, setQuiz]                           = useState(null);
  const [quizResult, setQuizResult]               = useState(null);
  const [whatHeSaidRound, setWhatHeSaidRound]     = useState(null);
  const [whatHeSaidGuess, setWhatHeSaidGuess]     = useState(null);
  const [statusMessage, setStatusMessage]         = useState('');
  const [loading, setLoading]                     = useState(false);
  const [error, setError]                         = useState('');
  const [quizCountdown, setQuizCountdown]         = useState(null);
  // Match stream
  const [isStreaming, setIsStreaming]             = useState(false);
  const [streamVolume, setStreamVolume]           = useState(70);
  const [isSpeaking, setIsSpeaking]              = useState(false);
  const [legendMuted, setLegendMuted]             = useState(false);
  // WHS toast
  const [whsToast, setWhsToast]                  = useState(null);
  // Community
  const [communityPosts, setCommunityPosts]       = useState(DEMO_POSTS);
  const [newPost, setNewPost]                     = useState('');
  const [postType, setPostType]                   = useState('post');

  const audioRef = useRef(null);

  const selectedLegend = useMemo(
    () => legends.find((l) => l.id === selectedLegendId) || legends[0] || null,
    [legends, selectedLegendId],
  );
  const legendImgIdx = useMemo(
    () => Math.max(legends.findIndex((l) => l.id === selectedLegendId), 0),
    [legends, selectedLegendId],
  );
  const activeAvatar = currentAvatar || selectedLegend?.idle_avatar || null;

  // ── Audio ─────────────────────────────────────────────────
  function playAudio(url) {
    if (!url) return;
    try {
      const a = audioRef.current || new Audio();
      audioRef.current = a;
      a.pause(); a.src = url; a.currentTime = 0;
      a.play().catch(() => null);
    } catch { /**/ }
  }

  function pushFeedItem(payload, source) {
    setMatchFeed((cur) => [{
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      source,
      text: payload?.text || payload?.tease || 'Legend reacted.',
      audio_url: payload?.audio_url || null,
      avatar: payload?.avatar || null,
    }, ...cur].slice(0, 12));
    if (payload?.avatar)    setCurrentAvatar(payload.avatar);
    if (payload?.audio_url) { setIsSpeaking(true); playAudio(payload.audio_url); setTimeout(() => setIsSpeaking(false), 4000); }
    // Show WHS toast if the legend produced a "what he said" style event
    if (payload?.text && payload.text.length > 40) {
      setWhsToast({ text: payload.text, ts: Date.now() });
      setTimeout(() => setWhsToast(null), 8000);
    }
  }

  // ── Data loaders ──────────────────────────────────────────
  async function loadLegends() {
    const p = await requestJson('/legends');
    const next = p?.legends || [];
    setLegends(next);
    if (!selectedLegendId && next.length > 0) {
      const free = next.find((l) => !l.locked) || next[0];
      setSelectedLegendId(free.id);
      setCurrentAvatar(free.idle_avatar || null);
    }
  }
  async function loadWallet() {
    const p = await requestJson(`/wallet?user_id=${encodeURIComponent(userId)}`);
    setWallet(p);
  }
  async function loadMatchState() {
    const p = await requestJson('/match-state');
    setMatchState(p);
  }
  async function loadPredictionLegend() {
    const q = new URLSearchParams({ user_id: userId });
    if (selectedLegendId) q.set('legend_id', selectedLegendId);
    const p = await requestJson(`/prediction/legend?${q.toString()}`);
    setPredictionLegend(p);
  }
  async function loadLeaderboard() {
    const p = await requestJson('/leaderboard');
    setLeaderboard(sanitizeList(p));
  }
  async function loadQuizNext() {
    const p = await requestJson('/quiz/next');
    setQuiz(p); setQuizResult(null); setQuizCountdown(null);
  }
  async function refreshCoreData() {
    setLoading(true); setError('');
    try {
      await Promise.all([loadLegends(), loadWallet(), loadMatchState(), loadPredictionLegend(), loadLeaderboard(), loadQuizNext()]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load data.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { refreshCoreData(); }, [userId]);
  useEffect(() => {
    const t = setInterval(() => loadMatchState().catch((e) => setError(e.message)), 10000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (screen !== 'quiz') return; if (!quiz) loadQuizNext().catch((e) => setError(e.message)); }, [quiz, screen]);
  useEffect(() => { if (screen !== 'predictions') return; loadPredictionLegend().catch((e) => setError(e.message)); }, [screen, selectedLegendId, userId]);
  useEffect(() => { setQuizCountdown((quiz?.timer_seconds || 0) > 0 ? quiz.timer_seconds : null); }, [quiz]);
  useEffect(() => {
    if (quizCountdown == null || quizCountdown <= 0) return;
    const t = setTimeout(() => setQuizCountdown((c) => (c == null ? c : Math.max(c - 1, 0))), 1000);
    return () => clearTimeout(t);
  }, [quizCountdown]);

  // ── Actions ───────────────────────────────────────────────
  async function handleUnlockLegend(legend) {
    try {
      await requestJson(`/legends/${legend.id}/unlock`, { method: 'POST', body: JSON.stringify({ user_id: userId }) });
      setStatusMessage(`${legend.name} unlocked.`); await loadLegends(); await loadWallet();
    } catch (e) { setError(e.message); }
  }
  async function handleTwinPassActivate() {
    try {
      await requestJson('/twin-pass/activate', { method: 'POST', body: JSON.stringify({ user_id: userId }) });
      setStatusMessage('Twin Pass activated.'); await loadWallet();
    } catch (e) { setError(e.message); }
  }
  async function sendReact(type) {
    try {
      await requestJson('/simulate', { method: 'POST', body: JSON.stringify({ type, user_id: userId, legend_id: selectedLegendId }) });
      const p = await requestJson('/react', { method: 'POST', body: JSON.stringify({ type, team: matchState?.home_team || 'home', scorer: matchState?.scorer || null, minute: matchState?.minute || 0 }) });
      pushFeedItem(p, type);
    } catch (e) { setError(e.message); }
  }
  async function sendChat(e) {
    e.preventDefault(); if (!chatMessage.trim()) return;
    try {
      const p = await requestJson('/chat', { method: 'POST', body: JSON.stringify({ user_id: userId, message: chatMessage.trim() }) });
      pushFeedItem(p, 'chat'); setChatMessage('');
    } catch (err) { setError(err.message); }
  }
  async function submitPrediction(e) {
    e.preventDefault(); if (predictionInputs.home === '' || predictionInputs.away === '') return;
    try {
      const p = await requestJson('/prediction/submit', { method: 'POST', body: JSON.stringify({ user_id: userId, match_id: predictionLegend?.match_id || matchState?.match_id || 'current', home_score: Number(predictionInputs.home), away_score: Number(predictionInputs.away) }) });
      setPredictionResult(p); await loadLeaderboard(); await loadWallet();
    } catch (err) { setError(err.message); }
  }
  async function answerQuiz(idx) {
    if (!quiz) return;
    try {
      const p = await requestJson('/quiz/answer', { method: 'POST', body: JSON.stringify({ user_id: userId, legend_id: selectedLegend?.id, question_id: quiz.question_id, answer_index: idx }) });
      setQuizResult(p); await loadWallet();
    } catch (e) { setError(e.message); }
  }
  async function openWhatHeSaid(type) {
    try {
      const p = await requestJson('/what-he-said/open', { method: 'POST', body: JSON.stringify({ type, team: matchState?.home_team || 'home', minute: matchState?.minute || 0 }) });
      setWhatHeSaidRound(p); setWhatHeSaidGuess(null);
    } catch (e) { setError(e.message); }
  }
  async function guessWhatHeSaid(idx) {
    if (!whatHeSaidRound) return;
    try {
      const p = await requestJson('/what-he-said/guess', { method: 'POST', body: JSON.stringify({ user_id: userId, round_id: whatHeSaidRound.round_id, choice_index: idx }) });
      setWhatHeSaidGuess(p); await loadWallet();
    } catch (e) { setError(e.message); }
  }
  function selectLegend(legend) {
    setSelectedLegendId(legend.id); setCurrentAvatar(legend.idle_avatar || null);
    setScreen('match'); setLegendNotice(`${legend.name} is now watching with you.`);
  }
  function submitCommunityPost() {
    if (!newPost.trim()) return;
    setCommunityPosts((cur) => [{
      id: Date.now(), type: postType, user: userId, avatar: userId.slice(0, 2).toUpperCase(),
      time: 'Just now', text: newPost.trim(), likes: 0, comments: 0,
      ...(postType === 'challenge' ? { opponent: 'Anyone', bet: '50 coins' } : {}),
    }, ...cur]);
    setNewPost('');
  }

  // ── Wallet chip ───────────────────────────────────────────
  function renderWalletChip() {
    if (!wallet) return null;
    return (
      <div className="wallet-chips">
        <Pill tone="light">{wallet.coins ?? 0} coins</Pill>
        <Pill tone={wallet.is_pro ? 'success' : 'neutral'}>{wallet.is_pro ? 'Twin Pass' : 'Free'}</Pill>
      </div>
    );
  }

  // ── Avatar ────────────────────────────────────────────────
  function renderAvatar() {
    const src = activeAvatar?.url || PLAYER_IMAGES[legendImgIdx % PLAYER_IMAGES.length];
    return (
      <div className="legend-avatar-zone">
        <img key={src} alt={selectedLegend?.name || 'Legend'} className="avatar-image" src={src} onError={(e) => { e.currentTarget.src = playerHadji; }} />
        <div className="avatar-state-badge">{activeAvatar?.label || activeAvatar?.state || 'Idle'}</div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════ */
  return (
    <div className="app-shell">

      {/* ══ TOPBAR ══ */}
      <header className="topbar" role="banner">
        <div className="topbar-left">
          <div className="brand-logo" onClick={() => setScreen('home')} role="button" tabIndex={0} aria-label="Home">
            <div className="brand-mark">
              <img src={logoMark} alt="Ghost Twin Arena" width={42} height={42} style={{ objectFit: 'cover' }} />
            </div>
            <div className="brand-text">
              <div className="brand-name">Ghost Twin Arena</div>
              <div className="brand-tagline">World Cup 2030</div>
            </div>
          </div>
        </div>

        <nav className="screen-nav" role="navigation">
          {[
            { id: 'home',        label: 'Legends'     },
            { id: 'match',       label: 'Live Match'  },
            { id: 'community',   label: 'Community'   },
            { id: 'predictions', label: 'Predictions' },
            { id: 'quiz',        label: 'Quiz'        },
            { id: 'leaderboard', label: 'Leaderboard' },
          ].map(({ id, label }) => (
            <button key={id} id={`nav-${id}`} className={`screen-button${screen === id ? ' active' : ''}`}
              type="button" onClick={() => setScreen(id)}>{label}</button>
          ))}
        </nav>

        <div className="topbar-right">
          {renderWalletChip()}
          <label className="user-chip" htmlFor="user-id-input">
            <span>User</span>
            <input id="user-id-input" value={userId} onChange={(e) => setUserId(e.target.value || USER_ID_DEFAULT)} />
          </label>
          <button id="nav-join-btn" className="btn btn-white btn-sm" type="button" onClick={() => setScreen('community')}>
            Join Community
          </button>
        </div>
      </header>

      {/* ══ MAIN ══ */}
      <main className="main-content" id="main">

        {/* Banners */}
        {(error || statusMessage || legendNotice) && (
          <div className="banners">
            {error         && <div className="banner banner-error"  role="alert">{error}</div>}
            {statusMessage && <div className="banner banner-status">{statusMessage}</div>}
            {legendNotice  && <div className="banner banner-notice">{legendNotice}</div>}
          </div>
        )}

        {/* ═══════════════════════════════
            HOME
            ═══════════════════════════════ */}
        {screen === 'home' && (
          <>
            {/* HERO */}
            <section className="hero" aria-labelledby="hero-title">
              <img src={heroStadium} alt="Stadium" className="hero-bg" />
              <div className="hero-overlay" />
              <div className="hero-content">
                <div className="hero-eyebrow">Ghost Twin Arena — World Cup 2030</div>
                <h1 className="hero-title" id="hero-title">Experience<br />Your Football<br />Legends</h1>
                <p className="hero-desc">Pick a Moroccan legend who watches every match with you — reacting live to every goal, red card, and VAR call. Predict scores, win quizzes, climb the board.</p>
                <div className="hero-actions">
                  <button id="hero-cta-explore" className="btn btn-white btn-lg" type="button"
                    onClick={() => document.getElementById('legends-section')?.scrollIntoView({ behavior: 'smooth' })}>
                    Choose a Legend
                  </button>
                  <button id="hero-cta-community" className="btn btn-outline btn-lg" type="button" onClick={() => setScreen('community')}>
                    Join Community
                  </button>
                </div>
              </div>
              <div className="hero-schedule-strip">
                <div className="schedule-match">
                  <div>
                    <div className="schedule-label">Next Match</div>
                    <div className="schedule-teams">
                      <span className="schedule-team">Morocco</span>
                      <span className="schedule-score">vs</span>
                      <span className="schedule-team">Portugal</span>
                    </div>
                  </div>
                  <span className="schedule-time">OCT 23 2030 · 19:00</span>
                </div>
                <div className="schedule-match" style={{ borderRight: 'none' }}>
                  <div>
                    <div className="schedule-label">Last Result</div>
                    <div className="schedule-teams">
                      <span className="schedule-team">{matchState?.home_team || 'MAR'}</span>
                      <span className="schedule-score">{matchState?.home_score ?? 0} – {matchState?.away_score ?? 0}</span>
                      <span className="schedule-team">{matchState?.away_team || 'ARG'}</span>
                    </div>
                  </div>
                  <span className="schedule-time">{matchState?.status || 'Full Time'}</span>
                </div>
              </div>
            </section>

            {/* STATS BAND */}
            <div className="stats-band">
              {[
                { icon: <Icons.Trophy />, value: 'World Cup',       label: 'Tournament 2030'  },
                { icon: <Icons.Medal />,  value: '1986 & 1998',     label: 'WC Appearances'   },
                { icon: <Icons.Shield />, value: 'AFCON 2025',      label: 'Africa Champions' },
                { icon: <Icons.Star />,   value: `${AVATAR_STATES.length} Moods`, label: 'Legend States' },
              ].map(({ icon, value, label }) => (
                <div className="stat-item" key={label}>
                  <div className="stat-icon">{icon}</div>
                  <div className="stat-value">{value}</div>
                  <div className="stat-label">{label}</div>
                </div>
              ))}
            </div>

            {/* LEGENDS + QUIZ SPOT SIDE BY SIDE */}
            <section id="legends-section" className="legends-section">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' }}>
                <div>
                  <div className="section-header-row">
                    <div>
                      <div className="section-eyebrow">Choose Your Legend</div>
                      <h2 className="section-title">Team Legends</h2>
                    </div>
                    <button id="view-all-btn" className="btn btn-outline-navy btn-sm" type="button">View All</button>
                  </div>
                  {legends.length === 0 && !loading && <div className="empty-state">No legends loaded — check backend connection.</div>}
                  <div className="legend-grid">
                    {legends.map((legend, idx) => (
                      <LegendCard key={legend.id} index={idx} legend={legend} selected={legend.id === selectedLegend?.id} onSelect={selectLegend} onUnlock={handleUnlockLegend} />
                    ))}
                  </div>
                </div>

                {/* Right sidebar: Quiz Spot + WHS */}
                <div style={{ display: 'grid', gap: 20, position: 'sticky', top: 88 }}>
                  <QuizSpot quiz={quiz} onAnswer={answerQuiz} wallet={wallet} quizCountdown={quizCountdown} />
                  <WHSNotificationSpot round={whatHeSaidRound} onGuess={guessWhatHeSaid} guess={whatHeSaidGuess} />
                </div>
              </div>
            </section>

            {/* FEATURED MATCH */}
            <section className="section" style={{ background: 'var(--bg-section)', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'center' }}>
                <div className="featured-match-img"><img src={stadiumAerial} alt="Stadium aerial" /></div>
                <div>
                  <div className="section-eyebrow">Featured</div>
                  <h2 className="section-title">World Prestige Match</h2>
                  <p className="section-desc">Watch alongside a Moroccan legend and get live reactions, predictions and insights from players who lived through matches like this.</p>
                  <div style={{ marginTop: 24 }}>
                    <button id="watch-match-btn" className="btn btn-primary" type="button" onClick={() => setScreen('match')}>Watch With a Legend</button>
                  </div>
                </div>
              </div>
            </section>

            {/* NEWS */}
            <section className="section" style={{ background: 'var(--white)' }}>
              <div className="section-header-row">
                <div>
                  <div className="section-eyebrow">Updates</div>
                  <h2 className="section-title">Latest News</h2>
                </div>
                <button className="btn btn-outline-navy btn-sm" type="button">See All</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 18 }}>
                {[
                  { img: newsTraining,  title: 'Morocco in Final World Cup Training Camp',           date: 'Jun 5, 2030', cat: 'Training' },
                  { img: matchAction,   title: 'Hadji Legend Preview: What to Expect vs Portugal',  date: 'Jun 4, 2030', cat: 'Legends'  },
                  { img: stadiumAerial, title: '80,000 Fans Expected for the Opening Ceremony',     date: 'Jun 3, 2030', cat: 'Stadium'  },
                ].map((article) => (
                  <article className="news-card" key={article.title}>
                    <div className="news-card-img"><img src={article.img} alt={article.title} /></div>
                    <div className="news-card-body">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Pill tone="light">{article.cat}</Pill>
                        <span className="news-card-date">{article.date}</span>
                      </div>
                      <div className="news-card-title">{article.title}</div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* CTA */}
            <div className="cta-band">
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div className="section-eyebrow section-eyebrow-white" style={{ justifyContent: 'center', marginBottom: 14 }}>Don't Miss Your Best Matches</div>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(2.5rem,5vw,4rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--white)', marginBottom: 28, lineHeight: 0.92 }}>
                  Come Join Us and<br />Watch With a Legend
                </h2>
                <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button id="cta-join-btn"  className="btn btn-white btn-lg" type="button" onClick={() => setScreen('community')}>Join Community</button>
                  <button id="cta-watch-btn" className="btn btn-outline btn-lg" type="button" onClick={() => setScreen('match')}>Watch Live</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════
            MATCH SCREEN
            ═══════════════════════════════ */}
        {screen === 'match' && (
          <div className="match-page">
            <div className="stream-zone">
              {/* Video panel */}
              <div className="stream-panel">
                <img src={streamPitch} alt="Live match" className="stream-img" />
                <div className="stream-overlay-top">
                  <div className="stream-live-badge">Live</div>
                  <div className="stream-score-pill">
                    <span className="stream-score-team">{matchState?.home_team || 'MAR'}</span>
                    <span className="stream-score-num">{matchState?.home_score ?? 0} : {matchState?.away_score ?? 0}</span>
                    <span className="stream-score-team">{matchState?.away_team || 'POR'}</span>
                  </div>
                  <div className="stream-time-badge">{matchState?.minute != null ? `${matchState.minute}'` : '--'}</div>
                </div>
                <div className="stream-controls">
                  <button id="stream-play-btn" className="ctrl-btn" type="button" onClick={() => setIsStreaming((v) => !v)}>
                    {isStreaming ? <Icons.Pause /> : <Icons.Play />}
                  </button>
                  <div className="ctrl-volume">
                    <button className="ctrl-btn" type="button"><Icons.Volume /></button>
                    <input type="range" className="ctrl-volume-slider" min={0} max={100} value={streamVolume} onChange={(e) => setStreamVolume(Number(e.target.value))} />
                  </div>
                  <div className="ctrl-progress">
                    <div className="ctrl-progress-fill" style={{ width: isStreaming ? '45%' : '35%' }} />
                  </div>
                  <button id="stream-fullscreen-btn" className="ctrl-btn" type="button"><Icons.Fullscreen /></button>
                </div>
              </div>

              {/* Legend panel */}
              <div className="legend-panel">
                <div className="legend-panel-header">
                  <div>
                    <div className="legend-panel-name">{selectedLegend?.name || 'Select a Legend'}</div>
                    <div className="legend-panel-role">{selectedLegend?.archetype || 'Co-Pilot'}</div>
                  </div>
                  <Pill tone={isSpeaking ? 'success' : 'light'}>{isSpeaking ? 'Speaking' : 'Watching'}</Pill>
                </div>
                {renderAvatar()}
                <div className={`voice-zone${isSpeaking ? ' speaking' : ''}`}>
                  <div className="voice-label">Legend Voice</div>
                  <VoiceWave active={isSpeaking} />
                  <div className="voice-buttons">
                    <button id="legend-speak-btn" className="voice-speak-btn" type="button" onClick={() => sendReact('GOAL')}>
                      <Icons.Speaker /> Ask Legend
                    </button>
                    <button id="legend-mute-btn" className="voice-mini-btn" type="button" onClick={() => setLegendMuted((v) => !v)}>
                      <Icons.Speaker /> {legendMuted ? 'Unmute' : 'Mute'}
                    </button>
                    <button id="legend-chat-btn" className="voice-mini-btn" type="button" onClick={() => document.getElementById('chat-input')?.focus()}>
                      <Icons.Mic /> Chat
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="match-bottom">
              {/* Left */}
              <div className="match-bottom-col">
                <div className="scoreboard-card">
                  <div className="scoreboard-top">
                    <Pill tone={matchState?.status?.toLowerCase().includes('live') ? 'success' : 'navy'}>
                      {matchState?.status || 'Waiting'}
                    </Pill>
                    <span className="match-status-text">{matchState?.home_team || 'Home'} vs {matchState?.away_team || 'Away'}</span>
                  </div>
                  <div className="scoreboard-body">
                    <div className="scoreboard">
                      <div className="score-team-block">
                        <div className="score-team-name">{matchState?.home_team || 'Home'}</div>
                        <div className="score-team-label">Home</div>
                      </div>
                      <div className="score-center">
                        <span className="score-num">{matchState?.home_score ?? 0}</span>
                        <span className="score-sep">:</span>
                        <span className="score-num">{matchState?.away_score ?? 0}</span>
                      </div>
                      <div className="score-team-block" style={{ textAlign: 'right' }}>
                        <div className="score-team-name">{matchState?.away_team || 'Away'}</div>
                        <div className="score-team-label">Away</div>
                      </div>
                    </div>
                    <div className="stat-grid">
                      <div className="stat-block"><div className="stat-block-label">Emotional State</div><div className="stat-block-value">{matchState?.emotional_state || 'Idle'}</div></div>
                      <div className="stat-block"><div className="stat-block-label">Avatar State</div><div className="stat-block-value">{matchState?.avatar_state || 'Idle'}</div></div>
                      <div className="stat-block"><div className="stat-block-label">Co-Pilot</div><div className="stat-block-value" style={{ color: 'var(--navy)' }}>{selectedLegend?.name || 'None'}</div></div>
                    </div>
                    <div className="reaction-toolbar">
                      <button id="react-goal"     className="react-btn" type="button" onClick={() => sendReact('GOAL')}>Goal</button>
                      <button id="react-redcard"  className="react-btn" type="button" onClick={() => sendReact('RED_CARD')}>Red Card</button>
                      <button id="react-var"      className="react-btn" type="button" onClick={() => sendReact('VAR')}>VAR</button>
                      <button id="react-penalty"  className="react-btn" type="button" onClick={() => sendReact('PENALTY')}>Penalty</button>
                      <button id="react-whatsaid" className="react-btn react-btn-accent" type="button" onClick={() => openWhatHeSaid('REACT')}>What He Said</button>
                    </div>
                  </div>
                </div>

                {/* WHS Notification Spot in match screen */}
                <WHSNotificationSpot round={whatHeSaidRound} onGuess={guessWhatHeSaid} guess={whatHeSaidGuess} />

                {/* Feed */}
                <div>
                  <div className="inner-header">
                    <div><div className="inner-title">Reaction Feed</div><div className="inner-sub">Real-time legend reactions</div></div>
                    <Pill tone="light">{matchFeed.length}</Pill>
                  </div>
                  <div className="feed-list">
                    {matchFeed.length === 0
                      ? <div className="empty-state">Trigger a match event above to see reactions.</div>
                      : matchFeed.map((item) => (
                        <article className="feed-item" key={item.id}>
                          <div className="feed-avatar">{item.avatar?.label?.slice(0,2) || 'GT'}</div>
                          <div>
                            <div className="feed-source">{item.source}</div>
                            <p className="feed-text">{item.text}</p>
                            {item.audio_url && (
                              <button type="button" className="btn btn-outline-navy btn-sm" style={{ marginTop: 8 }}
                                onClick={() => { playAudio(item.audio_url); setIsSpeaking(true); setTimeout(() => setIsSpeaking(false), 4000); }}>
                                Play Audio
                              </button>
                            )}
                          </div>
                        </article>
                      ))}
                  </div>
                </div>
              </div>

              {/* Right — Chat */}
              <div className="match-bottom-col">
                <div className="inner-header">
                  <div><div className="inner-title">Legend Chat</div><div className="inner-sub">French · Darija · Arabic · English</div></div>
                </div>
                <form className="chat-form" id="chat-form" onSubmit={sendChat}>
                  <textarea id="chat-input" rows={5} placeholder="Talk to the legend in any language..." value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} />
                  <button id="chat-send-btn" type="submit" className="btn btn-primary btn-full">Send Message</button>
                </form>
                {selectedLegend && (
                  <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--white)', border: '1px solid var(--border)', borderLeft: '3px solid var(--navy)', borderRadius: 8 }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--dark)', marginBottom: 4 }}>{selectedLegend.name}</div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--navy)', marginBottom: 6 }}>{selectedLegend.archetype}</div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{selectedLegend.archetype_desc || selectedLegend.description || 'Your legend co-pilot.'}</p>
                    <button type="button" className="btn btn-outline-navy btn-sm" style={{ marginTop: 12 }} onClick={() => setScreen('home')}>Change Legend</button>
                  </div>
                )}

                {/* Quiz spot in match sidebar */}
                <div style={{ marginTop: 4 }}>
                  <QuizSpot quiz={quiz} onAnswer={answerQuiz} wallet={wallet} quizCountdown={quizCountdown} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════
            COMMUNITY SCREEN
            ═══════════════════════════════ */}
        {screen === 'community' && (
          <div className="community-page">
            {/* Main column */}
            <div className="community-col">
              <div>
                <div className="section-eyebrow">Fan Hub</div>
                <h2 className="section-title" style={{ marginBottom: 4 }}>Community</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 24 }}>Exchange, debate, and challenge other fans in real time.</p>
              </div>

              {/* Post composer */}
              <div className="post-composer">
                <div className="post-composer-header">
                  <div className="composer-avatar">{userId.slice(0,2).toUpperCase()}</div>
                  <div>
                    <div className="composer-label">{userId}</div>
                    <div className="composer-sub">Share your thoughts with the community</div>
                  </div>
                </div>
                <textarea
                  id="community-post-input"
                  placeholder={postType === 'challenge' ? 'Issue a challenge — your prediction vs theirs...' : postType === 'whs' ? 'Share what a legend said...' : 'Share your thoughts, reactions, predictions...'}
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  rows={3}
                />
                <div className="post-composer-footer">
                  <div className="post-type-tabs">
                    {[
                      { id: 'post',      label: 'Post'      },
                      { id: 'challenge', label: 'Challenge' },
                      { id: 'whs',       label: 'Quote'     },
                    ].map(({ id, label }) => (
                      <button key={id} id={`post-type-${id}`} className={`post-type-tab${postType === id ? ' active' : ''}`}
                        type="button" onClick={() => setPostType(id)}>{label}</button>
                    ))}
                  </div>
                  <button id="submit-post-btn" className="btn btn-primary btn-sm" type="button" onClick={submitCommunityPost}>Post</button>
                </div>
              </div>

              {/* Feed */}
              <div className="community-feed">
                {communityPosts.map((post) => (
                  <CommunityPost key={post.id} post={post} userId={userId} />
                ))}
              </div>
            </div>

            {/* Sidebar */}
            <div style={{ display: 'grid', gap: 16 }}>
              {/* Online users */}
              <div className="online-users">
                <div className="online-title">
                  <span className="online-dot" />
                  Online Now ({DEMO_ONLINE.length})
                </div>
                <div className="online-user-list">
                  {DEMO_ONLINE.map((u) => (
                    <div className="online-user-row" key={u.id}>
                      <div className="online-avatar">{u.avatar}</div>
                      <div>
                        <div className="online-user-name">{u.name}</div>
                        <div className="online-user-status">{u.status}</div>
                      </div>
                      <button type="button" className="btn btn-outline-navy btn-sm" style={{ padding: '4px 10px', fontSize: '0.62rem' }}>Challenge</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Challenges */}
              <div className="challenge-card">
                <div className="challenge-header">
                  <div className="challenge-title">Active Challenges</div>
                  <Pill tone="navy">{DEMO_CHALLENGES.length}</Pill>
                </div>
                {DEMO_CHALLENGES.map((c) => (
                  <div className="challenge-row" key={c.id}>
                    <div>
                      <div className="challenge-user">{c.userA}</div>
                      <div className="challenge-bet">{c.predA}</div>
                    </div>
                    <div>
                      <div className="challenge-vs">vs</div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 2 }}>{c.bet}</div>
                    </div>
                    <div className="challenge-user-right">
                      <div className="challenge-user">{c.userB}</div>
                      <div className="challenge-bet">{c.predB}</div>
                    </div>
                  </div>
                ))}
                <button id="create-challenge-btn" type="button" className="btn btn-outline-navy btn-full" style={{ marginTop: 14 }} onClick={() => setPostType('challenge')}>
                  Create a Challenge
                </button>
              </div>

              {/* Quiz Spot in sidebar */}
              <QuizSpot quiz={quiz} onAnswer={answerQuiz} wallet={wallet} quizCountdown={quizCountdown} />
            </div>
          </div>
        )}

        {/* ═══════════════════════════════
            PREDICTIONS
            ═══════════════════════════════ */}
        {screen === 'predictions' && (
          <div className="predictions-page">
            <div className="card">
              <div className="card-body">
                <div className="section-eyebrow">Fan vs Fan</div>
                <h2 className="section-title" style={{ marginBottom: 20 }}>Prediction League</h2>
                {predictionLegend?.legend_comment && (
                  <div className="prediction-callout">
                    <strong>Legend says: "{predictionLegend.legend_comment}"</strong>
                    <p>Submit your scoreline to challenge the legend and win coins.</p>
                  </div>
                )}
                <form className="prediction-form" id="prediction-form" onSubmit={submitPrediction}>
                  <label htmlFor="pred-home">
                    <span className="form-label">{matchState?.home_team || 'Home'} Goals</span>
                    <input id="pred-home" type="number" min="0" placeholder="0" value={predictionInputs.home} onChange={(e) => setPredictionInputs((c) => ({ ...c, home: e.target.value }))} />
                  </label>
                  <label htmlFor="pred-away">
                    <span className="form-label">{matchState?.away_team || 'Away'} Goals</span>
                    <input id="pred-away" type="number" min="0" placeholder="0" value={predictionInputs.away} onChange={(e) => setPredictionInputs((c) => ({ ...c, away: e.target.value }))} />
                  </label>
                  <button id="submit-prediction-btn" type="submit" className="btn btn-primary btn-full">Submit Scoreline</button>
                </form>
                {predictionResult && <div className="result-box"><pre>{JSON.stringify(predictionResult, null, 2)}</pre></div>}
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <div className="inner-header">
                  <div><div className="inner-title">Leaderboard</div><div className="inner-sub">Fan vs Fan standings</div></div>
                  <button type="button" className="btn btn-outline-navy btn-sm" onClick={loadLeaderboard}>Refresh</button>
                </div>
                <div className="leaderboard-list">
                  {leaderboard.length === 0 ? <div className="empty-state">Leaderboard will appear here.</div>
                    : leaderboard.map((entry) => (
                      <div className="leaderboard-row" key={`${entry.rank}-${entry.user_id}`}>
                        <div className="leaderboard-rank">#{entry.rank}</div>
                        <div className="leaderboard-user">{entry.user_id}</div>
                        <div className="leaderboard-coins">{entry.coins} coins</div>
                        <div className="leaderboard-streak">{entry.streak} streak</div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════
            QUIZ SCREEN
            ═══════════════════════════════ */}
        {screen === 'quiz' && (
          <div className="quiz-page">
            <div className="card">
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
                  <Pill tone="navy">Quiz Room</Pill>
                  {quizCountdown != null && <div className="quiz-countdown" style={{ color: quizCountdown <= 10 ? 'var(--danger)' : 'var(--navy)' }}>{quizCountdown}s</div>}
                </div>
                <h2 className="quiz-question">{quiz?.lead_in || 'The Legend Is Testing You'}</h2>
                <div className="quiz-meta-grid">
                  <LabelValue label="Remaining Today" value={quiz?.remaining_today ?? wallet?.quiz_remaining_today ?? 0} />
                  <LabelValue label="Points"          value={quiz?.points ?? 0} />
                  <LabelValue label="Difficulty"      value={quiz?.difficulty || 'Standard'} />
                </div>
                {quiz?.locked && <div className="empty-state" style={{ marginBottom: 16 }}>Quiz limit reached. Upgrade to Twin Pass.</div>}
                {quiz?.question && <h3 className="quiz-question" style={{ borderTop: '1px solid var(--border)', paddingTop: 20, fontSize: 'clamp(1.1rem,2.5vw,1.8rem)' }}>{quiz.question}</h3>}
                {(quiz?.options || []).length > 0 && (
                  <div className="quiz-options">
                    {quiz.options.map((option, idx) => (
                      <button key={`${option}-${idx}`} id={`quiz-option-${idx}`} className="quiz-option-btn" type="button" onClick={() => answerQuiz(idx)}>
                        <span className="quiz-option-letter">{String.fromCharCode(65 + idx)}.</span>{option}
                      </button>
                    ))}
                  </div>
                )}
                {quizResult && (
                  <div className="quiz-result-box">
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: quizResult.correct ? '#edfaf4' : '#fff0f0', border: `2px solid ${quizResult.correct ? 'var(--success)' : 'var(--danger)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 900, color: quizResult.correct ? 'var(--success)' : 'var(--danger)' }}>
                        {quizResult.correct ? 'OK' : 'NO'}
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: quizResult.correct ? 'var(--success)' : 'var(--danger)' }}>{quizResult.correct ? 'Correct Answer' : 'Wrong Answer'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>+{quizResult.coins_awarded} coins — Streak: {quizResult.streak}</div>
                      </div>
                    </div>
                    <div className="quiz-result-grid">
                      <LabelValue label="Correct Index" value={quizResult.correct_index} />
                      <LabelValue label="Coins Awarded" value={quizResult.coins_awarded} />
                      <LabelValue label="Streak"        value={quizResult.streak} />
                    </div>
                    {quizResult.explanation && <p style={{ marginTop: 12, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{quizResult.explanation}</p>}
                    <button id="quiz-next-btn" type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={loadQuizNext}>Next Question</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════
            LEADERBOARD / WALLET
            ═══════════════════════════════ */}
        {screen === 'leaderboard' && (
          <div className="leaderboard-page">
            <div className="card">
              <div className="card-body">
                <Pill tone={wallet?.is_pro ? 'success' : 'neutral'}>{wallet?.is_pro ? 'Twin Pass Active' : 'Free Tier'}</Pill>
                <h2 className="section-title" style={{ marginTop: 12, marginBottom: 20 }}>Player Balance</h2>
                <div className="wallet-grid">
                  <LabelValue label="Twin Coins"       value={wallet?.coins ?? 0} />
                  <LabelValue label="Pro Status"       value={wallet?.is_pro ? 'Active' : 'Inactive'} />
                  <LabelValue label="Streak"           value={wallet?.streak ?? 0} />
                  <LabelValue label="Unlocked Legends" value={Array.isArray(wallet?.unlocked_legends) ? wallet.unlocked_legends.length : 0} />
                </div>
                {Array.isArray(wallet?.badges) && wallet.badges.length > 0 && (
                  <>
                    <div style={{ marginTop: 14, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Badges</div>
                    <div className="badge-list">{wallet.badges.map((b, i) => <span className="badge-chip" key={`${formatBadgeText(b)}-${i}`}>{formatBadgeText(b)}</span>)}</div>
                  </>
                )}
                <div className="action-row">
                  <button id="activate-twinpass-btn" type="button" className="btn btn-primary" onClick={handleTwinPassActivate}>Activate Twin Pass</button>
                  <button id="refresh-data-btn"      type="button" className="btn btn-ghost"   onClick={refreshCoreData}>Refresh Data</button>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <div className="inner-title" style={{ marginBottom: 16 }}>Legend Roster</div>
                <div className="unlock-list">
                  {legends.map((legend) => (
                    <div className="unlock-row" key={legend.id}>
                      <div><strong>{legend.name}</strong><p>{legend.arabic_name}</p></div>
                      {legend.locked ? <Pill tone="warning">{legend.unlock_cost_coins} coins</Pill> : <Pill tone="success">Unlocked</Pill>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ══ WHS MODAL ══ */}
      {whatHeSaidRound && screen !== 'match' && (
        <div className="overlay-backdrop" role="dialog" aria-modal="true" aria-labelledby="whs-modal-title">
          <div className="overlay-panel">
            <div className="overlay-header">
              <div>
                <Pill tone="warning">What He Said</Pill>
                <h2 id="whs-modal-title" style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 900, textTransform: 'uppercase', color: 'var(--dark)', marginTop: 10, lineHeight: 1.05 }}>{whatHeSaidRound.prompt}</h2>
              </div>
              <button id="close-whs-btn" className="close-btn" type="button" aria-label="Close" onClick={() => setWhatHeSaidRound(null)}>✕</button>
            </div>
            <div className="overlay-options">
              {(whatHeSaidRound.options || []).map((option, idx) => (
                <button key={`${option}-${idx}`} id={`whs-option-${idx}`} className="quiz-option-btn" type="button" onClick={() => guessWhatHeSaid(idx)}>
                  <span className="quiz-option-letter">{String.fromCharCode(65 + idx)}.</span>{option}
                </button>
              ))}
            </div>
            {whatHeSaidGuess && (
              <div className="quiz-result-box" style={{ marginTop: 16 }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: whatHeSaidGuess.correct ? 'var(--success)' : 'var(--danger)', marginBottom: 10 }}>
                  {whatHeSaidGuess.correct ? 'Correct — Well Played' : 'Wrong Answer'}
                </div>
                <div className="quiz-result-grid">
                  <LabelValue label="Correct Answer" value={whatHeSaidGuess.real_index} />
                  <LabelValue label="Coins Awarded"  value={whatHeSaidGuess.coins_awarded} />
                </div>
                {whatHeSaidGuess.tease && !whatHeSaidGuess.correct && <p style={{ marginTop: 12, fontSize: '0.86rem', fontStyle: 'italic', color: 'var(--navy)' }}>"{whatHeSaidGuess.tease}"</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ WHS FLOATING TOAST ══ */}
      {whsToast && (
        <div className="whs-toast" role="status">
          <div className="whs-toast-header">
            <span className="whs-toast-label">What He Said</span>
            <button className="whs-toast-close" type="button" onClick={() => setWhsToast(null)}>✕</button>
          </div>
          <div className="whs-toast-question">{whsToast.text.slice(0, 80)}{whsToast.text.length > 80 ? '…' : ''}</div>
          <button type="button" className="btn btn-outline-navy btn-sm btn-full" style={{ marginTop: 10 }} onClick={() => { setScreen('match'); setWhsToast(null); }}>
            Play in Match
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="loading-strip" role="status" aria-live="polite">
          <div className="loading-spinner" />
          Refreshing data...
        </div>
      )}
    </div>
  );
}
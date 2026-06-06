import { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE } from './config/api.js';
import logo from './assets/logo.svg';

const USER_ID_DEFAULT = 'guest';
const FREE_TIER_LEGEND_LIMIT = 1;

const AVATAR_STATES = ['idle', 'listening', 'thinking', 'neutral', 'tense', 'frustrated', 'euphoric', 'celebrating', 'heartbroken'];

function requestUrl(path) {
  return `${API_BASE}${path}`;
}

async function requestJson(path, options = {}) {
  const response = await fetch(requestUrl(path), {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.detail || payload?.error || `Request failed (${response.status})`);
  }

  return payload;
}

function formatBadgeText(badge) {
  if (typeof badge === 'string') {
    return badge;
  }

  return badge?.name || badge?.label || 'Badge';
}

function sanitizeList(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.leaderboard)) {
    return value.leaderboard;
  }

  return [];
}

function ScreenButton({ active, children, onClick }) {
  return (
    <button className={`screen-button ${active ? 'active' : ''}`} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function Pill({ children, tone = 'neutral' }) {
  return <span className={`pill tone-${tone}`}>{children}</span>;
}

function Card({ children, className = '' }) {
  return <section className={`card ${className}`}>{children}</section>;
}

function LabelValue({ label, value }) {
  return (
    <div className="label-value">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LegendCard({ legend, selected, onSelect, onUnlock, onFreeSelect }) {
  const locked = Boolean(legend.locked);
  const avatarUrl = legend.idle_avatar?.url || '';

  return (
    <button
      className={`legend-card ${selected ? 'selected' : ''}`}
      type="button"
      onClick={() => {
        if (locked) {
          onUnlock?.(legend);
          return;
        }

        onFreeSelect?.(legend);
        onSelect?.(legend);
      }}
    >
      <div className="legend-image-wrap">
        <img alt={legend.name} className="legend-image" src={avatarUrl} />
        {locked ? <span className="legend-lock">Unlock {legend.unlock_cost_coins} coins</span> : <span className="legend-free">Free legend</span>}
      </div>
      <div className="legend-meta">
        <div className="legend-heading-row">
          <h3>{legend.name}</h3>
          {selected ? <Pill tone="success">Watching</Pill> : null}
        </div>
        <p className="legend-arabic">{legend.arabic_name}</p>
        <p className="legend-archetype">
          {legend.archetype} · {legend.archetype_desc}
        </p>
        <p className="legend-description">{legend.description || legend.archetype_desc}</p>
        <div className="legend-footer">
          {locked ? <span className="legend-cost">{legend.unlock_cost_coins} coins</span> : <span>Tap to join the match</span>}
        </div>
      </div>
    </button>
  );
}

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
  const audioRef = useRef(null);

  const selectedLegend = useMemo(
    () => legends.find((legend) => legend.id === selectedLegendId) || legends[0] || null,
    [legends, selectedLegendId],
  );

  const selectedLegendIndex = useMemo(
    () => legends.findIndex((legend) => legend.id === selectedLegendId),
    [legends, selectedLegendId],
  );

  const activeAvatar = currentAvatar || selectedLegend?.idle_avatar || null;
  const reactionTone = matchState?.emotional_state || activeAvatar?.state || 'idle';

  function playAudio(audioUrl) {
    if (!audioUrl) {
      return;
    }

    try {
      const audio = audioRef.current || new Audio();
      audioRef.current = audio;
      audio.pause();
      audio.src = audioUrl;
      audio.currentTime = 0;
      audio.play().catch(() => null);
    } catch {
      // Ignore autoplay failures.
    }
  }

  function pushFeedItem(payload, source) {
    setMatchFeed((current) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        source,
        text: payload?.text || payload?.tease || 'Legend reacted.',
        audio_url: payload?.audio_url || null,
        avatar: payload?.avatar || null,
        match_context: payload?.match_context || null,
        ts: new Date().toISOString(),
      },
      ...current,
    ].slice(0, 12));

    if (payload?.avatar) {
      setCurrentAvatar(payload.avatar);
    }

    if (payload?.audio_url) {
      playAudio(payload.audio_url);
    }
  }

  async function loadLegends() {
    const payload = await requestJson('/legends');
    const nextLegends = payload?.legends || [];
    setLegends(nextLegends);

    if (!selectedLegendId && nextLegends.length > 0) {
      const freeLegend = nextLegends.find((legend) => !legend.locked) || nextLegends[0];
      setSelectedLegendId(freeLegend.id);
      setCurrentAvatar(freeLegend.idle_avatar || null);
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
    if (selectedLegendId) {
      query.set('legend_id', selectedLegendId);
    }

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
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to load live data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshCoreData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadMatchState().catch((caughtError) => {
        setError(caughtError instanceof Error ? caughtError.message : 'Failed to refresh match state.');
      });
    }, 10000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (screen !== 'quiz') {
      return;
    }

    if (!quiz) {
      loadQuizNext().catch((caughtError) => {
        setError(caughtError instanceof Error ? caughtError.message : 'Failed to load quiz.');
      });
    }
  }, [quiz, screen]);

  useEffect(() => {
    if (screen !== 'predictions') {
      return;
    }

    loadPredictionLegend().catch((caughtError) => {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to load prediction context.');
    });
  }, [screen, selectedLegendId, userId]);

  useEffect(() => {
    if (!quiz || !quiz.remaining_today || quiz.remaining_today <= 0) {
      setQuizCountdown(null);
      return;
    }

    setQuizCountdown((quiz.timer_seconds || 0) > 0 ? quiz.timer_seconds : null);
  }, [quiz]);

  useEffect(() => {
    if (quizCountdown == null) {
      return;
    }

    if (quizCountdown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setQuizCountdown((current) => (current == null ? current : Math.max(current - 1, 0)));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [quizCountdown]);

  async function handleUnlockLegend(legend) {
    setStatusMessage('');
    try {
      await requestJson(`/legends/${legend.id}/unlock`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
      setStatusMessage(`${legend.name} unlocked.`);
      await loadLegends();
      await loadWallet();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unlock failed.');
    }
  }

  async function handleTwinPassActivate() {
    setStatusMessage('');
    try {
      await requestJson('/twin-pass/activate', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
      setStatusMessage('Twin Pass activated.');
      await loadWallet();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Activation failed.');
    }
  }

  async function sendReact(type, teamOverride) {
    setStatusMessage('');
    try {
      await requestJson('/simulate', {
        method: 'POST',
        body: JSON.stringify({ type, user_id: userId, legend_id: selectedLegendId }),
      });

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
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Reaction failed.');
    }
  }

  async function sendChat(event) {
    event.preventDefault();
    if (!chatMessage.trim()) {
      return;
    }

    try {
      const payload = await requestJson('/chat', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, message: chatMessage.trim() }),
      });
      pushFeedItem(payload, 'chat');
      setChatMessage('');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Chat failed.');
    }
  }

  async function submitPrediction(event) {
    event.preventDefault();
    if (predictionInputs.home === '' || predictionInputs.away === '') {
      return;
    }

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
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Prediction submission failed.');
    }
  }

  async function answerQuiz(optionIndex) {
    if (!quiz) {
      return;
    }

    try {
      const payload = await requestJson('/quiz/answer', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          legend_id: selectedLegend?.id,
          question_id: quiz.question_id,
          answer_index: optionIndex,
        }),
      });
      setQuizResult(payload);
      await loadWallet();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Quiz answer failed.');
    }
  }

  async function openWhatHeSaid(type) {
    try {
      const payload = await requestJson('/what-he-said/open', {
        method: 'POST',
        body: JSON.stringify({
          type,
          team: matchState?.home_team || 'home',
          minute: matchState?.minute || 0,
        }),
      });
      setWhatHeSaidRound(payload);
      setWhatHeSaidGuess(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to open What He Said.');
    }
  }

  async function guessWhatHeSaid(choiceIndex) {
    if (!whatHeSaidRound) {
      return;
    }

    try {
      const payload = await requestJson('/what-he-said/guess', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, round_id: whatHeSaidRound.round_id, choice_index: choiceIndex }),
      });
      setWhatHeSaidGuess(payload);
      await loadWallet();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Guess failed.');
    }
  }

  function selectLegend(legend) {
    setSelectedLegendId(legend.id);
    setCurrentAvatar(legend.idle_avatar || null);
    setScreen('match');
    setLegendNotice(`${legend.name} is watching the match with you.`);
  }

  function renderWalletChip() {
    if (!wallet) {
      return <Pill tone="neutral">Loading wallet</Pill>;
    }

    return (
      <div className="wallet-chips">
        <Pill tone="success">{wallet.coins ?? 0} coins</Pill>
        <Pill tone={wallet.is_pro ? 'success' : 'warning'}>{wallet.is_pro ? 'Pro' : 'Free'}</Pill>
        <Pill tone="neutral">{Array.isArray(wallet.badges) ? wallet.badges.length : 0} badges</Pill>
        <Pill tone="neutral">{wallet.quiz_remaining_today ?? 0} quizzes left</Pill>
      </div>
    );
  }

  function renderAvatar() {
    if (!activeAvatar?.url) {
      return <div className="avatar-fallback">Legend avatar appears here</div>;
    }

    return (
      <div className="avatar-stage">
        <img key={`${activeAvatar.url}-${activeAvatar.state || 'idle'}`} alt={activeAvatar.label || 'Legend avatar'} className="avatar-image" src={activeAvatar.url} />
        <div className="avatar-caption">{activeAvatar.label || activeAvatar.state || 'idle'}</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="bg-orb orb-one" />
      <div className="bg-orb orb-two" />
      <div className="noise-layer" />

      <header className="topbar">
        <div className="brand-block">
          <img src={logo} alt="Ghost Twin Arena logo" className="brand-mark" />
          <div>
            <h1>Ghost Twin Arena</h1>
            <p>World Cup 2030 matchday companion</p>
          </div>
        </div>
        <div className="topbar-actions">
          {renderWalletChip()}
          <label className="user-chip">
            <span>User ID</span>
            <input value={userId} onChange={(event) => setUserId(event.target.value || USER_ID_DEFAULT)} />
          </label>
        </div>
      </header>

      <nav className="screen-nav">
        <ScreenButton active={screen === 'home'} onClick={() => setScreen('home')}>Home / Legends</ScreenButton>
        <ScreenButton active={screen === 'match'} onClick={() => setScreen('match')}>Match</ScreenButton>
        <ScreenButton active={screen === 'predictions'} onClick={() => setScreen('predictions')}>Predictions</ScreenButton>
        <ScreenButton active={screen === 'quiz'} onClick={() => setScreen('quiz')}>Quiz</ScreenButton>
        <ScreenButton active={screen === 'leaderboard'} onClick={() => setScreen('leaderboard')}>Leaderboard</ScreenButton>
      </nav>

      <main className="main-grid">
        {error ? <div className="banner error-banner">{error}</div> : null}
        {statusMessage ? <div className="banner status-banner">{statusMessage}</div> : null}
        {legendNotice ? <div className="banner notice-banner">{legendNotice}</div> : null}

        {screen === 'home' ? (
          <>
            <section className="hero-panel">
              <div className="hero-copy">
                <Pill tone="success">MVP legend: Mustapha Hadji</Pill>
                <h2>Choose your player</h2>
                <p>
                  Pick a Moroccan football legend who watches the game with you, reacts live, runs quizzes,
                  and helps you climb the prediction league.
                </p>
                <div className="hero-stats">
                  <LabelValue label="Free tier" value={`${FREE_TIER_LEGEND_LIMIT} legend, 5 quizzes/day`} />
                  <LabelValue label="Coin cap" value="500 coins" />
                  <LabelValue label="Avatar states" value={`${AVATAR_STATES.length} moods`} />
                </div>
              </div>
            </section>

            <section className="legend-grid">
              {legends.map((legend) => (
                <LegendCard
                  key={legend.id}
                  legend={legend}
                  selected={legend.id === selectedLegend?.id}
                  onSelect={selectLegend}
                  onUnlock={handleUnlockLegend}
                  onFreeSelect={(candidate) => {
                    if (candidate.locked) {
                      return;
                    }
                    selectLegend(candidate);
                  }}
                />
              ))}
            </section>
          </>
        ) : null}

        {screen === 'match' ? (
          <section className="match-layout">
            <div className="match-left">
              <Card>
                <div className="section-header">
                  <div>
                    <Pill tone="danger">Live match</Pill>
                    <h2>{matchState?.home_team || 'Home'} vs {matchState?.away_team || 'Away'}</h2>
                    <p>{matchState?.status || 'Waiting for match state'}</p>
                  </div>
                  <div className="match-minute">{matchState?.minute != null ? `${matchState.minute}'` : '--'}</div>
                </div>

                <div className="scoreboard">
                  <div className="score-team">{matchState?.home_team || 'Home'}</div>
                  <div className="score-line">
                    <strong>{matchState?.home_score ?? '-'}</strong>
                    <span>:</span>
                    <strong>{matchState?.away_score ?? '-'}</strong>
                  </div>
                  <div className="score-team">{matchState?.away_team || 'Away'}</div>
                </div>

                <div className="stat-grid">
                  <LabelValue label="Emotional state" value={matchState?.emotional_state || activeAvatar?.state || 'idle'} />
                  <LabelValue label="Avatar state" value={matchState?.avatar_state || activeAvatar?.state || 'idle'} />
                  <LabelValue label="Legend" value={selectedLegend?.name || 'Pick a legend'} />
                </div>

                <div className="reaction-toolbar">
                  <button type="button" onClick={() => sendReact('GOAL')}>Goal</button>
                  <button type="button" onClick={() => sendReact('RED_CARD')}>Red card</button>
                  <button type="button" onClick={() => sendReact('VAR')}>VAR</button>
                  <button type="button" onClick={() => sendReact('PENALTY')}>Penalty</button>
                  <button type="button" onClick={() => openWhatHeSaid('REACT')}>What He Said</button>
                </div>
              </Card>

              <Card className="feed-card">
                <div className="section-header compact">
                  <div>
                    <h3>Live reaction feed</h3>
                    <p>Latest reactions from the legend and your chat.</p>
                  </div>
                </div>
                <div className="feed-list">
                  {matchFeed.length === 0 ? <div className="empty-state">Reactions will appear here as the match changes.</div> : null}
                  {matchFeed.map((item) => (
                    <article className="feed-item" key={item.id}>
                      <div className="feed-avatar">{item.avatar?.label?.slice(0, 2) || 'GT'}</div>
                      <div>
                        <div className="feed-source">{item.source}</div>
                        <p>{item.text}</p>
                        {item.audio_url ? <button type="button" onClick={() => playAudio(item.audio_url)}>Play audio</button> : null}
                      </div>
                    </article>
                  ))}
                </div>
              </Card>
            </div>

            <div className="match-right">
              <Card className="avatar-card">{renderAvatar()}</Card>

              <Card>
                <div className="section-header compact">
                  <div>
                    <h3>Legend chat</h3>
                    <p>Multilingual chat talks to the live backend.</p>
                  </div>
                </div>
                <form className="chat-form" onSubmit={sendChat}>
                  <textarea
                    rows="4"
                    placeholder="Say something in French, Darija, Arabic, or English"
                    value={chatMessage}
                    onChange={(event) => setChatMessage(event.target.value)}
                  />
                  <button type="submit">Send chat</button>
                </form>
              </Card>
            </div>
          </section>
        ) : null}

        {screen === 'predictions' ? (
          <section className="two-column-layout">
            <Card>
              <div className="section-header compact">
                <div>
                  <Pill tone="success">Fan vs Fan</Pill>
                  <h2>Prediction league</h2>
                  <p>{predictionLegend?.legend_comment || 'The legend is ready to make a call.'}</p>
                </div>
              </div>

              <div className="prediction-callout">
                <strong>{predictionLegend?.your_prediction || 'Legend prediction pending'}</strong>
                <p>{predictionLegend?.legend_comment || 'Submit your own scoreline to join the league.'}</p>
              </div>

              <form className="prediction-form" onSubmit={submitPrediction}>
                <label>
                  <span>{matchState?.home_team || 'Home'} goals</span>
                  <input type="number" min="0" value={predictionInputs.home} onChange={(event) => setPredictionInputs((current) => ({ ...current, home: event.target.value }))} />
                </label>
                <label>
                  <span>{matchState?.away_team || 'Away'} goals</span>
                  <input type="number" min="0" value={predictionInputs.away} onChange={(event) => setPredictionInputs((current) => ({ ...current, away: event.target.value }))} />
                </label>
                <button type="submit">Submit scoreline</button>
              </form>

              {predictionResult ? (
                <div className="result-box">
                  <pre>{JSON.stringify(predictionResult, null, 2)}</pre>
                </div>
              ) : null}
            </Card>

            <Card>
              <div className="section-header compact">
                <div>
                  <h3>Leaderboard</h3>
                  <p>Fan vs Fan league standings pulled from the backend.</p>
                </div>
              </div>
              <div className="leaderboard-list">
                {leaderboard.length === 0 ? <div className="empty-state">Leaderboard data will appear here.</div> : null}
                {leaderboard.map((entry) => (
                  <div className="leaderboard-row" key={`${entry.rank}-${entry.user_id}`}>
                    <div className="leaderboard-rank">#{entry.rank}</div>
                    <div className="leaderboard-user">{entry.user_id}</div>
                    <div className="leaderboard-coins">{entry.coins} coins</div>
                    <div className="leaderboard-streak">{entry.streak} streak</div>
                    <div className="leaderboard-badges">{Array.isArray(entry.badges) ? entry.badges.map(formatBadgeText).join(', ') : ''}</div>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        ) : null}

        {screen === 'quiz' ? (
          <section className="quiz-layout">
            <Card>
              <div className="section-header compact">
                <div>
                  <Pill tone="warning">Quiz room</Pill>
                  <h2>{quiz?.lead_in || 'The legend is testing you'}</h2>
                  <p>{quiz?.locked ? 'This quiz is locked.' : 'Answer quickly and keep the streak alive.'}</p>
                </div>
              </div>

              <div className="quiz-meta">
                <LabelValue label="Remaining today" value={quiz?.remaining_today ?? wallet?.quiz_remaining_today ?? 0} />
                <LabelValue label="Points" value={quiz?.points ?? 0} />
                <LabelValue label="Difficulty" value={quiz?.difficulty || 'n/a'} />
              </div>

              {quiz?.locked ? <div className="empty-state">Free tier quiz limit reached or this quiz is locked.</div> : null}

              {quiz?.question ? <h3 className="quiz-question">{quiz.question}</h3> : null}

              <div className="quiz-options">
                {(quiz?.options || []).map((option, index) => (
                  <button key={`${option}-${index}`} type="button" onClick={() => answerQuiz(index)}>
                    {option}
                  </button>
                ))}
              </div>

              {quizResult ? (
                <div className="result-box quiz-result-box">
                  <div className="quiz-result-grid">
                    <LabelValue label="Correct" value={quizResult.correct ? 'Yes' : 'No'} />
                    <LabelValue label="Correct index" value={quizResult.correct_index} />
                    <LabelValue label="Coins awarded" value={quizResult.coins_awarded} />
                    <LabelValue label="Streak" value={quizResult.streak} />
                  </div>
                  <p>{quizResult.explanation}</p>
                </div>
              ) : null}
            </Card>
          </section>
        ) : null}

        {screen === 'leaderboard' ? (
          <section className="two-column-layout leaderboard-screen">
            <Card>
              <div className="section-header compact">
                <div>
                  <Pill tone="success">Wallet</Pill>
                  <h2>Player balance</h2>
                  <p>Coins, badges, pro status, and unlocks from the live backend.</p>
                </div>
              </div>
              <div className="wallet-detail-grid">
                <LabelValue label="Coins" value={wallet?.coins ?? 0} />
                <LabelValue label="Pro" value={wallet?.is_pro ? 'Yes' : 'No'} />
                <LabelValue label="Streak" value={wallet?.streak ?? 0} />
                <LabelValue label="Unlocked legends" value={Array.isArray(wallet?.unlocked_legends) ? wallet.unlocked_legends.length : 0} />
              </div>
              <div className="badge-list">
                {(wallet?.badges || []).map((badge, index) => (
                  <span className="badge-chip" key={`${formatBadgeText(badge)}-${index}`}>{formatBadgeText(badge)}</span>
                ))}
              </div>
              <div className="action-row">
                <button type="button" onClick={handleTwinPassActivate}>Activate Twin Pass</button>
                <button type="button" onClick={refreshCoreData}>Refresh live data</button>
              </div>
            </Card>

            <Card>
              <div className="section-header compact">
                <div>
                  <h3>Legend unlocks</h3>
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
                    <div>{legend.locked ? `${legend.unlock_cost_coins} coins` : 'Unlocked'}</div>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        ) : null}
      </main>

      {whatHeSaidRound ? (
        <div className="overlay-backdrop" role="dialog" aria-modal="true">
          <div className="overlay-panel">
            <div className="section-header compact">
              <div>
                <Pill tone="warning">What He Said</Pill>
                <h2>{whatHeSaidRound.prompt}</h2>
                <p>{quizCountdown != null ? `${quizCountdown}s remaining` : `${whatHeSaidRound.timer_seconds || 30}s timer`}</p>
              </div>
              <button type="button" className="close-button" onClick={() => setWhatHeSaidRound(null)}>Close</button>
            </div>

            <div className="quiz-options overlay-options">
              {(whatHeSaidRound.options || []).map((option, index) => (
                <button key={`${option}-${index}`} type="button" onClick={() => guessWhatHeSaid(index)}>
                  {option}
                </button>
              ))}
            </div>

            {whatHeSaidGuess ? (
              <div className="result-box quiz-result-box">
                <LabelValue label="Correct" value={whatHeSaidGuess.correct ? 'Yes' : 'No'} />
                <LabelValue label="Real index" value={whatHeSaidGuess.real_index} />
                <LabelValue label="Coins awarded" value={whatHeSaidGuess.coins_awarded} />
                <p>{whatHeSaidGuess.correct ? 'Nice call.' : whatHeSaidGuess.tease}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {loading ? <div className="loading-strip">Refreshing live data…</div> : null}
    </div>
  );
}
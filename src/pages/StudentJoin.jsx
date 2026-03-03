import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import { TEAM_COLORS } from '../components/BattleRound';

const PAGE = {
  minHeight: '100dvh',
  background: 'linear-gradient(145deg,#080818,#0f1629,#1a0a2e)',
  fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
  color: '#e2e8f0',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1.5rem',
  boxSizing: 'border-box',
};

export default function StudentJoin() {
  const [step, setStep] = useState('select-team'); // select-team | waiting | active | submitted
  const [teamId, setTeamId] = useState(null);
  const [challengeData, setChallengeData] = useState(null); // { challenge, teams }
  const [teams, setTeams] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimer = useRef(null);

  useEffect(() => {
    socket.connect();

    socket.on('challenge-started', (data) => {
      setChallengeData(data);
      setTeams(data.teams || []);
      setPrompt('');
      setStep((prev) => {
        if (prev === 'waiting' || prev === 'submitted') return 'active';
        if (prev === 'select-team') return 'select-team'; // 팀 선택 먼저
        return 'active';
      });
    });

    socket.on('challenge-reset', () => {
      setChallengeData(null);
      setPrompt('');
      setStep((prev) => (prev === 'select-team' ? 'select-team' : 'waiting'));
    });

    return () => {
      socket.off('challenge-started');
      socket.off('challenge-reset');
      socket.disconnect();
    };
  }, []);

  const handleSelectTeam = (id) => {
    setTeamId(id);
    setStep(challengeData ? 'active' : 'waiting');
  };

  const handleTyping = (value) => {
    setPrompt(value);
    // 타이핑 이벤트 디바운스 (300ms)
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      if (teamId !== null) {
        socket.emit('prompt-typing', { teamId, prompt: value });
      }
    }, 300);
  };

  const handleSubmit = () => {
    if (!prompt.trim() || teamId === null) return;
    socket.emit('submit-prompt', { teamId, prompt });
    setStep('submitted');
  };

  const teamColor = teamId !== null ? TEAM_COLORS[teamId] : null;

  // ── 팀 선택 화면 ─────────────────────────────────────────────────────────
  if (step === 'select-team') {
    const teamList = teams.length > 0 ? teams : TEAM_COLORS.slice(0, 8);
    return (
      <div style={PAGE}>
        <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet" />
        <div style={{ maxWidth: 420, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>⚔️</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#e2e8f0', marginBottom: 4 }}>
              VPython 프롬프트 챌린지
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.88rem' }}>내 팀을 선택하세요</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {teamList.map((team, i) => (
              <button
                key={i}
                onClick={() => handleSelectTeam(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 18px',
                  borderRadius: 14,
                  border: `2px solid ${TEAM_COLORS[i]?.border || 'rgba(255,255,255,0.1)'}`,
                  background: TEAM_COLORS[i]?.light || 'rgba(255,255,255,0.04)',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '1rem',
                  fontWeight: 700,
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: TEAM_COLORS[i]?.bg || '#fff',
                    flexShrink: 0,
                    boxShadow: `0 0 12px ${TEAM_COLORS[i]?.bg || '#fff'}66`,
                  }}
                />
                <span style={{ color: TEAM_COLORS[i]?.text || '#e2e8f0' }}>
                  {team.name || `${TEAM_COLORS[i]?.name}팀`}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── 대기 화면 ─────────────────────────────────────────────────────────────
  if (step === 'waiting') {
    return (
      <div style={PAGE}>
        <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet" />
        <div style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: teamColor?.light,
              border: `3px solid ${teamColor?.border}`,
              margin: '0 auto 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: teamColor?.bg,
                boxShadow: `0 0 16px ${teamColor?.bg}88`,
              }}
            />
          </div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: teamColor?.text, marginBottom: 8 }}>
            {teams[teamId]?.name || `${teamColor?.name}팀`}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6 }}>
            선생님이 챌린지를 시작하면<br />여기에 문제가 표시됩니다
          </p>
          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: 6 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: teamColor?.bg,
                  opacity: 0.3,
                  animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
          <style>{`
            @keyframes pulse {
              0%, 80%, 100% { opacity: 0.3; transform: scale(1); }
              40% { opacity: 1; transform: scale(1.3); }
            }
          `}</style>
          <button
            onClick={() => setStep('select-team')}
            style={{
              marginTop: '3rem',
              background: 'none',
              border: 'none',
              color: '#334155',
              fontSize: '0.78rem',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ← 팀 변경
          </button>
        </div>
      </div>
    );
  }

  // ── 입력 화면 ─────────────────────────────────────────────────────────────
  if (step === 'active') {
    const ch = challengeData?.challenge;
    return (
      <div style={{ ...PAGE, justifyContent: 'flex-start', paddingTop: '2rem' }}>
        <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet" />
        <div style={{ maxWidth: 480, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 팀 배지 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: teamColor?.bg,
                boxShadow: `0 0 10px ${teamColor?.bg}88`,
                flexShrink: 0,
              }}
            />
            <span style={{ fontWeight: 700, color: teamColor?.text, fontSize: '0.95rem' }}>
              {teams[teamId]?.name || `${teamColor?.name}팀`}
            </span>
            <span
              style={{
                marginLeft: 'auto',
                fontSize: '0.72rem',
                padding: '2px 8px',
                borderRadius: 10,
                background: 'rgba(167,139,250,0.15)',
                color: '#a78bfa',
              }}
            >
              {ch?.ctElement}
            </span>
          </div>

          {/* 챌린지 제목 */}
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#e2e8f0', marginBottom: 6 }}>
              {ch?.title}
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.6 }}>
              {ch?.description}
            </p>
          </div>

          {/* 힌트 */}
          {ch?.hint && (
            <div
              style={{
                background: 'rgba(251,191,36,0.07)',
                border: '1px solid rgba(251,191,36,0.2)',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: '0.83rem',
                color: '#fcd34d',
              }}
            >
              💡 {ch.hint}
            </div>
          )}

          {/* 프롬프트 입력 */}
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 6, fontWeight: 600 }}>
              이 장면을 AI에게 어떻게 설명할까요?
            </div>
            <textarea
              value={prompt}
              onChange={(e) => handleTyping(e.target.value)}
              placeholder="예) 빨간 구 위에 노란 구, 아래에 초록 구가 있는 신호등..."
              rows={5}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                border: `1.5px solid ${prompt.trim() ? teamColor?.border : 'rgba(255,255,255,0.1)'}`,
                background: 'rgba(0,0,0,0.3)',
                color: '#e2e8f0',
                fontSize: '0.95rem',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                resize: 'none',
                lineHeight: 1.6,
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!prompt.trim()}
            style={{
              padding: '14px',
              borderRadius: 14,
              border: 'none',
              background: prompt.trim()
                ? `linear-gradient(135deg,${teamColor?.bg},${teamColor?.bg}cc)`
                : 'rgba(255,255,255,0.06)',
              color: '#fff',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: prompt.trim() ? 'pointer' : 'default',
              fontFamily: 'inherit',
              boxShadow: prompt.trim() ? `0 4px 20px ${teamColor?.bg}44` : 'none',
              transition: 'all 0.2s',
            }}
          >
            🔒 프롬프트 제출
          </button>

          <button
            onClick={() => setStep('select-team')}
            style={{
              background: 'none',
              border: 'none',
              color: '#334155',
              fontSize: '0.78rem',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'center',
            }}
          >
            ← 팀 변경
          </button>
        </div>
      </div>
    );
  }

  // ── 제출 완료 화면 ────────────────────────────────────────────────────────
  if (step === 'submitted') {
    return (
      <div style={PAGE}>
        <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet" />
        <div style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#34d399', marginBottom: 8 }}>
            제출 완료!
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '2rem' }}>
            프롬프트가 전송되었습니다.<br />선생님 화면에서 결과를 확인하세요.
          </p>

          {/* 제출한 프롬프트 보기 */}
          <div
            style={{
              background: `${teamColor?.light}`,
              border: `1px solid ${teamColor?.border}`,
              borderRadius: 14,
              padding: '14px 16px',
              fontSize: '0.88rem',
              color: teamColor?.text,
              lineHeight: 1.6,
              textAlign: 'left',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 6 }}>내 프롬프트</div>
            {prompt}
          </div>

          <p style={{ color: '#334155', fontSize: '0.8rem' }}>다음 챌린지를 기다려주세요...</p>
        </div>
      </div>
    );
  }

  return null;
}

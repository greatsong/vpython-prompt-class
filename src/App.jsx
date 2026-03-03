import { useState, useEffect } from "react";
import { CHALLENGES } from "./data/challenges";
import { TEAM_COLORS } from "./components/BattleRound";
import VPythonScene from "./components/VPythonScene";
import PaperGame from "./components/PaperGame";
import BattleRound from "./components/BattleRound";
import ReflectionPage from "./components/ReflectionPage";
import { socket } from "./socket";

// ─── 슬라이드 데이터 ─────────────────────────────────────────────────────────

const VPYTHON_DEMO_CODE = `sphere(pos=vector(0,0,0), radius=1, color=color.red)
box(pos=vector(0,-1.6,0), size=vector(3,0.4,3), color=vector(0.2,0.4,0.8))`;

const SLIDES = {
  "intro-1": {
    icon: "🧩",
    title: "오늘의 질문",
    subtitle: '"컴퓨터가 이해하려면 얼마나 정확해야 할까?"',
    points: [
      ["친구에게", '"의자 가져다줘" → 친구는 알아서 가져옵니다'],
      ["AI에게", '"의자 가져다줘" → 어떤 의자? 어디서? 어디로?'],
      ["결론", "AI는 우리가 말한 것만, 정확히 그대로 실행합니다"],
      ["오늘", "이 차이를 직접 몸으로 체험하는 시간입니다"],
    ],
    teacherNote:
      "첫 질문을 던지고 잠시 기다리세요. '못 알아듣겠죠'라는 답이 나올 겁니다. '왜요?'로 이어가세요.",
  },
  "intro-2": {
    icon: "💡",
    title: "문제 정의의 힘",
    subtitle: "같은 목표, 다른 명세 → 완전히 다른 결과",
    points: [
      ["나쁜 예", '"빨간 공 그려줘" → AI마다 다르게 해석합니다'],
      ["좋은 예", '"반지름 1, 중앙에, 빨간색 구" → 누가 봐도 하나의 결과'],
      ["핵심", "추상적 언어 → 구체적 명세로 변환하는 능력"],
      ["AI 시대", "이 능력이 AI를 제대로 쓰는 사람과 못 쓰는 사람을 구분합니다"],
    ],
    teacherNote:
      "두 가지 프롬프트를 보여주며 결과 차이를 상상하게 해보세요. '같은 말 아닌가요?'라는 반응을 유도하세요.",
  },
  "vpython-intro": {
    icon: "🌐",
    title: "VPython — 3D 세계를 코드로",
    subtitle: "이 코드 한 줄이 빨간 구를 만듭니다",
    codeSnippet: `sphere(pos=vector(0,0,0), radius=1, color=color.red)`,
    demoCode: VPYTHON_DEMO_CODE,
    points: [
      ["VPython이란?", "파이썬으로 3D 물체를 만드는 라이브러리"],
      ["다음 학기", "이것으로 본격적인 코딩을 배울 예정입니다"],
      ["오늘은", "코드 없이 말로만! AI가 중간 다리 역할을 합니다"],
      ["목표", "내 말이 코드로 어떻게 변환되는지 느껴보기"],
    ],
    teacherNote:
      "VPython 데모를 잠깐 보여주며 '이게 앞으로 배울 도구다'는 기대감을 심어주세요. 지금은 설명하지 않아도 됩니다.",
  },
  "paper-rules": {
    icon: "📝",
    title: "종이 게임 — 준비",
    subtitle: "2인 1팀, 말로만 설명하는 3분",
    points: [
      ["팀 구성", "옆 사람과 2인 1팀으로 앉습니다"],
      ["설명자", "화면을 보고 파트너에게 장면을 말로만 설명합니다"],
      ["그림자", "등을 돌리고 설명만 듣고 종이에 그립니다"],
      ["3분 후", "종이 그림과 화면을 비교합니다. 얼마나 비슷할까요?"],
    ],
    teacherNote:
      "게임 전 '코드나 수학 용어 없이 일상어로만' 이라는 규칙을 강조하세요. 지금은 화면을 보여주지 마세요.",
  },
  "paper-debrief": {
    icon: "🤔",
    title: "무엇이 어려웠나요?",
    subtitle: "종이 게임 디브리프",
    points: [
      ["공간 표현", "위치나 방향을 말로 설명하는 게 쉬웠나요?"],
      ["크기 비율", "'큰 것'과 '작은 것'의 기준이 사람마다 달랐나요?"],
      ["누락된 정보", "그림에서 빠진 요소가 있었나요? 왜 빠졌나요?"],
      ["핵심 발견", "정확한 설명에는 구체적인 수치와 기준점이 필요합니다"],
    ],
    teacherNote:
      "2~3팀의 종이 그림을 화면에 보여주며 비교하면 효과적입니다. '어떤 정보가 있었으면 더 잘 그릴 수 있었나?'로 이어가세요.",
  },
  "battle-intro": {
    icon: "⚔️",
    title: "이제 AI와 함께!",
    subtitle: "프롬프트 배틀 — 글로 코딩하기",
    points: [
      ["목표 장면", "화면에 3D 장면이 보입니다"],
      ["팀별 작전", "이 장면을 AI에게 정확히 설명하는 글을 씁니다"],
      ["AI의 역할", "여러분의 글을 VPython 코드로 변환합니다"],
      ["점수", "정확할수록, 구체적일수록 높은 점수를 받습니다"],
    ],
    teacherNote:
      "배틀 전 '종이 게임에서 배운 것을 활용하세요'라고 말해주세요. API 키가 입력되어 있는지 확인하세요.",
  },
  "closing-1": {
    icon: "📊",
    title: "오늘의 발견",
    subtitle: "무엇이 점수를 만들었나요?",
    points: [
      ["구체적 표현", '"신호등" vs "빨간 구가 맨 위, 노란 구 중간, 초록 구 아래"'],
      ["위치 명시", '"오른쪽에" vs "x=2 위치에, y축 중앙"'],
      ["구성 요소", '"신호등" vs "검은 기둥 + 구 3개"로 분해'],
      ["패턴 인식", '"세 개의 구" → 반복 구조를 발견한 팀이 더 높았습니다'],
    ],
    teacherNote:
      "가장 높은 점수와 가장 낮은 점수의 프롬프트를 나란히 보여주며 차이를 짚어주세요.",
  },
  "closing-2": {
    icon: "🚀",
    title: "AI 시대의 문제 정의",
    subtitle: "코딩보다 먼저 배워야 할 것",
    points: [
      ["AI의 발전", "AI는 점점 더 똑똑해지고 있습니다"],
      ["우리의 역할", "\"뭘 만들지\" 정확히 정의하는 사람이 AI를 이깁니다"],
      ["오늘 배운 것", "추상적 언어를 구체적 명세로 변환하는 훈련"],
      ["다음 시간", "이 코드를 직접 읽고, 수정하고, 만들어봅니다"],
    ],
    teacherNote:
      "마지막에 '오늘 나의 프롬프트에서 아쉬웠던 점 한 가지'를 포스트잇에 쓰게 하면 좋습니다.",
  },
};

// ─── 수업 흐름 정의 ──────────────────────────────────────────────────────────

const FLOW = [
  { type: "setup" },
  { type: "slide", id: "intro-1" },
  { type: "slide", id: "intro-2" },
  { type: "slide", id: "vpython-intro" },
  { type: "slide", id: "paper-rules" },
  { type: "paper-game" },
  { type: "slide", id: "paper-debrief" },
  { type: "slide", id: "battle-intro" },
  { type: "battle", challengeIndex: 0 },
  { type: "reflection", challengeIndex: 0 },
  { type: "battle", challengeIndex: 1 },
  { type: "reflection", challengeIndex: 1 },
  { type: "battle", challengeIndex: 2 },
  { type: "reflection", challengeIndex: 2 },
  { type: "slide", id: "closing-1" },
  { type: "slide", id: "closing-2" },
];

const STEP_LABELS = [
  "설정", "도입①", "도입②", "VPython", "종이게임규칙", "종이게임",
  "디브리프", "배틀안내", "신호등", "성찰①", "숲", "성찰②", "꽃밭", "성찰③",
  "마무리①", "마무리②",
];

// ─── 팀 초기화 ───────────────────────────────────────────────────────────────

function initTeams(count, memberLists) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `${TEAM_COLORS[i].name}팀`,
    color: TEAM_COLORS[i],
    totalScore: 0,
    members: memberLists[i] || [],
  }));
}

// ─── 공통 스타일 ─────────────────────────────────────────────────────────────

const PAGE = {
  minHeight: "100vh",
  background: "linear-gradient(145deg,#080818,#0f1629,#1a0a2e)",
  fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
  color: "#e2e8f0",
  display: "flex",
  flexDirection: "column",
};

const INPUT_S = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(0,0,0,0.3)",
  color: "#e2e8f0",
  fontSize: "0.88rem",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

// ─── 메인 앱 ─────────────────────────────────────────────────────────────────

export default function App() {
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState("");
  const [teamCount, setTeamCount] = useState(4);
  const [timerSec, setTimerSec] = useState(180);
  const [studentText, setStudentText] = useState("");
  const [teams, setTeams] = useState([]);
  const [roundResults, setRoundResults] = useState([]); // [{challengeIndex, teams}]

  // 학생 명단 파싱 (엑셀 복붙: "1\t김철수" 형태 자동 처리)
  const studentList = studentText
    .split(/[\n\r]+/)
    .map((l) => l.replace(/^\d+[\.\)\s\t]+/, "").replace(/\t/g, " ").trim())
    .filter(Boolean);

  // 라운드로빈 팀 배정
  const memberLists = Array.from({ length: teamCount }, (_, i) =>
    studentList.filter((_, j) => j % teamCount === i)
  );

  const current = FLOW[step];
  const totalSteps = FLOW.length;

  const next = () => setStep((s) => Math.min(s + 1, totalSteps - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  // 소켓 연결
  useEffect(() => {
    socket.connect();
    return () => socket.disconnect();
  }, []);

  // 배틀 단계 시작 시 챌린지 이벤트 전송
  useEffect(() => {
    if (current.type === "battle" && teams.length > 0) {
      const ch = CHALLENGES[current.challengeIndex];
      socket.emit("start-challenge", { challenge: ch, teams });
    }
    if (current.type === "reflection") {
      socket.emit("reset-challenge");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleBattleDone = (roundTeams) => {
    // 누적 점수 업데이트
    const updated = teams.map((t) => {
      const rt = roundTeams.find((r) => r.id === t.id);
      return rt ? { ...t, totalScore: t.totalScore + (rt.score || 0) } : t;
    });
    setTeams(updated);
    setRoundResults((prev) => [
      ...prev,
      { challengeIndex: current.challengeIndex, teams: roundTeams },
    ]);
    next();
  };

  // ── 설정 화면 ────────────────────────────────────────────────────────────
  if (current.type === "setup") {
    return (
      <div style={{ ...PAGE, alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
        <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet" />
        <div style={{ maxWidth: 700, width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: 6, filter: "drop-shadow(0 0 24px rgba(139,92,246,0.5))" }}>⚔️</div>
            <h1 style={{ fontSize: "2rem", fontWeight: 900, background: "linear-gradient(90deg,#f472b6,#a78bfa,#60a5fa,#34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 }}>
              VPython 프롬프트 챌린지
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
              말로 코딩하며 배우는 문제 정의의 힘 — 고등학교 1학년 정보 수업
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* API 키 */}
            <Card>
              <Label>🔑 Anthropic API Key</Label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                style={INPUT_S}
              />
              {apiKey && <div style={{ color: "#34d399", fontSize: "0.75rem", marginTop: 4 }}>✓ 입력됨</div>}
            </Card>

            {/* 팀 수 + 시간 */}
            <Card>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <Label>👥 팀 수</Label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {[2,3,4,5,6,7,8,9,10,11,12,13,14].map((n) => (
                      <button
                        key={n}
                        onClick={() => setTeamCount(n)}
                        style={{
                          ...segBtn(teamCount === n, "#7c3aed", "#a78bfa"),
                          flex: "0 0 auto",
                          padding: "7px 10px",
                          minWidth: 34,
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>⏱️ 제한 시간</Label>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[60, 120, 180, 300].map((s) => (
                      <button
                        key={s}
                        onClick={() => setTimerSec(s)}
                        style={segBtn(timerSec === s, "#2563eb", "#60a5fa")}
                      >
                        {s >= 60 ? `${s / 60}분` : `${s}초`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* 학생 명단 붙여넣기 */}
            <Card>
              <Label>📋 학생 명단 (엑셀에서 복붙)</Label>
              <textarea
                value={studentText}
                onChange={(e) => setStudentText(e.target.value)}
                placeholder={"엑셀 이름 열을 복사해 붙여넣으세요\n번호+탭 형식(1\t김철수)도 자동 처리됩니다\n비워두면 팀 색 이름으로 진행합니다"}
                rows={5}
                style={{ ...INPUT_S, resize: "vertical", lineHeight: 1.5 }}
              />
              {studentList.length > 0 && (
                <div style={{ fontSize: "0.75rem", color: "#34d399", marginTop: 5 }}>
                  ✓ {studentList.length}명 인식 · 팀당 약 {Math.ceil(studentList.length / teamCount)}명
                </div>
              )}

              {/* 팀 배정 미리보기 */}
              {studentList.length > 0 && (
                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gridTemplateColumns:
                      teamCount <= 4 ? "repeat(2, 1fr)"
                      : teamCount <= 8 ? "repeat(4, 1fr)"
                      : "repeat(7, 1fr)",
                    gap: 5,
                  }}
                >
                  {memberLists.map((members, i) => (
                    <div
                      key={i}
                      style={{
                        background: TEAM_COLORS[i].light,
                        border: `1px solid ${TEAM_COLORS[i].border}`,
                        borderRadius: 8,
                        padding: "5px 7px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: TEAM_COLORS[i].bg, flexShrink: 0 }} />
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: TEAM_COLORS[i].text }}>
                          {TEAM_COLORS[i].name}팀
                        </span>
                      </div>
                      <div style={{ fontSize: "0.63rem", color: TEAM_COLORS[i].text, opacity: 0.8, lineHeight: 1.4 }}>
                        {members.length > 0 ? members.join(", ") : "(없음)"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* 학생 접속 URL */}
            <Card>
              <Label>📱 학생 접속 링크</Label>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: 8 }}>
                학생들이 같은 WiFi에서 아래 주소로 접속합니다
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontFamily: "monospace",
                  fontSize: "0.88rem",
                  color: "#a78bfa",
                  wordBreak: "break-all",
                }}
              >
                <span style={{ flex: 1 }}>{window.location.origin}/student</span>
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/student`)}
                  style={{
                    background: "rgba(167,139,250,0.15)",
                    border: "none",
                    borderRadius: 6,
                    padding: "4px 10px",
                    color: "#a78bfa",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    fontFamily: "inherit",
                    flexShrink: 0,
                  }}
                >
                  복사
                </button>
              </div>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`${window.location.origin}/student`)}`}
                alt="QR 코드"
                style={{ marginTop: 10, borderRadius: 8, display: "block" }}
              />
            </Card>

            <button
              onClick={() => {
                setTeams(initTeams(teamCount, memberLists));
                next();
              }}
              disabled={!apiKey}
              style={{
                padding: "14px",
                borderRadius: 14,
                border: "none",
                background: apiKey
                  ? "linear-gradient(135deg,#7c3aed,#ec4899)"
                  : "rgba(255,255,255,0.07)",
                color: "#fff",
                fontWeight: 800,
                fontSize: "1.05rem",
                cursor: apiKey ? "pointer" : "default",
                fontFamily: "inherit",
              }}
            >
              🚀 수업 시작
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 슬라이드 화면 ────────────────────────────────────────────────────────
  if (current.type === "slide") {
    const slide = SLIDES[current.id];
    return (
      <div style={{ ...PAGE }}>
        <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet" />
        <ProgressBar step={step} total={totalSteps} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "2rem 3rem", maxWidth: 1100, margin: "0 auto", width: "100%", gap: 20 }}>
          {/* 타이틀 */}
          <div>
            <div style={{ fontSize: "2.8rem", marginBottom: 8 }}>{slide.icon}</div>
            <h1 style={{ fontSize: "2.2rem", fontWeight: 900, color: "#e2e8f0", marginBottom: 6 }}>
              {slide.title}
            </h1>
            <p style={{ fontSize: "1.1rem", color: "#a78bfa", fontWeight: 600 }}>
              {slide.subtitle}
            </p>
          </div>

          {/* VPython 데모 (해당 슬라이드만) */}
          {slide.demoCode && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "center" }}>
              <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: "1rem", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.9rem", color: "#a5f3fc", lineHeight: 1.7 }}>
                <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: 6 }}>코드</div>
                {slide.codeSnippet}
              </div>
              <VPythonScene code={slide.demoCode} height={200} />
            </div>
          )}

          {/* 핵심 포인트 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {slide.points.map(([label, desc], i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 16,
                  padding: "14px 18px",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 12,
                  borderLeft: `3px solid ${["#a78bfa", "#60a5fa", "#34d399", "#fbbf24"][i % 4]}`,
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    minWidth: 80,
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: ["#a78bfa", "#60a5fa", "#34d399", "#fbbf24"][i % 4],
                    paddingTop: 2,
                  }}
                >
                  {label}
                </span>
                <span style={{ fontSize: "1rem", color: "#e2e8f0", lineHeight: 1.6 }}>
                  {desc}
                </span>
              </div>
            ))}
          </div>

          {/* 교사 메모 */}
          {slide.teacherNote && (
            <div
              style={{
                background: "rgba(251,191,36,0.06)",
                border: "1px solid rgba(251,191,36,0.15)",
                borderRadius: 12,
                padding: "10px 16px",
                fontSize: "0.82rem",
                color: "#fcd34d",
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
              }}
            >
              <span style={{ flexShrink: 0 }}>📌 교사 메모:</span>
              <span>{slide.teacherNote}</span>
            </div>
          )}
        </div>

        <NavBar step={step} total={totalSteps} onPrev={prev} onNext={next} labels={STEP_LABELS} />
      </div>
    );
  }

  // ── 종이 게임 ────────────────────────────────────────────────────────────
  if (current.type === "paper-game") {
    return (
      <div style={{ ...PAGE }}>
        <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet" />
        <ProgressBar step={step} total={totalSteps} />
        <div style={{ flex: 1, padding: "1rem 2rem", maxWidth: 1100, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
          <PaperGame onNext={next} />
        </div>
      </div>
    );
  }

  // ── 배틀 ─────────────────────────────────────────────────────────────────
  if (current.type === "battle") {
    const ch = CHALLENGES[current.challengeIndex];
    return (
      <div style={{ ...PAGE }}>
        <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet" />
        <ProgressBar step={step} total={totalSteps} />
        <div
          style={{
            flex: 1,
            padding: "0.8rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            maxWidth: 1400,
            margin: "0 auto",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <BattleRound
            key={`battle-${current.challengeIndex}`}
            challenge={ch}
            teams={teams}
            apiKey={apiKey}
            timerSec={timerSec}
            onComplete={handleBattleDone}
            socket={socket}
          />
        </div>
      </div>
    );
  }

  // ── 성찰 ─────────────────────────────────────────────────────────────────
  if (current.type === "reflection") {
    const ch = CHALLENGES[current.challengeIndex];
    const rr = roundResults.find((r) => r.challengeIndex === current.challengeIndex);
    if (!rr) {
      return (
        <div style={{ ...PAGE, alignItems: "center", justifyContent: "center" }}>
          <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet" />
          <div style={{ color: "#94a3b8" }}>배틀 결과를 먼저 완료해주세요.</div>
          <button onClick={prev} style={{ marginTop: 16, padding: "8px 20px", borderRadius: 10, border: "none", background: "#7c3aed", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
            ← 돌아가기
          </button>
        </div>
      );
    }

    // globalTeams에 이번 라운드 점수 반영된 teams 사용
    const globalTeams = [...teams].sort((a, b) => b.totalScore - a.totalScore);

    return (
      <div style={{ ...PAGE }}>
        <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet" />
        <ProgressBar step={step} total={totalSteps} />
        <div
          style={{
            flex: 1,
            padding: "0.8rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            maxWidth: 1400,
            margin: "0 auto",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <ReflectionPage
            challenge={ch}
            roundTeams={rr.teams}
            globalTeams={globalTeams}
            onNext={next}
          />
        </div>
      </div>
    );
  }

  return null;
}

// ─── 서브 컴포넌트 ───────────────────────────────────────────────────────────

function ProgressBar({ step, total }) {
  return (
    <div
      style={{
        padding: "8px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          flex: 1,
          height: 4,
          borderRadius: 2,
          background: "rgba(255,255,255,0.07)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${((step + 1) / total) * 100}%`,
            height: "100%",
            background: "linear-gradient(90deg,#7c3aed,#ec4899)",
            borderRadius: 2,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <span style={{ fontSize: "0.72rem", color: "#475569", whiteSpace: "nowrap" }}>
        {step + 1} / {total}
      </span>
    </div>
  );
}

function NavBar({ step, total, onPrev, onNext, labels }) {
  return (
    <div
      style={{
        padding: "12px 24px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexShrink: 0,
      }}
    >
      <button
        onClick={onPrev}
        disabled={step === 0}
        style={{
          padding: "8px 20px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.04)",
          color: step === 0 ? "#334155" : "#94a3b8",
          cursor: step === 0 ? "default" : "pointer",
          fontFamily: "inherit",
          fontSize: "0.88rem",
        }}
      >
        ← 이전
      </button>

      <div style={{ display: "flex", gap: 4 }}>
        {labels.map((label, i) => (
          <div
            key={i}
            title={label}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background:
                i === step
                  ? "#a78bfa"
                  : i < step
                  ? "rgba(167,139,250,0.4)"
                  : "rgba(255,255,255,0.1)",
              transition: "background 0.2s",
            }}
          />
        ))}
      </div>

      <button
        onClick={onNext}
        disabled={step === total - 1}
        style={{
          padding: "8px 20px",
          borderRadius: 10,
          border: "none",
          background:
            step === total - 1
              ? "rgba(255,255,255,0.05)"
              : "linear-gradient(135deg,#7c3aed,#a78bfa)",
          color: step === total - 1 ? "#334155" : "#fff",
          cursor: step === total - 1 ? "default" : "pointer",
          fontWeight: 700,
          fontFamily: "inherit",
          fontSize: "0.88rem",
        }}
      >
        다음 →
      </button>
    </div>
  );
}

function Card({ children }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.07)",
        padding: "1rem 1.2rem",
      }}
    >
      {children}
    </div>
  );
}

function Label({ children }) {
  return (
    <div
      style={{
        fontSize: "0.78rem",
        color: "#94a3b8",
        marginBottom: 7,
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

function segBtn(active, from, to) {
  return {
    flex: 1,
    padding: "7px 0",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    background: active ? `linear-gradient(135deg,${from},${to})` : "rgba(255,255,255,0.06)",
    color: active ? "#fff" : "#94a3b8",
    fontWeight: 700,
    fontSize: "0.82rem",
    fontFamily: "inherit",
  };
}

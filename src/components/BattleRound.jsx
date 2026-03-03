import { useState, useRef, useEffect } from "react";
import VPythonScene from "./VPythonScene";
import { buildGlow } from "../utils/glowscript";

const TEAM_COLORS = [
  { bg: "#ef4444", light: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)", text: "#fca5a5", name: "빨강" },
  { bg: "#3b82f6", light: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.35)", text: "#93c5fd", name: "파랑" },
  { bg: "#10b981", light: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.35)", text: "#6ee7b7", name: "초록" },
  { bg: "#f59e0b", light: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)", text: "#fcd34d", name: "노랑" },
  { bg: "#8b5cf6", light: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.35)", text: "#c4b5fd", name: "보라" },
  { bg: "#ec4899", light: "rgba(236,72,153,0.12)", border: "rgba(236,72,153,0.35)", text: "#f9a8d4", name: "분홍" },
  { bg: "#06b6d4", light: "rgba(6,182,212,0.12)", border: "rgba(6,182,212,0.35)", text: "#67e8f9", name: "하늘" },
  { bg: "#f97316", light: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.35)", text: "#fdba74", name: "주황" },
  { bg: "#84cc16", light: "rgba(132,204,22,0.12)", border: "rgba(132,204,22,0.35)", text: "#bef264", name: "라임" },
  { bg: "#14b8a6", light: "rgba(20,184,166,0.12)", border: "rgba(20,184,166,0.35)", text: "#5eead4", name: "청록" },
  { bg: "#6366f1", light: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.35)", text: "#a5b4fc", name: "인디고" },
  { bg: "#d97706", light: "rgba(217,119,6,0.12)", border: "rgba(217,119,6,0.35)", text: "#fcd34d", name: "앰버" },
  { bg: "#94a3b8", light: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.35)", text: "#cbd5e1", name: "슬레이트" },
  { bg: "#f43f5e", light: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.35)", text: "#fda4af", name: "장미" },
];

export { TEAM_COLORS };

const MEDALS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟", "1️⃣1️⃣", "1️⃣2️⃣", "1️⃣3️⃣", "1️⃣4️⃣"];

const INPUT_STYLE = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(0,0,0,0.3)",
  color: "#e2e8f0",
  fontSize: "0.82rem",
  boxSizing: "border-box",
  fontFamily: "inherit",
  resize: "none",
};

function initLocalTeams(teams) {
  return teams.map((t) => ({
    ...t,
    prompt: "",
    submitted: false,
    code: "",
    score: 0,
    eval: null,
  }));
}

/**
 * BattleRound
 * Props:
 *   challenge    - 현재 챌린지 객체
 *   teams        - [{id, name, color, totalScore}] (App에서 관리)
 *   apiKey       - Anthropic API key
 *   timerSec     - 제한 시간 (초)
 *   onComplete   - (roundTeams) => void
 *   socket       - (선택) Socket.io 인스턴스 — 학생 제출 수신용
 */
export default function BattleRound({ challenge, teams, apiKey, timerSec, onComplete, socket }) {
  const [localTeams, setLocalTeams] = useState(() => initLocalTeams(teams));
  const [phase, setPhase] = useState("input"); // input | generating | judging | done
  const [timeLeft, setTimeLeft] = useState(timerSec);
  const [hintVisible, setHintVisible] = useState(false);
  const [showExp, setShowExp] = useState(false);
  const timerRef = useRef(null);
  const iframeRefs = useRef({});

  // 학생 제출 수신 (Socket.io)
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = ({ teamId, prompt, submitted }) => {
      if (phase !== "input") return;
      setLocalTeams((prev) =>
        prev.map((t) =>
          t.id === teamId ? { ...t, prompt, submitted: submitted || t.submitted } : t
        )
      );
    };
    socket.on("prompt-update", handleUpdate);
    return () => socket.off("prompt-update", handleUpdate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, phase]);

  // 타이머
  useEffect(() => {
    if (phase !== "input" || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setPhase("locked");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, timeLeft]);

  // phase 전환
  useEffect(() => {
    if (phase === "locked") runGenAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const runGenAll = async () => {
    setPhase("generating");

    const generated = await Promise.all(
      localTeams.map(async (team) => {
        if (!team.prompt.trim()) return { ...team, code: "# 빈 프롬프트" };
        try {
          const r = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
              "anthropic-dangerous-direct-browser-access": "true",
            },
            body: JSON.stringify({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 1024,
              system: `VPython/GlowScript code generator. Output ONLY code. No markdown, no backticks, no imports, no canvas setup, no loops. Static 3D scene only. Target: "${challenge.description}"`,
              messages: [{ role: "user", content: team.prompt }],
            }),
          });
          const d = await r.json();
          if (d.error) throw new Error(d.error.message);
          const code = d.content
            .filter((b) => b.type === "text")
            .map((b) => b.text)
            .join("\n")
            .replace(/```[\w]*\n?/g, "")
            .replace(/```/g, "")
            .trim();
          return { ...team, code };
        } catch (e) {
          return { ...team, code: `# Error: ${e.message}` };
        }
      })
    );

    setLocalTeams(generated);
    setPhase("judging");

    const evaluated = await runJudge(generated);
    setLocalTeams(evaluated);
    setPhase("done");
  };

  const runJudge = async (list) => {
    const summary = list
      .map((t, i) => `Team${i} "${t.name}" prompt: "${t.prompt}"\ncode:\n${t.code}`)
      .join("\n---\n");

    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          system: `Evaluate VPython teams. Return JSON array only (no markdown). Each item: {"team_index":N,"score":0-100,"strengths":"잘한점 한국어 1-2문장","improvements":"개선점 한국어 1-2문장","ct_element":"분해/패턴인식/추상화/알고리즘"}
Scoring: accuracy(0-60)+prompt_clarity(0-20)+creativity(0-10)+completeness(0-10). Empty prompt = 0. Be fair and differentiate scores.`,
          messages: [
            {
              role: "user",
              content: `문제: ${challenge.description}\n정답 코드:\n${challenge.answerCode}\n\n${summary}`,
            },
          ],
        }),
      });
      const d = await r.json();
      const txt = d.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("")
        .replace(/```[\w]*\n?/g, "")
        .replace(/```/g, "")
        .trim();

      const results = JSON.parse(txt);
      return list.map((t, idx) => {
        const ev = results.find((r) => r.team_index === idx);
        if (!ev) return t;
        return { ...t, score: Math.min(100, ev.score), eval: ev };
      });
    } catch (e) {
      return list.map((t) => ({
        ...t,
        eval: { strengths: "평가 중 오류 발생", improvements: e.message, ct_element: "-" },
      }));
    }
  };

  useEffect(() => {
    if (phase === "done" || phase === "judging") {
      localTeams.forEach((t, i) => {
        const ref = iframeRefs.current[t.id];
        if (ref && t.code && !t.code.startsWith("#")) {
          setTimeout(() => {
            ref.srcdoc = buildGlow(t.code);
          }, 200 + i * 250);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const pct = timerSec > 0 ? timeLeft / timerSec : 0;
  const tCol = pct > 0.5 ? "#34d399" : pct > 0.2 ? "#fbbf24" : "#ef4444";
  const allSubmitted = localTeams.every((t) => t.submitted);
  const sortedByScore = [...localTeams].sort((a, b) => b.score - a.score);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
      {/* 상단 바 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#e2e8f0" }}>
            {challenge.title}
          </span>
          <span
            style={{
              fontSize: "0.72rem",
              padding: "2px 8px",
              borderRadius: 10,
              background: "rgba(167,139,250,0.15)",
              color: "#a78bfa",
            }}
          >
            {challenge.ctElement}
          </span>
          {challenge.hint && phase === "input" && (
            <button
              onClick={() => setHintVisible((v) => !v)}
              style={{
                background: "rgba(251,191,36,0.1)",
                border: "1px solid rgba(251,191,36,0.25)",
                borderRadius: 7,
                padding: "2px 8px",
                color: "#fbbf24",
                cursor: "pointer",
                fontSize: "0.72rem",
                fontFamily: "inherit",
              }}
            >
              {hintVisible ? "힌트 닫기" : "💡 힌트"}
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {phase === "input" && (
            <>
              <div
                style={{
                  width: 120,
                  height: 6,
                  borderRadius: 3,
                  background: "rgba(255,255,255,0.07)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${pct * 100}%`,
                    height: "100%",
                    background: tCol,
                    borderRadius: 3,
                    transition: "width 1s linear",
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: "monospace",
                  fontWeight: 900,
                  fontSize: "1.3rem",
                  color: tCol,
                  minWidth: 48,
                  textAlign: "right",
                }}
              >
                {fmt(timeLeft)}
              </span>
              {allSubmitted && (
                <button
                  onClick={() => {
                    clearInterval(timerRef.current);
                    setTimeLeft(0);
                    setPhase("locked");
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 10,
                    border: "none",
                    background: "linear-gradient(135deg,#ef4444,#dc2626)",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    fontFamily: "inherit",
                  }}
                >
                  ⏩ 마감
                </button>
              )}
            </>
          )}
          {phase === "generating" && (
            <span style={{ color: "#60a5fa", fontWeight: 700, fontSize: "0.9rem" }}>
              🤖 코드 생성 중...
            </span>
          )}
          {phase === "judging" && (
            <span style={{ color: "#a78bfa", fontWeight: 700, fontSize: "0.9rem" }}>
              📊 평가 중...
            </span>
          )}
          {phase === "done" && (
            <button
              onClick={() => onComplete(localTeams)}
              style={{
                padding: "8px 18px",
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg,#7c3aed,#a78bfa)",
                color: "#fff",
                fontWeight: 800,
                cursor: "pointer",
                fontSize: "0.9rem",
                fontFamily: "inherit",
              }}
            >
              결과 보기 →
            </button>
          )}
        </div>
      </div>

      {/* 힌트 */}
      {hintVisible && (
        <div
          style={{
            background: "rgba(251,191,36,0.07)",
            border: "1px solid rgba(251,191,36,0.2)",
            borderRadius: 10,
            padding: "8px 14px",
            fontSize: "0.85rem",
            color: "#fcd34d",
            flexShrink: 0,
          }}
        >
          💡 {challenge.hint}
        </div>
      )}

      {/* 문제 설명 */}
      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.06)",
          padding: "8px 14px",
          fontSize: "0.85rem",
          color: "#cbd5e1",
          flexShrink: 0,
        }}
      >
        {challenge.description}
      </div>

      {/* 메인 그리드: 목표 + 팀 카드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "240px 1fr",
          gap: 10,
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* 목표 장면 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>
            🎯 목표 장면
          </div>
          <VPythonScene code={challenge.answerCode} height={200} />

          {/* 라운드 순위 (done 시) */}
          {phase === "done" && (
            <div
              style={{
                background: "rgba(251,191,36,0.06)",
                borderRadius: 12,
                border: "1px solid rgba(251,191,36,0.12)",
                padding: "0.7rem",
                flex: 1,
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#fbbf24",
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                🏆 이번 라운드
              </div>
              {sortedByScore.map((t, i) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "4px 6px",
                    borderRadius: 6,
                    marginBottom: 3,
                    background: i === 0 ? "rgba(251,191,36,0.08)" : "transparent",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: "0.85rem" }}>{MEDALS[i]}</span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: t.color.text,
                        fontSize: "0.8rem",
                      }}
                    >
                      {t.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontWeight: 800,
                      color: "#fbbf24",
                      fontSize: "0.85rem",
                    }}
                  >
                    +{t.score}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* CT 해설 */}
          {phase === "done" && challenge.explanation && (
            <div>
              <button
                onClick={() => setShowExp((v) => !v)}
                style={{
                  width: "100%",
                  background: "rgba(167,139,250,0.08)",
                  border: "1px solid rgba(167,139,250,0.15)",
                  borderRadius: 10,
                  padding: "7px 10px",
                  color: "#a78bfa",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  textAlign: "left",
                  fontFamily: "inherit",
                }}
              >
                📖 {showExp ? "해설 닫기" : "CT 해설"}
              </button>
              {showExp && (
                <div
                  style={{
                    background: "rgba(0,0,0,0.2)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    marginTop: 6,
                    fontSize: "0.78rem",
                    color: "#cbd5e1",
                    lineHeight: 1.7,
                  }}
                >
                  {challenge.explanation}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 팀 카드 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              localTeams.length <= 4
                ? "1fr 1fr"
                : localTeams.length <= 6
                ? "1fr 1fr 1fr"
                : "1fr 1fr 1fr 1fr",
            gap: 8,
            alignContent: "start",
            overflow: "auto",
          }}
        >
          {localTeams.map((t) => {
            const c = t.color;
            return (
              <div
                key={t.id}
                style={{
                  borderRadius: 12,
                  padding: "0.65rem",
                  background: c.light,
                  border: `1.5px solid ${c.border}`,
                }}
              >
                {/* 팀 헤더 */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: "50%",
                          background: c.bg,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontWeight: 700,
                          color: c.text,
                          fontSize: "0.85rem",
                        }}
                      >
                        {t.name}
                      </span>
                    </div>
                    {t.members?.length > 0 && (
                      <div
                        style={{
                          fontSize: "0.62rem",
                          color: c.text,
                          opacity: 0.65,
                          paddingLeft: 14,
                          lineHeight: 1.3,
                        }}
                      >
                        {t.members.join(" · ")}
                      </div>
                    )}
                  </div>
                  {t.submitted && phase === "input" && (
                    <span
                      style={{
                        fontSize: "0.65rem",
                        background: "rgba(52,211,153,0.15)",
                        color: "#34d399",
                        padding: "1px 6px",
                        borderRadius: 5,
                      }}
                    >
                      제출
                    </span>
                  )}
                  {phase === "done" && (
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background:
                          t.score >= 80
                            ? "linear-gradient(135deg,#34d399,#10b981)"
                            : t.score >= 50
                            ? "linear-gradient(135deg,#fbbf24,#f59e0b)"
                            : "linear-gradient(135deg,#f87171,#ef4444)",
                        fontWeight: 800,
                        fontSize: "0.75rem",
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      {t.score}
                    </div>
                  )}
                </div>

                {/* 입력 phase */}
                {phase === "input" && (
                  <div>
                    <textarea
                      value={t.prompt}
                      onChange={(e) => {
                        if (t.submitted) return;
                        setLocalTeams((prev) =>
                          prev.map((tm) =>
                            tm.id === t.id ? { ...tm, prompt: e.target.value } : tm
                          )
                        );
                      }}
                      disabled={t.submitted}
                      placeholder="이 장면을 AI에게 설명하세요..."
                      rows={3}
                      style={{
                        ...INPUT_STYLE,
                        opacity: t.submitted ? 0.4 : 1,
                      }}
                    />
                    {!t.submitted ? (
                      <button
                        onClick={() =>
                          setLocalTeams((prev) =>
                            prev.map((tm) =>
                              tm.id === t.id ? { ...tm, submitted: true } : tm
                            )
                          )
                        }
                        disabled={!t.prompt.trim()}
                        style={{
                          width: "100%",
                          marginTop: 5,
                          padding: "6px",
                          borderRadius: 8,
                          border: "none",
                          background: t.prompt.trim()
                            ? `linear-gradient(135deg,${c.bg},${c.bg}cc)`
                            : "rgba(255,255,255,0.05)",
                          color: "#fff",
                          fontWeight: 700,
                          cursor: t.prompt.trim() ? "pointer" : "default",
                          fontSize: "0.8rem",
                          fontFamily: "inherit",
                        }}
                      >
                        🔒 제출
                      </button>
                    ) : (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "6px",
                          fontSize: "0.75rem",
                          color: "#64748b",
                        }}
                      >
                        ✅ 제출 완료
                      </div>
                    )}
                  </div>
                )}

                {/* 생성/평가/완료 phase */}
                {(phase === "generating" ||
                  phase === "judging" ||
                  phase === "done") && (
                  <div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "#94a3b8",
                        marginBottom: 3,
                      }}
                    >
                      프롬프트:
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: c.text,
                        background: "rgba(0,0,0,0.2)",
                        borderRadius: 6,
                        padding: "4px 8px",
                        marginBottom: 6,
                        maxHeight: 40,
                        overflow: "auto",
                        lineHeight: 1.4,
                      }}
                    >
                      {t.prompt || "(비어있음)"}
                    </div>
                    <div
                      style={{
                        height: phase === "done" ? 120 : 100,
                        borderRadius: 8,
                        overflow: "hidden",
                        background: "#10101a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {t.code && !t.code.startsWith("#") ? (
                        <iframe
                          ref={(el) => {
                            iframeRefs.current[t.id] = el;
                          }}
                          title={`team-${t.id}`}
                          style={{
                            width: "100%",
                            height: "100%",
                            border: "none",
                          }}
                          sandbox="allow-scripts"
                        />
                      ) : (
                        <span
                          style={{ fontSize: "0.72rem", color: "#475569" }}
                        >
                          {phase === "generating" ? "생성 중..." : t.code}
                        </span>
                      )}
                    </div>
                    {phase === "done" && t.eval && (
                      <div
                        style={{
                          fontSize: "0.7rem",
                          lineHeight: 1.5,
                          marginTop: 5,
                        }}
                      >
                        <div style={{ color: "#34d399", marginBottom: 2 }}>
                          ✅ {t.eval.strengths}
                        </div>
                        <div style={{ color: "#fbbf24" }}>
                          💡 {t.eval.improvements}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

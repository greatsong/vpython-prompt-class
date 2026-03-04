import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

// ─── 서버 상태 ────────────────────────────────────────────────────────────────
let currentChallenge = null; // { challenge, teams }
let teamPrompts = {};        // teamId → { prompt, submitted }

// ─── Socket.io 이벤트 ─────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[접속] ${socket.id}`);

  // 새 접속자에게 현재 상태 전송
  if (currentChallenge) {
    socket.emit('challenge-started', currentChallenge);
  }
  Object.entries(teamPrompts).forEach(([teamId, data]) => {
    socket.emit('prompt-update', { teamId: Number(teamId), ...data });
  });

  // 교사: 챌린지 시작
  socket.on('start-challenge', (data) => {
    currentChallenge = data; // { challenge, teams }
    teamPrompts = {};
    io.emit('challenge-started', data);
    console.log(`[챌린지 시작] ${data.challenge?.title}`);
  });

  // 학생: 프롬프트 실시간 타이핑 (교사 화면에 실시간 표시)
  socket.on('prompt-typing', ({ teamId, prompt }) => {
    if (!teamPrompts[teamId]) teamPrompts[teamId] = { prompt: '', submitted: false };
    teamPrompts[teamId].prompt = prompt;
    socket.broadcast.emit('prompt-update', { teamId, prompt, submitted: false });
  });

  // 학생: 프롬프트 최종 제출
  socket.on('submit-prompt', ({ teamId, prompt }) => {
    teamPrompts[teamId] = { prompt, submitted: true };
    io.emit('prompt-update', { teamId, prompt, submitted: true });
    console.log(`[제출] 팀${teamId}: ${prompt.slice(0, 40)}...`);
  });

  // 교사: 챌린지 리셋
  socket.on('reset-challenge', () => {
    currentChallenge = null;
    teamPrompts = {};
    io.emit('challenge-reset');
    console.log('[리셋]');
  });

  socket.on('disconnect', () => {
    console.log(`[퇴장] ${socket.id}`);
  });
});

// ─── 정적 파일 서빙 (프로덕션 빌드) ──────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = join(__dirname, '../dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('/{*path}', (_, res) => res.sendFile(join(distPath, 'index.html')));
}

import { networkInterfaces } from 'os';

function getLocalIP() {
  const nets = networkInterfaces();
  for (const iface of Object.values(nets)) {
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

const PORT = process.env.PORT || 4009;
httpServer.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log(`\n🚀 VPython 서버 실행 중`);
  console.log(`   로컬:    http://localhost:${PORT}`);
  console.log(`   네트워크: http://${ip}:${PORT}`);
  console.log(`\n📱 학생 접속 (교사 앱을 아래 주소로 열어주세요)`);
  console.log(`   → http://${ip}:4008\n`);
});

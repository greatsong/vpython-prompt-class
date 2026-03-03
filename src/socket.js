import { io } from 'socket.io-client';

// 개발: Vite 프록시(/socket.io → 4009), 프로덕션: 동일 오리진
export const socket = io({ autoConnect: false });

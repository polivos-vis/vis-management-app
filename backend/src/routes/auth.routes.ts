import { Router } from 'express';
import {
  register,
  login,
  getMe,
  updateGroqApiKey,
  createDesktopAuthCode,
  exchangeDesktopAuthCode
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.put('/ai-key', authenticate, updateGroqApiKey);
router.post('/desktop/code', authenticate, createDesktopAuthCode);
router.post('/desktop/exchange', exchangeDesktopAuthCode);

export default router;

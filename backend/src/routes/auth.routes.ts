import { Router } from 'express';
import { register, login, getMe, updateGroqApiKey } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.put('/ai-key', authenticate, updateGroqApiKey);

export default router;

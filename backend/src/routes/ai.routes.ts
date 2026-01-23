import { Router } from 'express';
import { generateBrief } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/brief', generateBrief);

export default router;

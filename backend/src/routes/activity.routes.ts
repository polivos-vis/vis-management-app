import { Router } from 'express';
import { getActivityLogs } from '../controllers/activity.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/board/:boardId', getActivityLogs);

export default router;

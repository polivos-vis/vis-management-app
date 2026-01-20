import { Router } from 'express';
import {
  getChecklistByItem,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem
} from '../controllers/checklist.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/item/:itemId', getChecklistByItem);
router.post('/', createChecklistItem);
router.put('/:id', updateChecklistItem);
router.delete('/:id', deleteChecklistItem);

export default router;

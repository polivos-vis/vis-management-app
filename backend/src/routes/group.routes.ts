import { Router } from 'express';
import {
  createGroup,
  updateGroup,
  deleteGroup,
  reorderGroup
} from '../controllers/group.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/', createGroup);
router.put('/:id', updateGroup);
router.delete('/:id', deleteGroup);
router.put('/:id/reorder', reorderGroup);

export default router;

import { Router } from 'express';
import {
  createComment,
  getComments,
  updateComment,
  deleteComment
} from '../controllers/comment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/', createComment);
router.get('/item/:itemId', getComments);
router.put('/:id', updateComment);
router.delete('/:id', deleteComment);

export default router;

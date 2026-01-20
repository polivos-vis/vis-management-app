import { Router } from 'express';
import {
  createItem,
  updateItem,
  deleteItem,
  reorderItem,
  getMyItems
} from '../controllers/item.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/', createItem);
router.put('/:id', updateItem);
router.delete('/:id', deleteItem);
router.put('/:id/reorder', reorderItem);
router.get('/my-items', getMyItems);

export default router;

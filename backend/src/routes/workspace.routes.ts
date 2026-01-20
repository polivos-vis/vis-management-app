import { Router } from 'express';
import {
  createWorkspace,
  getWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  addMember,
  removeMember,
  getMembers,
  getWorkspaceRoadmap
} from '../controllers/workspace.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/', createWorkspace);
router.get('/', getWorkspaces);
router.get('/:id/roadmap', getWorkspaceRoadmap);
router.get('/:id', getWorkspace);
router.put('/:id', updateWorkspace);
router.delete('/:id', deleteWorkspace);
router.post('/:id/members', addMember);
router.delete('/:id/members/:memberId', removeMember);
router.get('/:id/members', getMembers);

export default router;

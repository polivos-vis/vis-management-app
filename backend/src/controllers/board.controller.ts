import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

const hasWorkspaceAccess = async (workspaceId: string, userId: string): Promise<boolean> => {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      OR: [
        { ownerId: userId },
        {
          members: {
            some: {
              userId: userId
            }
          }
        }
      ]
    }
  });
  return !!workspace;
};

export const createBoard = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, workspaceId, isRetainer } = req.body;
    const userId = req.userId!;

    if (!name || !workspaceId) {
      return res.status(400).json({ error: 'Name and workspaceId are required' });
    }

    const hasAccess = await hasWorkspaceAccess(workspaceId, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this workspace' });
    }

    const board = await prisma.board.create({
      data: {
        name,
        description,
        workspaceId,
        ...(isRetainer !== undefined && { isRetainer: Boolean(isRetainer) })
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    await prisma.activityLog.create({
      data: {
        action: 'created',
        entityType: 'board',
        entityId: board.id,
        description: `Created board "${board.name}"`,
        userId,
        boardId: board.id
      }
    });

    res.status(201).json(board);
  } catch (error) {
    console.error('Create board error:', error);
    res.status(500).json({ error: 'Failed to create board' });
  }
};

export const getBoards = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.userId!;

    const hasAccess = await hasWorkspaceAccess(workspaceId, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this workspace' });
    }

    const boards = await prisma.board.findMany({
      where: {
        workspaceId
      },
      include: {
        _count: {
          select: {
            groups: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(boards);
  } catch (error) {
    console.error('Get boards error:', error);
    res.status(500).json({ error: 'Failed to get boards' });
  }
};

export const getBoard = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;
    const archivedParam = String(req.query.archived || '');
    const archivedOnly = archivedParam === 'true' || archivedParam === '1';
    const includeAll = archivedParam === 'all';

    const board = await prisma.board.findUnique({
      where: { id },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            ownerId: true
          }
        },
        groups: {
          include: {
            items: {
              where: includeAll ? undefined : archivedOnly ? { isArchived: true } : { isArchived: false },
              include: {
                assignedUser: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true
                  }
                },
                _count: {
                  select: {
                    comments: true,
                    checklistItems: true
                  }
                }
              },
              orderBy: {
                position: 'asc'
              }
            }
          },
          orderBy: {
            position: 'asc'
          }
        }
      }
    });

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const hasAccess = await hasWorkspaceAccess(board.workspaceId, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this board' });
    }

    res.json(board);
  } catch (error) {
    console.error('Get board error:', error);
    res.status(500).json({ error: 'Failed to get board' });
  }
};

export const updateBoard = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, isRetainer } = req.body;
    const userId = req.userId!;

    const board = await prisma.board.findUnique({
      where: { id },
      include: {
        workspace: true
      }
    });

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const hasAccess = await hasWorkspaceAccess(board.workspaceId, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this board' });
    }

    const updatedBoard = await prisma.board.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(isRetainer !== undefined && { isRetainer })
      }
    });

    await prisma.activityLog.create({
      data: {
        action: 'updated',
        entityType: 'board',
        entityId: board.id,
        description: `Updated board "${updatedBoard.name}"`,
        userId,
        boardId: board.id
      }
    });

    res.json(updatedBoard);
  } catch (error) {
    console.error('Update board error:', error);
    res.status(500).json({ error: 'Failed to update board' });
  }
};

export const deleteBoard = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const board = await prisma.board.findUnique({
      where: { id },
      include: {
        workspace: true
      }
    });

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: board.workspaceId,
        ownerId: userId
      }
    });

    if (!workspace) {
      return res.status(403).json({ error: 'Only workspace owner can delete boards' });
    }

    await prisma.board.delete({
      where: { id }
    });

    res.json({ message: 'Board deleted successfully' });
  } catch (error) {
    console.error('Delete board error:', error);
    res.status(500).json({ error: 'Failed to delete board' });
  }
};

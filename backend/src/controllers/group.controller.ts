import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

const hasBoardAccess = async (boardId: string, userId: string): Promise<boolean> => {
  const board = await prisma.board.findFirst({
    where: {
      id: boardId,
      workspace: {
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
    }
  });
  return !!board;
};

export const createGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { name, boardId, color } = req.body;
    const userId = req.userId!;

    if (!name || !boardId) {
      return res.status(400).json({ error: 'Name and boardId are required' });
    }

    const hasAccess = await hasBoardAccess(boardId, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this board' });
    }

    const maxPosition = await prisma.group.findFirst({
      where: { boardId },
      orderBy: { position: 'desc' },
      select: { position: true }
    });

    const group = await prisma.group.create({
      data: {
        name,
        boardId,
        color,
        position: (maxPosition?.position || 0) + 1
      }
    });

    res.status(201).json(group);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
};

export const updateGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;
    const userId = req.userId!;

    const group = await prisma.group.findUnique({
      where: { id }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const hasAccess = await hasBoardAccess(group.boardId, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this board' });
    }

    const updatedGroup = await prisma.group.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(color !== undefined && { color })
      }
    });

    res.json(updatedGroup);
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
};

export const deleteGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const group = await prisma.group.findUnique({
      where: { id }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const hasAccess = await hasBoardAccess(group.boardId, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this board' });
    }

    await prisma.group.delete({
      where: { id }
    });

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
};

export const reorderGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPosition } = req.body;
    const userId = req.userId!;

    const group = await prisma.group.findUnique({
      where: { id }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const hasAccess = await hasBoardAccess(group.boardId, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this board' });
    }

    const updatedGroup = await prisma.group.update({
      where: { id },
      data: { position: newPosition }
    });

    res.json(updatedGroup);
  } catch (error) {
    console.error('Reorder group error:', error);
    res.status(500).json({ error: 'Failed to reorder group' });
  }
};

import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

const hasItemAccess = async (itemId: string, userId: string): Promise<boolean> => {
  const item = await prisma.item.findFirst({
    where: {
      id: itemId,
      group: {
        board: {
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
      }
    }
  });
  return !!item;
};

export const getChecklistByItem = async (req: AuthRequest, res: Response) => {
  try {
    const { itemId } = req.params;
    const userId = req.userId!;

    const hasAccess = await hasItemAccess(itemId, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this item' });
    }

    const checklist = await prisma.checklistItem.findMany({
      where: { itemId },
      orderBy: { position: 'asc' }
    });

    res.json(checklist);
  } catch (error) {
    console.error('Get checklist error:', error);
    res.status(500).json({ error: 'Failed to get checklist' });
  }
};

export const createChecklistItem = async (req: AuthRequest, res: Response) => {
  try {
    const { itemId, text } = req.body;
    const userId = req.userId!;

    if (!itemId || !text) {
      return res.status(400).json({ error: 'ItemId and text are required' });
    }

    const hasAccess = await hasItemAccess(itemId, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this item' });
    }

    const maxPosition = await prisma.checklistItem.findFirst({
      where: { itemId },
      orderBy: { position: 'desc' },
      select: { position: true }
    });

    const checklistItem = await prisma.checklistItem.create({
      data: {
        itemId,
        text,
        position: (maxPosition?.position || 0) + 1
      }
    });

    res.status(201).json(checklistItem);
  } catch (error) {
    console.error('Create checklist item error:', error);
    res.status(500).json({ error: 'Failed to create checklist item' });
  }
};

export const updateChecklistItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { text, isDone } = req.body;
    const userId = req.userId!;

    const checklistItem = await prisma.checklistItem.findUnique({
      where: { id },
      include: {
        item: {
          select: { id: true }
        }
      }
    });

    if (!checklistItem) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    const hasAccess = await hasItemAccess(checklistItem.itemId, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this item' });
    }

    const updated = await prisma.checklistItem.update({
      where: { id },
      data: {
        ...(text !== undefined && { text }),
        ...(isDone !== undefined && { isDone })
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update checklist item error:', error);
    res.status(500).json({ error: 'Failed to update checklist item' });
  }
};

export const deleteChecklistItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const checklistItem = await prisma.checklistItem.findUnique({
      where: { id }
    });

    if (!checklistItem) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    const hasAccess = await hasItemAccess(checklistItem.itemId, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this item' });
    }

    await prisma.checklistItem.delete({ where: { id } });

    res.json({ message: 'Checklist item deleted' });
  } catch (error) {
    console.error('Delete checklist item error:', error);
    res.status(500).json({ error: 'Failed to delete checklist item' });
  }
};

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

export const createComment = async (req: AuthRequest, res: Response) => {
  try {
    const { content, itemId } = req.body;
    const userId = req.userId!;

    if (!content || !itemId) {
      return res.status(400).json({ error: 'Content and itemId are required' });
    }

    const hasAccess = await hasItemAccess(itemId, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this item' });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        itemId,
        userId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    });

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        group: {
          include: {
            board: true
          }
        }
      }
    });

    if (item) {
      await prisma.activityLog.create({
        data: {
          action: 'commented',
          entityType: 'item',
          entityId: itemId,
          description: `Commented on "${item.title}"`,
          userId,
          boardId: item.group.board.id,
          itemId
        }
      });
    }

    res.status(201).json(comment);
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
};

export const getComments = async (req: AuthRequest, res: Response) => {
  try {
    const { itemId } = req.params;
    const userId = req.userId!;

    const hasAccess = await hasItemAccess(itemId, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this item' });
    }

    const comments = await prisma.comment.findMany({
      where: { itemId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    res.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
};

export const updateComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.userId!;

    const comment = await prisma.comment.findUnique({
      where: { id }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({ error: 'You can only edit your own comments' });
    }

    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { content },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    });

    res.json(updatedComment);
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
};

export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const comment = await prisma.comment.findUnique({
      where: { id }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    await prisma.comment.delete({
      where: { id }
    });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

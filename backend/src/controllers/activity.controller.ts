import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export const getActivityLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { boardId } = req.params;
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 50;

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

    if (!board) {
      return res.status(404).json({ error: 'Board not found or access denied' });
    }

    const logs = await prisma.activityLog.findMany({
      where: { boardId },
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
        createdAt: 'desc'
      },
      take: limit
    });

    res.json(logs);
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ error: 'Failed to get activity logs' });
  }
};

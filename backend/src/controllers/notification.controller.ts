import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 50;
    const unreadOnly = req.query.unreadOnly === 'true';

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json(updated);
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await prisma.notification.delete({
      where: { id },
    });

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

// Función auxiliar para crear notificaciones (usada por otros controladores)
export const createNotification = async (data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  itemId?: string;
  boardId?: string;
}) => {
  try {
    return await prisma.notification.create({
      data,
    });
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
};

// Verificar y crear notificaciones para tareas próximas a vencer
export const checkUpcomingTasks = async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Buscar tareas que vencen en las próximas 24 horas
    const upcomingItems = await prisma.item.findMany({
      where: {
        dueDate: {
          gte: now,
          lte: tomorrow,
        },
        assignedTo: {
          not: null,
        },
        status: {
          notIn: ['done', 'complete'],
        },
      },
      include: {
        assignedUser: true,
        group: {
          include: {
            board: true,
          },
        },
      },
    });

    // Crear notificaciones para cada tarea
    for (const item of upcomingItems) {
      if (!item.assignedTo) continue;

      // Verificar si ya existe una notificación reciente para este item
      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId: item.assignedTo,
          itemId: item.id,
          type: 'reminder',
          createdAt: {
            gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // últimas 24 horas
          },
        },
      });

      if (!existingNotification) {
        await createNotification({
          userId: item.assignedTo,
          type: 'reminder',
          title: 'Task Due Soon',
          message: `"${item.title}" is due on ${item.dueDate?.toLocaleDateString()}`,
          itemId: item.id,
          boardId: item.group.board.id,
        });
      }
    }

    res.json({ checked: upcomingItems.length, message: 'Reminders checked' });
  } catch (error) {
    console.error('Check upcoming tasks error:', error);
    res.status(500).json({ error: 'Failed to check upcoming tasks' });
  }
};

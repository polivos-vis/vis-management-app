import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { createNotification } from './notification.controller';

const prisma = new PrismaClient();

const hasGroupAccess = async (groupId: string, userId: string): Promise<boolean> => {
  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
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
  });
  return !!group;
};

export const createItem = async (req: AuthRequest, res: Response) => {
  try {
    const { title, groupId, status, priority, startDate, dueDate, assignedTo, description } = req.body;
    const userId = req.userId!;

    if (!title || !groupId) {
      return res.status(400).json({ error: 'Title and groupId are required' });
    }

    const hasAccess = await hasGroupAccess(groupId, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this group' });
    }

    const maxPosition = await prisma.item.findFirst({
      where: { groupId },
      orderBy: { position: 'desc' },
      select: { position: true }
    });

    const item = await prisma.item.create({
      data: {
        title,
        groupId,
        status: status || 'todo',
        priority: priority || 'medium',
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedTo,
        description,
        position: (maxPosition?.position || 0) + 1
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        group: {
          include: {
            board: {
              include: {
                workspace: {
                  select: {
                    ownerId: true
                  }
                }
              }
            }
          }
        }
      }
    });

    await prisma.activityLog.create({
      data: {
        action: 'created',
        entityType: 'item',
        entityId: item.id,
        description: `Created item "${item.title}"`,
        userId,
        boardId: item.group.board.id,
        itemId: item.id
      }
    });

    // Crear notificación si se asignó a alguien
    if (assignedTo) {
      const notifyUserIds = new Set<string>();
      notifyUserIds.add(assignedTo);
      if (item.group.board.workspace?.ownerId) {
        notifyUserIds.add(item.group.board.workspace.ownerId);
      }

      await Promise.all(
        Array.from(notifyUserIds).map((notifyUserId) =>
          createNotification({
            userId: notifyUserId,
            type: 'assignment',
            title: 'Task Assigned',
            message: `"${item.title}" was assigned`,
            itemId: item.id,
            boardId: item.group.board.id,
          })
        )
      );
    }

    res.status(201).json(item);
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
};

export const updateItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, status, priority, startDate, dueDate, assignedTo, description, notes, retainerHours } = req.body;
    const userId = req.userId!;

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        group: {
          include: {
            board: {
              include: {
                workspace: {
                  select: {
                    ownerId: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const hasAccess = await hasGroupAccess(item.groupId, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this item' });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo || null;
    if (description !== undefined) updateData.description = description;
    if (notes !== undefined) updateData.notes = notes;

    // Verificar si cambió la asignación
    const assignmentChanged = assignedTo !== undefined && assignedTo !== item.assignedTo;
    const statusChanged = status !== undefined && status !== item.status;
    const isRetainerBoard = item.group.board?.isRetainer === true;
    const previousStatus = item.status;

    if (statusChanged) {
      if (status === 'done') {
        if (isRetainerBoard && (retainerHours === undefined || retainerHours === null)) {
          return res.status(400).json({ error: 'Retainer hours are required to complete this task' });
        }
        if (isRetainerBoard && !Number.isFinite(Number(retainerHours))) {
          return res.status(400).json({ error: 'Retainer hours must be a valid number' });
        }
        updateData.isArchived = true;
        updateData.completedAt = new Date();
        if (isRetainerBoard) {
          updateData.retainerHours = Number(retainerHours);
        }
      } else {
        updateData.isArchived = false;
        updateData.completedAt = null;
        if (isRetainerBoard) {
          updateData.retainerHours = null;
        }
      }
    } else if (retainerHours !== undefined && isRetainerBoard) {
      if (!Number.isFinite(Number(retainerHours))) {
        return res.status(400).json({ error: 'Retainer hours must be a valid number' });
      }
      updateData.retainerHours = Number(retainerHours);
    }

    const updatedItem = await prisma.item.update({
      where: { id },
      data: updateData,
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    });

    await prisma.activityLog.create({
      data: {
        action: 'updated',
        entityType: 'item',
        entityId: item.id,
        description: `Updated item "${updatedItem.title}"`,
        userId,
        boardId: item.group.board.id,
        itemId: item.id
      }
    });

    // Crear notificación si se reasignó a alguien diferente
    if (assignmentChanged && assignedTo) {
      const notifyUserIds = new Set<string>();
      notifyUserIds.add(assignedTo);
      if (item.group.board.workspace?.ownerId) {
        notifyUserIds.add(item.group.board.workspace.ownerId);
      }

      await Promise.all(
        Array.from(notifyUserIds).map((notifyUserId) =>
          createNotification({
            userId: notifyUserId,
            type: 'assignment',
            title: 'Task Assigned',
            message: `"${updatedItem.title}" was assigned`,
            itemId: item.id,
            boardId: item.group.board.id,
          })
        )
      );
    }

    if (statusChanged) {
      const notifyUserIds = new Set<string>();
      if (updatedItem.assignedTo) {
        notifyUserIds.add(updatedItem.assignedTo);
      }
      if (item.group.board.workspace?.ownerId) {
        notifyUserIds.add(item.group.board.workspace.ownerId);
      }

      await Promise.all(
        Array.from(notifyUserIds).map((notifyUserId) =>
          createNotification({
            userId: notifyUserId,
            type: 'status',
            title: 'Task Status Updated',
            message: `"${updatedItem.title}" changed from ${previousStatus} to ${updatedItem.status}`,
            itemId: item.id,
            boardId: item.group.board.id,
          })
        )
      );
    }

    res.json(updatedItem);
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
};

export const deleteItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const item = await prisma.item.findUnique({
      where: { id }
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const hasAccess = await hasGroupAccess(item.groupId, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this item' });
    }

    await prisma.item.delete({
      where: { id }
    });

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
};

export const reorderItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPosition, newGroupId } = req.body;
    const userId = req.userId!;

    const item = await prisma.item.findUnique({
      where: { id }
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const hasAccess = await hasGroupAccess(item.groupId, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this item' });
    }

    const updateData: any = {};
    if (newPosition !== undefined) updateData.position = newPosition;
    if (newGroupId !== undefined) updateData.groupId = newGroupId;

    const updatedItem = await prisma.item.update({
      where: { id },
      data: updateData
    });

    res.json(updatedItem);
  } catch (error) {
    console.error('Reorder item error:', error);
    res.status(500).json({ error: 'Failed to reorder item' });
  }
};

export const getMyItems = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const items = await prisma.item.findMany({
      where: {
        assignedTo: userId,
        isArchived: false
      },
      include: {
        group: {
          include: {
            board: {
              include: {
                workspace: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            comments: true
          }
        }
      },
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json(items);
  } catch (error) {
    console.error('Get my items error:', error);
    res.status(500).json({ error: 'Failed to get items' });
  }
};

import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export const createWorkspace = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    const userId = req.userId!;

    if (!name) {
      return res.status(400).json({ error: 'Workspace name is required' });
    }

    const workspace = await prisma.workspace.create({
      data: {
        name,
        description,
        ownerId: userId
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    });

    res.status(201).json(workspace);
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
};

export const getWorkspaces = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const workspaces = await prisma.workspace.findMany({
      where: {
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
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        members: {
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
        },
        _count: {
          select: {
            boards: true,
            members: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(workspaces);
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({ error: 'Failed to get workspaces' });
  }
};

export const getWorkspace = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const workspace = await prisma.workspace.findFirst({
      where: {
        id,
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
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        members: {
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
        },
        boards: {
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
        }
      }
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found or access denied' });
    }

    res.json(workspace);
  } catch (error) {
    console.error('Get workspace error:', error);
    res.status(500).json({ error: 'Failed to get workspace' });
  }
};

export const updateWorkspace = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const userId = req.userId!;

    const workspace = await prisma.workspace.findFirst({
      where: {
        id,
        ownerId: userId
      }
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found or you do not have permission' });
    }

    const updatedWorkspace = await prisma.workspace.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description })
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    });

    res.json(updatedWorkspace);
  } catch (error) {
    console.error('Update workspace error:', error);
    res.status(500).json({ error: 'Failed to update workspace' });
  }
};

export const deleteWorkspace = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const workspace = await prisma.workspace.findFirst({
      where: {
        id,
        ownerId: userId
      }
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found or you do not have permission' });
    }

    await prisma.workspace.delete({
      where: { id }
    });

    res.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    console.error('Delete workspace error:', error);
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
};

export const addMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { email, role = 'member' } = req.body;
    const userId = req.userId!;

    const workspace = await prisma.workspace.findFirst({
      where: {
        id,
        ownerId: userId
      }
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found or you do not have permission' });
    }

    const userToAdd = await prisma.user.findUnique({
      where: { email }
    });

    if (!userToAdd) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userToAdd.id === workspace.ownerId) {
      return res.status(400).json({ error: 'Owner is already a member' });
    }

    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: id,
          userId: userToAdd.id
        }
      }
    });

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId: id,
        userId: userToAdd.id,
        role
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

    res.status(201).json(member);
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
};

export const removeMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.userId!;

    const workspace = await prisma.workspace.findFirst({
      where: {
        id,
        ownerId: userId
      }
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found or you do not have permission' });
    }

    await prisma.workspaceMember.delete({
      where: {
        id: memberId
      }
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

export const getMembers = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const workspace = await prisma.workspace.findFirst({
      where: {
        id,
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

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found or access denied' });
    }

    const members = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: id
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

    const owner = await prisma.user.findUnique({
      where: { id: workspace.ownerId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true
      }
    });

    res.json({
      owner,
      members
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Failed to get members' });
  }
};

export const getWorkspaceRoadmap = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const workspace = await prisma.workspace.findFirst({
      where: {
        id,
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
      },
      select: { id: true }
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found or access denied' });
    }

    const boards = await prisma.board.findMany({
      where: { workspaceId: id },
      include: {
        groups: {
          include: {
            items: {
              select: {
                startDate: true,
                dueDate: true,
                completedAt: true
              }
            }
          }
        }
      }
    });

    const roadmap = boards
      .map((board) => {
        const items = board.groups.flatMap((group) => group.items);
        const startCandidates = items
          .map((item) => item.startDate || item.dueDate || item.completedAt)
          .filter((date): date is Date => Boolean(date));
        const endCandidates = items
          .map((item) => item.completedAt || item.dueDate || item.startDate)
          .filter((date): date is Date => Boolean(date));

        if (startCandidates.length === 0 || endCandidates.length === 0) {
          return null;
        }

        const startDate = new Date(Math.min(...startCandidates.map((date) => date.getTime())));
        const endDate = new Date(Math.max(...endCandidates.map((date) => date.getTime())));

        return {
          id: board.id,
          name: board.name,
          startDate,
          endDate
        };
      })
      .filter((entry): entry is { id: string; name: string; startDate: Date; endDate: Date } => Boolean(entry))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    res.json(roadmap);
  } catch (error) {
    console.error('Get workspace roadmap error:', error);
    res.status(500).json({ error: 'Failed to get workspace roadmap' });
  }
};

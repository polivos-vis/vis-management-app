import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();
const desktopAuthCodes = new Map<string, { userId: string; expiresAt: number }>();
const DESKTOP_CODE_TTL_MS = 2 * 60 * 1000;

const generateToken = (user: { id: string; email: string }) =>
  jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );

const cleanupDesktopCodes = () => {
  const now = Date.now();
  for (const [code, value] of desktopAuthCodes.entries()) {
    if (value.expiresAt <= now) {
      desktopAuthCodes.delete(code);
    }
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name
      }
    });

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
        groqApiKey: true,
        groqApiKeyLast4: true,
        groqApiKeyPrefix: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      createdAt: user.createdAt,
      hasGroqApiKey: Boolean(user.groqApiKey),
      groqApiKeyLast4: user.groqApiKeyLast4 || null,
      groqApiKeyPrefix: user.groqApiKeyPrefix || null
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

export const updateGroqApiKey = async (req: AuthRequest, res: Response) => {
  try {
    const { apiKey } = req.body as { apiKey?: string };
    const userId = req.userId!;

    const trimmedKey = typeof apiKey === 'string' ? apiKey.trim() : '';
    const newKey = trimmedKey.length > 0 ? trimmedKey : null;
    const newLast4 = newKey ? newKey.slice(-4) : null;
    const newPrefix = newKey ? newKey.slice(0, 4) : null;

    if (newKey && newKey.length < 10) {
      return res.status(400).json({ error: 'API key looks too short' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { groqApiKey: newKey, groqApiKeyLast4: newLast4, groqApiKeyPrefix: newPrefix }
    });

    res.json({ hasGroqApiKey: Boolean(newKey), groqApiKeyLast4: newLast4, groqApiKeyPrefix: newPrefix });
  } catch (error) {
    console.error('Update Groq API key error:', error);
    res.status(500).json({ error: 'Failed to update API key' });
  }
};

export const createDesktopAuthCode = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    cleanupDesktopCodes();
    const code = crypto.randomBytes(32).toString('hex');
    desktopAuthCodes.set(code, { userId, expiresAt: Date.now() + DESKTOP_CODE_TTL_MS });

    res.json({
      code,
      expiresInSeconds: Math.floor(DESKTOP_CODE_TTL_MS / 1000)
    });
  } catch (error) {
    console.error('Create desktop auth code error:', error);
    res.status(500).json({ error: 'Failed to create desktop auth code' });
  }
};

export const exchangeDesktopAuthCode = async (req: Request, res: Response) => {
  try {
    const { code } = req.body as { code?: string };
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    cleanupDesktopCodes();
    const session = desktopAuthCodes.get(code);
    if (!session || session.expiresAt <= Date.now()) {
      desktopAuthCodes.delete(code);
      return res.status(400).json({ error: 'Desktop code is invalid or expired' });
    }

    desktopAuthCodes.delete(code);
    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Exchange desktop auth code error:', error);
    res.status(500).json({ error: 'Failed to exchange desktop auth code' });
  }
};

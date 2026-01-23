import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.1-8b-instant';
const prisma = new PrismaClient();

type AiBriefPayload = {
  title?: string;
  summary: string;
  friendlyExplanation: string;
  implementationNotes: string;
  taskType: string;
  role: string;
  roleReason: string;
  steps: string[];
  acceptanceCriteria: string[];
  questions: string[];
};

const buildSystemPrompt = () =>
  [
    'Eres un asistente que convierte requerimientos de clientes en un brief claro para un manager no tecnico.',
    'Responde SOLO con JSON valido (sin markdown, sin texto extra).',
    'Usa solo caracteres ASCII (sin acentos).',
    'Todo debe estar en espanol.',
    'El objetivo es explicar que se debe hacer y como resolverlo de forma simple.',
    'Cuando sea posible, incluye instrucciones concretas de donde configurar y que cambiar.',
    'Si no hay certeza, dilo y pide el dato faltante.',
    'Siempre sugiere un rol responsable y el motivo.',
    'Mantén frases cortas y concretas.'
  ].join(' ');

const buildUserPrompt = (inputText: string, context?: string) =>
  [
    'Analiza el siguiente requerimiento y devuelve un JSON con esta forma exacta:',
    '{',
    '  "title": "titulo sugerido (opcional)",',
    '  "summary": "resumen corto en 1-2 frases",',
    '  "friendlyExplanation": "explicacion simple para alguien no tecnico",',
    '  "implementationNotes": "como se implementa con pasos concretos (panel, setting, archivo, etc.)",',
    '  "taskType": "dev | contenido | seo | diseno | ops | otro",',
    '  "role": "rol sugerido (ej: manager, dev, contenido, seo, diseno)",',
    '  "roleReason": "por que ese rol es el adecuado",',
    '  "steps": ["paso 1 con lugar + accion", "paso 2 con lugar + accion"],',
    '  "acceptanceCriteria": ["criterio 1", "criterio 2"],',
    '  "questions": ["pregunta 1", "pregunta 2"]',
    '}',
    context && context.trim().length > 0 ? `Contexto del proyecto: ${context.trim()}` : '',
    'Requerimiento:',
    inputText.trim()
  ]
    .filter((line) => line.length > 0)
    .join('\n');

const extractJson = (rawContent: string) => {
  const trimmed = rawContent.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Invalid JSON payload from AI');
  }
  return trimmed.slice(start, end + 1);
};

const sanitizeJsonString = (value: string) => {
  return value
    .replace(/[\u0000-\u001F]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const normalizeArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
};

export const generateBrief = async (req: AuthRequest, res: Response) => {
  try {
    const { inputText, context } = req.body as { inputText?: string; context?: string };

    if (!inputText || inputText.trim().length < 10) {
      return res.status(400).json({ error: 'inputText is required and must be at least 10 characters' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { groqApiKey: true }
    });

    const apiKey = user?.groqApiKey;
    if (!apiKey) {
      return res.status(403).json({ error: 'Groq API key is not configured for this user' });
    }

    const model = process.env.GROQ_MODEL || DEFAULT_MODEL;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(inputText, context) }
        ],
        temperature: 0.2,
        max_tokens: 700
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Groq API error:', errorBody);
      return res.status(502).json({ error: 'AI provider failed to respond' });
    }

    const data = (await response.json()) as any;
    const rawContent = data?.choices?.[0]?.message?.content;
    if (!rawContent || typeof rawContent !== 'string') {
      return res.status(502).json({ error: 'Invalid AI response' });
    }

    const jsonPayload = sanitizeJsonString(extractJson(rawContent));
    const parsed = JSON.parse(jsonPayload) as Partial<AiBriefPayload>;

    const brief: AiBriefPayload = {
      title: typeof parsed.title === 'string' ? parsed.title.trim() : undefined,
      summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
      friendlyExplanation: typeof parsed.friendlyExplanation === 'string' ? parsed.friendlyExplanation.trim() : '',
      implementationNotes: typeof parsed.implementationNotes === 'string' ? parsed.implementationNotes.trim() : '',
      taskType: typeof parsed.taskType === 'string' ? parsed.taskType.trim() : 'otro',
      role: typeof parsed.role === 'string' ? parsed.role.trim() : 'otro',
      roleReason: typeof parsed.roleReason === 'string' ? parsed.roleReason.trim() : '',
      steps: normalizeArray(parsed.steps),
      acceptanceCriteria: normalizeArray(parsed.acceptanceCriteria),
      questions: normalizeArray(parsed.questions)
    };

    if (!brief.summary || !brief.friendlyExplanation || !brief.role) {
      return res.status(502).json({ error: 'AI response missing required fields' });
    }

    res.json(brief);
  } catch (error) {
    console.error('AI brief error:', error);
    res.status(500).json({ error: 'Failed to generate AI brief' });
  }
};

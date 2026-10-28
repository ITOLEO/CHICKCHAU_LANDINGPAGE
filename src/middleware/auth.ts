import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { getOrCreateUser } from '../db/users.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

const DEFAULT_BOOTSTRAPPED_ADMIN_EMAIL = 'itleo4444@gmail.com';

export function getAllowedAdminEmails(): Set<string> {
  const allowed = new Set<string>([DEFAULT_BOOTSTRAPPED_ADMIN_EMAIL]);
  const raw = process.env.ADMIN_EMAILS;
  if (raw && raw.trim().length > 0) {
    for (const part of raw.split(',')) {
      const cleaned = part.trim().toLowerCase();
      if (cleaned.includes('@')) {
        allowed.add(cleaned);
      }
    }
  }
  return allowed;
}

export async function verifyAdminBearerHeader(authHeader: string | undefined): Promise<{
  uid: string;
  email: string;
}> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = new Error('Autentikasi diperlukan (Bearer token tidak ditemukan).') as Error & {
      statusCode?: number;
      code?: string;
    };
    err.statusCode = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    const err = new Error('Token autentikasi kosong.') as Error & {
      statusCode?: number;
      code?: string;
    };
    err.statusCode = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  let decodedToken: DecodedIdToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(token);
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    const err = new Error('Token autentikasi tidak valid atau sudah kedaluwarsa.') as Error & {
      statusCode?: number;
      code?: string;
    };
    err.statusCode = 401;
    err.code = 'INVALID_AUTH_TOKEN';
    throw err;
  }

  const email = (decodedToken.email || '').toLowerCase();
  const emailVerified = Boolean(decodedToken.email_verified);
  const allowedAdmins = getAllowedAdminEmails();

  if (!email || !emailVerified || !allowedAdmins.has(email)) {
    const err = new Error('Akun Anda tidak memiliki izin administrator CHICKCHAU.') as Error & {
      statusCode?: number;
      code?: string;
    };
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  try {
    await getOrCreateUser(decodedToken.uid, email, 'admin');
  } catch (syncErr) {
    console.warn('Could not sync admin user to PostgreSQL users table:', syncErr);
  }

  return {
    uid: decodedToken.uid,
    email,
  };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized: Missing token',
      },
    });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    if (decodedToken.email) {
      await getOrCreateUser(decodedToken.uid, decodedToken.email.toLowerCase(), 'customer');
    }
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({
      error: {
        code: 'INVALID_AUTH_TOKEN',
        message: 'Unauthorized: Invalid token',
      },
    });
  }
};

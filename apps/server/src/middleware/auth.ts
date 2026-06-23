import type { NextFunction, Request, Response } from 'express';
import { firebaseAuth } from '../config/firebaseAdmin.js';

export type AuthenticatedUser = {
  uid: string;
  email?: string;
  name?: string;
};

export type AuthenticatedRequest = Request & {
  auth: AuthenticatedUser;
};

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  const authorization = request.headers.authorization;
  const [scheme, token] = authorization?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    response.status(401).json({ error: 'Missing Firebase bearer token.' });
    return;
  }

  try {
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    (request as AuthenticatedRequest).auth = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
    };
    next();
  } catch {
    response.status(401).json({ error: 'Invalid or expired Firebase token.' });
  }
}

export function getAuth(request: Request) {
  return (request as AuthenticatedRequest).auth;
}

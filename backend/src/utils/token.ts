import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { config } from '../config/env.js';
import { AuthenticatedUser } from '../types/auth.js';

export const AUTH_COOKIE_NAME = 'token';

/**
 * Generates a signed JWT session token
 */
export function generateToken(user: AuthenticatedUser): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    config.JWT_SECRET,
    {
      expiresIn: '7d',
    }
  );
}

/**
 * Verifies and decodes a signed JWT session token
 */
export function verifyToken(token: string): AuthenticatedUser {
  const decoded = jwt.verify(token, config.JWT_SECRET) as jwt.JwtPayload;
  return {
    id: decoded.sub as string,
    email: decoded.email as string,
    role: decoded.role as 'CITIZEN' | 'ADMIN',
  };
}

/**
 * Sets the secure HttpOnly cookie for authenticated session
 */
export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/',
  });
}

/**
 * Clears the authentication cookie upon logout
 */
export function clearAuthCookie(res: Response): void {
  res.cookie(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(0),
    path: '/',
  });
}

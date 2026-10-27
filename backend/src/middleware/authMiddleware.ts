import { Request, Response, NextFunction } from 'express';
import { verifyToken, AUTH_COOKIE_NAME } from '../utils/token.js';
import { UserRole } from '../types/auth.js';

/**
 * Middleware ensuring incoming requests carry a valid authenticated session
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Extract token from HttpOnly cookie or Authorization Bearer header
  const tokenFromCookie = req.cookies?.[AUTH_COOKIE_NAME];
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

  const token = tokenFromCookie || tokenFromHeader;

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please log in to continue.',
      },
    });
    return;
  }

  try {
    const verifiedUser = verifyToken(token);
    req.user = verifiedUser;
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Your session has expired or is invalid. Please log in again.',
      },
    });
  }
}

/**
 * Middleware restricting access based on server-verified roles
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access forbidden: You do not possess the required permissions.',
        },
      });
      return;
    }

    next();
  };
}

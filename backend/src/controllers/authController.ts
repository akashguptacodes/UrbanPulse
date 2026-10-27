import { Request, Response, NextFunction } from 'express';
import { authService, AuthService } from '../services/authService.js';
import { registerSchema, loginSchema } from '../validators/authValidators.js';
import { setAuthCookie, clearAuthCookie } from '../utils/token.js';

export class AuthController {
  constructor(private service: AuthService = authService) {}

  public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedBody = registerSchema.safeParse(req.body);
      if (!parsedBody.success) {
        res.status(422).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid registration input',
            details: parsedBody.error.errors.map((e) => ({
              field: e.path.join('.'),
              issue: e.message,
            })),
          },
        });
        return;
      }

      const safeUser = await this.service.register(parsedBody.data);

      res.status(201).json({
        success: true,
        data: {
          user: safeUser,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedBody = loginSchema.safeParse(req.body);
      if (!parsedBody.success) {
        res.status(422).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid login input',
            details: parsedBody.error.errors.map((e) => ({
              field: e.path.join('.'),
              issue: e.message,
            })),
          },
        });
        return;
      }

      const { user, token } = await this.service.login(parsedBody.data);

      // Issue secure HttpOnly session cookie
      setAuthCookie(res, token);

      res.status(200).json({
        success: true,
        data: {
          user,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      const user = await this.service.getCurrentUser(req.user.id);

      res.status(200).json({
        success: true,
        data: {
          user,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public logout = async (req: Request, res: Response): Promise<void> => {
    clearAuthCookie(res);
    res.status(200).json({
      success: true,
      data: {
        message: 'Successfully logged out',
      },
    });
  };
}

export const authController = new AuthController();

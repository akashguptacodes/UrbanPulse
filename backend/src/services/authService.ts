import { userRepository, UserRepository } from '../repositories/userRepository.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/token.js';
import { RegisterInput, LoginInput } from '../validators/authValidators.js';
import { SafeUser } from '../types/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { Role } from '@prisma/client';

export class AuthService {
  constructor(private userRepo: UserRepository = userRepository) {}

  /**
   * Registers a new user. Always assigns CITIZEN role regardless of client payload.
   */
  public async register(input: RegisterInput): Promise<SafeUser> {
    const normalizedEmail = this.userRepo.normalizeEmail(input.email);

    // Check for duplicate account
    const existingUser = await this.userRepo.findByEmail(normalizedEmail);
    if (existingUser) {
      const error: AppError = new Error('An account with this email address already exists');
      error.statusCode = 409;
      error.code = 'EMAIL_ALREADY_EXISTS';
      throw error;
    }

    // Hash password with bcrypt work factor 12
    const password_hash = await hashPassword(input.password);

    // Persist new user with forced CITIZEN role
    const newUser = await this.userRepo.create({
      email: normalizedEmail,
      password_hash,
      full_name: input.full_name,
      role: Role.CITIZEN,
    });

    return this.userRepo.toSafeUser(newUser);
  }

  /**
   * Authenticates user credentials and generates a signed session token
   */
  public async login(input: LoginInput): Promise<{ user: SafeUser; token: string }> {
    const normalizedEmail = this.userRepo.normalizeEmail(input.email);

    const user = await this.userRepo.findByEmail(normalizedEmail);
    if (!user) {
      const error: AppError = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    const isValidPassword = await comparePassword(input.password, user.password_hash);
    if (!isValidPassword) {
      const error: AppError = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: this.userRepo.toSafeUser(user),
      token,
    };
  }

  /**
   * Resolves safe user details for an authenticated user
   */
  public async getCurrentUser(userId: string): Promise<SafeUser> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      const error: AppError = new Error('Authenticated user account could not be found');
      error.statusCode = 401;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    return this.userRepo.toSafeUser(user);
  }
}

export const authService = new AuthService();

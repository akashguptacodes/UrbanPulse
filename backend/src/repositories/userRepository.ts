import { prisma } from './prisma.js';
import { Role, User } from '@prisma/client';
import { SafeUser } from '../types/auth.js';

export class UserRepository {
  /**
   * Normalizes an email address to lowercase and trimmed string
   */
  public normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * Finds a user by normalized email address
   */
  public async findByEmail(email: string): Promise<User | null> {
    const normalized = this.normalizeEmail(email);
    return prisma.user.findUnique({
      where: { email: normalized },
    });
  }

  /**
   * Finds a user by unique identifier
   */
  public async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Creates a new user record
   */
  public async create(data: {
    email: string;
    password_hash: string;
    full_name: string;
    role?: Role;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        email: this.normalizeEmail(data.email),
        password_hash: data.password_hash,
        full_name: data.full_name.trim(),
        role: data.role ?? Role.CITIZEN,
      },
    });
  }

  /**
   * Converts a database User entity to a SafeUser DTO, omitting password_hash
   */
  public toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      created_at: user.created_at.toISOString(),
    };
  }
}

export const userRepository = new UserRepository();

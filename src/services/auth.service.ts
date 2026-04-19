import crypto from 'crypto';
import { AUTH_EVENTS } from '../events/auth.events';
import { hashPassword, verifyPassword } from '../lib/password';
import { ConflictError, UnauthorizedError } from '../lib/errors';
import { PrismaClient } from '../../generated/prisma/client';
import { EventEmitter } from 'events';
import type { TokenPayload } from '../lib/tokens';

type TokenService = {
  generateAccessToken: (user: { id: string, tier: string }) => string;
  generateRefreshToken: (user: { id: string, tier: string }) => string;
  verifyRefreshToken: (token: string) => TokenPayload;
}

export class AuthService {
  constructor(
    private tokenService: TokenService,
    private prisma: PrismaClient,
    private eventBus: EventEmitter
  ) {
    //
  }

  async register(data: { email: string, password: string }) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() }
    });
    if (existingUser) throw new ConflictError('Email already in use');

    const passwordHash = await hashPassword(data.password);
    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash,
      }
    });

    const defaultRole = await this.prisma.role.findFirst({
      where: { isDefault: true }
    });

    if (defaultRole) {
      await this.prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: defaultRole.id
        }
      });
    }

    this.eventBus.emit(AUTH_EVENTS.USER_REGISTERED, {
      id: user.id,
      email: user.email,
      tier: user.tier,
    });

    return { id: user.id, email: user.email, tier: user.tier };
  }

  async login(data: { email: string, password: string, deviceInfo?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() }
    });
    if (!user || !user.isActive) {
      this.eventBus.emit(AUTH_EVENTS.LOGIN_FAILED, {
        email: data.email, reason: 'User not found', deviceInfo: data.deviceInfo || 'unknown'
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValid = await verifyPassword(data.password, user.passwordHash);
    if (!isValid) {
      this.eventBus.emit(AUTH_EVENTS.LOGIN_FAILED, {
        email: data.email, reason: 'wrong_password', deviceInfo: data.deviceInfo || 'unknown'
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    const accessToken = this.tokenService.generateAccessToken(user);
    const refreshToken = this.tokenService.generateRefreshToken(user);

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    this.eventBus.emit(AUTH_EVENTS.USER_LOGGED_IN, {
      userId: user.id,
      deviceInfo: data.deviceInfo || 'unknown',
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, tier: user.tier }
    };
  }

  async logout(rawRefreshToken: string) {
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    await this.prisma.refreshToken.deleteMany({
      where: { token: tokenHash },
    });
  }
}

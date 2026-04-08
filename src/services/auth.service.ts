import { prisma } from '../lib/prisma';
import {eventBus} from '../lib/events';
import { AUTH_EVENTS } from '../events/auth.events';
import { generateAccessToken, generateRefreshToken } from '../lib/tokens';
import { hashPassword, verifyPassword } from '../lib/password';

export async function register(data: { email: string, password: string }) {
  const existingUser = await prisma.user.findUnique({ where: { email: data.email.toLowerCase().trim() } });
  if (existingUser) throw new Error('Email already in use');

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase().trim(),
      passwordHash,
    }
  });

  eventBus.emit(AUTH_EVENTS.USER_REGISTERED, {
    id: user.id,
    email: user.email,
    tier: user.tier,
  });

  return user;
}

export async function login(data: { email: string, password: string, deviceInfo?: string }) {
  const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase().trim() } });
  if (!user || !user.isActive) {
    eventBus.emit(AUTH_EVENTS.LOGIN_FAILED, {
      email: data.email, reason: 'User not found', deviceInfo: data.deviceInfo || 'unknown'
    });
    throw new Error('Invalid credentials');
  }

  const isValid = await verifyPassword(data.password, user.passwordHash);
  if (!isValid) {
    eventBus.emit(AUTH_EVENTS.LOGIN_FAILED, {
      email: data.email, reason: 'wrong_password', deviceInfo: data.deviceInfo || 'unknown'
    });
    throw new Error('Invalid email or password');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  eventBus.emit(AUTH_EVENTS.USER_LOGGED_IN, {
    userId: user.id,
    deviceInfo: data.deviceInfo || 'unknown',
  });

  return { accessToken, refreshToken, user };
}

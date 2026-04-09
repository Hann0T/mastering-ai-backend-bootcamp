import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { eventBus } from '../lib/events';
import { AUTH_EVENTS } from '../events/auth.events';
import { hashPassword, verifyPassword } from '../lib/password';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from '../lib/tokens';

export async function register(data: { email: string, password: string }) {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase().trim() }
  });
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

  return { id: user.id, email: user.email, tier: user.tier };
}

export async function login(data: { email: string, password: string, deviceInfo?: string }) {
  const user = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase().trim() }
  });
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
    throw new Error('Invalid credentials');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  eventBus.emit(AUTH_EVENTS.USER_LOGGED_IN, {
    userId: user.id,
    deviceInfo: data.deviceInfo || 'unknown',
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, tier: user.tier }
  };
}

export async function refresh(rawRefreshToken: string) {
  let payload = null;
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch (err) {
    throw new Error('Invalid refresh token');
  }

  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }

  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: tokenHash },
  });

  if (!storedToken || storedToken.expiresAt < new Date()) {
    throw new Error('Refresh token expired or revoked');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
  });
  if (!user || !user.isActive) {
    throw new Error('User not found or inactive');
  }

  await prisma.refreshToken.delete({
    where: { token: tokenHash }
  });

  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);
  const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: newTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: { id: user.id, email: user.email, tier: user.tier }
  };
}

export async function logout(rawRefreshToken: string) {
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  await prisma.refreshToken.deleteMany({
    where: { token: tokenHash },
  });
}

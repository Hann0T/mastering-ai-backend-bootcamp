import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../lib/prisma';
import { ConflictError, UnauthorizedError } from '../../lib/errors';
import * as authService from '../auth.service';

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    usageLog:{
      create: vi.fn(),
    },
    conversation:{
      create: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    }
  }
}));

// not working, better to inject the event bus to the service instead of an import
vi.mock('../lib/events', () => ({
  eventBus: { emit: vi.fn(), on: vi.fn() },
}));

describe('auth.service.register', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a user with a hashed password', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (prisma.user.create as any).mockResolvedValue({
      id: 'uuid-1',
      email: 'test@example.com',
      tier: 'free',
      passwordHash: '$2b$12$...'
    });

    const result = await authService.register({
      email: 'test@example.com',
      password: 'securePass!'
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'test@example.com',
        passwordHash: expect.stringMatching(/^\$2[aby]\$/),
      }
    });

    expect(result).not.toHaveProperty('passwordHash');
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('email');
  });
});

describe('auth.service.login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns tokens for valid credentials', async () => {
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash('SecurePass!', 12);

    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'uuid-1',
      email: 'test@example.com',
      tier: 'free',
      isActive: true,
      passwordHash: hash,
    });
    (prisma.refreshToken.create as any).mockResolvedValue({});

    const result = await authService.login({
      email: 'test@example.com',
      password: 'SecurePass!'
    });

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.user.email).toBe('test@example.com');
  });

  it('throws for wrong password', async () => {
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash('SecurePass!', 12);

    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'uuid-1',
      email: 'test@example.com',
      tier: 'free',
      isActive: true,
      passwordHash: hash,
    });
    (prisma.refreshToken.create as any).mockResolvedValue({});

    await expect(
      authService.login({
        email: 'test@example.com',
        password: 'WrongPassword'
      })
    ).rejects.toThrow('Invalid credentials');
  });

  it('throws the same error for non-existent user', async() => {
    (prisma.user.findUnique as any).mockResolvedValue(null);

    await expect(
      authService.login({
        email: 'nobody@example.com',
        password: 'Whatever1',
      })
    ).rejects.toThrow('Invalid credentials');
  });
});

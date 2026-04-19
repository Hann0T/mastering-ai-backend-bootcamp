import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../services/auth.service';
import * as TokenService from '../../lib/tokens';

const prismaMock = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  role: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  usageLog: {
    create: vi.fn(),
  },
  conversation: {
    create: vi.fn(),
  },
  refreshToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  }
} as any;

const eventBusMock = {
  emit: vi.fn(),
  on: vi.fn()
} as any;

const authService = new AuthService(
  TokenService, prismaMock, eventBusMock
);

describe('auth.service.register', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a user with a hashed password', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'uuid-1',
      email: 'test@example.com',
      tier: 'free',
      passwordHash: '$2b$12$...'
    });

    const result = await authService.register({
      email: 'test@example.com',
      password: 'securePass!'
    });

    expect(prismaMock.user.create).toHaveBeenCalledWith({
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
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'uuid-1',
      email: 'test@example.com',
      tier: 'free',
      isActive: true,
      passwordHash: hash,
    });
    prismaMock.refreshToken.create.mockResolvedValue({});

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

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'uuid-1',
      email: 'test@example.com',
      tier: 'free',
      isActive: true,
      passwordHash: hash,
    });
    prismaMock.refreshToken.create.mockResolvedValue({});

    await expect(
      authService.login({
        email: 'test@example.com',
        password: 'WrongPassword'
      })
    ).rejects.toThrow('Invalid credentials');
  });

  it('throws the same error for non-existent user', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      authService.login({
        email: 'nobody@example.com',
        password: 'Whatever1',
      })
    ).rejects.toThrow('Invalid credentials');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictError, UnauthorizedError } from '../../lib/errors';
import { AuthService } from '../../services/auth.service';

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

const tokenServiceMock = {
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
} as any;

let authService: AuthService;

beforeEach(() => {
  vi.resetAllMocks();
  authService = new AuthService(
    tokenServiceMock, prismaMock, eventBusMock
  );
})

describe('auth.service.register', () => {
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
    tokenServiceMock.generateAccessToken.mockImplementation(() => 'access-token');
    tokenServiceMock.generateRefreshToken.mockImplementation(() => 'refresh-token');

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

describe('auth.service.refresh', () => {
  it('throws unathorized for invalid refresh token', async () => {
    tokenServiceMock.verifyRefreshToken.mockImplementation(() => {
      throw new Error('Test');
    });

    await expect(
      authService.refresh('invalid-token')
    ).rejects.toThrow(UnauthorizedError);
  });

  it('throws unathorized for different type of token', async () => {
    tokenServiceMock.verifyRefreshToken.mockImplementation(() => ({
      sub: 'test-uuid-1',
      type: 'not-refresh'
    }));

    await expect(
      authService.refresh('valid-token')
    ).rejects.toThrow('Invalid token type');
    await expect(
      authService.refresh('valid-token')
    ).rejects.toThrow(UnauthorizedError);
  });

  it('throws unathorized for expired token', async () => {
    tokenServiceMock.verifyRefreshToken.mockImplementation(() => ({
      sub: 'test-uuid-1',
      type: 'refresh'
    }));

    const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    prismaMock.refreshToken.findUnique.mockResolvedValue({
      expiresAt: pastDate,
    });

    await expect(
      authService.refresh('valid-token')
    ).rejects.toThrow('Refresh token expired or revoked');
    await expect(
      authService.refresh('valid-token')
    ).rejects.toThrow(UnauthorizedError);
  });

  it('throws unathorized for invalid or inactive user', async () => {
    tokenServiceMock.verifyRefreshToken.mockImplementation(() => ({
      sub: 'test-uuid-1',
      type: 'refresh'
    }));
    const futureDate = new Date(Date.now() + 60 * 60 * 1000);
    prismaMock.refreshToken.findUnique.mockResolvedValue({
      expiresAt: futureDate,
    });
    prismaMock.user.findUnique.mockResolvedValue({
      isActive: false,
    });

    await expect(
      authService.refresh('valid-token')
    ).rejects.toThrow('Invalid refresh token');
    await expect(
      authService.refresh('valid-token')
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should delete current refresh token and create a new one', async () => {
    tokenServiceMock.verifyRefreshToken.mockImplementation(() => ({
      sub: 'test-uuid-1',
      type: 'refresh'
    }));
    const futureDate = new Date(Date.now() + 60 * 60 * 1000);
    prismaMock.refreshToken.findUnique.mockResolvedValue({
      expiresAt: futureDate,
    });
    prismaMock.user.findUnique.mockImplementation((data: any) => {
      if (data?.where?.id === 'test-uuid-1') {
        return Promise.resolve({
          id: 'test-uuid-1',
          isActive: true
        });
      }

      return Promise.resolve(null);
    });
    tokenServiceMock.generateRefreshToken.mockImplementation(() => 'new-refresh-token');

    await authService.refresh('valid-token');

    expect(prismaMock.refreshToken.delete).toHaveBeenCalled();
    expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'test-uuid-1',
      }),
    });
  });

  it('should return the rotated token', async () => {
    tokenServiceMock.verifyRefreshToken.mockImplementation(() => ({
      sub: 'test-uuid-1',
      type: 'refresh'
    }));
    const futureDate = new Date(Date.now() + 60 * 60 * 1000);
    prismaMock.refreshToken.findUnique.mockResolvedValue({
      expiresAt: futureDate,
    });
    prismaMock.user.findUnique.mockImplementation((data: any) => {
      if (data?.where?.id === 'test-uuid-1') {
        return Promise.resolve({
          id: 'test-uuid-1',
          email: 'test@mail.com',
          isActive: true
        });
      }

      return Promise.resolve(null);
    });
    tokenServiceMock.generateAccessToken.mockImplementation(() => 'new-access-token');
    tokenServiceMock.generateRefreshToken.mockImplementation(() => 'new-refresh-token');

    const result = await authService.refresh('valid-token');
    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBe('new-refresh-token');
    expect(result.user.email).toBe('test@mail.com');
  });
});

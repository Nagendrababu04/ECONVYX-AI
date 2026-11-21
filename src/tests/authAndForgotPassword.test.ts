// Test Suite: Authentication, Forgot Password, Reset Password & Token Lifecycle

import { describe, it, expect, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { db } from '../../server/db/database.js';

describe('Authentication & Password Lifecycle', () => {
  const testUserEmail = `user-${Date.now()}@econvyx.ai`;
  const initialPassword = 'InitialSecurePassword123!';
  const updatedPassword = 'NewSecretPassword456!';
  let userId: string;

  beforeEach(async () => {
    // Ensure test user exists in database
    const existing = db.getUsers().find((u) => u.email === testUserEmail);
    if (!existing) {
      const passwordHash = await bcrypt.hash(initialPassword, 10);
      userId = `usr-test-${Date.now()}`;
      db.getUsers().push({
        id: userId,
        email: testUserEmail,
        fullName: 'Test Automation User',
        passwordHash,
        role: 'owner',
        createdAt: new Date().toISOString(),
      });
      db.save();
    } else {
      userId = existing.id;
    }
  });

  it('authenticates user with valid credentials', async () => {
    const user = db.getUsers().find((u) => u.email === testUserEmail);
    expect(user).toBeDefined();
    const match = await bcrypt.compare(initialPassword, user!.passwordHash!);
    expect(match).toBe(true);
  });

  it('rejects incorrect password during authentication', async () => {
    const user = db.getUsers().find((u) => u.email === testUserEmail);
    expect(user).toBeDefined();
    const match = await bcrypt.compare('WrongPassword999!', user!.passwordHash!);
    expect(match).toBe(false);
  });

  it('initiates forgot-password and generates cryptographically secure reset token', () => {
    const result = db.createPasswordResetToken(testUserEmail);
    expect(result).not.toBeNull();
    expect(result?.token).toBeDefined();
    expect(result?.token.length).toBe(64); // 32 bytes hex
    expect(result?.expiresAt).toBeGreaterThan(Date.now());
  });

  it('rejects forgot-password for non-existent email safely', () => {
    const result = db.createPasswordResetToken('nonexistent-ghost-user@nowhere.com');
    expect(result).toBeNull();
  });

  it('verifies a valid, unexpired reset token', () => {
    const tokenData = db.createPasswordResetToken(testUserEmail)!;
    const verified = db.verifyPasswordResetToken(tokenData.token);
    expect(verified).not.toBeNull();
    expect(verified?.email).toBe(testUserEmail);
    expect(verified?.used).toBe(false);
  });

  it('rejects an invalid reset token', () => {
    const verified = db.verifyPasswordResetToken('completely-fabricated-fake-token');
    expect(verified).toBeNull();
  });

  it('completes password reset and updates password hash', async () => {
    const tokenData = db.createPasswordResetToken(testUserEmail)!;

    // Perform reset
    const newHash = await bcrypt.hash(updatedPassword, 10);
    const updated = db.updateUserPassword(tokenData.userId, newHash);
    expect(updated).toBe(true);

    // Consume token
    const consumed = db.usePasswordResetToken(tokenData.token);
    expect(consumed).toBe(true);

    // Verify token can no longer be used
    const reVerification = db.verifyPasswordResetToken(tokenData.token);
    expect(reVerification).toBeNull();

    // Verify new password works
    const user = db.getUsers().find((u) => u.id === tokenData.userId);
    expect(user).toBeDefined();
    const matchesNew = await bcrypt.compare(updatedPassword, user!.passwordHash!);
    expect(matchesNew).toBe(true);

    // Verify old password no longer works
    const matchesOld = await bcrypt.compare(initialPassword, user!.passwordHash!);
    expect(matchesOld).toBe(false);
  });
});

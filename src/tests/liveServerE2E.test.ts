// End-to-End Live HTTP Integration & API Verification Suite

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'http';
import app from '../../server/index.js';

describe('Live HTTP Server & Full API Lifecycle E2E Verification', { timeout: 25000 }, () => {
  let server: Server;
  let baseUrl: string;
  let authToken: string;
  let userId: string;
  let workspaceId: string;
  const testEmail = `e2e-tester-${Date.now()}@econvyx.ai`;
  const initialPassword = 'SecurePassword123!';
  const changedPassword = 'ChangedPassword456!';
  const resetPassword = 'FinalResetPassword789!';

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr !== null) {
          baseUrl = `http://localhost:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (typeof (server as any).closeAllConnections === 'function') {
      (server as any).closeAllConnections();
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // 1. Health Endpoint
  it('GET /api/health returns operational status', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('healthy');
    expect(data.product).toBe('ECONVYX AI');
  });

  // 2. Authentication: Registration
  it('POST /api/auth/register creates a new user account', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        fullName: 'E2E Testing Architect',
        password: initialPassword,
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.token).toBeDefined();
    expect(data.user.email).toBe(testEmail.toLowerCase());
    authToken = data.token;
    userId = data.user.id;
    workspaceId = data.activeWorkspaceId || 'ws-apex-demo-001';
  });

  // 3. Authentication: Login
  it('POST /api/auth/login authenticates registered user', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: initialPassword,
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBeDefined();
    authToken = data.token;
  });

  // 4. Authentication: User Profile
  it('GET /api/auth/me returns authenticated user details', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.email).toBe(testEmail.toLowerCase());
  });

  // 5. Authentication: Change Password
  it('POST /api/auth/change-password changes current password', async () => {
    const res = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        currentPassword: initialPassword,
        newPassword: changedPassword,
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toContain('successfully');
  });

  // 6. Authentication: Forgot Password
  it('POST /api/auth/forgot-password generates secure reset token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBeDefined();
    expect(data.token).toBeDefined();

    // Verify token
    const verifyRes = await fetch(`${baseUrl}/api/auth/verify-reset-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: data.token }),
    });
    expect(verifyRes.status).toBe(200);
    const verifyData = await verifyRes.json();
    expect(verifyData.valid).toBe(true);

    // Reset password with token
    const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: data.token,
        newPassword: resetPassword,
      }),
    });
    expect(resetRes.status).toBe(200);

    // Confirm new password works
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: resetPassword,
      }),
    });
    expect(loginRes.status).toBe(200);
    const loginData = await loginRes.json();
    authToken = loginData.token;
  });

  // 7. Workspace Onboarding
  it('POST /api/workspaces/onboarding creates a clean workspace for the user', async () => {
    const res = await fetch(`${baseUrl}/api/workspaces/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'E2E Testing Workspace',
        businessType: 'manufacturing',
        industry: 'Industrial Supplies',
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.activeWorkspaceId).toBeDefined();
    workspaceId = data.activeWorkspaceId;
  });

  // 8. Notifications: Clean Slate
  it('GET /api/notifications returns 0 notifications for a fresh user', async () => {
    const res = await fetch(`${baseUrl}/api/notifications`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'x-workspace-id': workspaceId,
      },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.notifications).toHaveLength(0);
    expect(data.unreadCount).toBe(0);
    expect(data.total).toBe(0);
  });

  // 9. Workspaces & Dynamic Badge Counts
  it('GET /api/workspaces/badge-counts returns zero counts for fresh workspace', async () => {
    const res = await fetch(`${baseUrl}/api/workspaces/badge-counts`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'x-workspace-id': workspaceId,
      },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.verificationFlagsCount).toBe(0);
    expect(data.suggestedMatchesCount).toBe(0);
  });

  // 10. Document Upload & Deletion Workflow
  it('POST /api/documents/upload, GET file, and DELETE document works end-to-end', async () => {
    const formData = new FormData();
    const fakeFileContent = new Blob(['Dummy PDF file content for test invoice'], { type: 'application/pdf' });
    formData.append('file', fakeFileContent, 'test-tax-invoice-001.pdf');
    formData.append('documentType', 'tax_invoice');

    const uploadRes = await fetch(`${baseUrl}/api/documents/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'x-workspace-id': workspaceId,
      },
      body: formData,
    });

    expect(uploadRes.status).toBe(201);
    const uploadData = await uploadRes.json();
    expect(uploadData.document).toBeDefined();
    expect(uploadData.document.documentType).toBe('tax_invoice');
    const docId = uploadData.document.id;

    // View file
    const fileRes = await fetch(`${baseUrl}/api/documents/${docId}/file`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'x-workspace-id': workspaceId,
      },
    });
    expect(fileRes.status).toBe(200);

    // Confirm document
    const confirmRes = await fetch(`${baseUrl}/api/documents/${docId}/confirm`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'x-workspace-id': workspaceId,
      },
    });
    expect(confirmRes.status).toBe(200);

    // Delete document
    const deleteRes = await fetch(`${baseUrl}/api/documents/${docId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'x-workspace-id': workspaceId,
      },
    });
    expect(deleteRes.status).toBe(200);
  });

  // 10. Production Asset Serving
  it('serves fingerprinted production assets and returns 404 for missing assets', async () => {
    // Dynamically find current fingerprinted assets in dist/assets
    const fs = await import('fs');
    const path = await import('path');
    const assetFiles = fs.readdirSync(path.resolve('dist/assets'));
    const cssFile = assetFiles.find((f: string) => f.endsWith('.css')) || 'index-Bh5lhE-H.css';
    const jsFile = assetFiles.find((f: string) => f.endsWith('.js')) || 'index-Cy73-hbD.js';

    // Current CSS asset
    const cssRes = await fetch(`${baseUrl}/assets/${cssFile}`);
    expect(cssRes.status).toBe(200);
    expect(cssRes.headers.get('content-type')).toContain('text/css');

    // Current JS asset
    const jsRes = await fetch(`${baseUrl}/assets/${jsFile}`);
    expect(jsRes.status).toBe(200);
    expect(jsRes.headers.get('content-type')).toContain('javascript');

    // Missing asset returns 404
    const missingRes = await fetch(`${baseUrl}/assets/non-existent-asset-999.js`);
    expect(missingRes.status).toBe(404);

    // SPA fallback returns index.html with 200
    const spaRes = await fetch(`${baseUrl}/forgot-password`);
    expect(spaRes.status).toBe(200);
    expect(spaRes.headers.get('content-type')).toContain('text/html');
  });
});

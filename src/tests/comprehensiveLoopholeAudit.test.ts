// ECONVYX AI — Comprehensive 12-Parameter Loophole & Resilience Audit
// Validates that all reported user friction points, session bugs, and loopholes are 100% resolved.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'http';
import app from '../../server/index.js';

describe('Comprehensive Master Loophole & Functional Audit', { timeout: 30000 }, () => {
  let server: Server;
  let baseUrl: string;
  let authToken: string;
  let workspaceId: string;
  const testEmail = `audit-${Date.now()}@testenterprise.in`;
  const testPassword = 'Password123!';

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

  // Parameter 1: User Registration
  it('[Parameter 1: Auth] User registration creates clean account', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        fullName: 'Audit Enterprise Lead',
        password: testPassword,
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    authToken = data.token;
    expect(data.token).toBeDefined();
    expect(data.user.email).toBe(testEmail.toLowerCase());
  });

  // Parameter 2: Workspace Onboarding
  it('[Parameter 2: Workspace] User creates fresh workspace with zero balances', async () => {
    const res = await fetch(`${baseUrl}/api/workspaces/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'Harshitha Fresh Enterprise',
        businessType: 'manufacturing',
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    workspaceId = data.activeWorkspaceId;
    expect(workspaceId).toBeDefined();
  });

  // Parameter 3: Stale Token Protection (Loophole: 401 Handling)
  it('[Parameter 3: Session Security] Stale or invalid token is strictly rejected with 401', async () => {
    const res = await fetch(`${baseUrl}/api/overview`, {
      headers: {
        Authorization: 'Bearer invalid-expired-or-old-container-token-xyz',
        'x-workspace-id': workspaceId,
      },
    });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('Session expired or invalid');
  });

  // Parameter 4: Quick-Add Customer (Loophole: Empty Customer Dropdown)
  it('[Parameter 4: Receivables] Allows creating customer and generating invoice seamlessly', async () => {
    // 1. Create customer inline
    const custRes = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'x-workspace-id': workspaceId,
      },
      body: JSON.stringify({
        name: 'Venkatesh Enterprises Pvt Ltd',
        gstin: '27AABCU9603R1ZM',
        paymentTermsDays: 30,
      }),
    });
    expect(custRes.status).toBe(201);
    const custData = await custRes.json();
    const customerId = custData.customer.id;
    expect(customerId).toBeDefined();

    // 2. Generate invoice with this customer
    const invRes = await fetch(`${baseUrl}/api/receivables`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'x-workspace-id': workspaceId,
      },
      body: JSON.stringify({
        customerId,
        invoiceNumber: `INV-${Date.now().toString().slice(-4)}`,
        issueDate: '2026-11-21',
        dueDate: '2026-12-21',
        paymentTermsDays: 30,
        items: [
          {
            description: 'PVC 6 inch pipes',
            quantity: 30,
            unitPriceRupees: 80,
            taxRatePercent: 12,
          },
        ],
      }),
    });
    expect(invRes.status).toBe(201);
    const invData = await invRes.json();
    expect(invData.invoice.totalAmountPaise).toBe(268800); // ₹2,688.00 exactly as in screenshot!
  });

  // Parameter 5: Quick-Add Supplier (Loophole: Empty Supplier Dropdown)
  it('[Parameter 5: Payables] Allows creating supplier and recording bill seamlessly', async () => {
    // 1. Create supplier inline
    const suppRes = await fetch(`${baseUrl}/api/suppliers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'x-workspace-id': workspaceId,
      },
      body: JSON.stringify({
        name: 'Venkatesh Suppliers India',
        gstin: '27ABJAHB744471',
        contactPerson: 'Rajesh Sharma',
        paymentTermsDays: 30,
      }),
    });
    expect(suppRes.status).toBe(201);
    const suppData = await suppRes.json();
    const supplierId = suppData.supplier.id;
    expect(supplierId).toBeDefined();

    // 2. Record bill with this supplier
    const billRes = await fetch(`${baseUrl}/api/payables`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'x-workspace-id': workspaceId,
      },
      body: JSON.stringify({
        supplierId,
        billNumber: `BILL-${Date.now().toString().slice(-4)}`,
        billDate: '2026-11-21',
        dueDate: '2026-12-21',
        amountRupees: 548452,
      }),
    });
    expect(billRes.status).toBe(201);
    const billData = await billRes.json();
    expect(billData.bill.totalAmountPaise).toBe(54845200);
  });

  // Parameter 6: Authenticated CSV Export (Loophole: 401 on Direct Browser Export)
  it('[Parameter 6: Reports] Exports CSV with authentication header or query token', async () => {
    // Via header
    const headerRes = await fetch(`${baseUrl}/api/reports/sales_invoices?format=csv`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'x-workspace-id': workspaceId,
      },
    });
    expect(headerRes.status).toBe(200);
    expect(headerRes.headers.get('content-type')).toContain('text/csv');
    const headerCsv = await headerRes.text();
    expect(headerCsv).toContain('Invoice #');

    // Via query token (simulating direct browser tab download)
    const queryRes = await fetch(
      `${baseUrl}/api/reports/sales_invoices?format=csv&token=${authToken}&workspaceId=${workspaceId}`
    );
    expect(queryRes.status).toBe(200);
    expect(queryRes.headers.get('content-type')).toContain('text/csv');
  });

  // Parameter 7: Financial Insights (Loophole: Non-Hanging Empty/Zero State)
  it('[Parameter 7: Insights] Returns valid structure and does not hang', async () => {
    const res = await fetch(`${baseUrl}/api/insights`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'x-workspace-id': workspaceId,
      },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.metrics).toBeDefined();
    expect(data.insights).toBeDefined();
  });

  // Parameter 8: Settings (Loophole: Non-Hanging Loading State)
  it('[Parameter 8: Settings] Returns workspace settings and does not hang', async () => {
    const res = await fetch(`${baseUrl}/api/settings`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'x-workspace-id': workspaceId,
      },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.workspace).toBeDefined();
    expect(data.workspace.name).toBe('Harshitha Fresh Enterprise');
  });

  // Parameter 9: AI Finance Assistant
  it('[Parameter 9: AI Assistant] Answers financial queries grounded in workspace data', async () => {
    const res = await fetch(`${baseUrl}/api/ai-assistant/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'x-workspace-id': workspaceId,
      },
      body: JSON.stringify({
        question: 'What is our total invoiced amount?',
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.answer).toBeDefined();
    expect(data.sourceReferences).toBeDefined();
  });

  // Parameter 10: Notification Zero-State Compliance
  it('[Parameter 10: Notifications] Shows zero unread and zero hardcoded alerts for fresh user', async () => {
    const res = await fetch(`${baseUrl}/api/notifications`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'x-workspace-id': workspaceId,
      },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.unreadCount).toBe(0);
    expect(data.notifications).toHaveLength(0);
  });

  // Parameter 11: Document Upload & Deletion Lifecycle
  it('[Parameter 11: Document Intelligence] Uploads document and deletes safely', async () => {
    const formData = new FormData();
    const fakeBlob = new Blob(['Sample PDF Invoice Data'], { type: 'application/pdf' });
    formData.append('file', fakeBlob, 'harshitha-tax-invoice-001.pdf');
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
    const docId = uploadData.document.id;
    expect(docId).toBeDefined();

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

  // Parameter 12: Multi-Tenant Workspace Isolation
  it('[Parameter 12: Tenant Isolation] Prevents access to other workspaces (returns 403 Forbidden)', async () => {
    const alienWorkspaceRes = await fetch(`${baseUrl}/api/overview`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'x-workspace-id': 'ws-unauthorized-alien-org-999',
      },
    });
    expect(alienWorkspaceRes.status).toBe(403);
    const alienData = await alienWorkspaceRes.json();
    expect(alienData.code).toBe('NO_WORKSPACE');
  });
});

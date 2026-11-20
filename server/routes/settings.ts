// Settings & Integrations Routes

import { Router, Response } from 'express';
import { AuthenticatedRequest, tenantAuthMiddleware } from '../middleware/auth.js';
import { db } from '../db/database.js';

const router = Router();
router.use(tenantAuthMiddleware);

router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.workspaceId!;
  const workspace = db.getWorkspace(workspaceId);
  const users = db.getUsers();

  const isGeminiConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '');

  return res.json({
    workspace,
    teamMembers: [
      { id: 'usr-1', name: 'Vikram Joshi', email: 'demo@econvyx.ai', role: 'Owner', status: 'Active' },
      { id: 'usr-2', name: 'Ananya Sharma', email: 'ananya.s@apexcomponents.in', role: 'Finance Manager', status: 'Active' },
      { id: 'usr-3', name: 'Rohan Deshmukh', email: 'rohan.d@apexcomponents.in', role: 'Accountant', status: 'Active' },
    ],
    integrations: {
      geminiAi: {
        name: 'Google Gemini 1.5 Flash',
        status: isGeminiConfigured ? 'connected' : 'fallback_mode',
        description: isGeminiConfigured
          ? 'Connected to Google AI Studio. Server-side structured document intelligence active.'
          : 'Deterministic intelligent fallback engine active. Set GEMINI_API_KEY in .env for live AI extraction.',
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      },
      database: {
        name: 'Persistent Relational Engine',
        status: 'connected',
        description: 'ACID transaction manager active with atomic state persistence.',
        type: 'PostgreSQL Relational Specification',
      },
      storage: {
        name: 'Document Vault Storage',
        status: 'connected',
        description: 'Private tenant document vault with authenticated access policies.',
        maxUploadBytes: 10 * 1024 * 1024,
      },
    },
  });
});

// Update Workspace Settings & Explicit Opening Balance
router.patch('/workspace', (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.workspaceId!;
  const { openingBalancePaise, openingBalanceRupees, name, industry, gstin, pan, address, city, state, pinCode } = req.body;
  const updates: Record<string, any> = {};

  if (openingBalancePaise !== undefined) {
    updates.openingBalancePaise = Math.max(0, Math.round(Number(openingBalancePaise)));
  } else if (openingBalanceRupees !== undefined) {
    updates.openingBalancePaise = Math.max(0, Math.round(Number(openingBalanceRupees) * 100));
  }

  if (name) updates.name = name;
  if (industry) updates.industry = industry;
  if (gstin) updates.gstin = gstin;
  if (pan) updates.pan = pan;
  if (address) updates.address = address;
  if (city) updates.city = city;
  if (state) updates.state = state;
  if (pinCode) updates.pinCode = pinCode;

  const updated = db.updateWorkspace(workspaceId, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Workspace not found.' });
  }

  db.addAuditLog({
    workspaceId,
    userEmail: req.user?.email || 'user',
    action: 'WORKSPACE_SETTINGS_UPDATED',
    entityType: 'business_workspace',
    entityId: workspaceId,
    details: `Updated workspace settings. ${updates.openingBalancePaise !== undefined ? `Opening balance set to ${updates.openingBalancePaise / 100} INR.` : ''}`,
  });

  return res.json({ message: 'Workspace updated successfully.', workspace: updated });
});

// Reset Demo Data
router.post('/reset-demo', (req: AuthenticatedRequest, res: Response) => {
  db.resetDemoWorkspace();
  return res.json({ message: 'Demo workspace reset to initial verified state.' });
});

export default router;

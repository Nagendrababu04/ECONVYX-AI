// ECONVYX AI — Authentication & Tenant Isolation Middleware
// Real JWT verification, user resolution, workspace scoping

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';
import { WorkspaceRole, User } from '../types/index.js';
import { JWT_SECRET } from '../config.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
  workspaceId?: string;
  userRoleInWorkspace?: WorkspaceRole;
}

export function tenantAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // ── 1. Resolve authenticated user from JWT ──────────────────────────────
  const authHeader = req.headers.authorization;
  let resolvedUser: User | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      resolvedUser = db.getUsers().find((u) => u.id === decoded.userId);
    } catch {
      return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    }
  }

  if (!resolvedUser) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  req.user = resolvedUser;

  // ── 2. Resolve active workspace scoped to this user ─────────────────────
  const headerWorkspaceId = req.headers['x-workspace-id'] as string;
  const userWorkspaces = db.getWorkspacesByUserId(resolvedUser.id);

  const targetWorkspace = headerWorkspaceId
    ? userWorkspaces.find((w) => w.id === headerWorkspaceId || w.slug === headerWorkspaceId)
    : userWorkspaces[0];

  if (!targetWorkspace) {
    return res.status(403).json({
      error: 'No accessible business workspace found. Please complete onboarding.',
      code: 'NO_WORKSPACE',
    });
  }

  const membership = db.getWorkspaceMembers().find(
    (member) => member.workspaceId === targetWorkspace.id && member.userId === resolvedUser!.id
  );
  if (!membership) {
    return res.status(403).json({ error: 'Workspace membership is required.', code: 'FORBIDDEN' });
  }

  req.workspaceId = targetWorkspace.id;
  req.userRoleInWorkspace = membership.role;

  next();
}

export function requireRole(allowedRoles: WorkspaceRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userRoleInWorkspace || !allowedRoles.includes(req.userRoleInWorkspace)) {
      return res.status(403).json({
        error: 'Permission Denied: Your workspace role does not permit this action.',
      });
    }
    next();
  };
}

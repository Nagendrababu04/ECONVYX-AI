// Notifications API Routes
// User-level isolation, read/unread persistence, and dynamic updates

import { Router, Response } from 'express';
import { requireAuth } from './auth.js';
import { db } from '../db/database.js';
import { User } from '../types/index.js';

const router = Router();
router.use(requireAuth);

// 1. GET /api/notifications — Retrieve notifications for the authenticated user
router.get('/', (req: any, res: Response) => {
  const user = req.currentUser as User;
  const workspaceId = req.headers['x-workspace-id'] as string | undefined;

  const notifications = db.getNotifications(user.id, workspaceId);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return res.json({
    notifications,
    unreadCount,
    total: notifications.length,
  });
});

// 2. PATCH /api/notifications/:id/read — Mark a single notification as read
router.patch('/:id/read', (req: any, res: Response) => {
  const user = req.currentUser as User;
  const { id } = req.params;

  const success = db.markNotificationAsRead(id, user.id);
  if (!success) {
    return res.status(404).json({ error: 'Notification not found or access denied.' });
  }

  const notifications = db.getNotifications(user.id);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return res.json({
    message: 'Notification marked as read.',
    unreadCount,
  });
});

// 3. POST /api/notifications/mark-all-read — Mark all notifications as read
router.post('/mark-all-read', (req: any, res: Response) => {
  const user = req.currentUser as User;
  const workspaceId = req.headers['x-workspace-id'] as string | undefined;

  const updatedCount = db.markAllNotificationsAsRead(user.id, workspaceId);

  return res.json({
    message: 'All notifications marked as read.',
    updatedCount,
    unreadCount: 0,
  });
});

// 4. DELETE /api/notifications/:id — Permanently delete a notification
router.delete('/:id', (req: any, res: Response) => {
  const user = req.currentUser as User;
  const { id } = req.params;

  const success = db.deleteNotification(id, user.id);
  if (!success) {
    return res.status(404).json({ error: 'Notification not found or access denied.' });
  }

  const notifications = db.getNotifications(user.id);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return res.json({
    message: 'Notification deleted.',
    unreadCount,
    total: notifications.length,
  });
});

export default router;

// Test Suite: Notifications Module, Clean Empty States & User Isolation

import { describe, it, expect } from 'vitest';
import { db } from '../../server/db/database.js';

describe('Notifications Module & Clean Slate Behavior', () => {
  const freshUserId = `usr-fresh-${Date.now()}`;
  const otherUserId = `usr-other-${Date.now()}`;
  const testWorkspaceId = `ws-notif-${Date.now()}`;

  it('fresh user with no activity has exactly 0 notifications and 0 unread', () => {
    const notifications = db.getNotifications(freshUserId);
    expect(notifications).toHaveLength(0);
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    expect(unreadCount).toBe(0);
  });

  it('notification appears only when a genuine event occurs', () => {
    const createdNotif = db.addNotification({
      userId: freshUserId,
      workspaceId: testWorkspaceId,
      title: 'Discrepancy Flagged',
      message: 'Quantity variance of 10 units detected in Case VC-2026-901.',
      type: 'warning',
      link: '/verification',
    });

    expect(createdNotif.id).toBeDefined();
    expect(createdNotif.isRead).toBe(false);

    const userNotifications = db.getNotifications(freshUserId);
    expect(userNotifications).toHaveLength(1);
    expect(userNotifications[0].title).toBe('Discrepancy Flagged');
    expect(userNotifications[0].isRead).toBe(false);
  });

  it('strictly isolates notifications between different users', () => {
    // otherUserId should not see freshUserId's notifications
    const otherUserNotifications = db.getNotifications(otherUserId);
    expect(otherUserNotifications).toHaveLength(0);

    // Add a notification for otherUserId
    db.addNotification({
      userId: otherUserId,
      workspaceId: testWorkspaceId,
      title: 'Bank Statement Reconciled',
      message: '₹50,000 matched with invoice INV-201.',
      type: 'success',
      link: '/reconciliation',
    });

    const otherUserNotifsAfter = db.getNotifications(otherUserId);
    expect(otherUserNotifsAfter).toHaveLength(1);
    expect(otherUserNotifsAfter[0].title).toBe('Bank Statement Reconciled');

    // freshUserId should still only have their own 1 notification
    const freshUserNotifs = db.getNotifications(freshUserId);
    expect(freshUserNotifs).toHaveLength(1);
    expect(freshUserNotifs[0].title).toBe('Discrepancy Flagged');
  });

  it('marks single notification as read and persists status', () => {
    const userNotifications = db.getNotifications(freshUserId);
    const notifId = userNotifications[0].id;

    const marked = db.markNotificationAsRead(notifId, freshUserId);
    expect(marked).toBe(true);

    const updated = db.getNotifications(freshUserId);
    expect(updated[0].isRead).toBe(true);
    const unreadCount = updated.filter((n) => !n.isRead).length;
    expect(unreadCount).toBe(0);
  });

  it('marks all notifications as read for a user', () => {
    // Add two new unread notifications
    db.addNotification({
      userId: freshUserId,
      workspaceId: testWorkspaceId,
      title: 'Invoice Due Reminder',
      message: 'INV-105 is due tomorrow.',
      type: 'info',
    });
    db.addNotification({
      userId: freshUserId,
      workspaceId: testWorkspaceId,
      title: 'Credit Note Recorded',
      message: 'CN-002 applied for ₹10,000.',
      type: 'info',
    });

    let notifs = db.getNotifications(freshUserId);
    expect(notifs.filter((n) => !n.isRead).length).toBe(2);

    const updatedCount = db.markAllNotificationsAsRead(freshUserId);
    expect(updatedCount).toBe(2);

    notifs = db.getNotifications(freshUserId);
    expect(notifs.filter((n) => !n.isRead).length).toBe(0);
  });

  it('deletes a notification permanently and ensures it does not reappear', () => {
    let notifs = db.getNotifications(freshUserId);
    const initialCount = notifs.length;
    const targetId = notifs[0].id;

    const deleted = db.deleteNotification(targetId, freshUserId);
    expect(deleted).toBe(true);

    notifs = db.getNotifications(freshUserId);
    expect(notifs.length).toBe(initialCount - 1);
    expect(notifs.some((n) => n.id === targetId)).toBe(false);
  });
});

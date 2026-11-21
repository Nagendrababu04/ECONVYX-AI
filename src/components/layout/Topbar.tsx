// Top Navigation Bar Component

import React, { useState, useEffect } from 'react';
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  Building2,
  PlusCircle,
  LogOut,
  User,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Info,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { formatDate } from '../../lib/utils.js';

interface TopbarProps {
  onOpenMobileSidebar: () => void;
  onOpenCommandSearch: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  onOpenMobileSidebar,
  onOpenCommandSearch,
}) => {
  const { user, activeWorkspace, workspaces, setActiveWorkspace, logout } = useAuth();
  const navigate = useNavigate();

  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications();
      if (res) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch {
      // Quiet fail if not authenticated
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user?.id, activeWorkspace?.id]);

  const handleMarkAsRead = async (id: string, link?: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      setIsNotificationsOpen(false);
      if (link) {
        navigate(link);
      }
    } catch (err) {
      console.error('Failed to mark notification read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications read', err);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.deleteNotification(id);
      const deleted = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (deleted && !deleted.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-brand-border shadow-xs">
      {/* Left: Mobile Toggle & Quick Search */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="p-2 text-slate-600 hover:text-brand-primary-navy hover:bg-slate-100 rounded-lg lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Logo Brand Emblem */}
        <div className="lg:hidden flex items-center">
          <img src="/logo-icon.svg" alt="ECONVYX AI" className="w-7 h-7 object-contain" />
        </div>

        {/* Global Command Search Bar Trigger */}
        <button
          onClick={onOpenCommandSearch}
          className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors w-48 sm:w-72 justify-between"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">Search transactions, invoices, tools...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 rounded">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Workspace Switcher, Notifications, User Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Workspace Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen);
              setIsNotificationsOpen(false);
              setIsUserMenuOpen(false);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 text-brand-teal" />
            <span className="max-w-[120px] sm:max-w-[160px] truncate">
              {activeWorkspace?.name || 'Apex Components'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isWorkspaceMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-brand-border rounded-lg shadow-elevated py-1.5 z-50">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Switch Business Workspace
              </div>
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    setActiveWorkspace(ws.id);
                    setIsWorkspaceMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-50 ${
                    ws.id === activeWorkspace?.id ? 'bg-teal-50/60 font-semibold text-brand-teal' : 'text-slate-700'
                  }`}
                >
                  <div className="truncate">
                    <div>{ws.name}</div>
                    <div className="text-[10px] text-slate-400">{ws.businessType}</div>
                  </div>
                  {ws.isDemo && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">
                      DEMO
                    </span>
                  )}
                </button>
              ))}
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={() => {
                    setIsWorkspaceMenuOpen(false);
                    navigate('/onboarding');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-brand-teal font-medium hover:bg-slate-50"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Onboard New Business</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsWorkspaceMenuOpen(false);
              setIsUserMenuOpen(false);
            }}
            className="relative p-2 text-slate-600 hover:text-brand-primary-navy hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-brand-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-brand-border rounded-lg shadow-elevated py-2 z-50">
              <div className="flex items-center justify-between px-3 pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800">Financial Notifications</span>
                {unreadCount > 0 ? (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] font-semibold text-brand-teal hover:underline bg-teal-50 px-1.5 py-0.5 rounded transition-colors"
                  >
                    {unreadCount} Unread &bull; Mark all read
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400">0 Unread</span>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs">
                    <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div className="font-bold text-slate-700">No Notifications Yet</div>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                      You're all caught up! New notifications will appear here when available.
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkAsRead(n.id, n.link)}
                      className={`p-3 hover:bg-slate-50 cursor-pointer flex gap-2.5 items-start transition-colors ${
                        !n.isRead ? 'bg-teal-50/20' : ''
                      }`}
                    >
                      {n.type === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      ) : n.type === 'danger' ? (
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      ) : n.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`truncate text-xs ${!n.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                            {n.title}
                          </span>
                          {!n.isRead && (
                            <span className="w-1.5 h-1.5 bg-brand-teal rounded-full shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                          <span>{formatDate(n.createdAt)}</span>
                          <button
                            onClick={(e) => handleDeleteNotification(e, n.id)}
                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                            title="Delete notification"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setIsUserMenuOpen(!isUserMenuOpen);
              setIsWorkspaceMenuOpen(false);
              setIsNotificationsOpen(false);
            }}
            className="flex items-center gap-2 p-1 text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            <div className="w-7 h-7 rounded-full bg-brand-deep-navy text-white text-xs font-bold flex items-center justify-center">
              {user?.fullName?.charAt(0) || 'V'}
            </div>
            <span className="hidden md:inline-block text-xs font-semibold text-slate-800">
              {user?.fullName || 'Vikram Joshi'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white border border-brand-border rounded-lg shadow-elevated py-1.5 z-50 text-xs">
              <div className="px-3 py-2 border-b border-slate-100">
                <div className="font-semibold text-slate-800">{user?.fullName || 'Vikram Joshi'}</div>
                <div className="text-[11px] text-slate-500">{user?.email || 'demo@econvyx.ai'}</div>
                <div className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                  <Shield className="w-3 h-3" /> Owner Access
                </div>
              </div>
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  navigate('/settings');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-700 text-left"
              >
                <User className="w-3.5 h-3.5" /> Workspace Profile & Settings
              </button>
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 text-left"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

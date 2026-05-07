"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { getUnreadCount } from "@/lib/notificationsHub";

interface NotificationSetupContextValue {
  showNotifSheet: boolean;
  setShowNotifSheet: (v: boolean) => void;
  showNotifSettings: boolean;
  setShowNotifSettings: (v: boolean) => void;
  showNotificationsHub: boolean;
  setShowNotificationsHub: (v: boolean) => void;
  unreadCount: number;
  setUnreadCount: (n: number) => void;
  subscribeToPush: () => Promise<boolean>;
  unsubscribeFromPush: () => Promise<void>;
  showSwNotification: (title: string, options?: NotificationOptions) => void;
}

const NotificationSetupContext = createContext<NotificationSetupContextValue | null>(null);

export function NotificationSetupProvider({ children }: { children: ReactNode }) {
  const [showNotifSheet, setShowNotifSheet] = useState(false);
  const [showNotifSettings, setShowNotifSettings] = useState(false);
  const [showNotificationsHub, setShowNotificationsHub] = useState(false);
  const [unreadCount, setUnreadCount] = useState(() => getUnreadCount());

  const { subscribeToPush, unsubscribeFromPush, showSwNotification } = useServiceWorker();

  return (
    <NotificationSetupContext.Provider
      value={{
        showNotifSheet,
        setShowNotifSheet,
        showNotifSettings,
        setShowNotifSettings,
        showNotificationsHub,
        setShowNotificationsHub,
        unreadCount,
        setUnreadCount,
        subscribeToPush,
        unsubscribeFromPush,
        showSwNotification,
      }}
    >
      {children}
    </NotificationSetupContext.Provider>
  );
}

export function useNotificationSetupContext(): NotificationSetupContextValue {
  const ctx = useContext(NotificationSetupContext);
  if (!ctx) throw new Error("useNotificationSetupContext must be used inside NotificationSetupProvider");
  return ctx;
}

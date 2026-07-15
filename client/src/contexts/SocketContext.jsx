/* eslint-disable react-refresh/only-export-components */
// Context quan ly trang thai socket context cho ung dung.
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { notificationApi } from "../api/notificationApi";
import { getAccessToken } from "../api/tokenStore";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

function socketUrl() {
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  if (!apiUrl || apiUrl.startsWith("/")) return window.location.origin;
  return apiUrl.replace(/\/api\/?$/, "");
}

export function SocketProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [badgePulse, setBadgePulse] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !getAccessToken()) {
      setUnreadCount(0);
      return undefined;
    }

    notificationApi
      .list({ page: 1, limit: 100 })
      .then((data) => {
        const items = data?.items || [];
        setUnreadCount(items.filter((item) => !(item.readAt || item.read_at)).length);
      })
      .catch(() => {});

    const instance = io(socketUrl(), {
      auth: (callback) => callback({ token: getAccessToken() }),
      transports: ["websocket", "polling"],
    });
    instance.on("connect", () => setIsConnected(true));
    instance.on("disconnect", () => setIsConnected(false));
    instance.on("notification:new", (notification) => {
      toast(notification.title || "New notification", { description: notification.content || undefined });
      setBadgePulse(true);
      window.setTimeout(() => setBadgePulse(false), 700);
    });
    instance.on("notification:count", (count) => setUnreadCount(Number(count) || 0));
    setSocket(instance);

    return () => {
      instance.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [isAuthenticated, user?.id]);

  const value = useMemo(
    () => ({ socket, isConnected, unreadCount, setUnreadCount, badgePulse }),
    [badgePulse, isConnected, socket, unreadCount],
  );
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error("useSocket must be used inside SocketProvider");
  return context;
}

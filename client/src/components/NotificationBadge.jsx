import { useNotifications } from "../hooks/useNotifications";

export default function NotificationBadge() {
  const { unreadCount, badgePulse } = useNotifications();
  if (!unreadCount) return null;

  return (
    <span
      className={`absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white ${
        badgePulse ? "animate-ping-once" : ""
      }`}
    >
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  );
}

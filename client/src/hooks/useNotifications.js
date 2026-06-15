import { useSocket } from "../contexts/SocketContext";

export function useNotifications() {
  return useSocket();
}

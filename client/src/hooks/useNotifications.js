// Hook use notifications dung lai logic trong component.
import { useSocket } from "../contexts/SocketContext";

export function useNotifications() {
  return useSocket();
}

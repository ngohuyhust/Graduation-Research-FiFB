import { toast } from "sonner";
import { getErrorMessage } from "../utils/errors";

export function showSuccess(message) {
  toast.success(message);
}

export function showError(error) {
  toast.error(getErrorMessage(error));
}

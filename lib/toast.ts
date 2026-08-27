import { toast, type ExternalToast } from "sonner";

/**
 * The four existing helpers keep their `(message)` call signature — every
 * caller in the app uses it — and simply forward an optional sonner options
 * object when one is passed.
 */
export const notify = {
  success: (message: string, options?: ExternalToast) => toast.success(message, options),
  error: (message: string, options?: ExternalToast) => toast.error(message, options),
  warning: (message: string, options?: ExternalToast) => toast.warning(message, options),
  info: (message: string, options?: ExternalToast) => toast(message, options),
};

"use client";

import { useEffect } from "react";

import { connectSocket, disconnectSocket } from "@/lib/socket";

/**
 * Owns the Socket.IO connection lifecycle only — no context, no state. The
 * client itself is a module-level singleton (`lib/socket/client.ts`), so
 * remounts (StrictMode, Fast Refresh) and re-renders never recreate it; only
 * `.connect()` / `.disconnect()` are toggled here.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    connectSocket();
    return () => disconnectSocket();
  }, []);

  return children;
}

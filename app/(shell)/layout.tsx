import { AppSidebar } from "@/components/app-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AlertProvider } from "@/providers/alert-provider";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    // `SidebarProvider` defaults to `min-h-svh`, which grows with content
    // instead of locking to the viewport — that left `main`'s `overflow-auto`
    // with nothing to bound against, so panels like the live map just grew
    // with their own min-height instead of filling the available screen.
    <SidebarProvider className="h-svh">
      {/* Seeds the alert feed from GET /alerts and bridges live alerts to
          toasts, for every route under the shell. Renders nothing. */}
      <AlertProvider />
      <AppSidebar />
      <SidebarInset className="min-h-0">
        <DashboardHeader />
        <main className="flex min-h-0 flex-1 flex-col overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

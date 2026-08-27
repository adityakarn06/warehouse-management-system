import { AppSidebar } from "@/components/app-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="flex flex-1 flex-col overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

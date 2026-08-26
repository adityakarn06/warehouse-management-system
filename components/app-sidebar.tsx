"use client";

import * as React from "react";
import { LayoutDashboardIcon, SearchIcon, WarehouseIcon, TruckIcon } from "lucide-react";

import { NavMain, type NavMainItem } from "@/components/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const navMain: NavMainItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Track", url: "/track", icon: SearchIcon },
  { title: "Yard", url: "/yard", icon: WarehouseIcon },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <TruckIcon />
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-medium">Where&apos;s My Truck</span>
                <span className="truncate text-[0.65rem] text-sidebar-foreground/60">
                  Control Tower
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

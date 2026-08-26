import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { QueryProvider } from "@/providers/query-provider"
import { RealtimeProvider } from "@/providers/realtime-provider"

const montserrat = Montserrat({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Where's My Truck? | Control Tower",
  description: "Real-time warehouse execution and control tower dashboard.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", montserrat.variable)}
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <RealtimeProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </RealtimeProvider>
        </QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}

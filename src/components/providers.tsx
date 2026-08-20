"use client";

import { Toaster } from "sonner";
import { AppearanceProvider } from "@/components/appearance-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppearanceProvider>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: "font-sans text-sm",
          style: {
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--popover)",
            color: "var(--popover-foreground)",
            boxShadow: "0 12px 32px -8px rgb(0 0 0 / 0.14)",
          },
        }}
      />
    </AppearanceProvider>
  );
}
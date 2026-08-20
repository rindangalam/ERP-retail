"use client";

import { useActionState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/appearance-menu";
import { loginAction } from "./actions";

const EASE = [0.16, 1, 0.3, 1] as const;

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);
  const reduce = useReducedMotion();

  return (
    <div className="relative w-full max-w-xs">
      <div className="absolute -top-16 right-0">
        <ThemeToggle />
      </div>
      <motion.div
        className="mb-6"
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
      >
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand font-mono text-sm font-semibold text-brand-foreground shadow-card">
            E
          </div>
          <h1 className="font-mono text-lg font-semibold tracking-tight">ERP Retail</h1>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Sistem manajemen retail terintegrasi — inventori, penjualan, keuangan, dan payroll.
        </p>
      </motion.div>

      <motion.form
        action={formAction}
        className="space-y-3"
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08, ease: EASE }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nama@perusahaan.com"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        {state?.error ? (
          <motion.p
            role="alert"
            className="text-xs text-destructive"
            initial={reduce ? false : { opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
          >
            {state.error}
          </motion.p>
        ) : null}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Memproses..." : "Masuk"}
        </Button>
      </motion.form>

      <motion.p
        className="mt-4 text-center text-[10px] text-muted-foreground"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        Butuh akun? Hubungi admin. · <Link href="/" className="underline">Beranda</Link>
      </motion.p>
    </div>
  );
}
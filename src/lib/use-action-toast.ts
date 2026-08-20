"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function useActionToast(
  state: { ok?: boolean; message?: string } | undefined,
  successMessage?: string,
) {
  const fired = useRef(false);

  useEffect(() => {
    if (!state || fired.current) return;
    fired.current = true;
    if (state.ok) {
      toast.success(successMessage ?? "Berhasil disimpan");
    } else if (state.message) {
      toast.error(state.message);
    }
    const t = setTimeout(() => {
      fired.current = false;
    }, 500);
    return () => clearTimeout(t);
  }, [state, successMessage]);
}

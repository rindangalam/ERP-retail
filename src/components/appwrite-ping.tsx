"use client";

import { useEffect } from "react";
import { client } from "@/lib/appwrite";

export function AppwritePing() {
  useEffect(() => {
    client
      .ping()
      .then(() => {
        if (process.env.NODE_ENV === "development") {
          console.log("[appwrite] connection verified");
        }
      })
      .catch((error) => {
        console.error("[appwrite] ping failed", error);
      });
  }, []);

  return null;
}

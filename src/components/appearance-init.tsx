"use client";

import { useServerInsertedHTML } from "next/navigation";

const APPEARANCE_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem('erp-appearance')||'{}');var t=p.theme||'system';var d=t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;var el=document.documentElement;el.dataset.theme=d;el.dataset.density=p.density||'comfortable';el.dataset.accent=p.accent||'emerald';}catch(e){}})();`;

export function AppearanceInit() {
  useServerInsertedHTML(() => (
    <script dangerouslySetInnerHTML={{ __html: APPEARANCE_SCRIPT }} />
  ));
  return null;
}

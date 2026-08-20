# Ledger Minimal — Full UI/UX Redesign Plan

> **For agentic workers:** REQUIRED SUB-SKILUse subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the entire ERP Retail frontend from generic shadcn/ui "AI slop" to a Ledger Minimal aesthetic — financial precision, tabular density, near-monochrome with green/red for signed values. Fix typography throughout.

**Architecture:** Replace all design tokens in globals.css, swap fonts from Geist to IBM Plex Sans + IBM Plex Mono, redefine radius/shadow/motion, update every page component's layout and spacing to use the new system. No backend changes.

**Tech Stack:** Tailwind v4, shadcn/ui v4, IBM Plex Sans/Mono, oklch colors, Next.js 16

---

## Design Brief

```
Purpose:    ERP Retail — inventory, purchasing, sales, finance, payroll for a single-location retail business
Audience:   Business owners, warehouse staff, accountants — daily use on desktop, occasional tablet
Tone:       Ledger Minimal — financial precision, tabular density, near-monochrome, trustworthy
Reference:  Bloomberg Terminal data tables, QuickBooks ledger view, SaaS admin panels (Linear, Vercel)
Palette:    White base, three grays, near-black ink, muted green for positive, muted red for negative — no accent
Type:       IBM Plex Sans (body/headings) + IBM Plex Mono (numbers/code) — tabular figures required
Memorable:  Dense data tables with hairline rules, right-aligned numbers, zero decoration
Restraint:  No shadows (except sticky headers), no rounded corners >2px, no gradients, no icons for decoration
```

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `src/app/globals.css` | **Rewrite** | New token block: Ledger Minimal colors, type scale, space scale |
| `src/app/layout.tsx` | **Modify** | Swap Geist fonts → IBM Plex Sans + IBM Plex Mono |
| `src/components/ui/button.tsx` | **Modify** | Remove `rounded-lg`, use `rounded-sm` (2px), tighten |
| `src/components/ui/card.tsx` | **Modify** | Remove shadows, use hairline borders, flat surface |
| `src/components/ui/table.tsx` | **Modify** | Hairline row rules, dense padding, tabular nums |
| `src/components/ui/input.tsx` | **Modify** | Sharp corners, tighter padding |
| `src/components/ui/badge.tsx` | **Modify** | Flat, no rounded, monospace for codes |
| `src/components/ui/label.tsx` | **Modify** | Uppercase small label style |
| `src/components/ui/sheet.tsx` | **Review** | Minimal changes if any |
| `src/components/ui/sidebar.tsx` | **Review** | Tighten spacing, adjust active state |
| `src/components/app-shell.tsx` | **Modify** | Tighter header, cleaner sidebar |
| `src/app/(auth)/login/login-form.tsx` | **Modify** | Ledger-style login: dense, minimal |
| `src/app/(app)/dashboard/dashboard-client.tsx` | **Rewrite** | Dense KPI grid, no card shadows, tabular layout |
| `src/app/(app)/*/` (all list pages) | **Batch modify** | Consistent table styling across all 15+ pages |
| `src/app/(app)/*/` (all detail pages) | **Batch modify** | Consistent detail layout |
| `src/app/(app)/reports/*` | **Batch modify** | Financial report styling |
| `src/app/globals.css` (print) | **Modify** | Print-specific ledger styles |

---

## Task 1: Design Token Block (globals.css)

**Files:**
- Modify: `src/app/globals.css`

**What changes:**
- Replace entire color system with Ledger Minimal palette (near-monochrome + green/red)
- Add typographic scale (minor third 1.200)
- Add space scale tokens
- Set radius to 2px
- Remove all chart colors (unused in current app)
- Add semantic tokens: `--positive`, `--negative` for financial values

- [ ] **Step 1: Rewrite globals.css with new token block**

Replace the entire file with the Ledger Minimal design system:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-ibm-plex-sans);
  --font-mono: var(--font-ibm-plex-mono);
  --font-heading: var(--font-ibm-plex-sans);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-positive: var(--positive);
  --color-negative: var(--negative);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

/* ── Ledger Minimal: near-monochrome + green/red ── */
:root {
  /* Base surface — warm white */
  --background: oklch(0.995 0.002 80);
  --foreground: oklch(0.15 0.005 80);

  /* Cards, popovers — pure white */
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.15 0.005 80);

  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.15 0.005 80);

  /* Primary — near-black, used for sidebar, buttons */
  --primary: oklch(0.18 0.005 80);
  --primary-foreground: oklch(0.97 0 0);

  /* Secondary — light warm gray */
  --secondary: oklch(0.955 0.005 80);
  --secondary-foreground: oklch(0.22 0.005 80);

  /* Muted — subtle gray for backgrounds */
  --muted: oklch(0.955 0.005 80);
  --muted-foreground: oklch(0.52 0.005 80);

  /* Accent — same as secondary (no accent color in Ledger Minimal) */
  --accent: oklch(0.955 0.005 80);
  --accent-foreground: oklch(0.22 0.005 80);

  /* Destructive — muted red, not bright */
  --destructive: oklch(0.55 0.18 25);

  /* Financial semantics */
  --positive: oklch(0.45 0.14 155);
  --negative: oklch(0.55 0.18 25);

  /* Borders — very subtle hairlines */
  --border: oklch(0.90 0.005 80);
  --input: oklch(0.90 0.005 80);
  --ring: oklch(0.50 0.005 80);

  /* Charts — monochrome ramp */
  --chart-1: oklch(0.35 0.005 80);
  --chart-2: oklch(0.50 0.005 80);
  --chart-3: oklch(0.65 0.005 80);
  --chart-4: oklch(0.78 0.005 80);
  --chart-5: oklch(0.88 0.005 80);

  /* Radius — sharp, 2px max */
  --radius: 0.125rem;

  /* Sidebar */
  --sidebar: oklch(0.985 0.003 80);
  --sidebar-foreground: oklch(0.15 0.005 80);
  --sidebar-primary: oklch(0.18 0.005 80);
  --sidebar-primary-foreground: oklch(0.97 0 0);
  --sidebar-accent: oklch(0.94 0.005 80);
  --sidebar-accent-foreground: oklch(0.18 0.005 80);
  --sidebar-border: oklch(0.92 0.005 80);
  --sidebar-ring: oklch(0.50 0.005 80);
}

/* ── Dark mode ── */
.dark {
  --background: oklch(0.13 0.005 80);
  --foreground: oklch(0.93 0.005 80);
  --card: oklch(0.17 0.005 80);
  --card-foreground: oklch(0.93 0.005 80);
  --popover: oklch(0.17 0.005 80);
  --popover-foreground: oklch(0.93 0.005 80);
  --primary: oklch(0.90 0.005 80);
  --primary-foreground: oklch(0.15 0.005 80);
  --secondary: oklch(0.22 0.005 80);
  --secondary-foreground: oklch(0.90 0.005 80);
  --muted: oklch(0.22 0.005 80);
  --muted-foreground: oklch(0.65 0.005 80);
  --accent: oklch(0.22 0.005 80);
  --accent-foreground: oklch(0.90 0.005 80);
  --destructive: oklch(0.65 0.16 25);
  --positive: oklch(0.55 0.14 155);
  --negative: oklch(0.65 0.16 25);
  --border: oklch(0.28 0.005 80);
  --input: oklch(0.28 0.005 80);
  --ring: oklch(0.60 0.005 80);
  --chart-1: oklch(0.80 0.005 80);
  --chart-2: oklch(0.65 0.005 80);
  --chart-3: oklch(0.50 0.005 80);
  --chart-4: oklch(0.35 0.005 80);
  --chart-5: oklch(0.25 0.005 80);
  --sidebar: oklch(0.15 0.005 80);
  --sidebar-foreground: oklch(0.93 0.005 80);
  --sidebar-primary: oklch(0.90 0.005 80);
  --sidebar-primary-foreground: oklch(0.15 0.005 80);
  --sidebar-accent: oklch(0.22 0.005 80);
  --sidebar-accent-foreground: oklch(0.90 0.005 80);
  --sidebar-border: oklch(0.28 0.005 80);
  --sidebar-ring: oklch(0.60 0.005 80);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }
  /* Ledger: tabular figures on all numeric content */
  .numeric, td, th, [class*="font-mono"] {
    font-variant-numeric: tabular-nums lining-nums;
  }
}

@media print {
  .no-print { display: none !important; }
  body { background: white !important; font-size: 10pt; }
  table { font-size: 9pt; }
}
```

- [ ] **Step 2: Verify CSS compiles**

Run `npx tsc --noEmit` to ensure no import errors. The app should still build with the old fonts temporarily (they'll be swapped in Task 2).

---

## Task 2: Font Swap (layout.tsx)

**Files:**
- Modify: `src/app/layout.tsx`

**What changes:**
- Remove `next/font/google` Geist imports
- Add `next/font/google` IBM Plex Sans + IBM Plex Mono imports
- Apply font variables to `<html>`

- [ ] **Step 1: Replace font imports in layout.tsx**

Replace the Geist font imports with IBM Plex Sans (weights 400, 500, 600, 700) and IBM Plex Mono (weights 400, 500). Apply the CSS variables `--font-ibm-plex-sans` and `--font-ibm-plex-mono`.

- [ ] **Step 2: Update any remaining Geist references**

Grep for `geist` across the codebase and update any remaining references. The `globals.css` token block already references `--font-ibm-plex-sans` and `--font-ibm-plex-mono`.

---

## Task 3: Component Updates — Sharp & Dense

**Files:**
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/card.tsx`
- Modify: `src/components/ui/table.tsx`
- Modify: `src/components/ui/input.tsx`
- Modify: `src/components/ui/badge.tsx`
- Modify: `src/components/ui/label.tsx`

**What changes per component:**

- [ ] **Step 1: Button — remove rounded-lg, use rounded-sm**

Replace `rounded-lg` with `rounded-sm` throughout button.tsx. Keep the same variant structure but with sharp corners.

- [ ] **Step 2: Card — remove shadows, flat surface**

Remove any shadow classes. Cards use only borders for separation. Header gets a bottom border rule instead of padding separation.

- [ ] **Step 3: Table — hairline rules, dense, tabular**

Reduce cell padding. Add hairline bottom borders on rows. Ensure `font-variant-numeric: tabular-nums` on numeric cells. Right-align numbers by default.

- [ ] **Step 4: Input — sharp corners, tight**

Remove rounded-lg. Use `rounded-sm`. Tighter vertical padding.

- [ ] **Step 5: Badge — flat, monospace for codes**

Remove rounded-xl. Use `rounded-sm`. For code-style badges, use monospace font.

- [ ] **Step 6: Label — uppercase small**

Add `text-[0.65rem] uppercase tracking-widest text-muted-foreground` default style for label consistency.

---

## Task 4: App Shell & Login

**Files:**
- Modify: `src/components/app-shell.tsx`
- Modify: `src/app/(auth)/login/login-form.tsx`
- Modify: `src/app/(auth)/layout.tsx` (if exists)

**What changes:**
- AppShell: tighter header (h-10 instead of h-12), sidebar logo uses monospace, cleaner active state
- Login: centered on page, dense form, no decorative elements, ledger-style heading

- [ ] **Step 1: Tighten AppShell header and sidebar**

Reduce header height. Make the sidebar logo a simple letter in a bordered box (no rounded). Tighten menu item spacing. Make the role badge monospace.

- [ ] **Step 2: Redesign login page**

Center the login form vertically. Use a clean, dense layout with the IBM Plex heading. Minimal footer text. No decorative elements.

---

## Task 5: Dashboard Rewrite

**Files:**
- Modify: `src/app/(app)/dashboard/dashboard-client.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`

**What changes:**
- Replace card-based KPI layout with a dense grid layout
- Use a stat row (no cards, just border-separated cells)
- Right-align all numbers
- Use green/red for positive/negative values
- Recent journal entries in a tight table
- Quick links as a simple list, not button row

- [ ] **Step 1: Rewrite dashboard-client.tsx**

Replace the card grid with a Ledger Minimal dashboard:
- Top: dense stat grid (2-4 columns, border-separated, no card wrappers)
- Middle: journal entries table (tight, hairline rules)
- Bottom: quick links as inline text links, not buttons

---

## Task 6: All List Pages — Consistent Table Styling

**Files:**
- All `*-client.tsx` files in list pages:
  - `src/app/(app)/products/products-client.tsx`
  - `src/app/(app)/categories/categories-client.tsx`
  - `src/app/(app)/suppliers/suppliers-client.tsx`
  - `src/app/(app)/customers/customers-client.tsx`
  - `src/app/(app)/purchasing/purchasing-client.tsx`
  - `src/app/(app)/goods-receipts/goods-receipts-client.tsx`
  - `src/app/(app)/purchase-returns/purchase-returns-client.tsx`
  - `src/app/(app)/sales-orders/sales-orders-client.tsx`
  - `src/app/(app)/sales-invoices/sales-invoices-client.tsx`
  - `src/app/(app)/sales-returns/sales-returns-client.tsx`
  - `src/app/(app)/stock-opname/stock-opname-client.tsx`
  - `src/app/(app)/journal-entries/journal-entries-client.tsx`
  - `src/app/(app)/cash-bank/cash-bank-client.tsx`
  - `src/app/(app)/employees/employees-client.tsx`
  - `src/app/(app)/payroll/payroll-client.tsx`
  - `src/app/(app)/users/users-client.tsx`
  - `src/app/(app)/chart-of-accounts/chart-of-accounts-client.tsx`

**What changes:**
- Replace `<Card>` wrapper with plain `<div>` (no card shadow/border)
- Use consistent table styling: hairline rows, dense padding, right-aligned numbers
- Page titles: `<h1>` with IBM Plex Sans, tight tracking
- Action buttons: small, outlined, sharp corners
- Status badges: monospace, flat

- [ ] **Step 1: Create a shared table page layout pattern**

Define the pattern:
```tsx
<div className="space-y-4">
  <div className="flex items-center justify-between">
    <h1 className="text-lg font-semibold tracking-tight">Page Title</h1>
    <Button size="sm" variant="outline">Action</Button>
  </div>
  <div className="border rounded-sm overflow-hidden">
    <Table>...</Table>
  </div>
</div>
```

- [ ] **Step 2: Update each list page client component**

Apply the pattern to all list pages. Each page gets:
- Tight header with title + action button
- Dense table with hairline rules
- Consistent badge/status styling
- Right-aligned numeric columns

This is repetitive — use a batch approach. Read each file, identify the Card wrapper and table, replace with the new pattern.

---

## Task 7: Detail & Form Pages

**Files:**
- All detail page files under `src/app/(app)/`
- Form pages (new/edit variants)

**What changes:**
- Forms: tight label-input pairs, no card wrappers, sharp inputs
- Detail views: clean key-value layout, not card-based
- Section headers: uppercase small labels for sections

- [ ] **Step 1: Update form pages**

For each form (product new, supplier new, etc.):
- Remove Card wrapper around forms
- Use `<div className="space-y-4 max-w-xl">` for form layout
- Labels use the new uppercase small style
- Inputs use sharp corners
- Submit buttons: primary, sharp

- [ ] **Step 2: Update detail pages**

For each detail view:
- Clean key-value pairs with hairline separators
- Action buttons in a tight row at top-right
- Consistent back link

---

## Task 8: Financial Reports

**Files:**
- `src/app/(app)/reports/neraca/neraca-client.tsx`
- `src/app/(app)/reports/laba-rugi/laba-rugi-client.tsx`
- `src/app/(app)/reports/arus-kas/arus-kas-client.tsx`

**What changes:**
- Reports are the most "ledger-like" pages — they should feel like actual financial statements
- Dense tables with right-aligned numbers
- Section headers with hairline rules
- Green/red for positive/negative values
- Total rows bold with top border

- [ ] **Step 1: Restyle all three report pages**

Apply consistent financial report styling:
- Title: "Neraca", "Laba Rugi", "Arus Kas" — serif-style heading (or bold sans)
- Date range subtitle
- Two-column layout for balance sheet (Assets | Liabilities + Equity)
- Income statement: single column with indented sub-items
- Cash flow: three sections (operating, investing, financing)
- All numbers: tabular, right-aligned, green/red

---

## Task 9: Payroll & Employee Pages

**Files:**
- `src/app/(app)/payroll/[id]/payroll-detail-client.tsx`
- `src/app/(app)/payroll/[id]/slip/[employeeId]/payslip-client.tsx`
- `src/app/(app)/employees/[id]/employee-detail-client.tsx`

**What changes:**
- Payroll detail: tight table, posted status prominent, Post button
- Payslip: clean printable layout, ledger-style
- Employee detail: key-value layout, salary components table

- [ ] **Step 1: Restyle payroll pages**

Apply Ledger Minimal to payroll:
- Detail: dense table, total row with border
- Slip: printable, clean, numbers tabular
- Employee: key-value pairs, salary components table

---

## Task 10: Verify & Polish

- [ ] **Step 1: Visual verification at 1440px**

Take screenshot of dashboard, a list page, a detail page, a report page, and the login page. Review against the Ledger Minimal rubric.

- [ ] **Step 2: Visual verification at 390px (mobile)**

Check that tables scroll horizontally, text doesn't overflow, touch targets are adequate.

- [ ] **Step 3: Run full E2E regression**

Run `e2e-erp035.py` to ensure all pages still load and function correctly.

- [ ] **Step 4: Run tsc + eslint**

Ensure no type errors or lint warnings after all changes.

---

## Self-Review Checklist

- [ ] Every spacing value uses a consistent scale (no arbitrary px values)
- [ ] Type scale is minor third (1.200) — one ratio, no sizes chosen by eye
- [ ] Zero accent color — near-monochrome + green/red only
- [ ] Radius is 0.125rem (2px) everywhere — no mixed radii
- [ ] No shadows anywhere (except sticky table headers if needed)
- [ ] All numbers use `font-variant-numeric: tabular-nums`
- [ ] Right-aligned numeric columns in all tables
- [ ] Hairline row rules, no heavy borders
- [ ] Font is IBM Plex Sans + IBM Plex Mono — no Geist references remain
- [ ] Nothing from the Anti-Slop table appears
- [ ] Verified at 1440px and 390px
- [ ] All E2E tests pass

---

## Estimated Scope

| Task | Complexity | Est. Time |
|------|-----------|-----------|
| Task 1: Token block | Low | 15 min |
| Task 2: Font swap | Low | 10 min |
| Task 3: Component updates | Medium | 30 min |
| Task 4: App shell & login | Medium | 20 min |
| Task 5: Dashboard | Medium | 20 min |
| Task 6: All list pages | High (repetitive) | 60 min |
| Task 7: Detail & form pages | High (repetitive) | 45 min |
| Task 8: Financial reports | Medium | 20 min |
| Task 9: Payroll & employees | Medium | 15 min |
| Task 10: Verify & polish | Medium | 20 min |
| **Total** | | **~4.5 hours** |

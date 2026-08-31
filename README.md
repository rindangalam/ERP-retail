# ERP Retail

> **Enterprise Resource Planning system for single-location retail businesses**  
> Unified platform integrating Inventory, Purchasing, Sales, Finance & Accounting, and HR & Payroll modules.

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Appwrite](https://img.shields.io/badge/Appwrite-Backend-f02e65)](https://appwrite.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8)](https://tailwindcss.com/)

---

## 📋 Overview

**ERP Retail** is an internal ERP system designed for single-location retail/trading businesses. It provides a **single source of truth** for stock, transactions, and financial data — eliminating manual double-entry and ensuring real-time synchronization across all modules.

### Key Problems Solved
- **Data synchronization**: Stock, sales, purchases, and accounting are managed separately (Excel, standalone POS, manual ledgers)
- **Manual reconciliation**: Month-end closing takes days due to manual reconciliation
- **No real-time visibility**: Business owners lack real-time insight into cash flow and inventory status

### Solution
One transaction automatically updates stock and accounting journals through backend business logic — no repeated manual entry required.

---

## ✨ Features

### Core Modules

#### 🏪 **Inventory Management**
- Master product data (SKU, category, unit, min stock, pricing)
- Automatic stock movements from purchases and sales
- Stock opname (physical count) with variance detection
- Low stock alerts

#### 📦 **Purchasing**
- Supplier management
- Purchase orders (PO) with approval workflow
- Goods receipt posting (auto-updates stock)
- Purchase returns

#### 💰 **Sales**
- Customer management
- Sales orders & invoicing
- Automatic stock reduction on invoice posting
- Sales returns

#### 💵 **Finance & Accounting**
- Chart of Accounts (COA) management
- Automatic journal entries from transactions
- Cash & bank account tracking
- Real-time Balance Sheet & Profit/Loss reports

#### 👥 **HR & Payroll**
- Employee master data
- Attendance tracking
- Payroll processing
- Salary slip generation

### Cross-Cutting Features
- **Role-based access control** (Admin, Warehouse, Purchasing, Sales, Finance, HR)
- **Audit trail** for all critical transactions
- **Responsive design** for desktop and tablet use

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript |
| **UI Components** | shadcn/ui, Radix UI, Tailwind CSS 4 |
| **Backend** | Appwrite (Database, Auth, Storage) |
| **Authentication** | Appwrite Auth + JWT (jose) |
| **State Management** | React Server Components, Server Actions |
| **Icons** | Lucide React |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ and npm
- Appwrite instance (cloud or self-hosted)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/rindangalam/ERP-retail.git
   cd ERP-retail
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Appwrite**
   
   Update `appwrite.config.json` with your Appwrite project credentials:
   ```json
   {
     "endpoint": "https://your-appwrite-endpoint",
     "projectId": "your-project-id"
   }
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

---

## 📁 Project Structure

```
erp-retail/
├── src/
│   ├── app/
│   │   ├── (app)/              # Protected routes (main ERP modules)
│   │   │   ├── cash-bank/      # Cash & bank transactions
│   │   │   ├── categories/     # Product categories
│   │   │   ├── chart-of-accounts/
│   │   │   ├── customers/
│   │   │   ├── dashboard/
│   │   │   ├── employees/
│   │   │   ├── inventory/
│   │   │   ├── payroll/
│   │   │   ├── products/
│   │   │   ├── purchases/
│   │   │   ├── sales/
│   │   │   └── suppliers/
│   │   ├── auth/               # Authentication pages
│   │   └── layout.tsx
│   ├── components/             # Reusable UI components
│   └── lib/                    # Utilities & helpers
├── functions/                  # Appwrite serverless functions
├── scripts/                    # Database setup & migration scripts
├── skema-database-erp.md       # Database schema & permissions
├── prd-erp-retail.md           # Product Requirements Document
└── sprint-backlog-erp.md       # Development backlog
```

---

## 📚 Documentation

- **[PRD (Product Requirements Document)](prd-erp-retail.md)** — Functional requirements, user roles, and success metrics
- **[Database Schema](skema-database-erp.md)** — Complete database structure and permission matrix
- **[Sprint Backlog](sprint-backlog-erp.md)** — Development tasks and implementation roadmap
- **[Development Protocol](CLAUDE.md)** — Agent development workflow and conventions

---

## 🎯 Roadmap

### ✅ MVP (In Progress)
- [x] Authentication & role-based access
- [x] Master data (Products, Customers, Suppliers, Employees, COA)
- [x] Basic inventory movements
- [ ] Purchase order flow (PO → Goods Receipt → Posting)
- [ ] Sales order flow (SO → Invoice → Stock reduction)
- [ ] Automatic journal entries
- [ ] Financial reports (Balance Sheet, P&L)
- [ ] Payroll processing

### 🔮 Future Enhancements (Out of Scope for MVP)
- Multi-branch / multi-warehouse support
- Manufacturing & Bill of Materials (BOM)
- Tax integration (e-Faktur, e-Bupot)
- Native mobile app
- Multi-currency support
- Advanced BI dashboards

---

## 🧪 Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Code Conventions
- **TypeScript strict mode** enabled
- **Server Actions** for data mutations
- **Server Components** by default (Client Components only when needed)
- Follow existing patterns in `/src/app/(app)` for new modules

---

## 🔐 Security

- **Role-based permissions** enforced at database level (Appwrite permissions)
- **JWT authentication** with secure session management
- **Audit trails** for all financial and stock transactions
- **No client-side secrets** — all sensitive operations via Server Actions

---

## 🤝 Contributing

This is an internal project. For feature requests or bug reports, contact the development team.

---

## 📄 License

Proprietary - Internal use only

---

## 👤 Author

**Rindang Alam Nur Muhammad**  
GitHub: [@rindangalam](https://github.com/rindangalam)

---

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [Appwrite](https://appwrite.io/) - Backend-as-a-Service
- [shadcn/ui](https://ui.shadcn.com/) - UI component library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

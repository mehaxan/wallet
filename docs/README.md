# FinanceOS BD — Personal Financial Management System

> Accessible at: **wallet.mehaxan.com**

A full-stack, PWA-enabled personal finance management web application built for Bangladeshi users. Tracks every aspect of personal and family finances with real-time Bangladesh tax calculations, AI-powered receipt scanning, and comprehensive reporting.

---

## 📚 Documentation Index

### Architecture Decision Records (ADR)
| ID | Title | Status |
|---|---|---|
| [ADR-001](./adr/001-frontend-framework.md) | Frontend Framework | Accepted |
| [ADR-002](./adr/002-backend-framework.md) | Backend Framework | Accepted |
| [ADR-003](./adr/003-database-strategy.md) | Database Strategy | Accepted |
| [ADR-004](./adr/004-ocr-pipeline.md) | OCR Pipeline | Accepted |
| [ADR-005](./adr/005-authentication.md) | Authentication Strategy | Accepted |
| [ADR-006](./adr/006-real-time-communication.md) | Real-time Communication | Accepted |
| [ADR-007](./adr/007-deployment-strategy.md) | Deployment Strategy | Accepted |

### Architecture
- [System Overview](./architecture/system-overview.md)
- [Database Schema](./architecture/database-schema.md)
- [API Design](./architecture/api-design.md)
- [Security](./architecture/security.md)

### Feature Specifications
- [Transactions](./features/01-transactions.md)
- [Bangladesh Tax Calculator](./features/02-bangladesh-tax.md)
- [Receipt OCR](./features/03-receipt-ocr.md)
- [Family Sharing](./features/04-family-sharing.md)
- [Dashboard & Analytics](./features/05-dashboard-analytics.md)
- [Reports](./features/06-reports.md)
- [Budget & Goals](./features/07-budget-goals.md)
- [Investments & DPS](./features/08-investments-dps.md)

### Implementation Guides
- [Getting Started](./implementation/getting-started.md)
- [Development Guide](./implementation/development-guide.md)
- [Deployment](./implementation/deployment.md)
- [Maintenance](./implementation/maintenance.md)

### Technology
- [Tech Stack](./technology/tech-stack.md)
- [Cost Analysis](./technology/cost-analysis.md)

---

## 🚀 Quick Overview

| Attribute | Value |
|---|---|
| **Domain** | wallet.mehaxan.com |
| **Type** | PWA (Progressive Web App — installable via Chrome) |
| **Primary Users** | Personal + family (Bangladesh) |
| **Frontend Hosting** | Cloudflare Pages |
| **Backend Hosting** | Railway |
| **Database** | PostgreSQL on Neon |
| **Target Users** | Bangladeshi individuals and families |

## 🌟 Core Feature Set

- ✅ All transaction types: expense, income, debt, borrow, lend, transfer
- ✅ Product borrowing/lending tracker
- ✅ DPS, FDR, investment tracking
- ✅ Budget planning with alerts
- ✅ Financial goals with progress tracking
- ✅ **Bangladesh tax calculator (real-time, FY 2025-26 rules)**
- ✅ Receipt OCR (Tesseract.js + Gemini Flash — 100% free)
- ✅ Family sharing with role-based access
- ✅ Real-time dashboard and stats
- ✅ Monthly PDF reports via email
- ✅ PWA installable on mobile via Chrome

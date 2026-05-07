# Feature: Monthly Reports & Email Delivery

## Overview

Automated monthly PDF reports generated on the 1st of every month, delivered via email. Reports can also be generated on-demand for any custom date range.

---

## Auto-Generation Schedule

```
Cron: 0 6 1 * *    (Every 1st of month at 6:00 AM Bangladesh time)
      ─┬─ ─┬─ ─┬─
       │   │   └── Day 1 of every month
       │   └─────── 6 AM (UTC+6)
       └─────────── Minute 0

On trigger:
  For each user with notifications.monthlyReport = true:
    1. Generate PDF report for previous month
    2. Upload to Cloudflare R2
    3. Send email via Resend with PDF attached
    4. Save report record in database
```

---

## Report Contents

### 1. Cover Page
- Report period (e.g., "May 2026")
- User name
- Generation date

### 2. Executive Summary
```
May 2026 — Financial Summary

Total Income        ৳85,000
Total Expenses      ৳32,450
Net Savings         ৳52,550
Savings Rate        61.8%

Net Worth (end of month)    ৳24,85,000
Change from last month      +৳12,000 (+0.49%)
```

### 3. Income Breakdown
- Bar chart + table by income category
- Comparison to previous month
- YTD total

### 4. Expense Breakdown
- Donut chart: % by category
- Table: each category with amount, count, top transaction
- Day-by-day spending timeline

### 5. Top Transactions
- Top 5 income transactions
- Top 5 expense transactions

### 6. Account Balances
- All accounts with opening, closing balance, net change

### 7. Budget Performance
```
Category          Allocated   Spent    % Used   Status
─────────────────────────────────────────────────────
Food & Dining     ৳10,000    ৳8,500   85%      ⚠️ Near limit
Transport         ৳5,000     ৳2,000   40%      ✅ On track
Housing           ৳20,000    ৳20,000  100%     ✅ On budget
Shopping          ৳8,000     ৳11,200  140%     🔴 Over budget
```

### 8. Goal Progress
- Each active goal: target, current, percentage, projected completion date

### 9. Debt Summary
- Total owed to you
- Total you owe
- Any overdue debts highlighted
- Settlements made this month

### 10. Tax Year-to-Date
- YTD income breakdown by source
- Estimated tax liability to date
- Investment rebate YTD
- Months remaining in fiscal year

### 11. DPS Status
- All active DPS accounts
- Installments paid this month
- Upcoming installments

### 12. Investments
- Portfolio value at end of month
- Gain/loss this month
- Holdings summary

---

## PDF Generation

Using **React-PDF** (renders React components to PDF):

```tsx
// components/reports/MonthlyReportPDF.tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    padding: 40,
    fontSize: 10,
  },
  // ... other styles
});

export function MonthlyReportPDF({ data }: { data: ReportData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <CoverPage data={data} />
      </Page>
      <Page size="A4" style={styles.page}>
        <SummaryPage data={data.summary} />
      </Page>
      {/* ... more pages */}
    </Document>
  );
}
```

Charts in PDF are rendered as SVG (Recharts supports SVG export).

---

## Email Template

```html
Subject: Your May 2026 Financial Report — FinanceOS BD

Hi Hasan,

Your monthly financial report for May 2026 is ready.

📊 Quick Summary:
  Income:   ৳85,000
  Expense:  ৳32,450
  Saved:    ৳52,550 (61.8% savings rate) 🎉

💡 This Month's Insight:
  Your Shopping spending was 40% above budget.
  Consider adjusting next month's budget or reducing discretionary spending.

📎 Full report attached (PDF)
   Or view online: [View Report]

---
FinanceOS BD | wallet.mehaxan.com
Unsubscribe from monthly reports
```

Email sent via **Resend** (free 100/day limit — more than sufficient for personal use).

---

## On-Demand Reports

Users can generate reports for any period:

```
Reports Page → [Generate Report]

┌──────────────────────────────────────────┐
│  Generate Report                         │
│                                          │
│  Report Type                             │
│  [Monthly ▼] [Quarterly] [Annual]        │
│  [Custom Date Range]                     │
│                                          │
│  Period                                  │
│  From: [May 2026 ▼]  To: [May 2026 ▼]  │
│                                          │
│  Include                                 │
│  ☑ Personal transactions                │
│  ☑ Household shared transactions        │
│  ☑ Tax summary                          │
│  ☑ Investment portfolio                 │
│                                          │
│  [Generate Report]                       │
└──────────────────────────────────────────┘
```

Report generation is async (BullMQ job). User is notified via WebSocket when ready.

---

## Report Storage

```
Cloudflare R2:
  reports/{userId}/{year}/{month}-report.pdf
  reports/{userId}/custom/{uuid}-report.pdf

Retention: Indefinite (user can delete from reports page)
```

---

## Report History

```
Reports Page

Generated Reports:
─────────────────────────────────────────────────────
May 2026          Monthly    Generated 1 Jun    [📥 Download] [🔗 Share] [🗑️]
Apr 2026          Monthly    Generated 1 May    [📥 Download] [🔗 Share] [🗑️]
Q1 2026 (Custom)  Custom     Generated 15 Apr   [📥 Download] [🔗 Share] [🗑️]
```

**Share link:** Encrypted, time-limited (30 days), password-optional. Allows sharing financial summary with accountant, spouse, or bank without giving app access.

// Overview Dashboard API Routes

import { Router, Response } from 'express';
import { AuthenticatedRequest, tenantAuthMiddleware } from '../middleware/auth.js';
import { db } from '../db/database.js';
import { calculateAgingSummary, calculateAvailableCashBalance, formatINR } from '../services/financialEngine.js';

const router = Router();
router.use(tenantAuthMiddleware);

router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.workspaceId!;
  const workspace = db.getWorkspace(workspaceId);

  const invoices = db.getInvoices(workspaceId);
  const bills = db.getBills(workspaceId);
  const bankTransactions = db.getBankTransactions(workspaceId);
  const verificationCases = db.getVerificationCases(workspaceId);
  const customers = db.getCustomers(workspaceId);
  const auditLogs = db.getAuditLogs(workspaceId);

  const today = new Date().toISOString().split('T')[0];

  // 1. Calculate KPI totals
  let totalInvoicedPaise = 0;
  let totalReceivedPaise = 0;
  let totalOutstandingReceivablesPaise = 0;
  let totalOverdueReceivablesPaise = 0;

  for (const inv of invoices) {
    totalInvoicedPaise += inv.totalAmountPaise;
    totalReceivedPaise += inv.receivedAmountPaise;
    totalOutstandingReceivablesPaise += inv.outstandingAmountPaise;

    if (inv.outstandingAmountPaise > 0 && inv.dueDate < today && inv.status !== 'paid') {
      totalOverdueReceivablesPaise += inv.outstandingAmountPaise;
    }
  }

  // Upcoming bills / payables
  let upcomingPaymentsPaise = 0;
  for (const bill of bills) {
    if (bill.outstandingAmountPaise > 0 && bill.status !== 'paid') {
      upcomingPaymentsPaise += bill.outstandingAmountPaise;
    }
  }

  // Available cash balance strictly from verified reconciled bank records and explicit opening balance
  const explicitOpeningBalancePaise = workspace?.openingBalancePaise || 0;
  const availableCashBalancePaise = calculateAvailableCashBalance(bankTransactions, explicitOpeningBalancePaise);

  // 2. Receivables Aging
  const agingSummary = calculateAgingSummary(invoices);

  // 3. Status Distribution
  const statusCounts: Record<string, { count: number; amountPaise: number }> = {
    paid: { count: 0, amountPaise: 0 },
    partially_paid: { count: 0, amountPaise: 0 },
    open: { count: 0, amountPaise: 0 },
    overdue: { count: 0, amountPaise: 0 },
    disputed: { count: 0, amountPaise: 0 },
  };

  for (const inv of invoices) {
    const s = inv.status;
    if (statusCounts[s]) {
      statusCounts[s].count++;
      statusCounts[s].amountPaise += inv.outstandingAmountPaise;
    } else {
      statusCounts[s] = { count: 1, amountPaise: inv.outstandingAmountPaise };
    }
  }

  // 4. Calculate actual monthly inflows and outflows from verified payments & reconciled bank transactions
  const payments = db.getPayments(workspaceId);
  const now = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Trailing 6 calendar months
  const trailingMonths: Array<{ key: string; label: string }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yr = d.getFullYear();
    const mIdx = d.getMonth();
    const key = `${yr}-${String(mIdx + 1).padStart(2, '0')}`;
    trailingMonths.push({ key, label: monthNames[mIdx] });
  }

  const monthlyTotals: Record<string, { inflowPaise: number; outflowPaise: number }> = {};
  for (const tm of trailingMonths) {
    monthlyTotals[tm.key] = { inflowPaise: 0, outflowPaise: 0 };
  }

  for (const p of payments) {
    if (p.paymentType === 'incoming' && p.paymentDate) {
      const monthKey = p.paymentDate.slice(0, 7);
      if (monthlyTotals[monthKey]) {
        monthlyTotals[monthKey].inflowPaise += p.amountPaise;
      }
    } else if (p.paymentType === 'outgoing' && p.paymentDate) {
      const monthKey = p.paymentDate.slice(0, 7);
      if (monthlyTotals[monthKey]) {
        monthlyTotals[monthKey].outflowPaise += p.amountPaise;
      }
    }
  }

  // Include reconciled bank transactions not already linked to payment
  for (const txn of bankTransactions) {
    if (txn.reconciliationStatus === 'matched' && !txn.matchedPaymentId && txn.transactionDate) {
      const monthKey = txn.transactionDate.slice(0, 7);
      if (monthlyTotals[monthKey]) {
        if (txn.type === 'credit') {
          monthlyTotals[monthKey].inflowPaise += txn.amountPaise;
        } else if (txn.type === 'debit') {
          monthlyTotals[monthKey].outflowPaise += txn.amountPaise;
        }
      }
    }
  }

  const monthlyFlows = trailingMonths.map((tm) => ({
    month: tm.label,
    inflowRupees: Math.round((monthlyTotals[tm.key]?.inflowPaise || 0) / 100),
    outflowRupees: Math.round((monthlyTotals[tm.key]?.outflowPaise || 0) / 100),
    forecast: false,
  }));

  // 5. Receivables Trend based on actual outstanding metrics
  const receivablesTrend = [
    { period: 'Historical', outstandingRupees: Math.round(totalReceivedPaise / 100) },
    { period: 'Overdue', outstandingRupees: Math.round(totalOverdueReceivablesPaise / 100) },
    { period: 'Current', outstandingRupees: Math.round(totalOutstandingReceivablesPaise / 100) },
  ];

  // 6. Top Outstanding Customers
  const customerOutstandings: Record<string, { customerId: string; name: string; outstandingPaise: number; invoiceCount: number }> = {};
  for (const inv of invoices) {
    if (inv.outstandingAmountPaise > 0) {
      const cId = inv.customerId;
      const cName = inv.customer?.name || 'Customer';
      if (!customerOutstandings[cId]) {
        customerOutstandings[cId] = { customerId: cId, name: cName, outstandingPaise: 0, invoiceCount: 0 };
      }
      customerOutstandings[cId].outstandingPaise += inv.outstandingAmountPaise;
      customerOutstandings[cId].invoiceCount++;
    }
  }
  const topOutstandingCustomers = Object.values(customerOutstandings)
    .sort((a, b) => b.outstandingPaise - a.outstandingPaise)
    .slice(0, 5);

  // 7. Upcoming Receivables
  const upcomingReceivables = invoices
    .filter((inv) => inv.outstandingAmountPaise > 0 && inv.dueDate >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  // 8. Alerts & Actions
  const documentVerificationAlerts = verificationCases.filter(
    (v) => v.status === 'mismatch' || v.status === 'needs_review'
  );

  const unmatchedBankTransactions = bankTransactions.filter(
    (t) => t.reconciliationStatus === 'unmatched' || t.reconciliationStatus === 'suggested'
  );

  // AI-generated Financial Observations (dynamically generated from actual workspace data)
  const aiObservations: Array<{ type: string; title: string; description: string }> = [];

  if (totalOverdueReceivablesPaise > 0) {
    const overdueRatio = totalOutstandingReceivablesPaise > 0
      ? Math.round((totalOverdueReceivablesPaise / totalOutstandingReceivablesPaise) * 100)
      : 100;
    aiObservations.push({
      type: 'warning',
      title: 'High Overdue Concentration',
      description: `${formatINR(totalOverdueReceivablesPaise)} (${overdueRatio}% of outstanding) is currently past its payment due date. Follow-up recommended.`,
    });
  }

  const mismatchCase = verificationCases.find((v) => v.status === 'mismatch' || v.status === 'needs_review');
  if (mismatchCase) {
    aiObservations.push({
      type: 'alert',
      title: 'Document Discrepancy Flagged',
      description: `Case ${mismatchCase.caseNumber} has an unverified variance. Review recommended.`,
    });
  }

  const suggestedBankTxn = bankTransactions.find((t) => t.reconciliationStatus === 'suggested');
  if (suggestedBankTxn) {
    aiObservations.push({
      type: 'action',
      title: 'Pending Bank Match',
      description: `A ${formatINR(suggestedBankTxn.amountPaise)} ${suggestedBankTxn.type} matches invoice records with ${suggestedBankTxn.matchConfidence}% confidence. Awaiting manual confirmation.`,
    });
  }

  if (aiObservations.length === 0) {
    aiObservations.push({
      type: 'info',
      title: 'No Financial Observations Yet',
      description: 'No financial observations yet. Insights will appear when business financial data becomes available.',
    });
  }

  const invoiceCount = invoices.length;
  const collectionPercentage = totalInvoicedPaise > 0
    ? Math.round((totalReceivedPaise / totalInvoicedPaise) * 100)
    : 0;
  const openInvoicesCount = invoices.filter((i) => i.outstandingAmountPaise > 0).length;
  const overdueInvoicesCount = invoices.filter(
    (i) => i.outstandingAmountPaise > 0 && i.dueDate < today && i.status !== 'paid'
  ).length;
  const overduePercentage = totalOutstandingReceivablesPaise > 0
    ? Math.round((totalOverdueReceivablesPaise / totalOutstandingReceivablesPaise) * 100)
    : 0;
  const upcomingBillsCount = bills.filter((b) => b.outstandingAmountPaise > 0 && b.status !== 'paid').length;

  return res.json({
    workspace: {
      name: workspace?.name,
      isDemo: workspace?.isDemo,
      city: workspace?.city,
    },
    kpiCards: {
      totalInvoiced: {
        paise: totalInvoicedPaise,
        formatted: formatINR(totalInvoicedPaise),
        count: invoiceCount,
        formattedCount: `${invoiceCount} ${invoiceCount === 1 ? 'Invoice' : 'Invoices'}`,
        tooltip: 'Sum of all confirmed sales invoices issued.',
      },
      totalReceived: {
        paise: totalReceivedPaise,
        formatted: formatINR(totalReceivedPaise),
        collectionPercentage,
        formattedCollection: `${collectionPercentage}% Collected`,
        tooltip: 'Total confirmed payments allocated to invoices.',
      },
      outstandingReceivables: {
        paise: totalOutstandingReceivablesPaise,
        formatted: formatINR(totalOutstandingReceivablesPaise),
        count: openInvoicesCount,
        formattedOpen: `${openInvoicesCount} Open`,
        tooltip: 'Total Invoiced − Total Confirmed Receipts.',
      },
      overdueReceivables: {
        paise: totalOverdueReceivablesPaise,
        formatted: formatINR(totalOverdueReceivablesPaise),
        count: overdueInvoicesCount,
        overduePercentage,
        formattedPercentage: `${overduePercentage}% of Outstanding`,
        tooltip: 'Outstanding balance on invoices past their agreed due date.',
      },
      upcomingPayments: {
        paise: upcomingPaymentsPaise,
        formatted: formatINR(upcomingPaymentsPaise),
        count: upcomingBillsCount,
        formattedBillsDue: `${upcomingBillsCount} ${upcomingBillsCount === 1 ? 'Bill Due' : 'Bills Due'}`,
        tooltip: 'Approved and pending supplier bills due in the upcoming cycle.',
      },
      availableCashBalance: {
        paise: availableCashBalancePaise,
        formatted: formatINR(availableCashBalancePaise),
        tooltip: 'Verified cash balance from reconciled bank records.',
      },
    },
    charts: {
      cashInflowVsOutflow: monthlyFlows,
      receivablesTrend,
      invoiceStatusDistribution: statusCounts,
      receivablesAging: agingSummary,
    },
    topOutstandingCustomers,
    upcomingReceivables,
    documentVerificationAlerts,
    unmatchedBankTransactions,
    aiObservations,
    recentActivity: auditLogs.slice(0, 6),
  });
});

export default router;

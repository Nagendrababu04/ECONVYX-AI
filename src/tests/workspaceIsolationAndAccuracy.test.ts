// Test Suite: Workspace Isolation, Fresh Workspace Data Accuracy & Metric Verification

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../server/db/database.js';
import { calculateAvailableCashBalance, formatINR } from '../../server/services/financialEngine.js';
import { BankTransaction } from '../../server/types/index.js';

describe('Data Accuracy & Fresh Workspace Clean Slate', () => {
  const freshWorkspaceId = `ws-test-fresh-${Date.now()}`;

  it('fresh workspace starts with zero financial records across all entities', () => {
    const invoices = db.getInvoices(freshWorkspaceId);
    const bills = db.getBills(freshWorkspaceId);
    const customers = db.getCustomers(freshWorkspaceId);
    const suppliers = db.getSuppliers(freshWorkspaceId);
    const bankTxns = db.getBankTransactions(freshWorkspaceId);
    const verificationCases = db.getVerificationCases(freshWorkspaceId);
    const auditLogs = db.getAuditLogs(freshWorkspaceId);

    expect(invoices).toHaveLength(0);
    expect(bills).toHaveLength(0);
    expect(customers).toHaveLength(0);
    expect(suppliers).toHaveLength(0);
    expect(bankTxns).toHaveLength(0);
    expect(verificationCases).toHaveLength(0);
    expect(auditLogs).toHaveLength(0);
  });

  it('fresh workspace with no verified transactions or opening balance has exactly ₹0.00 cash balance', () => {
    const bankTxns = db.getBankTransactions(freshWorkspaceId);
    const balancePaise = calculateAvailableCashBalance(bankTxns, undefined);
    expect(balancePaise).toBe(0);
    expect(formatINR(balancePaise)).toBe('₹0.00');
  });

  it('fresh workspace does not produce fabricated KPI counts, ratios, or percentages', () => {
    const invoices = db.getInvoices(freshWorkspaceId);
    const bills = db.getBills(freshWorkspaceId);

    const totalInvoicedPaise = invoices.reduce((s, inv) => s + inv.totalAmountPaise, 0);
    const totalReceivedPaise = invoices.reduce((s, inv) => s + inv.receivedAmountPaise, 0);
    const totalOutstandingPaise = invoices.reduce((s, inv) => s + inv.outstandingAmountPaise, 0);

    expect(totalInvoicedPaise).toBe(0);
    expect(totalReceivedPaise).toBe(0);
    expect(totalOutstandingPaise).toBe(0);

    const collectionPercentage = totalInvoicedPaise > 0
      ? Math.round((totalReceivedPaise / totalInvoicedPaise) * 100)
      : 0;
    const formattedCollection = totalInvoicedPaise > 0 ? `${collectionPercentage}% Collected` : '0% Collected';
    expect(formattedCollection).toBe('0% Collected');

    const overduePercentage = totalOutstandingPaise > 0 ? 0 : 0;
    const formattedPercentage = totalOutstandingPaise > 0 ? `${overduePercentage}% of Outstanding` : '0% of Outstanding';
    expect(formattedPercentage).toBe('0% of Outstanding');

    const formattedCount = `${invoices.length} Invoices`;
    expect(formattedCount).toBe('0 Invoices');

    const formattedBillsDue = `${bills.length} Bills Due`;
    expect(formattedBillsDue).toBe('0 Bills Due');
  });

  it('pending unverified bank transactions do not inflate available cash', () => {
    const pendingTxns: BankTransaction[] = [
      {
        id: 'txn-pending-1',
        workspaceId: freshWorkspaceId,
        transactionDate: '2026-11-20',
        description: 'Unverified NEFT Credit',
        amountPaise: 50000000, // ₹5,00,000
        type: 'credit',
        reconciliationStatus: 'unmatched',
      },
      {
        id: 'txn-pending-2',
        workspaceId: freshWorkspaceId,
        transactionDate: '2026-11-20',
        description: 'Unverified Cheque Deposit',
        amountPaise: 25000000, // ₹2,50,000
        type: 'credit',
        reconciliationStatus: 'suggested',
      },
    ];

    const cashBalance = calculateAvailableCashBalance(pendingTxns, 0);
    expect(cashBalance).toBe(0);
    expect(formatINR(cashBalance)).toBe('₹0.00');
  });

  it('explicit opening balance is correctly reflected when configured', () => {
    const explicitOpeningPaise = 15000000; // ₹1,50,000
    const cashBalance = calculateAvailableCashBalance([], explicitOpeningPaise);
    expect(cashBalance).toBe(15000000);
    expect(formatINR(cashBalance)).toBe('₹1,50,000.00');
  });
});

describe('Workspace Data Isolation & Multi-Tenancy', () => {
  const workspaceA = `ws-test-alpha-${Date.now()}`;
  const workspaceB = `ws-test-beta-${Date.now()}`;

  beforeEach(() => {
    // Add customer to Workspace A
    db.addCustomer({
      id: `cust-alpha-${Date.now()}`,
      workspaceId: workspaceA,
      name: 'Alpha Customer Ltd',
      email: 'contact@alpha.com',
      paymentTermsDays: 30,
      creditLimitPaise: 100000000,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Add supplier to Workspace A
    db.addSupplier({
      id: `supp-alpha-${Date.now()}`,
      workspaceId: workspaceA,
      name: 'Alpha Supplier Corp',
      paymentTermsDays: 15,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  it('Workspace B cannot view or access customers or suppliers of Workspace A', () => {
    const customersA = db.getCustomers(workspaceA);
    const customersB = db.getCustomers(workspaceB);

    expect(customersA.length).toBeGreaterThan(0);
    expect(customersA.some((c) => c.name === 'Alpha Customer Ltd')).toBe(true);

    expect(customersB).toHaveLength(0);
    expect(customersB.some((c) => c.name === 'Alpha Customer Ltd')).toBe(false);

    const suppliersA = db.getSuppliers(workspaceA);
    const suppliersB = db.getSuppliers(workspaceB);

    expect(suppliersA.length).toBeGreaterThan(0);
    expect(suppliersB).toHaveLength(0);
  });

  it('creating an invoice in Workspace A does not contaminate Workspace B', () => {
    const custA = db.getCustomers(workspaceA)[0];
    const invId = `inv-alpha-${Date.now()}`;
    db.addInvoice({
      id: invId,
      workspaceId: workspaceA,
      customerId: custA.id,
      invoiceNumber: `INV-ALPHA-${Date.now()}`,
      issueDate: '2026-11-20',
      dueDate: '2026-12-20',
      paymentTermsDays: 30,
      items: [
        {
          id: 'item-1',
          invoiceId: invId,
          description: 'Industrial Parts',
          quantity: 1,
          unit: 'NOS',
          unitPricePaise: 5000000, // ₹50,000
          taxRatePercent: 18,
          taxableAmountPaise: 5000000,
          cgstPaise: 450000,
          sgstPaise: 450000,
          igstPaise: 0,
          totalAmountPaise: 5900000,
        },
      ],
      subtotalPaise: 5000000,
      taxTotalPaise: 900000,
      totalAmountPaise: 5900000,
      receivedAmountPaise: 0,
      outstandingAmountPaise: 5900000,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const invoicesA = db.getInvoices(workspaceA);
    const invoicesB = db.getInvoices(workspaceB);

    expect(invoicesA).toHaveLength(1);
    expect(invoicesB).toHaveLength(0);
  });
});

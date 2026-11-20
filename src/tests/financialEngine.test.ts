// Unit Tests for Financial Engine & Deterministic Arithmetic

import { describe, it, expect } from 'vitest';
import {
  formatINR,
  rupeesToPaise,
  paiseToRupees,
  calculateGSTLine,
  calculateInvoiceTotals,
  getAgingBucket,
  calculateAgingSummary,
  evaluateCustomerPaymentBehavior,
  calculateAvailableCashBalance,
} from '../../server/services/financialEngine.js';
import { BankTransaction } from '../../server/types/index.js';

describe('Financial Engine - Currency & Paise Arithmetic', () => {
  it('correctly converts rupees to integer paise', () => {
    expect(rupeesToPaise(125000)).toBe(12500000);
    expect(rupeesToPaise(5000.5)).toBe(500050);
    expect(rupeesToPaise(0)).toBe(0);
  });

  it('correctly formats integer paise in Indian numbering system', () => {
    expect(formatINR(12500000)).toBe('₹1,25,000.00');
    expect(formatINR(50000000)).toBe('₹5,00,000.00');
    expect(formatINR(10000000)).toBe('₹1,00,000.00');
    expect(formatINR(80000000)).toBe('₹8,00,000.00');
    expect(formatINR(67000000)).toBe('₹6,70,000.00');
    expect(formatINR(17000000)).toBe('₹1,70,000.00');
    expect(formatINR(250050)).toBe('₹2,500.50');
  });

  it('converts paise to rupees accurately', () => {
    expect(paiseToRupees(50000000)).toBe(500000);
    expect(paiseToRupees(12500000)).toBe(125000);
  });
});

describe('Financial Engine - GST & Invoice Totals', () => {
  it('calculates intra-state GST line items (split CGST & SGST)', () => {
    // 10 units at ₹1,000 (100000 paise), 18% GST
    const result = calculateGSTLine(10, 100000, 18, false);
    expect(result.taxableAmountPaise).toBe(1000000); // ₹10,000
    expect(result.cgstPaise).toBe(90000);           // ₹900
    expect(result.sgstPaise).toBe(90000);           // ₹900
    expect(result.igstPaise).toBe(0);
    expect(result.totalAmountPaise).toBe(1180000);   // ₹11,800
  });

  it('calculates inter-state GST line items (100% IGST)', () => {
    const result = calculateGSTLine(10, 100000, 18, true);
    expect(result.taxableAmountPaise).toBe(1000000);
    expect(result.cgstPaise).toBe(0);
    expect(result.sgstPaise).toBe(0);
    expect(result.igstPaise).toBe(180000);           // ₹1,800
    expect(result.totalAmountPaise).toBe(1180000);
  });

  it('calculates full invoice totals and outstanding balance', () => {
    const lines = [
      { quantity: 100, unitPricePaise: 423729, taxRatePercent: 18 },
    ];
    const totals = calculateInvoiceTotals(lines, 0, 0);
    expect(totals.totalAmountPaise).toBe(50000022); // ~₹5,00,000
    expect(totals.receivedAmountPaise).toBe(0);
    expect(totals.outstandingAmountPaise).toBe(50000022);

    // After receiving partial payment of ₹2,00,000
    const partial = calculateInvoiceTotals(lines, 0, 20000000);
    expect(partial.outstandingAmountPaise).toBe(30000022);
  });
});

describe('Financial Engine - Aging & Customer Behavior', () => {
  it('categorizes aging buckets properly', () => {
    const today = '2026-03-01';
    expect(getAgingBucket('2026-03-15', today)).toBe('current');
    expect(getAgingBucket('2026-02-15', today)).toBe('1-30');
    expect(getAgingBucket('2026-01-15', today)).toBe('31-60');
    expect(getAgingBucket('2025-12-15', today)).toBe('61-90');
    expect(getAgingBucket('2025-11-01', today)).toBe('90+');
  });

  it('aggregates aging buckets across an invoice portfolio', () => {
    const invoices = [
      { dueDate: '2026-03-15', outstandingAmountPaise: 10000000, status: 'open' },
      { dueDate: '2026-02-15', outstandingAmountPaise: 20000000, status: 'open' },
      { dueDate: '2026-01-15', outstandingAmountPaise: 50000000, status: 'overdue' },
    ];
    const summary = calculateAgingSummary(invoices, '2026-03-01');
    expect(summary.totalOutstandingPaise).toBe(80000000);
    expect(summary.currentPaise).toBe(10000000);
    expect(summary.bucket0to30Paise).toBe(20000000);
    expect(summary.bucket31to60Paise).toBe(50000000);
    expect(summary.totalOverduePaise).toBe(70000000);
  });

  it('flags insufficient history when fewer than 3 confirmed invoices exist', () => {
    const invoices = [
      {
        totalAmountPaise: 20000000,
        receivedAmountPaise: 20000000,
        outstandingAmountPaise: 0,
        dueDate: '2026-01-15',
        status: 'paid',
      },
    ];
    const behavior = evaluateCustomerPaymentBehavior(invoices);
    expect(behavior.behavior).toBe('insufficient_history');
  });
});

describe('Financial Engine - Available Cash Balance Calculation', () => {
  it('returns ₹0.00 (0 paise) for a fresh workspace with no data', () => {
    const balance = calculateAvailableCashBalance([], 0);
    expect(balance).toBe(0);
    expect(formatINR(balance)).toBe('₹0.00');
  });

  it('returns ₹0.00 (0 paise) when there is no bank connection and no opening balance', () => {
    const balance = calculateAvailableCashBalance(undefined, undefined);
    expect(balance).toBe(0);
    expect(formatINR(balance)).toBe('₹0.00');
  });

  it('does NOT increase available cash for pending bank transactions (suggested, unmatched, unverified)', () => {
    const pendingTransactions: BankTransaction[] = [
      {
        id: 'btxn-1',
        workspaceId: 'ws-test',
        transactionDate: '2026-02-18',
        description: 'NEFT CR-AXIS/928371/BHARAT ELECTRICALS/INV102 TRN',
        type: 'credit',
        amountPaise: 10000000, // ₹1,00,000
        balancePaise: 20000000, // ₹2,00,000 unverified statement balance
        reconciliationStatus: 'suggested', // Pending match, awaiting manual confirmation
        matchConfidence: 96,
        createdAt: '2026-02-18T10:30:00Z',
      },
      {
        id: 'btxn-2',
        workspaceId: 'ws-test',
        transactionDate: '2026-02-19',
        description: 'UPI CR/987654/CUSTOMER',
        type: 'credit',
        amountPaise: 5000000, // ₹50,000
        reconciliationStatus: 'unmatched', // Unmatched
        matchConfidence: 0,
        createdAt: '2026-02-19T10:30:00Z',
      },
      {
        id: 'btxn-3',
        workspaceId: 'ws-test',
        transactionDate: '2026-02-20',
        description: 'IMPS CR/123456/BUYER',
        type: 'credit',
        amountPaise: 7500000, // ₹75,000
        reconciliationStatus: 'partially_matched', // Pending partial match
        matchConfidence: 50,
        createdAt: '2026-02-20T10:30:00Z',
      },
    ];

    const balance = calculateAvailableCashBalance(pendingTransactions, 0);
    expect(balance).toBe(0);
    expect(formatINR(balance)).toBe('₹0.00');
  });

  it('calculates correct balance strictly from verified reconciled transactions', () => {
    const mixedTransactions: BankTransaction[] = [
      {
        id: 'btxn-1',
        workspaceId: 'ws-test',
        transactionDate: '2026-02-10',
        description: 'NEFT CR/PAYMENT-1',
        type: 'credit',
        amountPaise: 15000000, // ₹1,50,000
        reconciliationStatus: 'matched', // Verified reconciled
        matchConfidence: 100,
        createdAt: '2026-02-10T10:00:00Z',
      },
      {
        id: 'btxn-2',
        workspaceId: 'ws-test',
        transactionDate: '2026-02-12',
        description: 'RTGS DR/SUPPLIER-PAYMENT',
        type: 'debit',
        amountPaise: 5000000, // ₹50,000
        reconciliationStatus: 'matched', // Verified reconciled
        matchConfidence: 100,
        createdAt: '2026-02-12T10:00:00Z',
      },
      {
        id: 'btxn-3',
        workspaceId: 'ws-test',
        transactionDate: '2026-02-15',
        description: 'NEFT CR/UNVERIFIED',
        type: 'credit',
        amountPaise: 20000000, // ₹2,00,000
        reconciliationStatus: 'suggested', // Pending (MUST NOT COUNT)
        matchConfidence: 90,
        createdAt: '2026-02-15T10:00:00Z',
      },
    ];

    // Verified: +1,50,000 - 50,000 = ₹1,00,000 (10000000 paise)
    const balance = calculateAvailableCashBalance(mixedTransactions, 0);
    expect(balance).toBe(10000000);
    expect(formatINR(balance)).toBe('₹1,00,000.00');
  });

  it('correctly handles explicitly recorded opening balance without bank transactions', () => {
    const openingBalancePaise = 50000000; // ₹5,00,000
    const balance = calculateAvailableCashBalance([], openingBalancePaise);
    expect(balance).toBe(50000000);
    expect(formatINR(balance)).toBe('₹5,00,000.00');
  });

  it('correctly combines explicitly recorded opening balance with verified reconciled transactions', () => {
    const openingBalancePaise = 20000000; // ₹2,00,000
    const transactions: BankTransaction[] = [
      {
        id: 'btxn-1',
        workspaceId: 'ws-test',
        transactionDate: '2026-02-10',
        description: 'NEFT CR/INVOICE-COLLECTION',
        type: 'credit',
        amountPaise: 10000000, // ₹1,00,000
        reconciliationStatus: 'matched',
        matchConfidence: 100,
        createdAt: '2026-02-10T10:00:00Z',
      },
      {
        id: 'btxn-2',
        workspaceId: 'ws-test',
        transactionDate: '2026-02-12',
        description: 'VENDOR DEBIT',
        type: 'debit',
        amountPaise: 3000000, // ₹30,000
        reconciliationStatus: 'matched',
        matchConfidence: 100,
        createdAt: '2026-02-12T10:00:00Z',
      },
      {
        id: 'btxn-3',
        workspaceId: 'ws-test',
        transactionDate: '2026-02-14',
        description: 'PENDING SUSPENSE',
        type: 'credit',
        amountPaise: 8000000, // ₹80,000
        reconciliationStatus: 'unmatched', // MUST NOT COUNT
        matchConfidence: 0,
        createdAt: '2026-02-14T10:00:00Z',
      },
    ];

    // Opening 2,00,000 + 1,00,000 - 30,000 = ₹2,70,000 (27000000 paise)
    const balance = calculateAvailableCashBalance(transactions, openingBalancePaise);
    expect(balance).toBe(27000000);
    expect(formatINR(balance)).toBe('₹2,70,000.00');
  });

  it('anchors to statement balancePaise on verified reconciled transaction', () => {
    const transactions: BankTransaction[] = [
      {
        id: 'btxn-1',
        workspaceId: 'ws-test',
        transactionDate: '2026-02-01',
        description: 'VERIFIED STATEMENT LINE',
        type: 'credit',
        amountPaise: 10000000,
        balancePaise: 35000000, // ₹3,50,000 verified balance on statement
        reconciliationStatus: 'matched',
        matchConfidence: 100,
        createdAt: '2026-02-01T10:00:00Z',
      },
      {
        id: 'btxn-2',
        workspaceId: 'ws-test',
        transactionDate: '2026-02-05',
        description: 'SUBSEQUENT VERIFIED EXPENSE',
        type: 'debit',
        amountPaise: 5000000, // ₹50,000
        reconciliationStatus: 'matched',
        matchConfidence: 100,
        createdAt: '2026-02-05T10:00:00Z',
      },
    ];

    // 3,50,000 - 50,000 = ₹3,00,000 (30000000 paise)
    const balance = calculateAvailableCashBalance(transactions, 0);
    expect(balance).toBe(30000000);
    expect(formatINR(balance)).toBe('₹3,00,000.00');
  });
});

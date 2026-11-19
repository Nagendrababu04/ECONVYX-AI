// Shared Server TypeScript Definitions for ECONVYX AI

export type WorkspaceRole = 'owner' | 'admin' | 'finance_manager' | 'accountant' | 'viewer';

export type BusinessType = 'manufacturing' | 'wholesale' | 'distribution' | 'services' | 'other';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  avatar?: string;
  passwordHash?: string;
  microsoftId?: string;
  role: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BusinessWorkspace {
  id: string;
  name: string;
  slug: string;
  businessType: BusinessType;
  industry?: string;
  gstin?: string;
  pan?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  defaultCurrency: string; // 'INR'
  financialYearStart: string; // '04-01'
  defaultPaymentTermsDays: number;
  timezone: string; // 'Asia/Kolkata'
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  user?: User;
  createdAt: string;
}

export interface Customer {
  id: string;
  workspaceId: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  billingAddress?: string;
  shippingAddress?: string;
  paymentTermsDays: number;
  creditLimitPaise: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  workspaceId: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  address?: string;
  paymentTermsDays: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DocumentType =
  | 'purchase_order'
  | 'grn'
  | 'delivery_acknowledgement'
  | 'tax_invoice'
  | 'credit_note'
  | 'debit_note'
  | 'bank_statement'
  | 'other';

export type ExtractionStatus =
  | 'uploaded'
  | 'processing'
  | 'extracted'
  | 'needs_review'
  | 'confirmed'
  | 'failed';

export interface DocumentItem {
  id: string;
  workspaceId: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSizeBytes: number;
  documentType: DocumentType;
  extractionStatus: ExtractionStatus;
  confidenceScore: number;
  extractedData?: Record<string, any>;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus =
  | 'draft'
  | 'awaiting_confirmation'
  | 'open'
  | 'due_soon'
  | 'overdue'
  | 'partially_paid'
  | 'paid'
  | 'disputed'
  | 'cancelled';

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  description: string;
  hsnSac?: string;
  quantity: number;
  unit: string;
  unitPricePaise: number;
  taxRatePercent: number;
  taxableAmountPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalAmountPaise: number;
}

export interface Invoice {
  id: string;
  workspaceId: string;
  customerId: string;
  customer?: Customer;
  documentId?: string;
  invoiceNumber: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD
  paymentTermsDays: number;
  poReference?: string;
  subtotalPaise: number;
  taxableAmountPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  discountPaise: number;
  totalAmountPaise: number;
  receivedAmountPaise: number;
  outstandingAmountPaise: number;
  status: InvoiceStatus;
  notes?: string;
  items?: InvoiceLineItem[];
  payments?: PaymentAllocation[];
  createdAt: string;
  updatedAt: string;
}

export type BillStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'disputed';

export interface Bill {
  id: string;
  workspaceId: string;
  supplierId: string;
  supplier?: Supplier;
  documentId?: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  paymentTermsDays: number;
  poReference?: string;
  totalAmountPaise: number;
  paidAmountPaise: number;
  outstandingAmountPaise: number;
  status: BillStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  poId: string;
  description: string;
  quantity: number;
  unitPricePaise: number;
  totalAmountPaise: number;
}

export interface PurchaseOrder {
  id: string;
  workspaceId: string;
  supplierId?: string;
  poNumber: string;
  poDate: string;
  deliveryDeadline?: string;
  totalValuePaise: number;
  status: string;
  documentId?: string;
  items?: PurchaseOrderItem[];
  createdAt: string;
}

export interface GoodsReceiptNote {
  id: string;
  workspaceId: string;
  poId?: string;
  grnNumber: string;
  receivedDate: string;
  documentId?: string;
  receivedItems?: Array<{ description: string; quantity: number; rejectedQuantity?: number }>;
  createdAt: string;
}

export interface Payment {
  id: string;
  workspaceId: string;
  paymentNumber: string;
  paymentType: 'incoming' | 'outgoing';
  paymentDate: string;
  amountPaise: number;
  allocatedAmountPaise: number;
  unallocatedAmountPaise: number;
  paymentMode: 'neft' | 'rtgs' | 'imps' | 'upi' | 'cheque' | 'bank_transfer';
  referenceNumber?: string;
  customerId?: string;
  supplierId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentAllocation {
  id: string;
  workspaceId: string;
  paymentId: string;
  invoiceId?: string;
  billId?: string;
  amountPaise: number;
  createdAt: string;
}

export interface BankTransaction {
  id: string;
  workspaceId: string;
  transactionDate: string;
  description: string;
  referenceNumber?: string;
  type: 'credit' | 'debit';
  amountPaise: number;
  balancePaise?: number;
  reconciliationStatus: 'unmatched' | 'suggested' | 'partially_matched' | 'matched' | 'ignored';
  matchedInvoiceId?: string;
  matchedBillId?: string;
  matchedPaymentId?: string;
  matchConfidence: number;
  matchReason?: string;
  createdAt: string;
}

export type VerificationStatus =
  | 'verified'
  | 'minor_difference'
  | 'mismatch'
  | 'missing_document'
  | 'needs_review'
  | 'disputed';

export interface VerificationFinding {
  id: string;
  caseId: string;
  fieldName: string;
  expectedValue: string;
  actualValue: string;
  differenceValue: string;
  monetaryDifferencePaise: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface VerificationCase {
  id: string;
  workspaceId: string;
  caseNumber: string;
  invoiceId?: string;
  invoice?: Invoice;
  poId?: string;
  po?: PurchaseOrder;
  grnId?: string;
  grn?: GoodsReceiptNote;
  status: VerificationStatus;
  summary: string;
  monetaryImpactPaise: number;
  findings: VerificationFinding[];
  reviewerComments?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashFlowForecast {
  openingBalancePaise: number;
  horizonDays: number;
  expectedInflowsPaise: number;
  expectedOutflowsPaise: number;
  projectedBalancePaise: number;
  timeline: Array<{
    date: string;
    inflowPaise: number;
    outflowPaise: number;
    balancePaise: number;
    description: string;
  }>;
  assumptions: string[];
}

export interface CashFlowScenario {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  delayDays: number;
  delayedInvoiceIds: string[];
  additionalExpensePaise: number;
  forecastHorizonDays: number;
  revisedProjectedCashPaise: number;
  createdAt: string;
}

export interface Reminder {
  id: string;
  workspaceId: string;
  invoiceId: string;
  customerId: string;
  tone: 'friendly' | 'professional' | 'firm' | 'final_notice';
  subject: string;
  messageBody: string;
  status: 'draft' | 'copied' | 'sent';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  workspaceId: string;
  userId?: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  details: string;
  createdAt: string;
}

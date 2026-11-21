-- ECONVYX AI - Unified Schema for Supabase
-- Fixes UUID vs VARCHAR mismatch to support application string IDs (e.g. ws-enterprise-001, usr-123)
-- Run this in Supabase SQL Editor

-- 1. Create session table for connect-pg-simple
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- 2. Modify existing tables if they exist, or create them with VARCHAR IDs
DO $$
BEGIN
    -- Drop tables if needed to recreate with clean types, or alter column types
    -- Because no real production user data exists yet, drop and recreate cleanly:
    DROP TABLE IF EXISTS audit_logs CASCADE;
    DROP TABLE IF EXISTS reminders CASCADE;
    DROP TABLE IF EXISTS cash_flow_scenarios CASCADE;
    DROP TABLE IF EXISTS verification_cases CASCADE;
    DROP TABLE IF EXISTS bank_transactions CASCADE;
    DROP TABLE IF EXISTS payment_allocations CASCADE;
    DROP TABLE IF EXISTS payments CASCADE;
    DROP TABLE IF EXISTS goods_receipt_notes CASCADE;
    DROP TABLE IF EXISTS purchase_orders CASCADE;
    DROP TABLE IF EXISTS bills CASCADE;
    DROP TABLE IF EXISTS invoices CASCADE;
    DROP TABLE IF EXISTS documents CASCADE;
    DROP TABLE IF EXISTS suppliers CASCADE;
    DROP TABLE IF EXISTS customers CASCADE;
    DROP TABLE IF EXISTS workspace_members CASCADE;
    DROP TABLE IF EXISTS business_workspaces CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS notifications CASCADE;
    DROP TABLE IF EXISTS password_reset_tokens CASCADE;
END $$;

-- 1. Users
CREATE TABLE users (
    id VARCHAR(100) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    avatar TEXT,
    microsoft_id VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Business Workspaces
CREATE TABLE business_workspaces (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    business_type VARCHAR(100) NOT NULL,
    industry VARCHAR(100),
    gstin VARCHAR(15),
    pan VARCHAR(10),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pin_code VARCHAR(10),
    default_currency VARCHAR(10) DEFAULT 'INR',
    financial_year_start VARCHAR(10) DEFAULT '04-01',
    default_payment_terms_days INT DEFAULT 30,
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    is_demo BOOLEAN DEFAULT FALSE,
    opening_balance_paise BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Workspace Members
CREATE TABLE workspace_members (
    id VARCHAR(100) PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    user_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Customers
CREATE TABLE customers (
    id VARCHAR(100) PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    gstin VARCHAR(15),
    billing_address TEXT,
    shipping_address TEXT,
    payment_terms_days INT DEFAULT 30,
    credit_limit_paise BIGINT DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Suppliers
CREATE TABLE suppliers (
    id VARCHAR(100) PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    gstin VARCHAR(15),
    address TEXT,
    payment_terms_days INT DEFAULT 30,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Documents
CREATE TABLE documents (
    id VARCHAR(100) PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    extraction_status VARCHAR(50) DEFAULT 'uploaded',
    confidence_score DECIMAL(5, 2) DEFAULT 0.00,
    extracted_data JSONB,
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Invoices
CREATE TABLE invoices (
    id VARCHAR(100) PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    customer_id VARCHAR(100) NOT NULL,
    document_id VARCHAR(100),
    invoice_number VARCHAR(100) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    payment_terms_days INT DEFAULT 30,
    po_reference VARCHAR(100),
    items JSONB DEFAULT '[]'::jsonb,
    subtotal_paise BIGINT NOT NULL DEFAULT 0,
    taxable_amount_paise BIGINT NOT NULL DEFAULT 0,
    cgst_paise BIGINT NOT NULL DEFAULT 0,
    sgst_paise BIGINT NOT NULL DEFAULT 0,
    igst_paise BIGINT NOT NULL DEFAULT 0,
    discount_paise BIGINT NOT NULL DEFAULT 0,
    total_amount_paise BIGINT NOT NULL DEFAULT 0,
    received_amount_paise BIGINT NOT NULL DEFAULT 0,
    outstanding_amount_paise BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    notes TEXT,
    customer JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Bills
CREATE TABLE bills (
    id VARCHAR(100) PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    supplier_id VARCHAR(100) NOT NULL,
    document_id VARCHAR(100),
    bill_number VARCHAR(100) NOT NULL,
    bill_date DATE NOT NULL,
    due_date DATE NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal_paise BIGINT NOT NULL DEFAULT 0,
    taxable_amount_paise BIGINT NOT NULL DEFAULT 0,
    cgst_paise BIGINT NOT NULL DEFAULT 0,
    sgst_paise BIGINT NOT NULL DEFAULT 0,
    igst_paise BIGINT NOT NULL DEFAULT 0,
    total_amount_paise BIGINT NOT NULL DEFAULT 0,
    paid_amount_paise BIGINT NOT NULL DEFAULT 0,
    outstanding_amount_paise BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    notes TEXT,
    supplier JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Purchase Orders
CREATE TABLE purchase_orders (
    id VARCHAR(100) PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    po_number VARCHAR(100) NOT NULL,
    supplier_id VARCHAR(100) NOT NULL,
    document_id VARCHAR(100),
    issue_date DATE NOT NULL,
    expected_delivery_date DATE,
    items JSONB DEFAULT '[]'::jsonb,
    total_amount_paise BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'issued',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Goods Receipt Notes
CREATE TABLE goods_receipt_notes (
    id VARCHAR(100) PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    grn_number VARCHAR(100) NOT NULL,
    po_id VARCHAR(100),
    supplier_id VARCHAR(100) NOT NULL,
    document_id VARCHAR(100),
    received_date DATE NOT NULL,
    received_items JSONB DEFAULT '[]'::jsonb,
    items JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'accepted',
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Payments
CREATE TABLE payments (
    id VARCHAR(100) PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    payment_number VARCHAR(100) NOT NULL,
    payment_type VARCHAR(50) NOT NULL,
    payment_date DATE NOT NULL,
    amount_paise BIGINT NOT NULL,
    allocated_amount_paise BIGINT DEFAULT 0,
    unallocated_amount_paise BIGINT DEFAULT 0,
    payment_mode VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    customer_id VARCHAR(100),
    supplier_id VARCHAR(100),
    bank_transaction_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Payment Allocations
CREATE TABLE payment_allocations (
    id VARCHAR(100) PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    payment_id VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    invoice_id VARCHAR(100),
    bill_id VARCHAR(100),
    amount_paise BIGINT NOT NULL,
    allocated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Bank Transactions
CREATE TABLE bank_transactions (
    id VARCHAR(100) PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    bank_account_id VARCHAR(100),
    transaction_date DATE NOT NULL,
    value_date DATE,
    description TEXT NOT NULL,
    reference_number VARCHAR(100),
    debit_paise BIGINT DEFAULT 0,
    credit_paise BIGINT DEFAULT 0,
    running_balance_paise BIGINT DEFAULT 0,
    category VARCHAR(100),
    reconciliation_status VARCHAR(50) DEFAULT 'unreconciled',
    matched_payment_id VARCHAR(100),
    confidence_score DECIMAL(5, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Verification Cases
CREATE TABLE verification_cases (
    id VARCHAR(100) PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    case_number VARCHAR(100) NOT NULL,
    invoice_id VARCHAR(100),
    po_id VARCHAR(100),
    grn_id VARCHAR(100),
    case_type VARCHAR(50) NOT NULL,
    overall_status VARCHAR(50) DEFAULT 'pending',
    confidence_score DECIMAL(5, 2) DEFAULT 0.00,
    findings JSONB DEFAULT '[]'::jsonb,
    items JSONB DEFAULT '[]'::jsonb,
    resolution_notes TEXT,
    resolved_by VARCHAR(100),
    resolved_at TIMESTAMPTZ,
    invoice JSONB,
    po JSONB,
    grn JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Cash Flow Scenarios
CREATE TABLE cash_flow_scenarios (
    id VARCHAR(100) PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    baseline_days INT DEFAULT 30,
    assumptions JSONB DEFAULT '{}'::jsonb,
    projected_balance_paise BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Reminders
CREATE TABLE reminders (
    id VARCHAR(100) PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    customer_id VARCHAR(100),
    invoice_id VARCHAR(100),
    due_date DATE,
    amount_paise BIGINT DEFAULT 0,
    reminder_level VARCHAR(50) DEFAULT 'friendly',
    delivery_channel VARCHAR(50) DEFAULT 'email',
    status VARCHAR(50) DEFAULT 'scheduled',
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    escalation_tier INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Audit Logs
CREATE TABLE audit_logs (
    id VARCHAR(100) PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100),
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Notifications
CREATE TABLE notifications (
    id VARCHAR(100) PRIMARY KEY,
    workspace_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Password Reset Tokens
CREATE TABLE password_reset_tokens (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable Row Level Security so the service role and server can seamlessly read/write
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE business_workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE bills DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations DISABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE verification_cases DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow_scenarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens DISABLE ROW LEVEL SECURITY;

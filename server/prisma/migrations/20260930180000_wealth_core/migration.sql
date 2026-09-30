-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('UZCARD', 'HUMO', 'CASH', 'DEPOSIT');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "DebtType" AS ENUM ('OWES_ME', 'I_OWE');

-- CreateEnum
CREATE TYPE "DebtStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('NORMAL', 'WARNING', 'EXCEEDED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DEBT', 'BUDGET', 'INSIGHT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('ANDROID', 'IOS', 'WEB');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "wealth_users" (
    "id" UUID NOT NULL,
    "phone" VARCHAR(32),
    "fullName" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254),
    "password_hash" VARCHAR(255),
    "avatar_url" VARCHAR(2048),
    "currency" CHAR(3) NOT NULL DEFAULT 'UZS',
    "language" VARCHAR(10) NOT NULL DEFAULT 'uz',
    "phone_verified_at" TIMESTAMPTZ(6),
    "email_verified_at" TIMESTAMPTZ(6),
    "pin_enabled" BOOLEAN NOT NULL DEFAULT false,
    "biometric_enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wealth_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wealth_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_hash" CHAR(64) NOT NULL,
    "device_name" VARCHAR(120),
    "device_id" VARCHAR(200),
    "ip_address" INET,
    "user_agent" VARCHAR(500),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wealth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wealth_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "AccountType" NOT NULL,
    "mask" VARCHAR(32),
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'UZS',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wealth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wealth_categories" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "type" "CategoryType" NOT NULL,
    "icon" VARCHAR(80),
    "color" VARCHAR(16),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wealth_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wealth_transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "to_account_id" UUID,
    "category_id" UUID,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'UZS',
    "description" VARCHAR(500) NOT NULL DEFAULT '',
    "transaction_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receipt_url" VARCHAR(2048),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wealth_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wealth_ledger_entries" (
    "id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wealth_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wealth_debts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "person_name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(32),
    "relationship" VARCHAR(80),
    "type" "DebtType" NOT NULL,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "paid_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "remaining_amount" DECIMAL(18,2) NOT NULL,
    "due_date" DATE,
    "status" "DebtStatus" NOT NULL DEFAULT 'PENDING',
    "notes" VARCHAR(2000),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wealth_debts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wealth_debt_payments" (
    "id" UUID NOT NULL,
    "debt_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "payment_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" VARCHAR(500),
    "transaction_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wealth_debt_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wealth_budgets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "total_limit" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wealth_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wealth_budget_categories" (
    "id" UUID NOT NULL,
    "budget_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "limit" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "wealth_budget_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wealth_notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "message" VARCHAR(2000) NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "deep_link" VARCHAR(500),
    "idempotency_key" VARCHAR(200),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wealth_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wealth_devices" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_id" VARCHAR(200) NOT NULL,
    "fcm_token" VARCHAR(4096) NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wealth_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wealth_plans" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "maxAccounts" INTEGER,
    "advanced_insights" BOOLEAN NOT NULL DEFAULT false,
    "pdf_export" BOOLEAN NOT NULL DEFAULT false,
    "xlsx_export" BOOLEAN NOT NULL DEFAULT false,
    "recurring_transactions" BOOLEAN NOT NULL DEFAULT false,
    "debt_collaboration" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "wealth_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wealth_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "starts_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wealth_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wealth_recurring_transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "category_id" UUID,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'UZS',
    "description" VARCHAR(500) NOT NULL DEFAULT '',
    "frequency" "RecurrenceFrequency" NOT NULL,
    "next_run_at" TIMESTAMPTZ(6) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wealth_recurring_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wealth_attachments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "storage_key" VARCHAR(1024) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wealth_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wealth_audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entity" VARCHAR(100) NOT NULL,
    "entity_id" VARCHAR(100),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wealth_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wealth_users_phone_key" ON "wealth_users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "wealth_users_email_key" ON "wealth_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "wealth_sessions_refresh_token_hash_key" ON "wealth_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "wealth_sessions_user_id_revoked_at_expires_at_idx" ON "wealth_sessions"("user_id", "revoked_at", "expires_at");

-- CreateIndex
CREATE INDEX "wealth_accounts_user_id_created_at_idx" ON "wealth_accounts"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "wealth_categories_type_is_system_idx" ON "wealth_categories"("type", "is_system");

-- CreateIndex
CREATE UNIQUE INDEX "wealth_categories_user_id_type_name_key" ON "wealth_categories"("user_id", "type", "name");

-- CreateIndex
CREATE INDEX "wealth_transactions_user_id_transaction_date_idx" ON "wealth_transactions"("user_id", "transaction_date" DESC);

-- CreateIndex
CREATE INDEX "wealth_transactions_user_id_type_transaction_date_idx" ON "wealth_transactions"("user_id", "type", "transaction_date");

-- CreateIndex
CREATE INDEX "wealth_transactions_account_id_transaction_date_idx" ON "wealth_transactions"("account_id", "transaction_date");

-- CreateIndex
CREATE INDEX "wealth_transactions_category_id_transaction_date_idx" ON "wealth_transactions"("category_id", "transaction_date");

-- CreateIndex
CREATE INDEX "wealth_ledger_entries_account_id_created_at_idx" ON "wealth_ledger_entries"("account_id", "created_at");

-- CreateIndex
CREATE INDEX "wealth_ledger_entries_transaction_id_idx" ON "wealth_ledger_entries"("transaction_id");

-- CreateIndex
CREATE INDEX "wealth_debts_user_id_due_date_status_idx" ON "wealth_debts"("user_id", "due_date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "wealth_debt_payments_transaction_id_key" ON "wealth_debt_payments"("transaction_id");

-- CreateIndex
CREATE INDEX "wealth_debt_payments_user_id_payment_date_idx" ON "wealth_debt_payments"("user_id", "payment_date");

-- CreateIndex
CREATE INDEX "wealth_debt_payments_debt_id_payment_date_idx" ON "wealth_debt_payments"("debt_id", "payment_date");

-- CreateIndex
CREATE INDEX "wealth_budgets_user_id_year_month_idx" ON "wealth_budgets"("user_id", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "wealth_budgets_user_id_year_month_key" ON "wealth_budgets"("user_id", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "wealth_budget_categories_budget_id_category_id_key" ON "wealth_budget_categories"("budget_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "wealth_notifications_idempotency_key_key" ON "wealth_notifications"("idempotency_key");

-- CreateIndex
CREATE INDEX "wealth_notifications_user_id_is_read_created_at_idx" ON "wealth_notifications"("user_id", "is_read", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "wealth_devices_fcm_token_key" ON "wealth_devices"("fcm_token");

-- CreateIndex
CREATE UNIQUE INDEX "wealth_devices_user_id_device_id_key" ON "wealth_devices"("user_id", "device_id");

-- CreateIndex
CREATE UNIQUE INDEX "wealth_plans_code_key" ON "wealth_plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "wealth_subscriptions_user_id_key" ON "wealth_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "wealth_recurring_transactions_is_active_next_run_at_idx" ON "wealth_recurring_transactions"("is_active", "next_run_at");

-- CreateIndex
CREATE UNIQUE INDEX "wealth_attachments_storage_key_key" ON "wealth_attachments"("storage_key");

-- CreateIndex
CREATE INDEX "wealth_attachments_user_id_transaction_id_idx" ON "wealth_attachments"("user_id", "transaction_id");

-- CreateIndex
CREATE INDEX "wealth_audit_logs_user_id_created_at_idx" ON "wealth_audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "wealth_audit_logs_entity_entity_id_idx" ON "wealth_audit_logs"("entity", "entity_id");

-- AddForeignKey
ALTER TABLE "wealth_sessions" ADD CONSTRAINT "wealth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "wealth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wealth_accounts" ADD CONSTRAINT "wealth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "wealth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wealth_categories" ADD CONSTRAINT "wealth_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "wealth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wealth_transactions" ADD CONSTRAINT "wealth_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "wealth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wealth_transactions" ADD CONSTRAINT "wealth_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "wealth_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wealth_transactions" ADD CONSTRAINT "wealth_transactions_to_account_id_fkey" FOREIGN KEY ("to_account_id") REFERENCES "wealth_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wealth_transactions" ADD CONSTRAINT "wealth_transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "wealth_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wealth_ledger_entries" ADD CONSTRAINT "wealth_ledger_entries_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "wealth_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wealth_ledger_entries" ADD CONSTRAINT "wealth_ledger_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "wealth_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wealth_debts" ADD CONSTRAINT "wealth_debts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "wealth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wealth_debt_payments" ADD CONSTRAINT "wealth_debt_payments_debt_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "wealth_debts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wealth_debt_payments" ADD CONSTRAINT "wealth_debt_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "wealth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wealth_debt_payments" ADD CONSTRAINT "wealth_debt_payments_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "wealth_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wealth_debt_payments" ADD CONSTRAINT "wealth_debt_payments_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "wealth_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wealth_budgets" ADD CONSTRAINT "wealth_budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "wealth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wealth_budget_categories" ADD CONSTRAINT "wealth_budget_categories_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "wealth_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wealth_budget_categories" ADD CONSTRAINT "wealth_budget_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "wealth_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wealth_notifications" ADD CONSTRAINT "wealth_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "wealth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wealth_devices" ADD CONSTRAINT "wealth_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "wealth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wealth_subscriptions" ADD CONSTRAINT "wealth_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "wealth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wealth_subscriptions" ADD CONSTRAINT "wealth_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "wealth_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wealth_recurring_transactions" ADD CONSTRAINT "wealth_recurring_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "wealth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wealth_recurring_transactions" ADD CONSTRAINT "wealth_recurring_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "wealth_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wealth_recurring_transactions" ADD CONSTRAINT "wealth_recurring_transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "wealth_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wealth_attachments" ADD CONSTRAINT "wealth_attachments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "wealth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wealth_attachments" ADD CONSTRAINT "wealth_attachments_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "wealth_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wealth_audit_logs" ADD CONSTRAINT "wealth_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "wealth_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Search indexes for case-insensitive substring filters.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "wealth_transactions_description_trgm_idx" ON "wealth_transactions" USING GIN ("description" gin_trgm_ops) WHERE "deleted_at" IS NULL;
CREATE INDEX "wealth_categories_name_trgm_idx" ON "wealth_categories" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "wealth_accounts_name_trgm_idx" ON "wealth_accounts" USING GIN ("name" gin_trgm_ops);

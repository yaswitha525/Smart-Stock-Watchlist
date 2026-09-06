-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlists" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocks" (
    "id" UUID NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "exchange" VARCHAR(20) NOT NULL DEFAULT 'NSE',
    "name" VARCHAR(255) NOT NULL,
    "sector" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_items" (
    "id" UUID NOT NULL,
    "watchlist_id" UUID NOT NULL,
    "stock_id" UUID NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_watchlist_visits" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "watchlist_id" UUID NOT NULL,
    "last_visited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_watchlist_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_snapshots" (
    "id" UUID NOT NULL,
    "stock_id" UUID NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "volume" BIGINT NOT NULL,
    "change_percent" DOUBLE PRECISION NOT NULL,
    "data_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "watchlists_user_id_idx" ON "watchlists"("user_id");

-- CreateIndex
CREATE INDEX "stocks_symbol_idx" ON "stocks"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "stocks_symbol_exchange_key" ON "stocks"("symbol", "exchange");

-- CreateIndex
CREATE INDEX "watchlist_items_watchlist_id_idx" ON "watchlist_items"("watchlist_id");

-- CreateIndex
CREATE INDEX "watchlist_items_stock_id_idx" ON "watchlist_items"("stock_id");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_items_watchlist_id_stock_id_key" ON "watchlist_items"("watchlist_id", "stock_id");

-- CreateIndex
CREATE INDEX "user_watchlist_visits_user_id_idx" ON "user_watchlist_visits"("user_id");

-- CreateIndex
CREATE INDEX "user_watchlist_visits_watchlist_id_idx" ON "user_watchlist_visits"("watchlist_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_watchlist_visits_user_id_watchlist_id_key" ON "user_watchlist_visits"("user_id", "watchlist_id");

-- CreateIndex
CREATE INDEX "stock_snapshots_stock_id_recorded_at_idx" ON "stock_snapshots"("stock_id", "recorded_at");

-- CreateIndex
CREATE INDEX "stock_snapshots_stock_id_data_timestamp_idx" ON "stock_snapshots"("stock_id", "data_timestamp");

-- AddForeignKey
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_watchlist_id_fkey" FOREIGN KEY ("watchlist_id") REFERENCES "watchlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_watchlist_visits" ADD CONSTRAINT "user_watchlist_visits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_watchlist_visits" ADD CONSTRAINT "user_watchlist_visits_watchlist_id_fkey" FOREIGN KEY ("watchlist_id") REFERENCES "watchlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_snapshots" ADD CONSTRAINT "stock_snapshots_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

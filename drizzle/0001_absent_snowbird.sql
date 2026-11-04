CREATE TABLE "user_hidden_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"category_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "category_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "icon" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "to_wallet_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "to_amount_minor" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "transfer_fee_minor" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "opening_balance_minor" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "account_number_last_4" text;--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user_hidden_categories" ADD CONSTRAINT "user_hidden_categories_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_hidden_categories" ADD CONSTRAINT "user_hidden_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_to_wallet_id_wallets_id_fk" FOREIGN KEY ("to_wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Ensure any transactions without an account are assigned to a valid account or a default Cash account
DO $$
DECLARE
  u RECORD;
  default_wal_id text;
BEGIN
  FOR u IN SELECT id FROM "user" LOOP
    SELECT id INTO default_wal_id FROM wallets WHERE user_id = u.id AND is_archived = false ORDER BY is_default DESC, sort_order ASC, created_at ASC LIMIT 1;
    IF default_wal_id IS NULL THEN
      default_wal_id := 'wal-' || substr(md5(random()::text), 1, 12);
      INSERT INTO wallets (id, user_id, name, type, currency, opening_balance_minor, is_default, is_archived, sort_order, created_at, updated_at)
      VALUES (default_wal_id, u.id, 'Cash', 'cash', 'USD', 0, true, false, 0, now(), now());
    END IF;
    UPDATE transactions SET wallet_id = default_wal_id WHERE user_id = u.id AND wallet_id IS NULL;
  END LOOP;
END $$;

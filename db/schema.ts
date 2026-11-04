import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  customType,
  jsonb,
} from "drizzle-orm/pg-core";

// Bytea column definition for PostgreSQL
export const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
  toDriver(value: Buffer): Buffer {
    return value;
  },
  fromDriver(value: unknown): Buffer {
    if (Buffer.isBuffer(value)) {
      return value;
    }
    return Buffer.from(value as string, "binary");
  },
});

// ==========================================
// AUTH TABLES (Better Auth compatible)
// ==========================================

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  currency: text("currency").notNull().default("USD"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ==========================================
// TRANSACTIONS & WALLETS / ACCOUNTS (Phase 2 & 7)
// ==========================================

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: text("kind").notNull(), // 'income' | 'expense'
  icon: text("icon"), // preset icon identifier e.g. 'cart', 'food', 'salary'
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userHiddenCategories = pgTable("user_hidden_categories", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const wallets = pgTable("wallets", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'bank' | 'cash' | 'mobile_wallet' | 'card' | 'other'
  currency: text("currency").notNull().default("USD"),
  openingBalanceMinor: integer("opening_balance_minor").notNull().default(0),
  isDefault: boolean("is_default").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  accountNumberLast4: text("account_number_last_4"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const receipts = pgTable("receipts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  data: bytea("data").notNull(),
  mimeType: text("mime_type").notNull(),
  filename: text("filename").notNull(),
  fileSize: integer("file_size").notNull(),
  parsedJson: text("parsed_json"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'income' | 'expense' | 'transfer'
  amountMinor: integer("amount_minor").notNull(),
  currency: text("currency").notNull().default("USD"),
  categoryId: text("category_id").references(() => categories.id), // Nullable for transfers
  walletId: text("wallet_id")
    .notNull()
    .references(() => wallets.id), // From account
  toWalletId: text("to_wallet_id").references(() => wallets.id), // Destination account for transfers
  toAmountMinor: integer("to_amount_minor"), // Destination amount if currencies differ
  transferFeeMinor: integer("transfer_fee_minor").default(0),
  merchant: text("merchant").notNull(),
  note: text("note"),
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
  source: text("source").notNull().default("manual"), // 'manual' | 'receipt'
  receiptId: text("receipt_id").references(() => receipts.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ==========================================
// QR VAULT (Phase 4)
// ==========================================

export const qrCodes = pgTable("qr_codes", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  note: text("note"),
  category: text("category").notNull().default("payment"), // 'payment' | 'person' | 'business'
  decodedText: text("decoded_text"),
  imageData: bytea("image_data"),
  mimeType: text("mime_type"),
  isPinned: boolean("is_pinned").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ==========================================
// INVESTMENTS (Phase 5)
// ==========================================

export const investments = pgTable("investments", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'stock' | 'gold' | 'property' | 'business' | 'other'
  name: text("name").notNull(),
  quantity: text("quantity").notNull(),
  unit: text("unit"),
  purchasePriceMinor: integer("purchase_price_minor").notNull(),
  purchaseDate: timestamp("purchase_date").notNull(),
  currentValueMinor: integer("current_value_minor").notNull(),
  currency: text("currency").notNull().default("USD"),
  notes: text("notes"),
  extraFields: jsonb("extra_fields"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const investmentEvents = pgTable("investment_events", {
  id: text("id").primaryKey(),
  investmentId: text("investment_id")
    .notNull()
    .references(() => investments.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(), // 'buy' | 'sell' | 'dividend' | 'valuation_update'
  amountMinor: integer("amount_minor"),
  quantity: text("quantity"),
  note: text("note"),
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
});

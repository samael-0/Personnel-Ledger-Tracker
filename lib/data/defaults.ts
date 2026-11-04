export const DEFAULT_CATEGORIES = [
  // Income
  { id: "cat-sal", name: "Salary & Wages", kind: "income" as const, icon: "salary" },
  { id: "cat-fre", name: "Freelance & Consulting", kind: "income" as const, icon: "freelance" },
  { id: "cat-div", name: "Investments & Dividends", kind: "income" as const, icon: "investment" },
  { id: "cat-inc-oth", name: "Other Income", kind: "income" as const, icon: "other" },

  // Expense
  { id: "cat-foo", name: "Food & Dining", kind: "expense" as const, icon: "food" },
  { id: "cat-gro", name: "Groceries", kind: "expense" as const, icon: "groceries" },
  { id: "cat-hou", name: "Housing & Rent", kind: "expense" as const, icon: "home" },
  { id: "cat-tra", name: "Transportation & Fuel", kind: "expense" as const, icon: "transport" },
  { id: "cat-uti", name: "Utilities & Bills", kind: "expense" as const, icon: "bills" },
  { id: "cat-ent", name: "Entertainment & Leisure", kind: "expense" as const, icon: "entertainment" },
  { id: "cat-hea", name: "Healthcare & Medical", kind: "expense" as const, icon: "health" },
  { id: "cat-sho", name: "Shopping & Supplies", kind: "expense" as const, icon: "shopping" },
  { id: "cat-exp-oth", name: "Other Expense", kind: "expense" as const, icon: "other" },
];

export const DEFAULT_WALLETS = [
  { name: "Cash", type: "cash" as const, isDefault: true, currency: "USD" },
  { name: "Main Bank Account", type: "bank" as const, isDefault: false, currency: "USD" },
  { name: "Mobile Wallet", type: "mobile_wallet" as const, isDefault: false, currency: "USD" },
];

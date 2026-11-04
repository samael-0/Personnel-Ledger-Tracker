export const DEFAULT_CATEGORIES = [
  // Income
  { id: "cat-sal", name: "Salary & Wages", kind: "income" as const },
  { id: "cat-fre", name: "Freelance & Consulting", kind: "income" as const },
  { id: "cat-div", name: "Investments & Dividends", kind: "income" as const },
  { id: "cat-inc-oth", name: "Other Income", kind: "income" as const },

  // Expense
  { id: "cat-foo", name: "Food & Dining", kind: "expense" as const },
  { id: "cat-gro", name: "Groceries", kind: "expense" as const },
  { id: "cat-hou", name: "Housing & Rent", kind: "expense" as const },
  { id: "cat-tra", name: "Transportation & Fuel", kind: "expense" as const },
  { id: "cat-uti", name: "Utilities & Bills", kind: "expense" as const },
  { id: "cat-ent", name: "Entertainment & Leisure", kind: "expense" as const },
  { id: "cat-hea", name: "Healthcare & Medical", kind: "expense" as const },
  { id: "cat-sho", name: "Shopping & Supplies", kind: "expense" as const },
  { id: "cat-exp-oth", name: "Other Expense", kind: "expense" as const },
];

export const DEFAULT_WALLETS = [
  { name: "Cash", type: "cash" as const },
  { name: "Main Bank Account", type: "bank" as const },
  { name: "Mobile Wallet", type: "mobile_wallet" as const },
];


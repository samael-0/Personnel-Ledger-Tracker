export interface CategoryIconPreset {
  id: string;
  label: string;
  symbol: string;
}

export const CATEGORY_ICON_PRESETS: CategoryIconPreset[] = [
  { id: "food", label: "Dining & Food", symbol: "🍔" },
  { id: "groceries", label: "Groceries", symbol: "🛒" },
  { id: "coffee", label: "Coffee & Drinks", symbol: "☕" },
  { id: "transport", label: "Transportation", symbol: "🚗" },
  { id: "home", label: "Housing & Rent", symbol: "🏠" },
  { id: "bills", label: "Bills & Utilities", symbol: "⚡" },
  { id: "entertainment", label: "Entertainment", symbol: "🎬" },
  { id: "health", label: "Healthcare & Gym", symbol: "💊" },
  { id: "shopping", label: "Shopping", symbol: "🛍️" },
  { id: "travel", label: "Travel & Vacation", symbol: "✈️" },
  { id: "education", label: "Education & Books", symbol: "📚" },
  { id: "gift", label: "Gifts & Donations", symbol: "🎁" },
  { id: "salary", label: "Salary & Wage", symbol: "💼" },
  { id: "investment", label: "Investment Return", symbol: "📈" },
  { id: "freelance", label: "Side Gig & Client", symbol: "💻" },
  { id: "other", label: "General & Other", symbol: "🏷️" },
];

export function getCategoryIconSymbol(iconId?: string | null): string {
  if (!iconId) return "🏷️";
  const found = CATEGORY_ICON_PRESETS.find((p) => p.id === iconId);
  return found ? found.symbol : "🏷️";
}


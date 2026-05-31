import { AppData, Transaction, Bill, Budget } from "./types";

const STORAGE_KEY = "spendwise_data";

const defaultData: AppData = {
  transactions: [],
  bills: [],
  budgets: [],
};

export function loadData(): AppData {
  if (typeof window === "undefined") return defaultData;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData;
    return { ...defaultData, ...JSON.parse(raw) };
  } catch {
    return defaultData;
  }
}

export function saveData(data: AppData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function formatAmount(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getCategoryClass(cat: string): string {
  const map: Record<string, string> = {
    "Food & Dining": "cat-food",
    "Transport": "cat-transport",
    "Shopping": "cat-shopping",
    "Bills & Utilities": "cat-bills",
    "Health": "cat-health",
    "Entertainment": "cat-entertainment",
    "Credit Card": "cat-credit-card",
    "Loan": "cat-loan",
    "Other": "cat-other",
  };
  return map[cat] ?? "cat-other";
}

export function getCategoryEmoji(cat: string): string {
  const map: Record<string, string> = {
    "Food & Dining": "🍜",
    "Transport": "🚌",
    "Shopping": "🛍️",
    "Bills & Utilities": "💡",
    "Health": "💊",
    "Entertainment": "🎮",
    "Credit Card": "💳",
    "Loan": "🏦",
    "Other": "📌",
  };
  return map[cat] ?? "📌";
}

export function groupTransactionsByDate(transactions: Transaction[]) {
  const groups: Record<string, Transaction[]> = {};
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  for (const t of sorted) {
    const day = t.date.slice(0, 10);
    if (!groups[day]) groups[day] = [];
    groups[day].push(t);
  }
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

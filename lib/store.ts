import { AppData, Transaction, Bill, Budget, Category } from "./types";
import { createClient } from "./supabase";

const defaultData: AppData = {
  transactions: [],
  bills: [],
  budgets: [],
};

function mapTransaction(row: any): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: parseFloat(row.amount),
    category: row.category as Category,
    description: row.description,
    date: row.date,
    note: row.note || undefined,
  };
}

function mapBill(row: any): Bill {
  return {
    id: row.id,
    name: row.name,
    amount: parseFloat(row.amount),
    dueDay: row.due_day,
    category: row.category as Bill["category"],
    isPaid: row.is_paid,
    paidMonth: row.paid_month || undefined,
    month: row.bill_month || undefined,
    duration: row.duration || undefined,
    color: row.color,
    note: row.note || undefined,
  };
}

function mapBudget(row: any): Budget {
  return {
    category: row.category as Category,
    limit: parseFloat(row.limit_amount),
  };
}

// Reverse mappings (TypeScript → DB columns)
function txnToDb(t: Transaction, userId: string) {
  return {
    id: t.id, user_id: userId, type: t.type, amount: t.amount,
    category: t.category, description: t.description, date: t.date,
    note: t.note || '',
  };
}

function billToDb(b: Bill, userId: string) {
  return {
    id: b.id, user_id: userId, name: b.name, amount: b.amount,
    due_day: b.dueDay, category: b.category,
    is_paid: b.isPaid, paid_month: b.paidMonth || null,
    bill_month: b.month || null,
    duration: b.duration || null,
    color: b.color, note: b.note || '',
  };
}

function budgetToDb(b: Budget, userId: string) {
  return {
    category: b.category, user_id: userId,
    limit_amount: b.limit,
  };
}

export async function loadData(userId: string): Promise<AppData> {
  const supabase = createClient();
  try {
    const [txnRes, billRes, budgetRes] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", userId).order("date", { ascending: false }),
      supabase.from("bills").select("*").eq("user_id", userId),
      supabase.from("budgets").select("*").eq("user_id", userId),
    ]);
    return {
      transactions: (txnRes.data || []).map(mapTransaction),
      bills: (billRes.data || []).map(mapBill),
      budgets: (budgetRes.data || []).map(mapBudget),
    };
  } catch {
    return defaultData;
  }
}

export async function saveData(data: AppData, userId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("transactions").delete().eq("user_id", userId);
  await supabase.from("bills").delete().eq("user_id", userId);
  await supabase.from("budgets").delete().eq("user_id", userId);
  if (data.transactions.length > 0)
    await supabase.from("transactions").insert(data.transactions.map(t => txnToDb(t, userId)));
  if (data.bills.length > 0)
    await supabase.from("bills").insert(data.bills.map(b => billToDb(b, userId)));
  if (data.budgets.length > 0)
    await supabase.from("budgets").insert(data.budgets.map(b => budgetToDb(b, userId)));
}

export function genId(): string {
  return crypto.randomUUID();
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
    "Allowance": "cat-allowance",
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
    "Allowance": "💰",
    "Other": "📌",
  };
  return map[cat] ?? "📌";
}

export function getCategoryIcon(cat: string): string {
  const map: Record<string, string> = {
    "Food & Dining": "fa-utensils-crossed",
    "Transport": "fa-car",
    "Shopping": "fa-shopping-bag",
    "Bills & Utilities": "fa-bolt",
    "Health": "fa-heart-pulse",
    "Entertainment": "fa-clapperboard",
    "Credit Card": "fa-credit-card",
    "Loan": "fa-landmark",
    "Allowance": "fa-wallet",
    "Other": "fa-more-horizontal",
  };
  return map[cat] ?? "fa-more-horizontal";
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

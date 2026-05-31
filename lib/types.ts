export type Category =
  | "Food & Dining"
  | "Transport"
  | "Shopping"
  | "Bills & Utilities"
  | "Health"
  | "Entertainment"
  | "Credit Card"
  | "Loan"
  | "Other";

export type TransactionType = "expense" | "income";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: Category;
  description: string;
  date: string; // ISO
  note?: string;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDay: number; // day of month 1-31
  category: "Credit Card" | "Loan" | "Bills & Utilities" | "Other";
  isPaid: boolean;
  paidMonth?: string; // "YYYY-MM"
  color: string;
  note?: string;
}

export interface Budget {
  category: Category;
  limit: number;
}

export interface AppData {
  transactions: Transaction[];
  bills: Bill[];
  budgets: Budget[];
}

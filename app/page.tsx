"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  loadData, saveData, genId, currentMonth, formatAmount,
  getCategoryClass, getCategoryEmoji, getCategoryIcon, groupTransactionsByDate
} from "@/lib/store";
import { AppData, Transaction, Bill, Budget, Category } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import {
  Plus, House, List, CreditCard, PieChart, Settings, Sun, Moon,
  ArrowUp, ArrowDown, Bell, ChevronRight, Wallet, Receipt, Palette,
  Trash2, Pencil, PhilippinePeso, Tag, Calendar, StickyNote,
  FileText, CalendarDays, Building2, Zap, CheckCircle, Circle,
  Target, X, ArrowUpCircle, ArrowDownCircle, LogOut, User,
  UtensilsCrossed, Car, ShoppingBag, HeartPulse, Clapperboard, Landmark, MoreHorizontal
} from "lucide-react";

const CATEGORIES: Category[] = [
  "Food & Dining","Transport","Shopping","Bills & Utilities",
  "Health","Entertainment","Credit Card","Loan","Other"
];

const BILL_COLORS = ["#1591DC","#2C5EAD","#4BB8FA","#ff6b6b","#00d9a3","#ff8c42","#a855f7","#ff4db8"];

type Tab = "home" | "transactions" | "bills" | "analytics" | "settings";

// ── Icon helper (Font Awesome) ──
const iconMap: Record<string, React.ElementType> = {
  "fa-plus": Plus, "fa-house": House, "fa-list-ul": List,
  "fa-credit-card": CreditCard, "fa-chart-pie": PieChart, "fa-gear": Settings,
  "fa-sun": Sun, "fa-moon": Moon, "fa-arrow-up": ArrowUp, "fa-arrow-down": ArrowDown,
  "fa-bell": Bell, "fa-chevron-right": ChevronRight, "fa-wallet": Wallet,
  "fa-receipt": Receipt, "fa-circle-half-stroke": Palette, "fa-trash-can": Trash2,
  "fa-trash": Trash2, "fa-pen": Pencil, "fa-peso-sign": PhilippinePeso,
  "fa-tag": Tag, "fa-calendar": Calendar, "fa-note-sticky": StickyNote,
  "fa-file-invoice": FileText, "fa-calendar-day": CalendarDays,
  "fa-building-columns": Building2, "fa-bolt": Zap, "fa-circle-check": CheckCircle,
  "fa-circle": Circle, "fa-bullseye": Target, "fa-xmark": X,
  "fa-circle-up": ArrowUpCircle, "fa-circle-down": ArrowDownCircle,
  "fa-right-from-bracket": LogOut,
  "fa-user": User,
  "fa-utensils-crossed": UtensilsCrossed,
  "fa-car": Car,
  "fa-shopping-bag": ShoppingBag,
  "fa-heart-pulse": HeartPulse,
  "fa-clapperboard": Clapperboard,
  "fa-landmark": Landmark,
  "fa-more-horizontal": MoreHorizontal,
};

const I = ({ icon, style }: { icon: string; style?: React.CSSProperties }) => {
  const Icon = iconMap[icon];
  if (!Icon) return null;
  const { fontSize, color, ...rest } = style || {};
  return (
    <span style={rest}>
      <Icon size={fontSize ? parseInt(String(fontSize)) : 16} color={color} />
    </span>
  );
};

export default function App() {
  const { user, loading, logout, username } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AppData>({ transactions: [], bills: [], budgets: [] });
  const [tab, setTab] = useState<Tab>("home");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [sheet, setSheet] = useState<"none"|"add-txn"|"add-bill"|"add-budget"|"edit-txn"|"edit-bill">("none");
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [filterMonth, setFilterMonth] = useState(currentMonth());

  const [form, setForm] = useState({
    type: "expense" as "expense"|"income",
    amount:"", category:"Food & Dining" as Category,
    description:"", date: new Date().toISOString().slice(0,10), note:""
  });
  const [billForm, setBillForm] = useState({
    name:"", amount:"", dueDay:"1",
    category:"Credit Card" as Bill["category"],
    color:BILL_COLORS[0], note:""
  });
  const [budgetForm, setBudgetForm] = useState({ category:"Food & Dining" as Category, limit:"" });

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login"); return; }
    const savedTheme = (localStorage.getItem("theme") as "dark"|"light") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
    loadData(user.id).then(setData).catch(e => console.error("Failed to load data:", e));
  }, [user, loading, router]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  };

  const persist = useCallback(async (next: AppData) => {
    setData(next);
    if (user) {
      try {
        await saveData(next, user.id);
      } catch (e) {
        console.error("Failed to save data to Supabase:", e);
      }
    }
  }, [user]);

  // ── Transactions ──
  const addTransaction = () => {
    if (!form.amount || !form.description) return;
    const txn: Transaction = {
      id: genId(), type: form.type, amount: parseFloat(form.amount),
      category: form.category, description: form.description,
      date: new Date(form.date).toISOString(), note: form.note
    };
    persist({ ...data, transactions: [txn, ...data.transactions] });
    setSheet("none");
    setForm({ type:"expense", amount:"", category:"Food & Dining", description:"", date: new Date().toISOString().slice(0,10), note:"" });
  };

  const updateTransaction = () => {
    if (!editingTxn || !form.amount || !form.description) return;
    const updated = data.transactions.map(t =>
      t.id === editingTxn.id
        ? { ...t, type:form.type, amount:parseFloat(form.amount), category:form.category, description:form.description, date:new Date(form.date).toISOString(), note:form.note }
        : t
    );
    persist({ ...data, transactions: updated });
    setSheet("none"); setEditingTxn(null);
  };

  const deleteTransaction = (id: string) =>
    persist({ ...data, transactions: data.transactions.filter(t => t.id !== id) });

  const openEditTxn = (t: Transaction) => {
    setEditingTxn(t);
    setForm({ type:t.type, amount:String(t.amount), category:t.category, description:t.description, date:t.date.slice(0,10), note:t.note||"" });
    setSheet("edit-txn");
  };

  // ── Bills ──
  const addBill = () => {
    if (!billForm.name || !billForm.amount) return;
    const bill: Bill = {
      id: genId(), name:billForm.name, amount:parseFloat(billForm.amount),
      dueDay:parseInt(billForm.dueDay), category:billForm.category,
      isPaid:false, color:billForm.color, note:billForm.note
    };
    persist({ ...data, bills: [bill, ...data.bills] });
    setSheet("none");
    setBillForm({ name:"", amount:"", dueDay:"1", category:"Credit Card", color:BILL_COLORS[0], note:"" });
  };

  const updateBill = () => {
    if (!editingBill || !billForm.name || !billForm.amount) return;
    const updated = data.bills.map(b =>
      b.id === editingBill.id
        ? { ...b, name:billForm.name, amount:parseFloat(billForm.amount), dueDay:parseInt(billForm.dueDay), category:billForm.category, color:billForm.color, note:billForm.note }
        : b
    );
    persist({ ...data, bills: updated });
    setSheet("none"); setEditingBill(null);
  };

  const toggleBillPaid = (id: string) => {
    const month = currentMonth();
    const updated = data.bills.map(b => {
      if (b.id !== id) return b;
      const wasPaid = b.isPaid && b.paidMonth === month;
      return { ...b, isPaid: !wasPaid, paidMonth: !wasPaid ? month : undefined };
    });
    persist({ ...data, bills: updated });
  };

  const deleteBill = (id: string) => persist({ ...data, bills: data.bills.filter(b => b.id !== id) });

  const openEditBill = (b: Bill) => {
    setEditingBill(b);
    setBillForm({ name:b.name, amount:String(b.amount), dueDay:String(b.dueDay), category:b.category, color:b.color, note:b.note||"" });
    setSheet("edit-bill");
  };

  // ── Budgets ──
  const addBudget = () => {
    if (!budgetForm.limit) return;
    const existing = data.budgets.filter(b => b.category !== budgetForm.category);
    persist({ ...data, budgets: [...existing, { category:budgetForm.category, limit:parseFloat(budgetForm.limit) }] });
    setSheet("none");
  };
  const deleteBudget = (cat: Category) =>
    persist({ ...data, budgets: data.budgets.filter(b => b.category !== cat) });

  // ── Derived ──
  const monthTransactions = data.transactions.filter(t => t.date.startsWith(filterMonth));
  const monthExpenses = monthTransactions.filter(t => t.type === "expense").reduce((s,t) => s+t.amount, 0);
  const monthIncome   = monthTransactions.filter(t => t.type === "income").reduce((s,t) => s+t.amount, 0);
  const unpaidBills   = data.bills.filter(b => !b.isPaid || b.paidMonth !== currentMonth());
  const paidBills     = data.bills.filter(b => b.isPaid && b.paidMonth === currentMonth());
  const totalUnpaid   = unpaidBills.reduce((s,b) => s+b.amount, 0);
  const totalBillsDue = data.bills.reduce((s,b) => s+b.amount, 0);

  const catSpending: Record<string,number> = {};
  for (const t of monthTransactions.filter(t => t.type === "expense"))
    catSpending[t.category] = (catSpending[t.category]||0) + t.amount;
  const sortedCats = Object.entries(catSpending).sort(([,a],[,b]) => b-a);

  const daysUntilDue = (dueDay: number) => {
    const today = new Date();
    const due = new Date(today.getFullYear(), today.getMonth(), dueDay);
    if (due < today) due.setMonth(due.getMonth()+1);
    return Math.ceil((due.getTime()-today.getTime())/86400000);
  };

  const fmt = (a: number) => formatAmount(a);
  const closeSheet = () => { setSheet("none"); setEditingTxn(null); setEditingBill(null); };

  if (loading) return null;
  if (!user) return null;

  return (
    <div className="app-container" style={{ background:"var(--bg)", minHeight:"100vh" }}>

      {/* ── TABS ── */}
      {tab === "home" && <HomeTab data={data} filterMonth={filterMonth} setFilterMonth={setFilterMonth}
        monthExpenses={monthExpenses} monthIncome={monthIncome} totalUnpaid={totalUnpaid}
        unpaidBills={unpaidBills} sortedCats={sortedCats} fmt={fmt}
        onAddTxn={() => setSheet("add-txn")} setTab={setTab} theme={theme} toggleTheme={toggleTheme} />}

      {tab === "transactions" && <TransactionsTab transactions={data.transactions}
        filterMonth={filterMonth} setFilterMonth={setFilterMonth} fmt={fmt}
        onDelete={deleteTransaction} onEdit={openEditTxn} />}

      {tab === "bills" && <BillsTab bills={data.bills} fmt={fmt}
        onToggle={toggleBillPaid} onDelete={deleteBill} onEdit={openEditBill}
        daysUntilDue={daysUntilDue} totalBillsDue={totalBillsDue}
        paidBills={paidBills} unpaidBills={unpaidBills} />}

      {tab === "analytics" && <AnalyticsTab data={data} filterMonth={filterMonth}
        setFilterMonth={setFilterMonth} sortedCats={sortedCats}
        monthExpenses={monthExpenses} monthIncome={monthIncome} fmt={fmt}
        onDeleteBudget={deleteBudget} onAddBudget={() => setSheet("add-budget")} />}

      {tab === "settings" && <SettingsTab theme={theme} toggleTheme={toggleTheme}
        data={data} onClearAll={() => { if(confirm("Clear all data? This cannot be undone.")) persist({ transactions:[], bills:[], budgets:[] }); }}
        user={username || user?.email || "User"} onLogout={() => { logout(); router.push("/login"); }} />}

      {/* ── FAB ── */}
      {tab !== "settings" && (
        <button className="fab" onClick={() => setSheet(tab === "bills" ? "add-bill" : "add-txn")}>
          <I icon="fa-plus" style={{ color:"white", fontSize:22 }} />
        </button>
      )}

      {/* ── BOTTOM NAV ── */}
      <nav className="bottom-nav">
        {([
          { id:"home",         icon:"fa-house",          label:"Home" },
          { id:"transactions", icon:"fa-list-ul",        label:"History" },
          { id:"bills",        icon:"fa-credit-card",    label:"Bills" },
          { id:"analytics",    icon:"fa-chart-pie",      label:"Analytics" },
          { id:"settings",     icon:"fa-gear",           label:"Settings" },
        ] as const).map(item => (
          <button key={item.id} className={`nav-btn${tab===item.id?" active":""}`} onClick={() => setTab(item.id)}>
            <div className="nav-icon-wrap">
              <I icon={item.icon} />
            </div>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ── SHEETS ── */}
      {sheet !== "none" && (
        <>
          <div className="sheet-overlay" onClick={closeSheet} />
          <div className="sheet">
            {(sheet==="add-txn"||sheet==="edit-txn") && (
              <TxnForm form={form} setForm={setForm}
                onSubmit={sheet==="add-txn" ? addTransaction : updateTransaction}
                onClose={closeSheet} isEdit={sheet==="edit-txn"} />
            )}
            {(sheet==="add-bill"||sheet==="edit-bill") && (
              <BillForm form={billForm} setForm={setBillForm}
                onSubmit={sheet==="add-bill" ? addBill : updateBill}
                onClose={closeSheet} isEdit={sheet==="edit-bill"} colors={BILL_COLORS} />
            )}
            {sheet==="add-budget" && (
              <BudgetForm form={budgetForm} setForm={setBudgetForm}
                onSubmit={addBudget} onClose={closeSheet} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// HOME TAB
// ══════════════════════════════════════════
function HomeTab({ data, filterMonth, setFilterMonth, monthExpenses, monthIncome, totalUnpaid, unpaidBills, sortedCats, fmt, onAddTxn, setTab, theme, toggleTheme }: any) {
  const balance = monthIncome - monthExpenses;
  const recentTxns = [...data.transactions].sort((a:any,b:any) => b.date.localeCompare(a.date)).slice(0,5);

  return (
    <div style={{ paddingTop:"env(safe-area-inset-top)", paddingBottom:100 }}>
      {/* Header */}
      <div style={{ padding:"24px 20px 0", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <p style={{ color:"var(--muted)", fontSize:12, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:2 }}>
            {new Date(filterMonth+"-01").toLocaleString("default",{month:"long",year:"numeric"})}
          </p>
          <h1 style={{ fontSize:28, fontWeight:800, color:"var(--text)" }}>Overview</h1>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center", marginTop:4 }}>
          <MonthPicker value={filterMonth} onChange={setFilterMonth} />
          <button onClick={toggleTheme} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
            <I icon={theme==="dark" ? "fa-sun" : "fa-moon"} style={{ color:"var(--accent)", fontSize:15 }} />
          </button>
        </div>
      </div>

      {/* Balance Hero Card */}
      <div style={{ padding:"14px 20px 0" }}>
        <div className="hero-card fade-up stagger-1" style={{ padding:"24px" }}>
          <p style={{ color:"rgba(255,255,255,0.75)", fontSize:12, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6, position:"relative", zIndex:1 }}>Net Balance</p>
          <p style={{ fontSize:40, fontWeight:900, color:"white", marginBottom:20, position:"relative", zIndex:1 }}>
            {balance<0?"-":""}{fmt(Math.abs(balance))}
          </p>
          <div style={{ display:"flex", gap:0, position:"relative", zIndex:1 }}>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:3 }}>
                <I icon="fa-arrow-up" style={{ color:"rgba(255,255,255,0.7)", fontSize:11 }} />
                <p style={{ color:"rgba(255,255,255,0.7)", fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", margin:0 }}>Income</p>
              </div>
              <p style={{ color:"white", fontWeight:800, fontSize:17, margin:0 }}>{fmt(monthIncome)}</p>
            </div>
            <div style={{ width:1, background:"rgba(255,255,255,0.2)", margin:"0 16px" }} />
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:3 }}>
                <I icon="fa-arrow-down" style={{ color:"rgba(255,255,255,0.7)", fontSize:11 }} />
                <p style={{ color:"rgba(255,255,255,0.7)", fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", margin:0 }}>Expenses</p>
              </div>
              <p style={{ color:"white", fontWeight:800, fontSize:17, margin:0 }}>{fmt(monthExpenses)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bills Alert */}
      {unpaidBills.length > 0 && (
        <div style={{ padding:"12px 20px 0" }}>
          <button className="fade-up stagger-2" onClick={() => setTab("bills")}
            style={{ width:"100%", background:"rgba(224,62,62,0.08)", border:"1px solid rgba(224,62,62,0.25)", borderRadius:16, padding:"13px 16px", display:"flex", alignItems:"center", gap:10, cursor:"pointer", textAlign:"left" }}>
            <div style={{ width:34, height:34, borderRadius:10, background:"rgba(224,62,62,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <I icon="fa-bell" style={{ color:"var(--danger)", fontSize:15 }} />
            </div>
            <div style={{ flex:1 }}>
              <p style={{ margin:0, fontWeight:700, fontSize:13, color:"var(--danger)" }}>{unpaidBills.length} unpaid bill{unpaidBills.length>1?"s":""}</p>
              <p style={{ margin:0, fontSize:12, color:"var(--muted)" }}>Total due: {fmt(totalUnpaid)}</p>
            </div>
            <I icon="fa-chevron-right" style={{ color:"var(--muted)", fontSize:13 }} />
          </button>
        </div>
      )}

      {/* Top Categories */}
      {sortedCats.length > 0 && (
        <div className="fade-up stagger-3" style={{ padding:"16px 20px 0" }}>
          <SectionHeader label="Top Spending" />
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {sortedCats.slice(0,4).map(([cat,amt]:[string,number]) => {
              const pct = monthExpenses > 0 ? (amt/monthExpenses)*100 : 0;
              return (
                <div key={cat} className="card" style={{ padding:"12px 14px" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <I icon={getCategoryIcon(cat)} style={{ fontSize:20 }} />
                      <span style={{ fontWeight:600, fontSize:14 }}>{cat}</span>
                    </div>
                    <span style={{ fontWeight:800, fontSize:14 }}>{fmt(amt)}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width:`${pct}%`, background:"var(--accent)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="fade-up stagger-4" style={{ padding:"16px 20px 0" }}>
        <SectionHeader label="Recent" action={{ label:"See all", onClick:()=>setTab("transactions") }} />
        {recentTxns.length === 0 ? (
          <div className="card" style={{ padding:"36px 20px", textAlign:"center" }}>
            <I icon="fa-wallet" style={{ fontSize:32, color:"var(--muted)", opacity:0.4, display:"block", marginBottom:10 }} />
            <p style={{ color:"var(--muted)", marginBottom:12, fontSize:14 }}>No transactions yet</p>
            <button className="btn-primary" style={{ width:"auto", padding:"10px 20px", fontSize:14 }} onClick={onAddTxn}>
              Add your first one
            </button>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {recentTxns.map((t:Transaction) => <TxnRow key={t.id} txn={t} fmt={fmt} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// TRANSACTIONS TAB
// ══════════════════════════════════════════
function TransactionsTab({ transactions, filterMonth, setFilterMonth, fmt, onDelete, onEdit }: any) {
  const filtered = transactions.filter((t:Transaction) => t.date.startsWith(filterMonth));
  const groups = groupTransactionsByDate(filtered);
  const total = filtered.filter((t:Transaction)=>t.type==="expense").reduce((s:number,t:Transaction)=>s+t.amount,0);

  return (
    <div style={{ paddingTop:"env(safe-area-inset-top)", paddingBottom:100 }}>
      <div style={{ padding:"24px 20px 14px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <h1 style={{ fontSize:26, fontWeight:800 }}>Transactions</h1>
          <MonthPicker value={filterMonth} onChange={setFilterMonth} />
        </div>
        {filtered.length > 0 && (
          <div style={{ display:"flex", gap:8 }}>
            <StatPill icon="fa-arrow-down" label="Spent" value={fmt(total)} color="var(--danger)" />
            <StatPill icon="fa-receipt" label="Count" value={`${filtered.length} items`} color="var(--accent)" />
          </div>
        )}
      </div>

      {groups.length === 0 ? (
        <EmptyState icon="fa-list-ul" title="No transactions" subtitle="this month" />
      ) : (
        <div style={{ padding:"0 20px" }}>
          {groups.map(([day,txns]:[string,Transaction[]]) => (
            <div key={day} style={{ marginBottom:18 }}>
              <p style={{ fontSize:11, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:7 }}>
                {formatDay(day)}
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {txns.map((t:Transaction) => (
                  <TxnRow key={t.id} txn={t} fmt={fmt} onDelete={()=>onDelete(t.id)} onEdit={()=>onEdit(t)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// BILLS TAB
// ══════════════════════════════════════════
function BillsTab({ bills, fmt, onToggle, onDelete, onEdit, daysUntilDue, totalBillsDue, paidBills, unpaidBills }: any) {
  const paidPct = bills.length > 0 ? (paidBills.length/bills.length)*100 : 0;
  return (
    <div style={{ paddingTop:"env(safe-area-inset-top)", paddingBottom:100 }}>
      <div style={{ padding:"24px 20px 0" }}>
        <h1 style={{ fontSize:26, fontWeight:800, marginBottom:2 }}>Bills & Loans</h1>
        <p style={{ color:"var(--muted)", fontSize:13, marginBottom:14 }}>Recurring payments tracker</p>

        {bills.length > 0 && (
          <div className="hero-card fade-up stagger-1" style={{ padding:"18px 20px", marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12, position:"relative", zIndex:1 }}>
              <div>
                <p style={{ color:"rgba(255,255,255,0.7)", fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:3 }}>Total Monthly</p>
                <p style={{ fontSize:24, fontWeight:900, color:"white", margin:0 }}>{fmt(totalBillsDue)}</p>
              </div>
              <div style={{ textAlign:"right" }}>
                <p style={{ color:"rgba(255,255,255,0.7)", fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:3 }}>Progress</p>
                <p style={{ fontSize:24, fontWeight:900, color:"white", margin:0 }}>{paidBills.length}<span style={{ fontSize:14, opacity:0.7 }}>/{bills.length}</span></p>
              </div>
            </div>
            <div style={{ height:8, borderRadius:99, background:"rgba(255,255,255,0.2)", overflow:"hidden", position:"relative", zIndex:1 }}>
              <div style={{ height:"100%", width:`${paidPct}%`, borderRadius:99, background:"white", transition:"width 0.6s ease" }} />
            </div>
          </div>
        )}
      </div>

      {bills.length === 0 ? (
        <EmptyState icon="fa-credit-card" title="No bills yet" subtitle="Add credit cards, loans & recurring bills" />
      ) : (
        <div style={{ padding:"0 20px", display:"flex", flexDirection:"column", gap:9 }}>
          {unpaidBills.length > 0 && <SectionHeader label="Unpaid" />}
          {unpaidBills.map((b:Bill) => (
            <BillCard key={b.id} bill={b} isPaid={false} fmt={fmt}
              onToggle={()=>onToggle(b.id)} onDelete={()=>onDelete(b.id)} onEdit={()=>onEdit(b)}
              daysUntil={daysUntilDue(b.dueDay)} />
          ))}
          {paidBills.length > 0 && <SectionHeader label="Paid this month" />}
          {paidBills.map((b:Bill) => (
            <BillCard key={b.id} bill={b} isPaid={true} fmt={fmt}
              onToggle={()=>onToggle(b.id)} onDelete={()=>onDelete(b.id)} onEdit={()=>onEdit(b)}
              daysUntil={daysUntilDue(b.dueDay)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// ANALYTICS TAB
// ══════════════════════════════════════════
function AnalyticsTab({ data, filterMonth, setFilterMonth, sortedCats, monthExpenses, monthIncome, fmt, onDeleteBudget, onAddBudget }: any) {
  const net = monthIncome - monthExpenses;
  return (
    <div style={{ paddingTop:"env(safe-area-inset-top)", paddingBottom:100 }}>
      <div style={{ padding:"24px 20px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h1 style={{ fontSize:26, fontWeight:800 }}>Analytics</h1>
        <MonthPicker value={filterMonth} onChange={setFilterMonth} />
      </div>

      {/* Summary */}
      <div style={{ padding:"0 20px 14px", display:"flex", gap:8 }}>
        <StatCard icon="fa-arrow-up" label="Income" value={fmt(monthIncome)} color="var(--success)" />
        <StatCard icon="fa-arrow-down" label="Expenses" value={fmt(monthExpenses)} color="var(--danger)" />
        <StatCard icon={net>=0?"fa-circle-up":"fa-circle-down"} label="Net" value={fmt(Math.abs(net))} color={net>=0?"var(--accent-light)":"var(--warning)"} />
      </div>

      {/* Breakdown */}
      {sortedCats.length > 0 && (
        <div style={{ padding:"0 20px 16px" }}>
          <SectionHeader label="Category Breakdown" />
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {sortedCats.map(([cat,amt]:[string,number]) => {
              const pct = monthExpenses > 0 ? (amt/monthExpenses)*100 : 0;
              const budget = data.budgets.find((b:Budget)=>b.category===cat);
              const over = budget && amt > budget.limit;
              return (
                <div key={cat} className="card" style={{ padding:"13px 14px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <I icon={getCategoryIcon(cat)} style={{ fontSize:20 }} />
                      <div>
                        <p style={{ margin:0, fontWeight:700, fontSize:14 }}>{cat}</p>
                        {budget && <p style={{ margin:0, fontSize:11, color:over?"var(--danger)":"var(--muted)" }}>Budget: {fmt(budget.limit)}{over?" ⚠️":""}</p>}
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <p style={{ margin:0, fontWeight:800, fontSize:14 }}>{fmt(amt)}</p>
                      <p style={{ margin:0, fontSize:11, color:"var(--muted)" }}>{pct.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width:`${Math.min(pct,100)}%`, background:over?"var(--danger)":"var(--accent)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Budgets */}
      <div style={{ padding:"0 20px" }}>
        <SectionHeader label="Budgets" action={{ label:"+ Add", onClick:onAddBudget }} />
        {data.budgets.length === 0 ? (
          <div className="card" style={{ padding:"20px", textAlign:"center" }}>
            <I icon="fa-bullseye" style={{ fontSize:28, color:"var(--muted)", opacity:0.3, display:"block", marginBottom:8 }} />
            <p style={{ color:"var(--muted)", fontSize:13, margin:0 }}>Set monthly spending limits per category</p>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {data.budgets.map((b:Budget) => {
              const spent = sortedCats.find(([c]:[string,number])=>c===b.category)?.[1]||0;
              const pct = (spent/b.limit)*100;
              return (
                <div key={b.category} className="card" style={{ padding:"13px 14px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <I icon={getCategoryIcon(b.category)} style={{ fontSize:18 }} />
                      <span style={{ fontWeight:700, fontSize:14 }}>{b.category}</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:pct>100?"var(--danger)":"var(--text)" }}>{fmt(spent as number)} / {fmt(b.limit)}</span>
                      <button onClick={()=>onDeleteBudget(b.category)} className="btn-danger" style={{ padding:"4px 8px", borderRadius:8 }}>
                        <I icon="fa-trash" style={{ fontSize:12 }} />
                      </button>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width:`${Math.min(pct,100)}%`, background:pct>100?"var(--danger)":pct>80?"var(--warning)":"var(--success)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {sortedCats.length === 0 && (
        <EmptyState icon="fa-chart-pie" title="No data yet" subtitle="Add transactions to see analytics" />
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// SETTINGS TAB
// ══════════════════════════════════════════
function SettingsTab({ theme, toggleTheme, data, onClearAll, user, onLogout }: any) {
  const txnCount = data.transactions.length;
  const billCount = data.bills.length;

  return (
    <div style={{ paddingTop:"env(safe-area-inset-top)", paddingBottom:100 }}>
      <div style={{ padding:"24px 20px 20px" }}>
        <h1 style={{ fontSize:26, fontWeight:800, marginBottom:4 }}>Settings</h1>
        <p style={{ color:"var(--muted)", fontSize:13 }}>Customize your experience</p>
      </div>

      <SettingsSection title="Account">
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 0" }}>
          <div style={{ width:32, height:32, borderRadius:9, background:"rgba(21,145,220,0.13)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <img src="/spendwise.png" alt="" style={{ width:18, height:18, objectFit:"contain" }} />
          </div>
          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontWeight:600, fontSize:14 }}>{user || "User"}</p>
            <p style={{ margin:0, fontSize:12, color:"var(--muted)" }}>Signed in</p>
          </div>
        </div>
        <div style={{ height:1, background:"var(--border)", margin:"0 -20px 0 46px" }} />
        <SettingsRow
          icon="fa-right-from-bracket"
          iconColor="#2C5EAD"
          label="Sign Out"
          sublabel="Switch account"
          right={
            <button onClick={onLogout} className="btn-danger" style={{ padding:"7px 14px", borderRadius:10 }}>
              <I icon="fa-right-from-bracket" style={{ fontSize:13 }} />
              <span style={{ marginLeft:5, fontSize:13, fontWeight:600 }}>Logout</span>
            </button>
          }
        />
      </SettingsSection>

      <SettingsSection title="Appearance">
        <SettingsRow
          icon="fa-circle-half-stroke"
          iconColor="#1591DC"
          label="Dark Mode"
          sublabel={theme==="dark" ? "Dark theme" : "Light theme"}
          right={
            <label className="toggle-switch">
              <input type="checkbox" checked={theme==="dark"} onChange={toggleTheme} />
              <span className="toggle-slider" />
            </label>
          }
        />
      </SettingsSection>

      <SettingsSection title="Data">
        <SettingsRow icon="fa-receipt" iconColor="#1591DC" label="Transactions" sublabel={`${txnCount} records`} />
        <div style={{ height:1, background:"var(--border)", margin:"0 -20px 0 46px" }} />
        <SettingsRow icon="fa-credit-card" iconColor="#2C5EAD" label="Bills" sublabel={`${billCount} bills tracked`} />
        <div style={{ height:1, background:"var(--border)", margin:"0 -20px 0 46px" }} />
        <SettingsRow
          icon="fa-trash-can"
          iconColor="#2C5EAD"
          label="Clear All Data"
          sublabel="Permanently delete everything"
          right={
            <button onClick={onClearAll} className="btn-danger" style={{ padding:"7px 14px", borderRadius:10 }}>
              <I icon="fa-trash" style={{ fontSize:13 }} />
              <span style={{ marginLeft:5, fontSize:13, fontWeight:600 }}>Clear</span>
            </button>
          }
        />
      </SettingsSection>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding:"0 20px 16px" }}>
      <p style={{ fontSize:11, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>{title}</p>
      <div className="card" style={{ padding:"0 16px", overflow:"hidden" }}>
        {children}
      </div>
    </div>
  );
}

function SettingsRow({ icon, iconColor, label, sublabel, right }: any) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 0" }}>
      <div style={{ width:32, height:32, borderRadius:9, background:iconColor+"22", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <I icon={icon} style={{ color:iconColor, fontSize:14 }} />
      </div>
      <div style={{ flex:1 }}>
        <p style={{ margin:0, fontWeight:600, fontSize:14 }}>{label}</p>
        {sublabel && <p style={{ margin:0, fontSize:12, color:"var(--muted)" }}>{sublabel}</p>}
      </div>
      {right}
    </div>
  );
}

// ══════════════════════════════════════════
// CATEGORY PICKER
// ══════════════════════════════════════════
function CategoryPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="cat-picker">
      {CATEGORIES.map(c => (
        <button key={c} className={`cat-btn${value===c?" selected":""}`} onClick={()=>onChange(c)}>
          <I icon={getCategoryIcon(c)} style={{ fontSize:15 }} />
          {c}
        </button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════
// FORMS
// ══════════════════════════════════════════
function TxnForm({ form, setForm, onSubmit, onClose, isEdit }: any) {
  const sf = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));
  return (
    <div style={{ padding:"20px 20px 32px" }}>
      <SheetHeader title={isEdit?"Edit Transaction":"Add Transaction"} onClose={onClose} />
      <div className="type-toggle" style={{ marginBottom:14 }}>
        {(["expense","income"] as const).map(t => (
          <button key={t} className={`type-btn ${t}${form.type===t?" active":""}`} onClick={()=>sf("type",t)}>
            <I icon={t==="expense"?"fa-arrow-down":"fa-arrow-up"} style={{ marginRight:6 }} />
            {t==="expense"?"Expense":"Income"}
          </button>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
        <FormField label="Amount (₱)" icon="fa-peso-sign">
          <input type="number" placeholder="0.00" value={form.amount} onChange={e=>sf("amount",e.target.value)} style={{ fontSize:24, fontWeight:800 }} />
        </FormField>
        <FormField label="Description" icon="fa-pen">
          <input type="text" placeholder="What was this for?" value={form.description} onChange={e=>sf("description",e.target.value)} />
        </FormField>
        <FormField label="Category" icon="fa-tag">
          <CategoryPicker value={form.category} onChange={v=>sf("category",v)} />
        </FormField>
        <FormField label="Date" icon="fa-calendar">
          <input type="date" value={form.date} onChange={e=>sf("date",e.target.value)} />
        </FormField>
        <FormField label="Note (optional)" icon="fa-note-sticky">
          <input type="text" placeholder="Extra details..." value={form.note} onChange={e=>sf("note",e.target.value)} />
        </FormField>
        <button className="btn-primary" onClick={onSubmit}>{isEdit?"Save Changes":"Add Transaction"}</button>
      </div>
    </div>
  );
}

function BillForm({ form, setForm, onSubmit, onClose, isEdit, colors }: any) {
  const sf = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));
  return (
    <div style={{ padding:"20px 20px 32px" }}>
      <SheetHeader title={isEdit?"Edit Bill":"Add Bill"} onClose={onClose} />
      <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
        <FormField label="Bill Name" icon="fa-file-invoice">
          <input type="text" placeholder="e.g. BPI Credit Card" value={form.name} onChange={e=>sf("name",e.target.value)} />
        </FormField>
        <FormField label="Monthly Amount (₱)" icon="fa-peso-sign">
          <input type="number" placeholder="0.00" value={form.amount} onChange={e=>sf("amount",e.target.value)} />
        </FormField>
        <FormField label="Due Day of Month" icon="fa-calendar-day">
          <input type="number" placeholder="1-31" min="1" max="31" value={form.dueDay} onChange={e=>sf("dueDay",e.target.value)} />
        </FormField>
        <FormField label="Category" icon="fa-tag">
          <CategoryPicker value={form.category} onChange={v=>sf("category",v)} />
        </FormField>
        <div>
          <label style={labelStyle}>Color</label>
          <div style={{ display:"flex", gap:9, flexWrap:"wrap", marginTop:4 }}>
            {colors.map((c: string) => (
              <button key={c} onClick={()=>sf("color",c)}
                style={{ width:34, height:34, borderRadius:"50%", background:c, border:form.color===c?"3px solid white":"3px solid transparent", cursor:"pointer", boxShadow:form.color===c?`0 0 0 2px ${c}`:""}} />
            ))}
          </div>
        </div>
        <FormField label="Note (optional)" icon="fa-note-sticky">
          <input type="text" placeholder="Account number, etc." value={form.note} onChange={e=>sf("note",e.target.value)} />
        </FormField>
        <button className="btn-primary" onClick={onSubmit}>{isEdit?"Save Changes":"Add Bill"}</button>
      </div>
    </div>
  );
}

function BudgetForm({ form, setForm, onSubmit, onClose }: any) {
  const sf = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));
  return (
    <div style={{ padding:"20px 20px 32px" }}>
      <SheetHeader title="Set Budget" onClose={onClose} />
      <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
        <FormField label="Category" icon="fa-tag">
          <CategoryPicker value={form.category} onChange={v=>sf("category",v)} />
        </FormField>
        <FormField label="Monthly Limit (₱)" icon="fa-peso-sign">
          <input type="number" placeholder="0.00" value={form.limit} onChange={e=>sf("limit",e.target.value)} />
        </FormField>
        <button className="btn-primary" onClick={onSubmit}>Set Budget</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// SMALL COMPONENTS
// ══════════════════════════════════════════
function TxnRow({ txn, fmt, onDelete, onEdit }: any) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="card" style={{ overflow:"hidden" }}>
      <button onClick={()=>setExpanded(!expanded)} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", padding:"12px 14px", display:"flex", alignItems:"center", gap:11 }}>
        <div style={{ width:42, height:42, borderRadius:13, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, background:"var(--surface2)", flexShrink:0 }}>
          <I icon={getCategoryIcon(txn.category)} style={{ fontSize:20 }} />
        </div>
        <div style={{ flex:1, textAlign:"left" }}>
          <p style={{ margin:0, fontWeight:700, fontSize:14, color:"var(--text)" }}>{txn.description}</p>
          <p style={{ margin:0, fontSize:12, color:"var(--muted)" }}>{txn.category}</p>
        </div>
        <span style={{ fontWeight:800, fontSize:15, color:txn.type==="income"?"var(--success)":"var(--danger)", flexShrink:0 }}>
          {txn.type==="income"?"+":"-"}{fmt(txn.amount)}
        </span>
      </button>
      {expanded && onDelete && (
        <div style={{ borderTop:"1px solid var(--border)", padding:"8px 14px", display:"flex", gap:7, alignItems:"center" }}>
          {txn.note && <p style={{ margin:"0 auto 0 0", fontSize:12, color:"var(--muted)" }}>📝 {txn.note}</p>}
          <button onClick={onEdit} className="btn-ghost"><I icon="fa-pen" style={{ fontSize:12 }} /> Edit</button>
          <button onClick={onDelete} className="btn-danger"><I icon="fa-trash" style={{ fontSize:12 }} /> Delete</button>
        </div>
      )}
    </div>
  );
}

function BillCard({ bill, isPaid, fmt, onToggle, onDelete, onEdit, daysUntil }: any) {
  const urgent = !isPaid && daysUntil <= 3;
  const billIcon = bill.category==="Credit Card"?"fa-credit-card":bill.category==="Loan"?"fa-building-columns":"fa-bolt";
  return (
    <div className="card" style={{ overflow:"hidden", border:urgent?"1px solid rgba(224,62,62,0.35)":"1px solid var(--border)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 14px" }}>
        <div style={{ width:44, height:44, borderRadius:14, background:bill.color+"22", border:`1.5px solid ${bill.color}44`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <I icon={billIcon} style={{ color:bill.color, fontSize:17 }} />
        </div>
        <div style={{ flex:1 }}>
          <p style={{ margin:0, fontWeight:700, fontSize:15, color:isPaid?"var(--muted)":"var(--text)", textDecoration:isPaid?"line-through":"none" }}>{bill.name}</p>
          <p style={{ margin:0, fontSize:12, color:urgent?"var(--danger)":"var(--muted)" }}>
            Due day {bill.dueDay} · {isPaid ? "✓ Paid" : `${daysUntil}d left`}
          </p>
        </div>
        <p style={{ fontWeight:900, fontSize:16, color:isPaid?"var(--muted)":"var(--text)", margin:0, flexShrink:0 }}>{fmt(bill.amount)}</p>
        <button onClick={onToggle} style={{ background:"none", border:"none", cursor:"pointer", padding:4, flexShrink:0, color:isPaid?"var(--success)":"var(--border)" }}>
          <I icon={isPaid?"fa-circle-check":"fa-circle"} style={{ fontSize:24, color:isPaid?"var(--success)":"var(--muted)" }} />
        </button>
      </div>
      <div style={{ borderTop:"1px solid var(--border)", padding:"8px 14px", display:"flex", gap:7, justifyContent:"flex-end", alignItems:"center" }}>
        {bill.note && <p style={{ margin:"0 auto 0 0", fontSize:12, color:"var(--muted)" }}>📝 {bill.note}</p>}
        <button onClick={onEdit} className="btn-ghost"><I icon="fa-pen" style={{ fontSize:12 }} /> Edit</button>
        <button onClick={onDelete} className="btn-danger"><I icon="fa-trash" style={{ fontSize:12 }} /> Delete</button>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  return (
    <div className="card" style={{ flex:1, padding:"11px 10px", textAlign:"center" }}>
      <I icon={icon} style={{ color, fontSize:16, marginBottom:4, display:"block" }} />
      <p style={{ margin:0, fontSize:10, color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</p>
      <p style={{ margin:"2px 0 0", fontSize:13, fontWeight:800, color }}>{value}</p>
    </div>
  );
}

function StatPill({ icon, label, value, color }: any) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:7, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"7px 12px" }}>
      <I icon={icon} style={{ color, fontSize:13 }} />
      <span style={{ fontSize:12, color:"var(--muted)", fontWeight:600 }}>{label}:</span>
      <span style={{ fontSize:13, fontWeight:800, color }}>{value}</span>
    </div>
  );
}

function MonthPicker({ value, onChange }: any) {
  return (
    <input type="month" value={value} onChange={e=>onChange(e.target.value)}
      style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, padding:"6px 10px", color:"var(--text)", fontSize:12, fontWeight:700, width:"auto", cursor:"pointer" }} />
  );
}

function SectionHeader({ label, action }: { label: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
      <p style={{ fontSize:11, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.07em", margin:0 }}>{label}</p>
      {action && (
        <button onClick={action.onClick} style={{ background:"var(--accent-pale)", color:"var(--accent)", border:"1px solid var(--accent)33", borderRadius:8, padding:"5px 11px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
          {action.label}
        </button>
      )}
    </div>
  );
}

function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
      <div style={{ width:36, height:4, borderRadius:2, background:"var(--border)", margin:"0 auto 0 auto", position:"absolute", left:"50%", transform:"translateX(-50%)", top:10 }} />
      <h2 style={{ margin:0, fontSize:19, fontWeight:800 }}>{title}</h2>
      <button onClick={onClose} style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:10, width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
        <I icon="fa-xmark" style={{ color:"var(--muted)", fontSize:16 }} />
      </button>
    </div>
  );
}

function FormField({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ ...labelStyle, display:"flex", alignItems:"center", gap:6 }}>
        <I icon={icon} style={{ color:"var(--accent)", fontSize:11 }} />
        {label}
      </label>
      {children}
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: any) {
  return (
    <div style={{ textAlign:"center", padding:"50px 20px", color:"var(--muted)" }}>
      <I icon={icon} style={{ fontSize:36, opacity:0.25, display:"block", marginBottom:10 }} />
      <p style={{ margin:"0 0 3px", fontWeight:700, fontSize:15 }}>{title}</p>
      <p style={{ margin:0, fontSize:13 }}>{subtitle}</p>
    </div>
  );
}

// ── Helpers ──
const labelStyle: React.CSSProperties = { fontSize:11, fontWeight:700, color:"var(--muted)", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.06em" };

function formatDay(dateStr: string): string {
  const d = new Date(dateStr+"T12:00:00");
  const today = new Date(); today.setHours(12,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate()-1);
  if (d.toDateString()===today.toDateString()) return "Today";
  if (d.toDateString()===yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-PH",{weekday:"long",month:"short",day:"numeric"});
}

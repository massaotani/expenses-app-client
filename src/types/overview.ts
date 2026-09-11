export interface BudgetOverviewItem {
  id: number;
  category: string;
  spent: number;
  limit: number;
  color: string;
}

export interface TransactionSummary {
  id: number;
  title: string;
  category: string;
  date: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  emoji: string;
}

export interface OverviewData {
  userName: string;
  monthYear: string;
  totalBalance: number;
  balanceChangePercentage: number;
  income: number;
  expenses: number;
  budgets: BudgetOverviewItem[];
  recentTransactions: TransactionSummary[];
}

export interface SpringBootExpense {
  id?: string;
  description: string;
  value: number;
  category: string;
  dueDate: string;
  isPaid: boolean;
  paidAt?: string | null;
  paymentType: "CASH" | "CARD";
  recurrencePeriod: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  cardId?: string | null;
}

export interface UserProfile {
  id: string;
  name: string;
  monthlyIncome: number;
  investmentPot: number;
  monthlyExpenses: number;
  currency?: string;
}

export interface SpringBootIncome {
  id: string;
  description: string;
  value?: number;
  amount?: number;
  createdAt: string;
}

export interface UserCard {
  id: string;
  name: string;
  cardType: "CREDIT" | "DEBIT";
}

export interface MonthlyBalance {
  id?: string;
  year: number;
  month: number;
  income: number;
  totalExpenses: number;
  savings: number;
}

export interface ExpenseItem {
  id: string;
  description?: string;
  title?: string;
  value?: number | string;
  amount?: number | string;
  category: string;
  dueDate?: string;
  paidAt?: string;
  date?: string;
  paymentType?: any;
  paymentMethod?: any;
  card?: any;
}

export interface IncomeItem {
  id: string;
  description?: string;
  title?: string;
  source?: string;
  value?: number | string;
  amount?: number | string;
  category?: string;
  createdAt?: string;
  date?: string;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  category: string;
  rawDate: Date;
  type: "INCOME" | "EXPENSE";
  paymentMethod?: string;
}

export interface FilterListHeaderProps {
  filterCategories: string[];
  filterCards: string[];
  selectedFilter: string;
  selectedCardFilter: string;
  setSelectedFilter: (value: string) => void;
  setSelectedCardFilter: (value: string) => void;
  isDark: boolean;
  appColors: any;
  getFilterLabel: (filter: string) => string;
  translatePaymentMethod: (method: string) => string;
  getPaymentIcon: (method?: string) => string;
}

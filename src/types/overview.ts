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
  type: 'INCOME' | 'EXPENSE';
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
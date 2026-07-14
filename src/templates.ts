import { ParsedData, KPIConfig, ChartConfig, type AccountConfig } from './types';

export interface Template {
  id: string;
  name: string;
  description: string;
  data: ParsedData;
  defaultKPIs: KPIConfig[];
  defaultCharts: ChartConfig[];
  accountConfig: AccountConfig; // ✅ เพิ่ม
}

export const templates: Template[] = [
  {
    id: 'futures',
    name: 'Prop Firm Futures Trading Journal',
    description: 'Track evaluations and live trades with advanced metrics: Win Rate, Profit Factor, Drawdown, setups, and session timelines.',
    data: {
      sourceName: 'My Prop Firm Sheets (Google Sheet Sync)',
      columns: [
        { name: 'Date', type: 'date' },
        { name: 'Symbol', type: 'string' },
        { name: 'Direction', type: 'string' },
        { name: 'Setup', type: 'string' },
        { name: 'Session', type: 'string' },
        { name: 'Contracts', type: 'number' },
        { name: 'P&L', type: 'number' },
        { name: 'R-Multiple', type: 'number' },
      ],
      rows: [
        { Date: '2026-07-01', Symbol: 'MNQ', Direction: 'Long', Setup: 'ICT Silver Bullet', Session: 'AM Session', Contracts: 2, 'P&L': 1250, 'R-Multiple': 2.5 },
        { Date: '2026-07-01', Symbol: 'MES', Direction: 'Short', Setup: 'FVG Entry', Session: 'PM Session', Contracts: 4, 'P&L': -600, 'R-Multiple': -1.0 },
        { Date: '2026-07-02', Symbol: 'MCL', Direction: 'Long', Setup: 'VWAP Deviation', Session: 'London Open', Contracts: 1, 'P&L': 450, 'R-Multiple': 1.5 },
        { Date: '2026-07-02', Symbol: 'MNQ', Direction: 'Short', Setup: 'Order Block Bounce', Session: 'AM Session', Contracts: 2, 'P&L': 2100, 'R-Multiple': 3.2 },
        { Date: '2026-07-03', Symbol: 'MES', Direction: 'Long', Setup: 'ICT Silver Bullet', Session: 'AM Session', Contracts: 3, 'P&L': -900, 'R-Multiple': -1.5 },
        { Date: '2026-07-03', Symbol: 'MGC', Direction: 'Long', Setup: 'Order Block Bounce', Session: 'London Open', Contracts: 2, 'P&L': 1800, 'R-Multiple': 2.0 },
        { Date: '2026-07-05', Symbol: 'MBT', Direction: 'Long', Setup: 'FVG Entry', Session: 'AM Session', Contracts: 1, 'P&L': 3500, 'R-Multiple': 4.5 },
        { Date: '2026-07-06', Symbol: 'MNQ', Direction: 'Long', Setup: 'VWAP Deviation', Session: 'PM Session', Contracts: 2, 'P&L': -1200, 'R-Multiple': -2.0 },
        { Date: '2026-07-06', Symbol: 'MES', Direction: 'Short', Setup: 'Order Block Bounce', Session: 'AM Session', Contracts: 4, 'P&L': 1500, 'R-Multiple': 2.1 },
        { Date: '2026-07-07', Symbol: 'MCL', Direction: 'Short', Setup: 'FVG Entry', Session: 'PM Session', Contracts: 2, 'P&L': 850, 'R-Multiple': 1.7 },
        { Date: '2026-07-07', Symbol: 'MNQ', Direction: 'Short', Setup: 'ICT Silver Bullet', Session: 'AM Session', Contracts: 2, 'P&L': -1000, 'R-Multiple': -1.5 },
        { Date: '2026-07-08', Symbol: 'MES', Direction: 'Long', Setup: 'VWAP Deviation', Session: 'AM Session', Contracts: 3, 'P&L': 2400, 'R-Multiple': 3.0 },
        { Date: '2026-07-08', Symbol: 'MGC', Direction: 'Short', Setup: 'Order Block Bounce', Session: 'PM Session', Contracts: 1, 'P&L': -500, 'R-Multiple': -1.0 },
        { Date: '2026-07-09', Symbol: 'MNQ', Direction: 'Long', Setup: 'ICT Silver Bullet', Session: 'AM Session', Contracts: 2, 'P&L': 1600, 'R-Multiple': 2.2 },
        { Date: '2026-07-09', Symbol: 'MBT', Direction: 'Long', Setup: 'FVG Entry', Session: 'PM Session', Contracts: 1, 'P&L': 4200, 'R-Multiple': 5.0 },
      ],
    },
    defaultKPIs: [
      {
        id: 'kpi-futures-1',
        title: 'Total Trades Executed',
        column: 'P&L',
        type: 'count',
        format: 'number',
        color: 'slate',
      },
      {
        id: 'kpi-futures-2',
        title: 'Net P&L Accumulated',
        column: 'P&L',
        type: 'sum',
        format: 'currency',
        color: 'emerald',
      },
      {
        id: 'kpi-futures-3',
        title: 'Win Rate Ratio',
        column: 'P&L',
        type: 'win_rate',
        format: 'percent',
        color: 'amber',
      },
      {
        id: 'kpi-futures-4',
        title: 'Profit Factor Index',
        column: 'P&L',
        type: 'profit_factor',
        format: 'number',
        color: 'sky',
      },
      {
        id: 'kpi-futures-5',
        title: 'Average R-Multiple',
        column: 'R-Multiple',
        type: 'avg',
        format: 'number',
        color: 'indigo',
      },
      {
        id: 'kpi-futures-6',
        title: 'Maximum Peak Drawdown',
        column: 'P&L',
        type: 'max_drawdown',
        format: 'currency',
        color: 'rose',
      },
      {
        id: 'kpi-futures-7',
        title: 'Current Prop Account Balance',
        column: 'P&L',
        type: 'current_balance',
        format: 'currency',
        color: 'slate',
      },
      {
        id: 'kpi-futures-8',
        title: 'Latest Trading Day P&L',
        column: 'P&L',
        type: 'daily_loss',
        format: 'currency',
        color: 'rose',
      },
    ],
    defaultCharts: [
      {
        id: 'chart-futures-1',
        title: 'Prop Firm Equity Curve ($100k Account)',
        type: 'area',
        xAxisKey: 'Date',
        yAxisKey: 'P&L',
        color: '#E5C158', // Gold
      },
      {
        id: 'chart-futures-2',
        title: 'Daily Profit & Loss Ledger',
        type: 'bar',
        xAxisKey: 'Date',
        yAxisKey: 'P&L',
        color: '#10b981', // green
      },
      {
        id: 'chart-futures-3',
        title: 'Monthly P&L Allocation',
        type: 'bar',
        xAxisKey: 'Date',
        yAxisKey: 'P&L',
        color: '#8b5cf6', // purple
      },
      {
        id: 'chart-futures-4',
        title: 'Win / Loss Ratio Overview',
        type: 'pie',
        xAxisKey: 'P&L',
        yAxisKey: 'P&L',
        color: '#E5C158',
      },
      {
        id: 'chart-futures-5',
        title: 'Win Rate Trend Evolution',
        type: 'line',
        xAxisKey: 'Date',
        yAxisKey: 'P&L',
        color: '#0ea5e9',
      },
      {
        id: 'chart-futures-6',
        title: 'Net Performance by Trade Setup',
        type: 'bar',
        xAxisKey: 'Setup',
        yAxisKey: 'P&L',
        color: '#E5C158',
      },
      {
        id: 'chart-futures-7',
        title: 'Performance Distribution by Session',
        type: 'bar',
        xAxisKey: 'Session',
        yAxisKey: 'P&L',
        color: '#3b82f6',
      },
    ],
    accountConfig: {
      startingBalance: 100000,
      profitTarget: 6000,
      dailyLossLimit: 1000,
      trailingDrawdown: 3000,
      consistencyLimit: 40
    }
  },
  {
    id: 'sales',
    name: 'Sales Performance & Revenue',
    description: 'Track reps, products, regions, deals closed, and total sales revenue.',
    data: {
      sourceName: 'Sales Performance (Sample)',
      columns: [
        { name: 'Date', type: 'date' },
        { name: 'Representative', type: 'string' },
        { name: 'Category', type: 'string' },
        { name: 'Deals Closed', type: 'number' },
        { name: 'Revenue', type: 'number' },
        { name: 'Region', type: 'string' },
      ],
      rows: [
        { Date: '2026-01-05', Representative: 'Alex', Category: 'Enterprise Software', 'Deals Closed': 4, Revenue: 12000, Region: 'North America' },
        { Date: '2026-01-12', Representative: 'Sarah', Category: 'Cloud Storage', 'Deals Closed': 12, Revenue: 8400, Region: 'Europe' },
        { Date: '2026-01-19', Representative: 'Alex', Category: 'Consulting', 'Deals Closed': 2, Revenue: 15000, Region: 'North America' },
        { Date: '2026-01-26', Representative: 'Chen', Category: 'Enterprise Software', 'Deals Closed': 5, Revenue: 22000, Region: 'Asia Pacific' },
        { Date: '2026-02-02', Representative: 'Sarah', Category: 'Security Services', 'Deals Closed': 8, Revenue: 14500, Region: 'Europe' },
        { Date: '2026-02-09', Representative: 'Alex', Category: 'Cloud Storage', 'Deals Closed': 15, Revenue: 10500, Region: 'North America' },
        { Date: '2026-02-16', Representative: 'Chen', Category: 'Consulting', 'Deals Closed': 3, Revenue: 18000, Region: 'Asia Pacific' },
        { Date: '2026-02-23', Representative: 'Elena', Category: 'Enterprise Software', 'Deals Closed': 7, Revenue: 24500, Region: 'South America' },
        { Date: '2026-03-02', Representative: 'Sarah', Category: 'Consulting', 'Deals Closed': 4, Revenue: 20000, Region: 'Europe' },
        { Date: '2026-03-09', Representative: 'Elena', Category: 'Security Services', 'Deals Closed': 9, Revenue: 16200, Region: 'South America' },
        { Date: '2026-03-16', Representative: 'Chen', Category: 'Cloud Storage', 'Deals Closed': 18, Revenue: 12600, Region: 'Asia Pacific' },
        { Date: '2026-03-23', Representative: 'Alex', Category: 'Security Services', 'Deals Closed': 6, Revenue: 11000, Region: 'North America' },
      ],
    },
    defaultKPIs: [
      {
        id: 'kpi-sales-1',
        title: 'Total Revenue',
        column: 'Revenue',
        type: 'sum',
        format: 'currency',
        color: 'emerald',
      },
      {
        id: 'kpi-sales-2',
        title: 'Total Deals Closed',
        column: 'Deals Closed',
        type: 'sum',
        format: 'number',
        color: 'indigo',
      },
      {
        id: 'kpi-sales-3',
        title: 'Avg Revenue per Deal',
        column: 'Revenue',
        type: 'avg',
        format: 'currency',
        color: 'amber',
      },
      {
        id: 'kpi-sales-4',
        title: 'Total Transactions',
        column: 'Revenue',
        type: 'count',
        format: 'number',
        color: 'slate',
      },
    ],
    defaultCharts: [
      {
        id: 'chart-sales-1',
        title: 'Revenue by Representative',
        type: 'bar',
        xAxisKey: 'Representative',
        yAxisKey: 'Revenue',
        color: '#10b981', // emerald
      },
      {
        id: 'chart-sales-2',
        title: 'Deals by Product Category',
        type: 'pie',
        xAxisKey: 'Category',
        yAxisKey: 'Deals Closed',
        color: '#6366f1', // indigo
      },
      {
        id: 'chart-sales-3',
        title: 'Revenue over Time',
        type: 'area',
        xAxisKey: 'Date',
        yAxisKey: 'Revenue',
        color: '#3b82f6', // blue
      },
    ],
    accountConfig: {
      startingBalance: 0,
      profitTarget: 0,
      dailyLossLimit: 0,
      trailingDrawdown: 0,
      consistencyLimit: 40
    }
  },
  {
    id: 'budget',
    name: 'Personal Budget & Expense Tracker',
    description: 'Track monthly personal expenses, bills, investments, and discretionary spending.',
    data: {
      sourceName: 'Personal Finance (Sample)',
      columns: [
        { name: 'Date', type: 'date' },
        { name: 'Category', type: 'string' },
        { name: 'Merchant', type: 'string' },
        { name: 'Amount', type: 'number' },
        { name: 'Payment Method', type: 'string' },
      ],
      rows: [
        { Date: '2026-06-01', Category: 'Rent & Housing', Merchant: 'Pine Management', Amount: 1450, 'Payment Method': 'Bank Transfer' },
        { Date: '2026-06-03', Category: 'Groceries', Merchant: 'Whole Foods', Amount: 145.2, 'Payment Method': 'Credit Card' },
        { Date: '2026-06-04', Category: 'Dining Out', Merchant: 'Ramen Ichiran', Amount: 42.5, 'Payment Method': 'Apple Pay' },
        { Date: '2026-06-05', Category: 'Utilities', Merchant: 'ConEd Power', Amount: 98.7, 'Payment Method': 'Auto-Pay' },
        { Date: '2026-06-08', Category: 'Transport', Merchant: 'Uber Trip', Amount: 24.5, 'Payment Method': 'Credit Card' },
        { Date: '2026-06-10', Category: 'Entertainment', Merchant: 'Netflix Subscription', Amount: 19.99, 'Payment Method': 'Credit Card' },
        { Date: '2026-06-12', Category: 'Groceries', Merchant: 'Trader Joes', Amount: 88.4, 'Payment Method': 'Credit Card' },
        { Date: '2026-06-15', Category: 'Shopping', Merchant: 'Amazon', Amount: 112.5, 'Payment Method': 'Credit Card' },
        { Date: '2026-06-18', Category: 'Dining Out', Merchant: 'Blue Bottle Coffee', Amount: 18.25, 'Payment Method': 'Apple Pay' },
        { Date: '2026-06-20', Category: 'Health & Fitness', Merchant: 'Equinox Gym', Amount: 180, 'Payment Method': 'Auto-Pay' },
        { Date: '2026-06-22', Category: 'Groceries', Merchant: 'Local Farmer Market', Amount: 34.6, 'Payment Method': 'Cash' },
        { Date: '2026-06-25', Category: 'Transport', Merchant: 'Gas Station', Amount: 45.0, 'Payment Method': 'Credit Card' },
        { Date: '2026-06-28', Category: 'Shopping', Merchant: 'Nike Store', Amount: 135.0, 'Payment Method': 'Credit Card' },
      ],
    },
    defaultKPIs: [
      {
        id: 'kpi-budget-1',
        title: 'Total Spending',
        column: 'Amount',
        type: 'sum',
        format: 'currency',
        color: 'rose',
      },
      {
        id: 'kpi-budget-2',
        title: 'Average Expense',
        column: 'Amount',
        type: 'avg',
        format: 'currency',
        color: 'amber',
      },
      {
        id: 'kpi-budget-3',
        title: 'Highest Expense',
        column: 'Amount',
        type: 'max',
        format: 'currency',
        color: 'violet',
      },
      {
        id: 'kpi-budget-4',
        title: 'Number of Expenses',
        column: 'Amount',
        type: 'count',
        format: 'number',
        color: 'slate',
      },
    ],
    defaultCharts: [
      {
        id: 'chart-budget-1',
        title: 'Expenses by Category',
        type: 'bar',
        xAxisKey: 'Category',
        yAxisKey: 'Amount',
        color: '#f43f5e', // rose
      },
      {
        id: 'chart-budget-2',
        title: 'Spending Share',
        type: 'pie',
        xAxisKey: 'Category',
        yAxisKey: 'Amount',
        color: '#8b5cf6', // violet
      },
      {
        id: 'chart-budget-3',
        title: 'Expenses by Payment Method',
        type: 'bar',
        xAxisKey: 'Payment Method',
        yAxisKey: 'Amount',
        color: '#eab308', // amber
      },
    ],
    accountConfig: {
      startingBalance: 0,
      profitTarget: 0,
      dailyLossLimit: 0,
      trailingDrawdown: 0,
      consistencyLimit: 40
    }
  },
  {
    id: 'saas',
    name: 'SaaS Platform KPIs',
    description: 'Monitor monthly recurring revenue (MRR), user signups, active users, and platform scale.',
    data: {
      sourceName: 'SaaS Business Metrics (Sample)',
      columns: [
        { name: 'Month', type: 'string' },
        { name: 'MRR', type: 'number' },
        { name: 'Signups', type: 'number' },
        { name: 'Active Users', type: 'number' },
        { name: 'Churn Rate %', type: 'number' },
      ],
      rows: [
        { Month: 'January', MRR: 12000, Signups: 240, 'Active Users': 1800, 'Churn Rate %': 3.1 },
        { Month: 'February', MRR: 14500, Signups: 280, 'Active Users': 2020, 'Churn Rate %': 2.8 },
        { Month: 'March', MRR: 18200, Signups: 350, 'Active Users': 2310, 'Churn Rate %': 2.5 },
        { Month: 'April', MRR: 21000, Signups: 310, 'Active Users': 2540, 'Churn Rate %': 2.9 },
        { Month: 'May', MRR: 24800, Signups: 420, 'Active Users': 2890, 'Churn Rate %': 2.2 },
        { Month: 'June', MRR: 29500, Signups: 510, 'Active Users': 3310, 'Churn Rate %': 2.0 },
      ],
    },
    defaultKPIs: [
      {
        id: 'kpi-saas-1',
        title: 'Current MRR',
        column: 'MRR',
        type: 'max',
        format: 'currency',
        color: 'emerald',
      },
      {
        id: 'kpi-saas-2',
        title: 'Total New Signups',
        column: 'Signups',
        type: 'sum',
        format: 'number',
        color: 'indigo',
      },
      {
        id: 'kpi-saas-3',
        title: 'Peak Active Users',
        column: 'Active Users',
        type: 'max',
        format: 'number',
        color: 'sky',
      },
      {
        id: 'kpi-saas-4',
        title: 'Avg Churn Rate',
        column: 'Churn Rate %',
        type: 'avg',
        format: 'percent',
        color: 'rose',
      },
    ],
    defaultCharts: [
      {
        id: 'chart-saas-1',
        title: 'MRR Growth Over Months',
        type: 'area',
        xAxisKey: 'Month',
        yAxisKey: 'MRR',
        color: '#10b981', // emerald
      },
      {
        id: 'chart-saas-2',
        title: 'Monthly User Signups',
        type: 'bar',
        xAxisKey: 'Month',
        yAxisKey: 'Signups',
        color: '#6366f1', // indigo
      },
      {
        id: 'chart-saas-3',
        title: 'Active Users Trend',
        type: 'line',
        xAxisKey: 'Month',
        yAxisKey: 'Active Users',
        color: '#0ea5e9', // sky
      },
    ],
    accountConfig: {
      startingBalance: 0,
      profitTarget: 0,
      dailyLossLimit: 0,
      trailingDrawdown: 0,
      consistencyLimit: 40
    }
  }
];
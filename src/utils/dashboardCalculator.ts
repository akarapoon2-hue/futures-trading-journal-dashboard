// =============================================
// src/utils/dashboardCalculator.ts
// คำนวณ KPI ทั้งหมดจาก trades และ account
// ใช้ร่วมกันทุกหน้า
//
// แก้ไขครบทุกจุด:
// 1. Win Rate = Wins / (Wins + Losses) ไม่นับ BE
// 2. Daily Loss ใช้วันที่เทรดล่าสุด ไม่ใช่วันนี้
// 3. Drawdown Buffer ใช้ Current Drawdown ไม่ใช่ Max Drawdown
// 4. Daily Loss Usage = max(-PnL, 0) / limit (ไม่ใช้ Math.abs)
// 5. toNumber() ป้องกัน string และ null จาก Supabase
// 6. trailing_drawdown แปลงก่อนตรวจค่า
// 7. Profit Target Progress ไม่ติดลบ
// 8. เรียงลำดับด้วย Date + Time
// 9. Latest Trade ใช้ sortedTrades (เรียงแล้ว)
// 10. Current Drawdown ป้องกันค่าติดลบ
// 11. Profit Factor ใช้ค่าที่ปลอดภัย (ไม่ใช้ Infinity)
// 12. Latest Day P&L ใช้ sortedTrades (สอดคล้อง)
// 13. starting_balance ใช้ตรรกะแยก clear
// =============================================

// ✅ อัปเดต import จาก types/trading
import type { Trade, Account, DashboardMetrics } from '../types/trading';

// =============================================
// toNumber() ป้องกัน string และ null
// =============================================
function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// =============================================
// Main Calculator
// =============================================
export function calculateDashboard(trades: Trade[], account: Account): DashboardMetrics {
  const totalTrades = trades.length;
  
  // ✅ ข้อ 1: แยก Wins, Losses, Break Even
  const wins = trades.filter(t => toNumber(t.net_pnl) > 0);
  const losses = trades.filter(t => toNumber(t.net_pnl) < 0);
  const breakEven = trades.filter(t => toNumber(t.net_pnl) === 0);
  
  const winningTrades = wins.length;
  const losingTrades = losses.length;
  const breakEvenTrades = breakEven.length;
  
  // ✅ ข้อ 1: Win Rate = Wins / (Wins + Losses) ไม่นับ BE
  const completedTrades = winningTrades + losingTrades;
  const winRate = completedTrades > 0 
    ? winningTrades / completedTrades 
    : 0;
  
  // P&L ใช้ toNumber()
  const totalPnL = trades.reduce((sum, trade) => sum + toNumber(trade.net_pnl), 0);
  const totalWins = wins.reduce((sum, trade) => sum + toNumber(trade.net_pnl), 0);
  const totalLosses = Math.abs(losses.reduce((sum, trade) => sum + toNumber(trade.net_pnl), 0));
  
  const averageWin = winningTrades > 0 ? totalWins / winningTrades : 0;
  const averageLoss = losingTrades > 0 ? totalLosses / losingTrades : 0;
  
  // ✅ ข้อ 11: Profit Factor - ป้องกัน Infinity
  const profitFactor = totalLosses > 0 
    ? Math.min(totalWins / totalLosses, Number.MAX_SAFE_INTEGER)
    : totalWins > 0 
      ? Number.MAX_SAFE_INTEGER
      : 0;
  
  const expectancy = totalTrades > 0 ? totalPnL / totalTrades : 0;
  
  // R-Multiple ใช้ toNumber()
  const averageR = totalTrades > 0
    ? trades.reduce((sum, trade) => sum + toNumber(trade.r_multiple), 0) / totalTrades
    : 0;
  
  // ✅ ข้อ 8: เรียงลำดับด้วย Date + Time
  const sortedTrades = [...trades].sort((a, b) => {
    const dateCompare = a.trade_date.localeCompare(b.trade_date);
    
    if (dateCompare !== 0) {
      return dateCompare;
    }
    
    return (a.trade_time || '').localeCompare(b.trade_time || '');
  });
  
  // ✅ ข้อ 13: starting_balance แยก clear
  const startingBalance = toNumber(account.starting_balance);
  const initialBalance = startingBalance > 0 ? startingBalance : 100000;
  
  let peakBalance = initialBalance;
  let currentBalance = initialBalance;
  let maxDrawdown = 0;
  
  // ในลูปใช้ toNumber()
  for (const trade of sortedTrades) {
    currentBalance += toNumber(trade.net_pnl);
    if (currentBalance > peakBalance) {
      peakBalance = currentBalance;
    }
    const drawdown = peakBalance - currentBalance;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  // ✅ ข้อ 10: Current Drawdown ป้องกันค่าติดลบ
  const currentDrawdown = Math.max(peakBalance - currentBalance, 0);
  
  // ✅ ข้อ 6: แปลง trailing_drawdown ก่อนตรวจค่า
  const trailingDrawdown = toNumber(account.trailing_drawdown);
  const drawdownBuffer = trailingDrawdown > 0
    ? Math.max(1 - (currentDrawdown / trailingDrawdown), 0)
    : 0;
  
  // Consistency - highest profit day
  const dailyPnL: Record<string, number> = {};
  for (const trade of trades) {
    const date = trade.trade_date;
    dailyPnL[date] = (dailyPnL[date] || 0) + toNumber(trade.net_pnl);
  }
  
  const dailyProfits = Object.values(dailyPnL).filter(v => v > 0);
  const highestProfitDay = dailyProfits.length > 0 ? Math.max(...dailyProfits) : 0;
  const consistency = totalPnL > 0 ? highestProfitDay / totalPnL : 0;
  
  // ✅ ข้อ 7: Profit Target Progress ไม่ติดลบ (0-1 เสมอ)
  const profitTarget = toNumber(account.profit_target);
  const profitTargetProgress = profitTarget > 0
    ? Math.max(Math.min(totalPnL / profitTarget, 1), 0)
    : 0;
  
  // ✅ ข้อ 9: Latest Trade ใช้ sortedTrades (เรียงแล้ว)
  const latestTrade = sortedTrades.length > 0
    ? sortedTrades[sortedTrades.length - 1]
    : null;
  
  const latestTradingDay = latestTrade?.trade_date || '';
  
  // ✅ ข้อ 12: Latest Day P&L ใช้ sortedTrades (สอดคล้อง)
  const latestDayPnL = latestTrade
    ? sortedTrades
        .filter(t => t.trade_date === latestTrade.trade_date)
        .reduce((sum, t) => sum + toNumber(t.net_pnl), 0)
    : 0;
  
  // ✅ ข้อ 4: Daily Loss Usage = max(-PnL, 0) / limit
  const dailyLossLimit = toNumber(account.daily_loss_limit);
  const latestDayLoss = Math.max(-latestDayPnL, 0);
  
  const dailyLossUsage = dailyLossLimit > 0
    ? Math.min(latestDayLoss / dailyLossLimit, 1)
    : 0;

  return {
    // Basic
    totalTrades,
    winningTrades,
    losingTrades,
    breakEvenTrades,
    winRate,
    
    // P&L
    totalPnL,
    averageWin,
    averageLoss,
    profitFactor,
    expectancy,
    
    // Risk
    averageR,
    maxDrawdown,
    currentDrawdown,
    currentBalance,
    peakBalance,
    
    // Consistency
    highestProfitDay,
    consistency,
    
    // Targets
    profitTargetProgress,
    dailyLossUsage,
    drawdownBuffer,
    
    // Latest
    latestDayPnL,
    latestTradingDay,
  };
}
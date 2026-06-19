const pool = require('../config/db');
const budgetRepository = require('../repositories/BudgetRepository');
const goalRepository = require('../repositories/GoalRepository');

class HealthService {
  async getHealthScore(userId) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    return this.getHealthScoreForMonth(userId, currentMonth, currentYear);
  }

  async getHealthScoreForMonth(userId, month, year) {
    const lastDay = new Date(year, month, 0).getDate();
    const dateLimit = new Date(Date.UTC(year, month - 1, lastDay, 23, 59, 59));
    const targetDateStr = dateLimit.toISOString().split('T')[0];

    // 1. Fetch current month's stats
    const summary = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'income' THEN converted_amount ELSE 0 END), 0) AS total_income,
         COALESCE(SUM(CASE WHEN type = 'expense' THEN converted_amount ELSE 0 END), 0) AS total_expense
       FROM transactions
       WHERE user_id = $1
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR FROM date) = $3`,
      [userId, month, year]
    );

    const income = parseFloat(summary.rows[0].total_income);
    const expense = parseFloat(summary.rows[0].total_expense);
    const savings = Math.max(0, income - expense);

    // ── A. Savings Rate (25%) ──
    let savingsRateScore = 15; // default middle
    if (income > 0) {
      const rate = (savings / income) * 100;
      if (rate >= 20) savingsRateScore = 25;
      else if (rate >= 15) savingsRateScore = 20;
      else if (rate >= 10) savingsRateScore = 15;
      else if (rate >= 5) savingsRateScore = 10;
      else savingsRateScore = 5;
    }

    // ── B. Budget Adherence (20%) ──
    const budgets = await budgetRepository.findAllForUser(userId, { month, year });
    let budgetAdherenceScore = 20; // default full if no budgets set
    if (budgets.length > 0) {
      const underLimitCount = budgets.filter(b => parseFloat(b.amount_spent) <= parseFloat(b.limit_amount)).length;
      const pct = (underLimitCount / budgets.length) * 100;
      if (pct >= 90) budgetAdherenceScore = 20;
      else if (pct >= 80) budgetAdherenceScore = 16;
      else if (pct >= 70) budgetAdherenceScore = 12;
      else budgetAdherenceScore = 8;
    }

    // ── C. Emergency Fund Coverage (20%) ──
    const goals = await goalRepository.findAllForUser(userId);
    const emergencyFundGoal = goals.find(g => g.category === 'emergency_fund');
    let emergencyCoverageScore = 10; // default middle
    if (emergencyFundGoal) {
      const emergencyValue = parseFloat(emergencyFundGoal.current_amount || 0);
      if (expense > 0) {
        const monthsCovered = emergencyValue / expense;
        if (monthsCovered >= 6) emergencyCoverageScore = 20;
        else if (monthsCovered >= 3) emergencyCoverageScore = 15;
        else if (monthsCovered >= 1) emergencyCoverageScore = 10;
        else emergencyCoverageScore = 5;
      } else if (emergencyValue > 0) {
        emergencyCoverageScore = 20;
      } else {
        emergencyCoverageScore = 5;
      }
    } else {
      emergencyCoverageScore = 8;
    }

    // ── D. Income Stability (15%) ──
    // Coefficient of variation of monthly income over the last 6 months
    const incomeHistory = await pool.query(
      `SELECT
         EXTRACT(YEAR FROM date) as yr,
         EXTRACT(MONTH FROM date) as mo,
         COALESCE(SUM(converted_amount), 0) AS monthly_income
       FROM transactions
       WHERE user_id = $1
         AND type = 'income'
         AND date <= $2
       GROUP BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date)
       ORDER BY yr DESC, mo DESC
       LIMIT 6`,
      [userId, targetDateStr]
    );

    const incomes = incomeHistory.rows.map(r => parseFloat(r.monthly_income));
    let stabilityScore = 15;
    if (incomes.length > 0) {
      const sum = incomes.reduce((a, b) => a + b, 0);
      const mean = sum / incomes.length;
      if (mean > 0) {
        const variance = incomes.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / incomes.length;
        const stdDev = Math.sqrt(variance);
        const cv = stdDev / mean;
        if (cv < 0.10) stabilityScore = 15;
        else if (cv < 0.20) stabilityScore = 12;
        else if (cv < 0.30) stabilityScore = 8;
        else stabilityScore = 5;
      } else {
        stabilityScore = 5;
      }
    } else {
      stabilityScore = 10;
    }

    // ── E. Spending Consistency (10%) ──
    // Coefficient of variation of monthly expenses over the last 6 months
    const expenseHistory = await pool.query(
      `SELECT
         EXTRACT(YEAR FROM date) as yr,
         EXTRACT(MONTH FROM date) as mo,
         COALESCE(SUM(converted_amount), 0) AS monthly_expense
       FROM transactions
       WHERE user_id = $1
         AND type = 'expense'
         AND date <= $2
       GROUP BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date)
       ORDER BY yr DESC, mo DESC
       LIMIT 6`,
      [userId, targetDateStr]
    );

    const expensesList = expenseHistory.rows.map(r => parseFloat(r.monthly_expense));
    let consistencyScore = 10;
    if (expensesList.length > 0) {
      const sum = expensesList.reduce((a, b) => a + b, 0);
      const mean = sum / expensesList.length;
      if (mean > 0) {
        const variance = expensesList.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / expensesList.length;
        const stdDev = Math.sqrt(variance);
        const cv = stdDev / mean;
        if (cv < 0.15) consistencyScore = 10;
        else if (cv < 0.30) consistencyScore = 7;
        else consistencyScore = 4;
      } else {
        consistencyScore = 10;
      }
    } else {
      consistencyScore = 7;
    }

    // ── F. Financial Growth (10%) ──
    // 3-month savings rate/trend
    const threeMonthsAgo = new Date(dateLimit);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0];

    const growthHistory = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'income' THEN converted_amount ELSE 0 END), 0) AS total_income,
         COALESCE(SUM(CASE WHEN type = 'expense' THEN converted_amount ELSE 0 END), 0) AS total_expense
       FROM transactions
       WHERE user_id = $1
         AND date <= $2
         AND date > $3`,
      [userId, targetDateStr, threeMonthsAgoStr]
    );

    const totalIncome3mo = parseFloat(growthHistory.rows[0].total_income);
    const totalExpense3mo = parseFloat(growthHistory.rows[0].total_expense);
    const savings3mo = totalIncome3mo - totalExpense3mo;

    let growthScore = 10;
    if (totalIncome3mo > 0) {
      if (savings3mo > 0) growthScore = 10;
      else if (savings3mo >= -0.1 * totalIncome3mo) growthScore = 6;
      else growthScore = 3;
    } else {
      if (totalExpense3mo === 0) growthScore = 6;
      else growthScore = 3;
    }

    const overall = savingsRateScore + budgetAdherenceScore + emergencyCoverageScore + stabilityScore + consistencyScore + growthScore;

    let label = 'Fair';
    if (overall >= 80) label = 'Excellent';
    else if (overall >= 70) label = 'Good';
    else if (overall >= 50) label = 'Fair';
    else label = 'Needs Attention';

    return {
      overall: Math.min(overall, 100),
      label,
      components: [
        { name: 'Savings Rate', score: Math.round((savingsRateScore / 25) * 100), max: 100 },
        { name: 'Budget Adherence', score: Math.round((budgetAdherenceScore / 20) * 100), max: 100 },
        { name: 'Emergency Fund', score: Math.round((emergencyCoverageScore / 20) * 100), max: 100 },
        { name: 'Income Stability', score: Math.round((stabilityScore / 15) * 100), max: 100 },
        { name: 'Spending Consistency', score: Math.round((consistencyScore / 10) * 100), max: 100 },
        { name: 'Financial Growth', score: Math.round((growthScore / 10) * 100), max: 100 },
      ]
    };
  }

  async getHealthHistory(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM financial_health_snapshots WHERE user_id = $1 ORDER BY computed_at DESC LIMIT 6`,
      [userId]
    );
    if (rows.length === 0) {
      // Calculate dynamic health scores for the last 6 months
      const history = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        
        const scoreObj = await this.getHealthScoreForMonth(userId, m, y);
        history.push({
          month: d.toLocaleString('en', { month: 'short' }),
          score: scoreObj.overall
        });
      }
      return history;
    }
    return rows.map(r => ({
      month: new Date(r.computed_at).toLocaleString('en', { month: 'short' }),
      score: r.score
    })).reverse();
  }
}

module.exports = new HealthService();

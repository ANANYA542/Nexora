const investmentRepository = require('../repositories/InvestmentRepository');
const AppError = require('../utils/AppError');

class InvestmentService {
  async getInvestments(userId) {
    const investments = await investmentRepository.findAllForUser(userId);
    return investments.map(i => ({
      ...i,
      invested_amount: parseFloat(i.invested_amount),
      current_value: parseFloat(i.current_value),
      units: i.units ? parseFloat(i.units) : null,
      return_pct: i.invested_amount > 0 ? Math.round(((parseFloat(i.current_value) - parseFloat(i.invested_amount)) / parseFloat(i.invested_amount)) * 100 * 10) / 10 : 0
    }));
  }

  async createInvestment(userId, body) {
    const { name, type, platform, invested_amount, current_value, units, last_updated, metadata } = body;
    if (!name || !type || !invested_amount || invested_amount <= 0) {
      throw new AppError('Name, type, and positive invested amount are required', 400);
    }
    return investmentRepository.create({
      userId, name, type, platform, invested_amount, current_value: current_value || invested_amount, units, last_updated, metadata
    });
  }

  async updateInvestment(userId, investmentId, body) {
    const holding = await investmentRepository.findByIdForUser(investmentId, userId);
    if (!holding) {
      throw new AppError('Investment holding not found', 404);
    }
    return investmentRepository.updateForUser(investmentId, userId, body);
  }

  async deleteInvestment(userId, investmentId) {
    const deleted = await investmentRepository.deleteForUser(investmentId, userId);
    if (!deleted) {
      throw new AppError('Investment holding not found', 404);
    }
    return deleted;
  }

  async getPortfolioSummary(userId) {
    const summary = await investmentRepository.getPortfolioSummary(userId);
    const allocation = await investmentRepository.getAllocation(userId);

    const totalInvested = parseFloat(summary.total_invested);
    const currentValue = parseFloat(summary.total_current_value);
    const totalReturns = parseFloat(summary.total_returns);
    const returnPct = totalInvested > 0 ? Math.round((totalReturns / totalInvested) * 100 * 10) / 10 : 0;

    return {
      total_invested: totalInvested,
      current_value: currentValue,
      total_returns: totalReturns,
      return_pct: returnPct,
      allocation: allocation.map(a => ({
        type: a.type,
        value: parseFloat(a.total_value)
      }))
    };
  }
}

module.exports = new InvestmentService();

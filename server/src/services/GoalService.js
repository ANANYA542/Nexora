const goalRepository = require('../repositories/GoalRepository');
const AppError = require('../utils/AppError');

class GoalService {
  async getGoals(userId) {
    const goals = await goalRepository.findAllForUser(userId);
    return goals.map(g => ({
      ...g,
      target_amount: parseFloat(g.target_amount),
      current_amount: parseFloat(g.current_amount),
      auto_save_amount: g.auto_save_amount ? parseFloat(g.auto_save_amount) : null,
      progress_pct: g.target_amount > 0 ? Math.round((parseFloat(g.current_amount) / parseFloat(g.target_amount)) * 100) : 0
    }));
  }

  async createGoal(userId, body) {
    const { name, target_amount, current_amount, deadline, priority, category, auto_save_amount } = body;
    if (!name || !target_amount || target_amount <= 0) {
      throw new AppError('Name and positive target amount are required', 400);
    }
    return goalRepository.create({
      userId, name, target_amount, current_amount, deadline, priority, category, auto_save_amount
    });
  }

  async updateGoal(userId, goalId, body) {
    const goal = await goalRepository.findByIdForUser(goalId, userId);
    if (!goal) {
      throw new AppError('Goal not found', 404);
    }
    return goalRepository.updateForUser(goalId, userId, body);
  }

  async contributeToGoal(userId, goalId, body) {
    const { amount } = body;
    if (!amount || amount <= 0) {
      throw new AppError('Contribution amount must be positive', 400);
    }
    const goal = await goalRepository.findByIdForUser(goalId, userId);
    if (!goal) {
      throw new AppError('Goal not found', 404);
    }
    return goalRepository.contributeForUser(goalId, userId, amount);
  }

  async deleteGoal(userId, goalId) {
    const deleted = await goalRepository.deleteForUser(goalId, userId);
    if (!deleted) {
      throw new AppError('Goal not found', 404);
    }
    return deleted;
  }
}

module.exports = new GoalService();

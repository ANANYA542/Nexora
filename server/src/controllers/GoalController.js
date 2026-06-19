const goalService = require('../services/GoalService');
const { sendSuccess } = require('../utils/response');

class GoalController {
  async getGoals(req, res) {
    try {
      const goals = await goalService.getGoals(req.user.id);
      sendSuccess(res, { goals });
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  async createGoal(req, res) {
    try {
      const goal = await goalService.createGoal(req.user.id, req.body);
      sendSuccess(res, { goal }, 'Goal created successfully', 201);
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  async updateGoal(req, res) {
    try {
      const goal = await goalService.updateGoal(req.user.id, req.params.id, req.body);
      sendSuccess(res, { goal }, 'Goal updated successfully');
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  async contributeToGoal(req, res) {
    try {
      const goal = await goalService.contributeToGoal(req.user.id, req.params.id, req.body);
      sendSuccess(res, { goal }, 'Contribution successfully applied');
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  async deleteGoal(req, res) {
    try {
      await goalService.deleteGoal(req.user.id, req.params.id);
      sendSuccess(res, null, 'Goal deleted successfully');
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new GoalController();

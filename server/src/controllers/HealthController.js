const healthService = require('../services/HealthService');
const { sendSuccess } = require('../utils/response');

class HealthController {
  async getHealthScore(req, res) {
    try {
      const score = await healthService.getHealthScore(req.user.id);
      sendSuccess(res, score);
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  async getHealthHistory(req, res) {
    try {
      const history = await healthService.getHealthHistory(req.user.id);
      sendSuccess(res, { history });
    } catch (err) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new HealthController();

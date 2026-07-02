const { IsolationForest } = require('ml-isolation-forest');
const transactionRepository = require('../repositories/TransactionRepository');

class MLAnomalyService {
  /**
   * Extract numeric features for the Isolation Forest model.
   */
  _extractFeatures(tx) {
    const date = new Date(tx.date);
    return [
      Number(tx.converted_amount) || Number(tx.amount),
      date.getDate(),      // Day of month
      date.getDay(),       // Day of week
    ];
  }

  /**
   * Train the isolation forest on the user's historical transactions.
   * Returns a trained model or null if insufficient data.
   */
  async _trainModel(userId) {
    const transactions = await transactionRepository.findByUserId(userId, 500); // Last 500 tx
    if (!transactions || transactions.length < 10) {
      return null; // Not enough data for reliable ML
    }

    // Filter to expenses only if we want to model spending, or both. Let's model expenses.
    const expenses = transactions.filter(t => t.type === 'expense');
    if (expenses.length < 10) return null;

    const data = expenses.map(this._extractFeatures);

    const model = new IsolationForest({
      nEstimators: 100, // Number of trees
      maxSamples: 'auto',
      contamination: 0.05, // Expected % of anomalies in dataset
    });

    model.train(data);
    return model;
  }

  /**
   * Predict if a new transaction is an anomaly.
   * Returns { isMLAnomaly: boolean, score: number }
   */
  async predictAnomaly(userId, newTransaction) {
    if (newTransaction.type !== 'expense') {
      return { isMLAnomaly: false, score: 0 };
    }

    const model = await this._trainModel(userId);
    if (!model) {
      return { isMLAnomaly: false, score: 0 }; // Fallback if no model
    }

    const feature = [this._extractFeatures(newTransaction)];
    const predictions = model.predict(feature);
    
    // In typical IsolationForest implementations, 1 = anomaly, 0 or -1 = normal
    // But some implementations return an anomaly score array. ml-isolation-forest returns objects.
    // ml-isolation-forest usually returns an array of scores between 0 and 1. Scores > 0.5 are anomalies.
    const score = predictions[0];
    
    const isMLAnomaly = score > 0.6; // Stricter threshold to avoid false positives

    return { isMLAnomaly, score };
  }
}

module.exports = new MLAnomalyService();

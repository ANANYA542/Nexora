const pool = require('../config/db');
const { createChatCompletion } = require('../utils/aiClient');
const { sendEmail } = require('../utils/email');
const userRepository = require('../repositories/UserRepository');
const notificationRepo = require('../repositories/NotificationRepository');

const MIN_TRANSACTIONS_FOR_CHECK = 3;
const STDDEV_MULTIPLIER = 2;
const MAX_AMOUNT_MULTIPLIER = 3;
const DUPLICATE_WINDOW_HOURS = 48;

class AnomalyService {

  async detectAnomaly(transaction, userId) {
    try {
      const categoryId = transaction.category_id;
      const amount = Math.abs(parseFloat(transaction.amount));
      const txDate = transaction.date || new Date().toISOString().split('T')[0];

      const stats = await this._getCategoryStats(userId, categoryId, transaction.id);

      let ensembleTriggered = false;
      let zScoreFlag = false;
      let iqrFlag = false;
      let rollingFlag = false;
      let mlFlag = false;
      let zScore = null;
      let mlScore = null;
      let upperBound = null;
      let flagCount = 0;

      const flagReasons = [];

      const totalCount = parseInt(stats.total_count, 10);

      if (totalCount >= MIN_TRANSACTIONS_FOR_CHECK) {
        const mean = parseFloat(stats.mean) || 0;
        const stddev = stats.stddev !== null ? parseFloat(stats.stddev) : null;
        const q1 = parseFloat(stats.q1);
        const q3 = parseFloat(stats.q3);
        const recentAvg = stats.recent_avg !== null ? parseFloat(stats.recent_avg) : null;

        // CHECK 1 — Z-Score
        if (stddev !== null && stddev > 0) {
          zScore = (amount - mean) / stddev;
          if (zScore > 2.5) {
            zScoreFlag = true;
            flagCount++;
          }
        }

        // CHECK 2 — IQR
        if (q1 !== null && q3 !== null && q1 !== q3) {
          const iqr = q3 - q1;
          upperBound = q3 + (1.5 * iqr);
          if (amount > upperBound) {
            iqrFlag = true;
            flagCount++;
          }
        }

        // CHECK 3 — Rolling Average
        if (recentAvg !== null && recentAvg > 0) {
          if (amount > recentAvg * 3) {
            rollingFlag = true;
            flagCount++;
          }
        }

        // CHECK 4 — ML Isolation Forest
        const mlAnomalyService = require('./MLAnomalyService');
        const mlResult = await mlAnomalyService.predictAnomaly(userId, transaction);
        if (mlResult.isMLAnomaly) {
          mlFlag = true;
          mlScore = mlResult.score;
          flagCount++;
        }

        console.log('[ANOMALY] Checks:', { zScoreFlag, iqrFlag, rollingFlag, mlFlag, flagCount });

        if (flagCount >= 2) {
          ensembleTriggered = true;
          if (zScoreFlag) flagReasons.push(`Z-Score check triggered (score: ${zScore.toFixed(2)}, threshold: 2.5)`);
          if (iqrFlag) flagReasons.push(`IQR check triggered (amount: ${amount.toFixed(2)}, upper bound: ${upperBound.toFixed(2)})`);
          if (rollingFlag) flagReasons.push(`Rolling 30-day avg check triggered (amount: ${amount.toFixed(2)}, 3x rolling avg: ${(recentAvg * 3).toFixed(2)})`);
          if (mlFlag) flagReasons.push(`ML Isolation Forest check triggered (anomaly score: ${mlScore.toFixed(2)}, threshold: 0.6)`);
        }
      }

      // Standalone Duplicate Check
      const isDuplicate = await this._checkDuplicate(userId, categoryId, amount, txDate, transaction.id);
      if (isDuplicate) {
        flagReasons.push(`A transaction with the same amount (${amount.toFixed(2)}) in the same category was recorded within the last 48 hours`);
      }

      if (!ensembleTriggered && !isDuplicate) {
        return { isAnomaly: false, explanation: null };
      }

      const categoryName = await this._getCategoryName(categoryId);
      const rawAiExplanation = await this._getAIExplanation(transaction, categoryName, stats, flagReasons, {
        zScoreFlag, zScore, iqrFlag, upperBound, rollingFlag, flagCount
      });

      // DB update string formatting
      let finalExplanation = rawAiExplanation;
      if (ensembleTriggered) {
        const prefix = `[Z-Score: ${zScoreFlag ? '✓' : '✗'} | IQR: ${iqrFlag ? '✓' : '✗'} | Rolling Avg: ${rollingFlag ? '✓' : '✗'}] `;
        finalExplanation = prefix + rawAiExplanation;
      } else if (isDuplicate) {
        finalExplanation = "[Duplicate Flag] " + rawAiExplanation;
      }

      await this._markAsAnomaly(transaction.id, finalExplanation);

      const user = await userRepository.findById(userId);
      if (user) {
        const backgroundJobService = require('./BackgroundJobService');
        backgroundJobService.processAnomalyAlert(user, transaction, finalExplanation).catch(console.error);
      }

      return { isAnomaly: true, explanation: finalExplanation };
    } catch (err) {
      console.error('[ANOMALY] Detection failed:', err.message);
      return { isAnomaly: false, explanation: null };
    }
  }

  async _getCategoryStats(userId, categoryId, excludeTxId) {
    const { rows } = await pool.query(
      `SELECT
         PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY amount) as q1,
         PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY amount) as q3,
         AVG(amount) as mean,
         STDDEV(amount) as stddev,
         AVG(CASE WHEN date >= NOW() - INTERVAL '30 days' 
             THEN amount END) as recent_avg,
         COUNT(*) as total_count
       FROM transactions
       WHERE user_id = $1
         AND category_id = $2
         AND type = 'expense'
         AND id != $3`,
      [userId, categoryId, excludeTxId]
    );
    return rows[0];
  }

  async _checkDuplicate(userId, categoryId, amount, txDate, excludeId) {
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS count
       FROM transactions
       WHERE user_id = $1
         AND category_id = $2
         AND ABS(amount) = $3
         AND id != $4
         AND created_at >= NOW() - INTERVAL '${DUPLICATE_WINDOW_HOURS} hours'`,
      [userId, categoryId, amount, excludeId]
    );
    return parseInt(rows[0].count, 10) > 0;
  }

  async _getCategoryName(categoryId) {
    const { rows } = await pool.query(
      'SELECT name FROM categories WHERE id = $1 LIMIT 1',
      [categoryId]
    );
    return rows[0] ? rows[0].name : 'Unknown';
  }

  async _getAIExplanation(transaction, categoryName, stats, flagReasons, ensembleData) {
    const amount = Math.abs(parseFloat(transaction.amount));
    const mean = stats.mean !== null ? parseFloat(stats.mean).toFixed(2) : 'N/A';
    const stddev = stats.stddev !== null ? parseFloat(stats.stddev).toFixed(2) : 'N/A';
    const q1 = stats.q1 !== null ? parseFloat(stats.q1).toFixed(2) : 'N/A';
    const q3 = stats.q3 !== null ? parseFloat(stats.q3).toFixed(2) : 'N/A';
    const recentAvg = stats.recent_avg !== null ? parseFloat(stats.recent_avg).toFixed(2) : 'N/A';
    const totalCount = parseInt(stats.total_count, 10);

    const threeX = stats.recent_avg !== null ? (parseFloat(stats.recent_avg) * 3).toFixed(2) : 'N/A';
    const zScoreVal = ensembleData.zScore !== null ? ensembleData.zScore.toFixed(2) : 'N/A';
    const upperBoundVal = ensembleData.upperBound !== null ? ensembleData.upperBound.toFixed(2) : 'N/A';

    const userMessage = [
      'A transaction has been statistically flagged as unusual.',
      '',
      'Transaction details:',
      `- Description: ${transaction.description || 'N/A'}`,
      `- Category: ${categoryName}`,
      `- Amount: ${amount.toFixed(2)} ${transaction.currency || 'INR'}`,
      `- Date: ${transaction.date}`,
      '',
      'Anomaly detection results:',
      `- Z-Score check: ${ensembleData.zScoreFlag ? 'triggered' : 'not triggered'} (score: ${zScoreVal}, threshold: 2.5)`,
      `- IQR check: ${ensembleData.iqrFlag ? 'triggered' : 'not triggered'} (amount: ${amount.toFixed(2)}, upper bound: ${upperBoundVal})`,
      `- Rolling 30-day average check: ${ensembleData.rollingFlag ? 'triggered' : 'not triggered'} (amount: ${amount.toFixed(2)}, 3x rolling average: ${threeX})`,
      `- Checks triggered: ${ensembleData.flagCount} out of 3`,
      '',
      'Category statistics:',
      `- Mean: ${mean}`,
      `- Standard deviation: ${stddev}`,
      `- Q1: ${q1}, Q3: ${q3}`,
      `- 30-day rolling average: ${recentAvg}`,
      `- Total transactions in category: ${totalCount}`,
      '',
      `Reason it was flagged: ${flagReasons.join('; ')}`,
      '',
      `In exactly 2 sentences: explain which statistical checks flagged this transaction and why the amount looks unusual compared to the user's history. Reference the actual numbers. Be conversational and specific, not alarming.`
    ].join('\n');

    try {
      const reply = await createChatCompletion({
        messages: [
          {
            role: 'system',
            content: 'You are a personal finance assistant helping users understand unusual transactions. Be conversational, specific, and helpful. Never be alarmist. Always reference actual numbers.',
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
      });
      return reply.trim();
    } catch (err) {
      console.error('[ANOMALY] AI explanation failed:', err.message);
      return flagReasons.join('. ') + '.';
    }
  }

  async _markAsAnomaly(transactionId, explanation) {
    await pool.query(
      'UPDATE transactions SET is_anomaly = TRUE, anomaly_reason = $1 WHERE id = $2',
      [explanation, transactionId]
    );
  }

  _sendAnomalyEmail(userId, transaction, categoryName, explanation) {
    (async () => {
      try {
        const user = await userRepository.findById(userId);
        if (!user || !user.email) return;

        const amount = Math.abs(parseFloat(transaction.amount));

        await sendEmail(user.email, `Unusual Transaction Detected — ${categoryName}`, {
          title: 'Unusual Transaction Detected',
          intro: 'A transaction on your account has been flagged as statistically unusual.',
          content: `
            <p style="margin:0 0 12px;">
              <strong>${transaction.description || 'No description'}</strong><br>
              Amount: <strong>${amount.toFixed(2)} ${transaction.currency || 'INR'}</strong><br>
              Category: <strong>${categoryName}</strong><br>
              Date: <strong>${transaction.date}</strong>
            </p>
          `,
          highlightTitle: 'Why This Was Flagged',
          highlightContent: `
            <div>${explanation}</div>
            <div style="margin-top:12px;font-size:13px;color:#64748b;">
              If this was you, no action needed. If this looks unfamiliar, please review your account.
            </div>
          `,
        });

        await notificationRepo.logNotification(user.id, 'anomaly_detected', `Anomaly detected: ${transaction.description || categoryName}`);
      } catch (err) {
        console.error('[ANOMALY] Notification email failed:', err.message);
      }
    })();
  }

  async getAnomalies(userId) {
    const { rows } = await pool.query(
      `SELECT
         t.id,
         t.description,
         t.amount,
         t.currency,
         c.name AS category,
         TO_CHAR(t.date, 'YYYY-MM-DD') AS date,
         t.anomaly_reason,
         t.created_at
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1
         AND t.is_anomaly = TRUE
         AND t.date >= CURRENT_DATE - INTERVAL '30 days'
       ORDER BY t.date DESC`,
      [userId]
    );
    return rows;
  }
}

module.exports = new AnomalyService();

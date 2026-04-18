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


      const stats = await this._getCategoryStats(userId, categoryId);


      if (stats.transaction_count < MIN_TRANSACTIONS_FOR_CHECK) {
        return { isAnomaly: false, explanation: null };
      }

      const avg = parseFloat(stats.avg_amount);
      const stddev = parseFloat(stats.stddev_amount);
      const maxAmount = parseFloat(stats.max_amount);
      const flagReasons = [];


      if (stddev > 0 && amount > avg + STDDEV_MULTIPLIER * stddev) {
        flagReasons.push(
          `Amount ${amount.toFixed(2)} exceeds the statistical threshold of ${(avg + STDDEV_MULTIPLIER * stddev).toFixed(2)} (avg ${avg.toFixed(2)} + 2× std dev ${stddev.toFixed(2)})`
        );
      }


      if (maxAmount > 0 && amount > MAX_AMOUNT_MULTIPLIER * maxAmount) {
        flagReasons.push(
          `Amount ${amount.toFixed(2)} is more than 3× the highest recorded amount in this category (${maxAmount.toFixed(2)})`
        );
      }


      const isDuplicate = await this._checkDuplicate(userId, categoryId, amount, txDate, transaction.id);
      if (isDuplicate) {
        flagReasons.push(
          `A transaction with the same amount (${amount.toFixed(2)}) in the same category was recorded within the last 48 hours`
        );
      }

      if (flagReasons.length === 0) {
        return { isAnomaly: false, explanation: null };
      }


      const categoryName = await this._getCategoryName(categoryId);


      const explanation = await this._getAIExplanation(transaction, categoryName, stats, flagReasons);


      await this._markAsAnomaly(transaction.id, explanation);


      this._sendAnomalyEmail(userId, transaction, categoryName, explanation);

      return { isAnomaly: true, explanation };
    } catch (err) {
      console.error('[ANOMALY] Detection failed:', err.message);
      return { isAnomaly: false, explanation: null };
    }
  }


  async _getCategoryStats(userId, categoryId) {
    const { rows } = await pool.query(
      `SELECT
         COALESCE(AVG(ABS(amount)), 0) AS avg_amount,
         COALESCE(STDDEV_POP(ABS(amount)), 0) AS stddev_amount,
         COALESCE(MAX(ABS(amount)), 0) AS max_amount,
         COUNT(*) AS transaction_count
       FROM transactions
       WHERE user_id = $1
         AND category_id = $2
         AND date >= CURRENT_DATE - INTERVAL '3 months'`,
      [userId, categoryId]
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


  async _getAIExplanation(transaction, categoryName, stats, flagReasons) {
    const amount = Math.abs(parseFloat(transaction.amount));
    const avg = parseFloat(stats.avg_amount);
    const stddev = parseFloat(stats.stddev_amount);
    const maxAmount = parseFloat(stats.max_amount);
    const count = parseInt(stats.transaction_count, 10);

    const userMessage = [
      'A transaction has been statistically flagged as unusual.',
      '',
      'Transaction details:',
      `- Description: ${transaction.description || 'N/A'}`,
      `- Category: ${categoryName}`,
      `- Amount: ${amount.toFixed(2)} ${transaction.currency || 'INR'}`,
      `- Date: ${transaction.date}`,
      `- Transaction type: ${transaction.type}`,
      '',
      'This user\'s category statistics (last 3 months):',
      `- Average transaction amount: ${avg.toFixed(2)}`,
      `- Typical range: ${Math.max(0, avg - stddev).toFixed(2)} to ${(avg + stddev).toFixed(2)}`,
      `- Highest ever recorded in this category: ${maxAmount.toFixed(2)}`,
      `- Total transactions in this category: ${count}`,
      '',
      `Reason it was flagged: ${flagReasons.join('; ')}`,
      '',
      'In exactly 2 sentences: explain why this looks unusual based on the actual numbers, and suggest whether the user should review it.',
      'Do not use vague language. Reference the specific amounts.',
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

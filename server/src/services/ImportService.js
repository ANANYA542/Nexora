const { parse } = require('csv-parse/sync');
const pdfParse = require('pdf-parse');
const aiService = require('./AIService');
const pool = require('../config/db');

class ImportService {
  /**
   * Parse a CSV buffer into an array of raw transactions.
   */
  _parseCSV(buffer) {
    const records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    });
    
    // Attempt to map typical bank CSV columns to our format
    return records.map(record => {
      // Very naive mapping for demo purposes. Real-world banks vary wildly.
      const date = record.Date || record.date || new Date().toISOString().split('T')[0];
      const description = record.Description || record.description || record.Payee || 'Unknown';
      const amountStr = record.Amount || record.amount || record.Credit || record.Debit || '0';
      const amount = parseFloat(amountStr.replace(/[^0-9.-]+/g, ''));
      
      const type = (record.Type || record.type || (amount < 0 ? 'expense' : 'income')).toLowerCase();

      return {
        date,
        description,
        amount: Math.abs(amount),
        type: type === 'debit' || amount < 0 ? 'expense' : 'income',
        currency: 'INR'
      };
    }).filter(tx => tx.amount > 0);
  }

  /**
   * Parse a PDF buffer into raw transactions using heuristics.
   */
  async _parsePDF(buffer) {
    const data = await pdfParse(buffer);
    const lines = data.text.split('\n');
    
    const transactions = [];
    const dateRegex = /\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}/;
    
    // Extremely naive PDF heuristic
    for (const line of lines) {
      if (dateRegex.test(line)) {
        const match = line.match(dateRegex);
        const date = match[0];
        const rest = line.replace(date, '').trim();
        
        const amountMatch = rest.match(/[\d,]+\.\d{2}/);
        if (amountMatch) {
          const amount = parseFloat(amountMatch[0].replace(/,/g, ''));
          const description = rest.replace(amountMatch[0], '').trim() || 'Unknown';
          
          transactions.push({
            date,
            description,
            amount,
            type: 'expense', // Defaulting to expense for simple PDF scrape
            currency: 'INR'
          });
        }
      }
    }
    
    return transactions;
  }

  /**
   * Process an uploaded file, map categories via AI, and return ready-to-insert items.
   */
  async processStatement(userId, fileBuffer, mimeType) {
    let rawTransactions = [];
    
    if (mimeType === 'application/pdf') {
      rawTransactions = await this._parsePDF(fileBuffer);
    } else if (mimeType === 'text/csv' || mimeType === 'application/vnd.ms-excel') {
      rawTransactions = this._parseCSV(fileBuffer);
    } else {
      throw new Error('Unsupported file type. Please upload a CSV or PDF.');
    }

    if (rawTransactions.length === 0) {
      throw new Error('No transactions could be found in this document.');
    }

    // Limit to 20 for AI mapping to avoid massive context window limits
    const limited = rawTransactions.slice(0, 20);

    // AI Categorization
    const mappedTransactions = [];
    for (const tx of limited) {
      try {
        const aiResult = await aiService.categorizeTransaction(userId, tx.description);
        
        mappedTransactions.push({
          ...tx,
          category_id: aiResult.categoryId,
          category_name: aiResult.categoryName,
          status: 'ready'
        });
      } catch (err) {
        // Fallback
        mappedTransactions.push({
          ...tx,
          category_id: null,
          category_name: 'Uncategorized',
          status: 'ready'
        });
      }
    }

    // Duplicate Detection (Check if same amount, description, and date exists within 48h)
    for (const tx of mappedTransactions) {
      const { rows } = await pool.query(
        `SELECT id FROM transactions 
         WHERE user_id = $1 
         AND ABS(amount) = $2 
         AND date = $3`,
        [userId, tx.amount, tx.date]
      );
      if (rows.length > 0) {
        tx.status = 'duplicate';
      }
    }

    return mappedTransactions;
  }
}

module.exports = new ImportService();

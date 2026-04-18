const pool = require('../config/db');
const fs = require('fs/promises');
const transactionRepository = require('../repositories/TransactionRepository');
const budgetRepository = require('../repositories/BudgetRepository');
const dashboardService = require('./DashboardService');
const reportRepository = require('../repositories/ReportRepository');
const categoryRepository = require('../repositories/CategoryRepository');
const { createChatCompletion, createVisionCompletion } = require('../utils/aiClient');
const AppError = require('../utils/AppError');

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function parseJsonResponse(content) {
  try {
    return JSON.parse(content);
  } catch (_err) {
    const match = String(content).match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch (_err2) {
      return null;
    }
  }
}

class AIService {

  async chat(userId, message) {
    const [recentResult, budgets, dashboard, patternsRes] = await Promise.all([
      transactionRepository.findAllForUser(userId, { page: 1, limit: 20 }),
      budgetRepository.findAllForUser(userId),
      dashboardService.getDashboard(userId, { currency: 'INR' }),
      pool.query(`SELECT content FROM ai_recommendations WHERE user_id = $1 AND type = 'pattern_analysis' ORDER BY created_at DESC LIMIT 1`, [userId])
    ]);
    
    const latestPattern = patternsRes.rows[0] ? patternsRes.rows[0].content : null;
    let patternText = 'None recently detected.';
    if (latestPattern) {
      patternText = `Pattern: ${latestPattern.pattern || 'N/A'}\nShift: ${latestPattern.shift || 'N/A'}\nPeak: ${latestPattern.peak || 'N/A'}`;
    }

    const income = dashboard.summary.total_income || 0;
    const expense = dashboard.summary.total_expense || 0;
    const rate = income > 0 ? (((income - expense) / income) * 100).toFixed(1) : 0;

    const sysPrompt = [
      'You are an expert personal financial advisor with access to',
      'this user\'s complete financial data. Your goal is to give',
      'specific, actionable advice grounded entirely in their real',
      'numbers — never generic tips.',
      '',
      'STRICT RULES:',
      '- Always reference specific amounts in INR (or their currency)',
      '- Never say \'try to save more\' — always say how much and from where',
      '- If asked about affordability, calculate it from their actual balance',
      '- If asked to compare months, use the actual monthly data provided',
      '- If you don\'t have enough data to answer confidently, say so and explain what data would help',
      '- Keep responses under 150 words unless the question requires more',
      '- End every response with one specific, numbered action item',
      '',
      'USER FINANCIAL SNAPSHOT:',
      `Balance: ${income - expense} INR`,
      `This month income: ${income} INR`,
      `This month expenses: ${expense} INR`,
      `This month savings rate: ${rate}%`,
      '',
      'BUDGET STATUS:',
      budgets.length ? budgets.map(b => `${b.category_name} | ${b.limit_amount} | ${b.amount_spent} | ${b.remaining} | ${b.is_over_budget?'OVER':'UNDER'}`).join('\n') : 'No active budgets.',
      '',
      'TOP SPENDING CATEGORIES THIS MONTH:',
      dashboard.expense_by_category ? dashboard.expense_by_category.slice(0, 3).map(c => `${c.category_name} | ${c.total}`).join('\n') : 'No expenses.',
      '',
      'RECENT TRANSACTIONS (last 20):',
      recentResult.rows.map(t => `${t.date} | ${t.description} | ${t.category_name} | ${t.amount} | ${t.type}`).join('\n') || 'None recorded.',
      '',
      'ACTIVE FINANCIAL PATTERNS DETECTED:',
      patternText,
      '',
      'When the user asks a question, answer using ONLY the data above.',
      'If they ask something outside your data scope, say so clearly.'
    ].join('\n');

    const reply = await createChatCompletion({
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: message }
      ],
    });

    return reply.trim();
  }
  async categorizeTransaction(userId, { description, type }) {
    if (!description) return null;

    const categories = await categoryRepository.findAllForUser(userId);
    const allowedCategories = categories.filter((item) => item.type === type);

    if (!allowedCategories.length) {
      return null;
    }



    const categoryDefinitions = {
      'Food': 'meals, groceries, restaurants, food delivery, snacks, beverages, dining out',
      'Transport': 'cab, auto, bus, train, metro, fuel, petrol, uber, ola, flight tickets, parking',
      'Utilities': 'electricity, water, gas, internet, wifi, broadband, phone recharge, DTH',
      'Rent': 'house rent, office rent, lease payments, property rent',
      'Entertainment': 'movies, games, streaming subscriptions (Netflix/Spotify), concerts, hobbies',
      'Healthcare': 'doctor visits, medicine, hospital bills, medical tests, health insurance premiums',
      'Shopping': 'clothes, shoes, electronics, gadgets, appliances, home goods, personal items',
      'Other Expense': 'tuition fees, education, donations, gifts, miscellaneous, any expense that does not clearly fit the other categories',
      'Salary': 'monthly salary, wages, pay',
      'Freelance': 'freelance payments, consulting fees, gig income, contract work',
      'Investment': 'stock dividends, mutual fund returns, interest income, capital gains',
      'Other Income': 'refunds, cashback, gifts received, prize money, any income that does not clearly fit the other categories',
    };

    const definitionLines = allowedCategories.map((item) => {
      const definition = categoryDefinitions[item.name] || 'general items in this category';
      return `- ${item.name}: ${definition}`;
    });

    const prompt = [
      `You are a strict financial transaction classifier for a personal finance tracker.`,
      `Your task: classify the transaction description into EXACTLY ONE category from the list below.`,
      '',
      `Transaction type: ${type}`,
      `Transaction description: "${description}"`,
      '',
      `Available categories and what belongs in each:`,
      ...definitionLines,
      '',
      `RULES:`,
      `1. Match the description to the category whose definition is the CLOSEST semantic match.`,
      `2. "Tuition Fee", "School Fee", "College Fee", "Course Fee" → "Other Expense" (NOT Healthcare).`,
      `3. "Medicine", "Doctor", "Hospital", "Clinic", "Pharmacy" → "Healthcare".`,
      `4. If the description does not clearly match any specific category, choose "Other Expense" for expenses or "Other Income" for income.`,
      `5. Reply with ONLY the exact category name from the list. No explanation, no quotes, no punctuation.`,
    ].join('\n');

    const content = await createChatCompletion({
      messages: [
        { role: 'system', content: 'You are a transaction classifier. Reply with only a category name, nothing else.' },
        { role: 'user', content: prompt },
      ],
    });

    const answer = normalizeText(content.replace(/["'.]/g, ''));
    return allowedCategories.find((item) => normalizeText(item.name) === answer)
      || allowedCategories.find((item) => answer.includes(normalizeText(item.name)))
      || null;
  }
  async getMonthlyReportSummary(userId, { month, year }) {
    const rows = await reportRepository.getMonthlyReport(userId, { year });
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const report = rows.find((item) => item.month === monthKey);

    if (!report) {
      throw new AppError('No monthly report data found for the selected month', 404);
    }

    const prompt = [
      'You are a personal finance report summarizer.',
      'Summarize the following monthly financial report data in 3-4 clear, specific sentences.',
      'Mention the exact income, expense, and savings figures.',
      'Add one practical, actionable suggestion based on the numbers.',
      'Do NOT invent any data beyond what is provided.',
      '',
      `Month: ${report.month}`,
      `Total Income: ${report.total_income} INR`,
      `Total Expenses: ${report.total_expense} INR`,
      `Net Savings: ${report.savings} INR`,
    ].join('\n');

    const summary = await createChatCompletion({
      messages: [
        { role: 'system', content: 'You are a finance report summarizer. Be concise and data-driven.' },
        { role: 'user', content: prompt },
      ],
    });

    return {
      month: report.month,
      summary: summary.trim(),
    };
  }

  async extractReceipt(userId, file) {
    if (!file) {
      throw new AppError('Receipt image is required', 400);
    }

    if (!String(file.mimetype || '').startsWith('image/')) {
      throw new AppError('Only image receipts are supported for AI extraction', 400);
    }

    const categories = await categoryRepository.findAllForUser(userId);
    const expenseCategoryNames = categories
      .filter((item) => item.type === 'expense')
      .map((item) => item.name);

    const buffer = await fs.readFile(file.path);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.mimetype};base64,${base64}`;

    const content = await createVisionCompletion({
      prompt: [
        'You are a receipt data extractor for a personal finance application.',
        'Analyze this receipt image carefully and extract the following fields.',
        'Return a JSON object with exactly these keys: amount, date, merchant, suggested_category.',
        '',
        'Field rules:',
        '- amount: the total amount paid (number only, no currency symbol)',
        '- date: the transaction date in YYYY-MM-DD format. If not readable, leave as empty string.',
        '- merchant: the store/business name on the receipt. If not readable, leave as empty string.',
        `- suggested_category: pick the best match from this list: ${expenseCategoryNames.join(', ')}. If unsure, use "Other Expense".`,
        '',
        'Return ONLY valid JSON. No explanation text.',
      ].join('\n'),
      dataUrl,
    });

    const parsed = parseJsonResponse(content);
    if (!parsed) {
      throw new AppError('Could not read receipt data from AI response', 502);
    }

    return {
      amount: parsed.amount || '',
      date: parsed.date || '',
      merchant: parsed.merchant || '',
      suggested_category: parsed.suggested_category || '',
    };
  }

  async getBudgetSuggestion(userId, categoryId) {
    const category = await categoryRepository.findByIdForUser(categoryId, userId);
    if (!category) {
      throw new AppError('Category not found', 404);
    }
    if (category.type !== 'expense') {
      throw new AppError('Budget suggestions are available only for expense categories', 400);
    }

    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 3);

    const result = await transactionRepository.findAllForUser(userId, {
      category_id: categoryId,
      type: 'expense',
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      page: 1,
      limit: 100,
    });

    const total = result.rows.reduce((sum, item) => sum + Math.abs(parseFloat(item.converted_amount || 0)), 0);
    const averageMonthlySpend = total / 3;

    const content = await createChatCompletion({
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a personal budget advisor. Return only valid JSON with keys: suggested_budget (number) and reason (string).',
        },
        {
          role: 'user',
          content: [
            'Suggest a reasonable monthly budget limit in INR for this expense category.',
            'The budget should be practical — not too tight, not too generous.',
            'If there is spending history, add a 10-20% buffer above the average.',
            'If there is no spending history, suggest a sensible default for the category.',
            '',
            `Category: ${category.name}`,
            `Average monthly spend over last 3 months: ${averageMonthlySpend.toFixed(2)} INR`,
            `Number of transactions in this period: ${result.rows.length}`,
            '',
            'Return JSON: { "suggested_budget": <number>, "reason": "<short explanation>" }',
          ].join('\n'),
        },
      ],
    });

    const parsed = parseJsonResponse(content);
    if (!parsed) {
      throw new AppError('Could not generate budget suggestion', 502);
    }

    const suggestedBudget = parseFloat(parsed.suggested_budget);

    return {
      suggested_budget: Number.isFinite(suggestedBudget) ? suggestedBudget : parseFloat(averageMonthlySpend.toFixed(2)),
      reason: String(parsed.reason || `Based on your recent spending in ${category.name}.`),
      category_name: category.name,
    };
  }
  async generateBudgetRecommendations(userId) {
    console.log('[AI] Generating budget recommendations...');
    try {
      const { rows: budgets } = await pool.query(`
        SELECT c.name as category, b.limit_amount as limit, 
               COALESCE((SELECT AVG(sum_amt) FROM (SELECT SUM(ABS(amount)) as sum_amt FROM transactions WHERE category_id = c.id AND user_id = $1 AND date >= NOW() - INTERVAL '6 months' GROUP BY date_trunc('month', date)) as sub), 0) as avg_spent,
               COALESCE((SELECT SUM(ABS(amount)) FROM transactions WHERE category_id = c.id AND user_id = $1 AND date_trunc('month', date) = date_trunc('month', CURRENT_DATE)), 0) as current_spent,
               (SELECT COUNT(*) FROM budgets b2 JOIN (SELECT category_id, SUM(ABS(amount)) as total, date_trunc('month', date) as m FROM transactions WHERE user_id = $1 GROUP BY category_id, m) t2 ON b2.category_id = t2.category_id WHERE b2.user_id = $1 AND b2.category_id = c.id AND t2.total > b2.limit_amount AND b2.month >= extract(month from now() - interval '6 months')) as times_exceeded
        FROM budgets b JOIN categories c ON b.category_id = c.id WHERE b.user_id = $1 AND b.month = extract(month from CURRENT_DATE) AND b.year = extract(year from CURRENT_DATE)
      `, [userId]);

      const { rows: unbudgeted } = await pool.query(`
        SELECT c.name as category, 
               COALESCE((SELECT AVG(sum_amt) FROM (SELECT SUM(ABS(amount)) as sum_amt FROM transactions WHERE category_id = c.id AND user_id = $1 AND transactions.type='expense' GROUP BY date_trunc('month', date)) as sub), 0) as avg_spend,
               COALESCE((SELECT SUM(ABS(amount)) FROM transactions WHERE category_id = c.id AND user_id = $1 AND transactions.type='expense' AND date >= NOW() - INTERVAL '3 months'), 0) as recent_spend
        FROM categories c WHERE c.type = 'expense' AND c.id NOT IN (SELECT category_id FROM budgets WHERE user_id = $1 AND month = extract(month from CURRENT_DATE) AND year = extract(year from CURRENT_DATE))
        AND EXISTS (SELECT 1 FROM transactions WHERE category_id = c.id AND user_id = $1 AND transactions.type='expense')
      `, [userId]);

      const systemPrompt = `You are a precise personal finance advisor. You have access to real spending data. Every recommendation must include specific INR amounts. Never say 'consider reducing spending' without saying exactly how much and in which category. Format your response as exactly 3 recommendations, each starting with [OPTIMIZE], [CREATE], or [REALLOCATE] tag.`;

      const userPrompt = [
        `Analyze this user's budget data and generate exactly 3 budget recommendations:`,
        ``,
        `CURRENT BUDGETS:`,
        budgets.length ? budgets.map(b => `${b.category} | Limit: ${b.limit} | Avg Spent (6mo): ${parseFloat(b.avg_spent).toFixed(0)} | Current Spent: ${b.current_spent} | Times Exceeded: ${b.times_exceeded}`).join('\n') : 'None',
        ``,
        `UNBUDGETED CATEGORIES:`,
        unbudgeted.length ? unbudgeted.map(u => `${u.category} | Avg Monthly: ${parseFloat(u.avg_spend).toFixed(0)} | Spend Last 3mo: ${parseFloat(u.recent_spend).toFixed(0)}`).join('\n') : 'None',
        ``,
        `Rules:`,
        `- [OPTIMIZE] tag: for a budget that needs adjustment up or down based on 6 month average. Include specific new amount to set.`,
        `- [CREATE] tag: for an unbudgeted category that needs a budget. Suggest specific amount based on their average spend.`,
        `- [REALLOCATE] tag: for moving money from a consistently underspent budget to a consistently overspent one. Include exact amounts to move.`,
        `Each recommendation must be 2 sentences max with specific numbers.`
      ].join('\n');

      const content = await createChatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });

      const lines = content.split('\n').filter(l => l.trim() !== '');
      let recs = [];
      for (const line of lines) {
        if (line.includes('[OPTIMIZE]') || line.includes('[CREATE]') || line.includes('[REALLOCATE]')) {
          recs.push(line.trim());
        }
      }
      if (recs.length === 0) recs = lines.slice(0, 3); // Fallback

      await pool.query(
        `INSERT INTO ai_recommendations (user_id, type, content) VALUES ($1, $2, $3)`,
        [userId, 'budget_advice', JSON.stringify({ recommendations: recs })]
      );
      console.log('[AI] Generated budget recommendations success.');
      return recs;
    } catch (err) {
      console.error('[AI] Budget recommendation failed:', err.message);
      return null;
    }
  }

  async analyzeSpendingPatterns(userId) {
    console.log('[AI] Generating spending patterns...');
    try {
      const { rows: dw } = await pool.query(`
        SELECT to_char(date, 'Day') as day_name, extract(isodow from date) as dow, COUNT(*) as tx_count, SUM(ABS(amount)) as total_spend, AVG(ABS(amount)) as avg_size
        FROM transactions WHERE user_id = $1 AND type='expense' AND date >= NOW() - INTERVAL '90 days'
        GROUP BY day_name, dow ORDER BY dow
      `, [userId]);

      const { rows: wom } = await pool.query(`
        SELECT CEIL(EXTRACT(day from date)/7.0) as week_num, SUM(ABS(amount)) as total_spend, 
               (SELECT c.name FROM transactions t2 JOIN categories c ON t2.category_id = c.id WHERE t2.user_id = $1 AND t2.type='expense' AND CEIL(EXTRACT(day from t2.date)/7.0) = CEIL(EXTRACT(day from t.date)/7.0) GROUP BY c.name ORDER BY SUM(ABS(t2.amount)) DESC LIMIT 1) as biggest_category
        FROM transactions t WHERE user_id = $1 AND t.type='expense' AND date >= NOW() - INTERVAL '90 days'
        GROUP BY week_num ORDER BY week_num
      `, [userId]);

      const { rows: mom } = await pool.query(`
        WITH current_month AS (SELECT category_id, SUM(ABS(amount)) as total FROM transactions WHERE user_id=$1 AND type='expense' AND date_trunc('month', date) = date_trunc('month', CURRENT_DATE) GROUP BY category_id),
             last_month AS (SELECT category_id, SUM(ABS(amount)) as total FROM transactions WHERE user_id=$1 AND type='expense' AND date_trunc('month', date) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month') GROUP BY category_id)
        SELECT c.name as category, COALESCE(lm.total, 0) as last_month_amt, COALESCE(cm.total, 0) as this_month_amt, 
               CASE WHEN COALESCE(lm.total, 0) = 0 THEN 0 ELSE ((COALESCE(cm.total, 0) - COALESCE(lm.total, 0)) / COALESCE(lm.total, 1) * 100) END as pct_change
        FROM categories c LEFT JOIN current_month cm ON c.id = cm.category_id LEFT JOIN last_month lm ON c.id = lm.category_id
        WHERE c.type='expense' AND (cm.total > 0 OR lm.total > 0)
        ORDER BY this_month_amt DESC
      `, [userId]);

      const systemPrompt = `You are a behavioral finance analyst. Identify patterns in spending data that the user themselves might not notice. Focus on timing patterns, category shifts, and behavioral trends. Always quantify patterns with specific numbers and percentages. Structure output in exactly 4 labeled sections: [PATTERN]: ..., [SHIFT]: ..., [PEAK]: ..., [OPPORTUNITY]: ...`;

      const userPrompt = [
        `Analyze these spending patterns and return exactly 4 insights:`,
        `DAY OF WEEK DATA:`,
        dw.map(r => `${r.day_name.trim()}: ${r.tx_count} tx, Tot: ${parseFloat(r.total_spend).toFixed(0)}, Avg: ${parseFloat(r.avg_size).toFixed(0)}`).join('\n'),
        ``,
        `WEEK OF MONTH DATA:`,
        wom.map(r => `Week ${r.week_num}: Tot: ${parseFloat(r.total_spend).toFixed(0)} | Top: ${r.biggest_category}`).join('\n'),
        ``,
        `MONTH OVER MONTH CATEGORY CHANGES:`,
        mom.map(r => `${r.category}: Last: ${parseFloat(r.last_month_amt).toFixed(0)} | This: ${parseFloat(r.this_month_amt).toFixed(0)} | Change: ${parseFloat(r.pct_change).toFixed(1)}%`).join('\n'),
        ``,
        `Return format — exactly this structure:`,
        `[PATTERN]: [1-2 sentences about a behavioral timing pattern with specific day/amounts]`,
        `[SHIFT]: [1-2 sentences about biggest category change with % and INR amounts]`,
        `[PEAK]: [1-2 sentences about highest spend period with specific dates/amounts]`,
        `[OPPORTUNITY]: [1-2 sentences about the single biggest opportunity to reduce spend based on patterns, with specific amount and timeframe]`
      ].join('\n');

      const content = await createChatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });

      const parseExtract = (tag) => {
        const regex = new RegExp(`\\[${tag}\\]:(.*?)(?=\\[|$)`, 's');
        const match = content.match(regex);
        return match ? match[1].trim() : content; 
      };

      const result = {
        pattern: parseExtract('PATTERN'),
        shift: parseExtract('SHIFT'),
        peak: parseExtract('PEAK'),
        opportunity: parseExtract('OPPORTUNITY')
      };

      await pool.query(
        `INSERT INTO ai_recommendations (user_id, type, content) VALUES ($1, $2, $3)`,
        [userId, 'pattern_analysis', JSON.stringify(result)]
      );
      console.log('[AI] Generating spending patterns success.');
      return result;
    } catch (err) {
      console.error('[AI] Pattern analysis failed:', err.message);
      return null;
    }
  }

  async generateNaturalLanguageReport(userId, month, year) {
    console.log('[AI] Generating monthly report...');
    try {
      const { rows: dt } = await pool.query(`
        SELECT type, SUM(ABS(amount)) as total FROM transactions WHERE user_id = $1 AND extract(month from date) = $2 AND extract(year from date) = $3 GROUP BY type
      `, [userId, month, year]);
      
      let inc = 0, exp = 0;
      for(const row of dt) { if(row.type === 'income') inc = parseFloat(row.total); else exp = parseFloat(row.total); }
      const savings = inc - exp;
      const savingsRate = inc > 0 ? (savings / inc) * 100 : 0;

      const { rows: ldt } = await pool.query(`
        SELECT type, SUM(ABS(amount)) as total FROM transactions WHERE user_id = $1 AND date_trunc('month', date) = make_date($3, $2, 1) - interval '1 month' GROUP BY type
      `, [userId, month, year]);
      let lInc = 0, lExp = 0;
      for(const row of ldt) { if(row.type === 'income') lInc = parseFloat(row.total); else lExp = parseFloat(row.total); }
      
      const { rows: topCats } = await pool.query(`
        SELECT c.name as category, SUM(ABS(amount)) as amt FROM transactions t JOIN categories c ON t.category_id=c.id WHERE t.user_id=$1 AND t.type='expense' AND extract(month from date)=$2 AND extract(year from date)=$3 GROUP BY c.name ORDER BY amt DESC LIMIT 5
      `, [userId, month, year]);

      const { rows: budgets } = await pool.query(`
        SELECT c.name as category, b.limit_amount as lim, COALESCE((SELECT SUM(ABS(amount)) FROM transactions WHERE category_id=c.id AND extract(month from date)=$2 AND extract(year from date)=$3), 0) as spent
        FROM budgets b JOIN categories c ON b.category_id=c.id WHERE b.user_id=$1 AND b.month=$2 AND b.year=$3
      `, [userId, month, year]);
      
      const { rows: incSrc } = await pool.query(`
        SELECT description, SUM(ABS(amount)) as amt FROM transactions WHERE user_id=$1 AND type='income' AND extract(month from date)=$2 AND extract(year from date)=$3 GROUP BY description ORDER BY amt DESC
      `, [userId, month, year]);

      const systemPrompt = `You are writing a personal monthly financial report for a user. Write in second person ('you', 'your'). Be encouraging but honest. Use specific numbers. Structure as a flowing narrative, not bullet points. Length: exactly 4 paragraphs.`;

      const userPrompt = [
        `Write a monthly financial report for Month ${month}, Year ${year}.`,
        `DATA:`,
        `Total Income: ${inc.toFixed(2)} INR`,
        `Total Expenses: ${exp.toFixed(2)} INR`,
        `Net Savings: ${savings.toFixed(2)} INR`,
        `Savings Rate: ${savingsRate.toFixed(1)}%`,
        `vs Previous Month:`,
        `Income change: ${inc - lInc} (${lInc ? (((inc - lInc)/lInc)*100).toFixed(1) : 0}%)`,
        `Expense change: ${exp - lExp} (${lExp ? (((exp - lExp)/lExp)*100).toFixed(1) : 0}%)`,
        `Top 5 Expense Categories:`,
        topCats.map((c, i) => `${i+1}. ${c.category}: ${c.amt} (${exp ? ((c.amt/exp)*100).toFixed(1) : 0}%)`).join('\n'),
        `Budget Performance:`,
        budgets.map(b => `${b.category}: Limit ${b.lim}, Spent ${b.spent}`).join('\n'),
        `Income Sources:`,
        incSrc.map(s => `${s.description || 'Unknown'}: ${s.amt}`).join('\n'),
        ``,
        `Write exactly 4 paragraphs:
1. Overall financial health summary for the month with key numbers
2. Spending analysis — what drove expenses, which categories stood out, budget performance highlights
3. Comparison to last month — what improved, what got worse, why it matters
4. Forward-looking — one specific, actionable goal for next month with a concrete target number based on this month's data`
      ].join('\n');

      const content = await createChatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });

      const reportText = content.trim();

      await pool.query(
        `INSERT INTO ai_recommendations (user_id, type, content, metadata) VALUES ($1, $2, $3, $4)`,
        [userId, 'monthly_report', JSON.stringify({ report: reportText }), JSON.stringify({ month, year })]
      );
      console.log('[AI] Generating monthly report success.');
      return reportText;
    } catch (err) {
      console.error('[AI] Monthly report failed:', err.message);
      return null;
    }
  }

  async generateIncomeInsights(userId) {
    console.log('[AI] Generating income insights...');
    try {
      const { rows: incHist } = await pool.query(`
        SELECT description as source, extract(month from date) as m, extract(year from date) as y, SUM(ABS(amount)) as total
        FROM transactions WHERE user_id=$1 AND type='income' AND date >= NOW() - INTERVAL '6 months' GROUP BY source, m, y
      `, [userId]);

      const sources = {};
      incHist.forEach(r => {
        const src = r.source || 'Unknown';
        if(!sources[src]) sources[src] = { counts: 0, amts: [] };
        sources[src].counts++;
        sources[src].amts.push(parseFloat(r.total));
      });

      const { rows: trends } = await pool.query(`
        SELECT date_trunc('month', date) as m, 
               SUM(CASE WHEN type='income' THEN ABS(amount) ELSE 0 END) as inc,
               SUM(CASE WHEN type='expense' THEN ABS(amount) ELSE 0 END) as exp
        FROM transactions WHERE user_id=$1 AND date >= NOW() - INTERVAL '6 months' GROUP BY m ORDER BY m ASC
      `, [userId]);

      let deficitMonths = [];
      trends.forEach(r => {
        if (parseFloat(r.exp) > parseFloat(r.inc)) {
          deficitMonths.push(new Date(r.m).toLocaleString('default', { month: 'short' }));
        }
      });

      const systemPrompt = `You are analyzing income patterns for a personal finance user. Focus on income stability, diversification, and the relationship between income and expenses. Be specific with numbers. Return exactly 3 insights tagged with [STABILITY], [DIVERSIFICATION], and [RATIO].`;

      let srcStr = Object.keys(sources).map(k => `${k}: total amt over 6m: ${sources[k].amts.reduce((a,b)=>a+b,0)}, frequency: ${sources[k].counts} out of 6 months`).join('\n');

      const userPrompt = [
        `Analyze this income data:`,
        `INCOME BY SOURCE (last 6 months):`,
        srcStr || 'No income recorded.',
        `INCOME TREND:`,
        trends.map(t => `${new Date(t.m).toLocaleString('default', { month: 'short' })}: Inc ${t.inc}, Exp ${t.exp}, Diff ${t.inc - t.exp}`).join('\n'),
        `MONTHS IN DEFICIT (expenses > income): ${deficitMonths.length} (${deficitMonths.join(', ')})`,
        ``,
        `Return exactly:
[STABILITY]: Is this income stable or volatile? What is the month-over-month variance? 
[DIVERSIFICATION]: How many income sources exist? Is there over-reliance on one source?
[RATIO]: What is the average income-to-expense ratio? Is the user living within their means consistently?`
      ].join('\n');

      const content = await createChatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });

      const parseExtract = (tag) => {
        const regex = new RegExp(`\\[${tag}\\]:(.*?)(?=\\[|$)`, 's');
        const match = content.match(regex);
        return match ? match[1].trim() : content; 
      };

      const result = {
        stability: parseExtract('STABILITY'),
        diversification: parseExtract('DIVERSIFICATION'),
        ratio: parseExtract('RATIO')
      };

      await pool.query(
        `INSERT INTO ai_recommendations (user_id, type, content) VALUES ($1, $2, $3)`,
        [userId, 'income_insight', JSON.stringify(result)]
      );

      console.log('[AI] Generating income insights success.');
      return result;
    } catch (err) {
      console.error('[AI] Income insights failed:', err.message);
      return null;
    }
  }
}

module.exports = new AIService();

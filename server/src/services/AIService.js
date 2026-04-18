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
    const [recentResult, budgets, dashboard] = await Promise.all([
      transactionRepository.findAllForUser(userId, { page: 1, limit: 10 }),
      budgetRepository.findAllForUser(userId),
      dashboardService.getDashboard(userId, { currency: 'INR' }),
    ]);

    const prompt = [
      'You are a personal finance advisor embedded in a finance tracking application.',
      'The user is asking a question about their own financial data.',
      'Answer ONLY using the data provided below. Never fabricate numbers, categories, or transactions.',
      'Keep your answer concise (3-5 sentences max), practical, and specific to their data.',
      'If the data is insufficient to answer, say so honestly.',
      '',
      '--- USER FINANCIAL DATA ---',
      `Dashboard summary (all values in INR): ${JSON.stringify(dashboard.summary)}`,
      `Recent transactions (last 10): ${JSON.stringify(recentResult.rows.map((item) => ({
        date: item.date,
        type: item.type,
        amount: item.amount,
        currency: item.currency,
        category: item.category_name,
        description: item.description,
      })))}`,
      `Active budgets: ${JSON.stringify(budgets.map((item) => ({
        category: item.category_name,
        limit_amount: item.limit_amount,
        amount_spent: item.amount_spent,
        remaining: item.remaining,
        month: item.month,
        year: item.year,
      })))}`,
      '--- END DATA ---',
      '',
      `User question: ${message}`,
    ].join('\n');

    const reply = await createChatCompletion({
      messages: [
        { role: 'system', content: 'You are a helpful personal finance advisor. Use only the data provided. Do not invent data.' },
        { role: 'user', content: prompt },
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
}

module.exports = new AIService();

function resetBudgetForm() {
  document.getElementById('budgetForm').reset();
  document.getElementById('budgetId').value = '';
  document.getElementById('budgetFormTitle').textContent = 'Add Budget';
  document.getElementById('budgetSubmitButton').textContent = 'Save Budget';
  document.getElementById('cancelBudgetEdit').style.display = 'none';
  document.getElementById('budgetSuggestionStatus').textContent = '';
}

async function loadBudgetCategories() {
  try {
    await fetchCategories();
    renderCategorySelect('category_id', 'expense');
  } catch (err) {
    alert(err.message);
  }
}

async function loadBudgets() {
  try {
    const res = await apiCall('/budgets');
    const budgets = res.data.budgets;

    document.getElementById('budgetsTable').innerHTML = budgets.length
      ? budgets.map((budget) => `
        <tr>
          <td>${budget.category_name}</td>
          <td>${budget.month}/${budget.year}</td>
          <td>${parseFloat(budget.limit_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td>${parseFloat(budget.amount_spent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td>${parseFloat(budget.remaining).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td>
            <div class="table-actions">
              <button type="button" class="secondary small" onclick="editBudget('${budget.id}', '${budget.category_id}', '${budget.limit_amount}', '${budget.month}', '${budget.year}')">Edit</button>
              <button type="button" class="danger-text" onclick="deleteBudget('${budget.id}')">Delete</button>
            </div>
          </td>
        </tr>
      `).join('')
      : '<tr><td colspan="6">No budgets yet.</td></tr>';
  } catch (err) {
    alert(err.message);
  }
}

function editBudget(id, categoryId, limitAmount, month, year) {
  document.getElementById('budgetId').value = id;
  document.getElementById('category_id').value = categoryId;
  document.getElementById('limit').value = limitAmount;
  document.getElementById('month').value = month;
  document.getElementById('year').value = year;
  document.getElementById('budgetFormTitle').textContent = 'Edit Budget';
  document.getElementById('budgetSubmitButton').textContent = 'Update Budget';
  document.getElementById('cancelBudgetEdit').style.display = 'inline-flex';
}

async function deleteBudget(id) {
  if (!confirm('Delete this budget?')) return;
  try {
    await apiCall(`/budgets/${id}`, 'DELETE');
    if (document.getElementById('budgetId').value === id) {
      resetBudgetForm();
    }
    await loadBudgets();
  } catch (err) {
    alert(err.message);
  }
}

async function suggestBudget() {
  const categoryId = document.getElementById('category_id').value;
  const status = document.getElementById('budgetSuggestionStatus');

  if (!categoryId) {
    status.textContent = 'Choose a category first.';
    return;
  }

  const button = document.getElementById('suggestBudgetButton');
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'Suggesting...';
  status.textContent = '';

  try {
    const res = await apiCall(`/ai/budget-suggestion?category_id=${encodeURIComponent(categoryId)}`);
    document.getElementById('limit').value = Number(res.data.suggested_budget || 0).toFixed(2);
    status.textContent = res.data.reason;
  } catch (err) {
    status.textContent = err.message;
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

document.getElementById('budgetForm').onsubmit = async (event) => {
  event.preventDefault();
  try {
    await apiCall('/budgets', 'POST', {
      category_id: event.target.category_id.value,
      limit_amount: parseFloat(event.target.limit.value),
      month: parseInt(event.target.month.value, 10),
      year: parseInt(event.target.year.value, 10),
    });
    resetBudgetForm();
    await loadBudgets();
  } catch (err) {
    alert(err.message);
  }
};

document.getElementById('cancelBudgetEdit').onclick = resetBudgetForm;
document.getElementById('suggestBudgetButton').onclick = suggestBudget;

window.editBudget = editBudget;
window.deleteBudget = deleteBudget;

loadBudgetCategories();
loadBudgets();
resetBudgetForm();

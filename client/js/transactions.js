let transactionCache = [];

function renderTransactionCategorySelect(type, selectedValue = '') {
  renderCategorySelect('category_id', type);
  const select = document.getElementById('category_id');
  if (!select) return;

  select.innerHTML = `<option value="">Choose manually or use AI</option>${select.innerHTML}`;
  if (selectedValue) {
    select.value = selectedValue;
  }
}

function getTransactionCategoryName(categoryId) {
  const categories = getCachedCategories();
  const category = categories.find((item) => item.id === categoryId);
  return category ? category.name : '';
}

function formatTransactionAmount(transaction) {
  return `${parseFloat(transaction.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${transaction.currency}`;
}

function toDateInputValue(value) {
  return value ? value.split('T')[0] : '';
}

function normalizeTransaction(transaction) {
  return {
    ...transaction,
    category_name: transaction.category_name || getTransactionCategoryName(transaction.category_id),
  };
}

function renderTransactions() {
  const table = document.getElementById('txTable');
  table.innerHTML = transactionCache.length
    ? transactionCache.map((transaction) => `
      <tr>
        <td>${toDateInputValue(transaction.date)}</td>
        <td><strong>${transaction.description || '-'}</strong><br><span class="muted-inline">${transaction.type}</span></td>
        <td>${transaction.category_name || '-'}</td>
        <td>${formatTransactionAmount(transaction)}</td>
        <td>${transaction.receipt_url ? `<a href="http://localhost:5003${transaction.receipt_url}" target="_blank">View</a>` : '-'}</td>
        <td>
          <div class="table-actions">
            <button type="button" class="secondary small" onclick="editTransaction('${transaction.id}')">Edit</button>
            <button type="button" class="danger-text" onclick="deleteTransaction('${transaction.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('')
    : '<tr><td colspan="6">No transactions yet.</td></tr>';
}

function resetTransactionForm() {
  document.getElementById('txForm').reset();
  document.getElementById('txId').value = '';
  document.getElementById('currency').value = 'INR';
  document.getElementById('date').value = new Date().toISOString().split('T')[0];
  renderTransactionCategorySelect(document.getElementById('type').value);
  document.getElementById('txFormTitle').textContent = 'New Entry';
  document.getElementById('txSubmitButton').textContent = 'Create Transaction';
  document.getElementById('txSubmitButton').disabled = false;
  document.getElementById('cancelTxEdit').style.display = 'none';
}

async function loadTransactionCategories() {
  try {
    await fetchCategories();
    renderTransactionCategorySelect(document.getElementById('type').value);
  } catch (err) {
    alert(err.message);
  }
}

async function loadTransactions() {
  const table = document.getElementById('txTable');
  table.innerHTML = '<tr><td colspan="6">Loading transactions...</td></tr>';

  try {
    const res = await apiCall('/transactions?limit=100');
    transactionCache = res.data.transactions.map(normalizeTransaction);
    renderTransactions();
  } catch (err) {
    table.innerHTML = `<tr><td colspan="6">${err.message}</td></tr>`;
  }
}

async function editTransaction(id) {
  const cached = transactionCache.find((transaction) => transaction.id === id);
  if (cached) {
    document.getElementById('txId').value = cached.id;
    document.getElementById('amount').value = cached.amount;
    document.getElementById('currency').value = cached.currency;
    document.getElementById('type').value = cached.type;
    renderTransactionCategorySelect(cached.type, cached.category_id);
    document.getElementById('description').value = cached.description || '';
    document.getElementById('date').value = toDateInputValue(cached.date);
    document.getElementById('txFormTitle').textContent = 'Edit Entry';
    document.getElementById('txSubmitButton').textContent = 'Update Transaction';
    document.getElementById('cancelTxEdit').style.display = 'inline-flex';
    return;
  }

  try {
    const res = await apiCall(`/transactions/${id}`);
    const transaction = normalizeTransaction(res.data.transaction);
    document.getElementById('txId').value = transaction.id;
    document.getElementById('amount').value = transaction.amount;
    document.getElementById('currency').value = transaction.currency;
    document.getElementById('type').value = transaction.type;
    renderTransactionCategorySelect(transaction.type, transaction.category_id);
    document.getElementById('description').value = transaction.description || '';
    document.getElementById('date').value = toDateInputValue(transaction.date);
    document.getElementById('txFormTitle').textContent = 'Edit Entry';
    document.getElementById('txSubmitButton').textContent = 'Update Transaction';
    document.getElementById('cancelTxEdit').style.display = 'inline-flex';
  } catch (err) {
    alert(err.message);
  }
}

async function deleteTransaction(id) {
  if (!confirm('Delete transaction?')) return;

  const previousCache = [...transactionCache];
  transactionCache = transactionCache.filter((transaction) => transaction.id !== id);
  renderTransactions();

  try {
    await apiCall(`/transactions/${id}`, 'DELETE');
    if (document.getElementById('txId').value === id) {
      resetTransactionForm();
    }
  } catch (err) {
    transactionCache = previousCache;
    renderTransactions();
    alert(err.message);
  }
}

async function shouldProceedWithBalanceCheck() {
  const type = document.getElementById('type').value;
  if (type !== 'expense') {
    return true;
  }

  try {
    const res = await apiCall('/transactions/check-balance', 'POST', {
      amount: document.getElementById('amount').value,
      currency: document.getElementById('currency').value,
      type,
      transaction_id: document.getElementById('txId').value || undefined,
    });

    const balance = res.data.balance;
    if (!balance.exceeds_balance) {
      return true;
    }

    return confirm(
      `This expense exceeds your current balance.\nCurrent balance: ${balance.current_balance.toFixed(2)} INR\nProjected balance: ${balance.projected_balance.toFixed(2)} INR\n\nDo you want to continue?`
    );
  } catch (err) {
    alert(err.message);
    return false;
  }
}

async function autoCategorizeTransaction() {
  const description = document.getElementById('description').value.trim();
  const type = document.getElementById('type').value;

  if (!description) {
    alert('Enter a description first.');
    return;
  }

  const button = document.getElementById('autoCategorizeButton');
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'Classifying...';

  try {
    const res = await apiCall('/ai/categorize', 'POST', { description, type });
    if (!res.data.category_id) {
      alert('AI could not match a category. Please choose one manually.');
      return;
    }
    renderTransactionCategorySelect(type, res.data.category_id);
  } catch (err) {
    alert(err.message);
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

async function extractReceiptDetails() {
  const file = document.getElementById('receipt').files[0];
  if (!file) {
    alert('Choose a receipt image first.');
    return;
  }

  const button = document.getElementById('extractReceiptButton');
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'Reading...';

  const formData = new FormData();
  formData.append('receipt', file);

  try {
    const res = await apiCall('/ai/receipt', 'POST', formData, true);
    const data = res.data;

    if (data.amount) {
      document.getElementById('amount').value = data.amount;
    }
    if (data.date) {
      document.getElementById('date').value = data.date;
    }
    if (data.merchant && !document.getElementById('description').value.trim()) {
      document.getElementById('description').value = data.merchant;
    }
    if (data.suggested_category) {
      const match = getCachedCategories().find((item) =>
        item.type === document.getElementById('type').value &&
        item.name.toLowerCase() === String(data.suggested_category).toLowerCase()
      );
      if (match) {
        renderTransactionCategorySelect(document.getElementById('type').value, match.id);
      }
    }
  } catch (err) {
    alert(err.message);
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

document.getElementById('txForm').onsubmit = async (event) => {
  event.preventDefault();
  const submitButton = document.getElementById('txSubmitButton');
  const originalLabel = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = document.getElementById('txId').value ? 'Updating...' : 'Saving...';

  const canProceed = await shouldProceedWithBalanceCheck();
  if (!canProceed) {
    submitButton.disabled = false;
    submitButton.textContent = originalLabel;
    return;
  }

  const formData = new FormData();
  formData.append('type', event.target.type.value);
  if (event.target.category_id.value) {
    formData.append('category_id', event.target.category_id.value);
  }
  formData.append('amount', event.target.amount.value);
  formData.append('currency', event.target.currency.value);
  formData.append('description', event.target.description.value);
  formData.append('date', event.target.date.value);

  if (event.target.receipt.files[0]) {
    formData.append('receipt', event.target.receipt.files[0]);
  }

  try {
    const id = document.getElementById('txId').value;
    const res = await apiCall(id ? `/transactions/${id}` : '/transactions', id ? 'PATCH' : 'POST', formData, true);
    const transaction = normalizeTransaction(res.data.transaction);

    if (id) {
      transactionCache = transactionCache.map((item) => item.id === transaction.id ? transaction : item);
    } else {
      transactionCache = [transaction, ...transactionCache];
    }

    renderTransactions();
    resetTransactionForm();
  } catch (err) {
    submitButton.disabled = false;
    submitButton.textContent = originalLabel;
    alert(err.message);
  }
};

document.getElementById('type').addEventListener('change', () => {
  renderTransactionCategorySelect(document.getElementById('type').value);
});
document.getElementById('cancelTxEdit').onclick = resetTransactionForm;
document.getElementById('autoCategorizeButton').onclick = autoCategorizeTransaction;
document.getElementById('extractReceiptButton').onclick = extractReceiptDetails;

window.editTransaction = editTransaction;
window.deleteTransaction = deleteTransaction;

loadTransactionCategories();
loadTransactions();
resetTransactionForm();

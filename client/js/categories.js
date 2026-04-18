let categoryCache = [];

async function fetchCategories() {
  const res = await apiCall('/categories');
  categoryCache = res.data.categories;
  return categoryCache;
}

function getCachedCategories() {
  return categoryCache;
}

function filterCategoriesByType(type) {
  return categoryCache.filter((category) => category.type === type);
}

function renderCategorySelect(selectId, type) {
  const select = document.getElementById(selectId);
  if (!select) return;

  const categories = type ? filterCategoriesByType(type) : categoryCache;
  select.innerHTML = categories.map((category) => `<option value="${category.id}">${category.name}</option>`).join('');
}

function renderCategoriesTable() {
  const table = document.getElementById('categoriesTable');
  if (!table) return;

  table.innerHTML = categoryCache.length
    ? categoryCache.map((category) => `
      <tr>
        <td>${category.name}</td>
        <td>${category.type}</td>
        <td>${category.user_id ? 'Personal' : 'System'}</td>
        <td>
          ${category.user_id ? `<button type="button" class="danger-text" onclick="deleteCategory('${category.id}')">Delete</button>` : ''}
        </td>
      </tr>
    `).join('')
    : '<tr><td colspan="4">No categories available.</td></tr>';
}

async function deleteCategory(id) {
  if (!confirm('Delete this category?')) return;
  try {
    await apiCall(`/categories/${id}`, 'DELETE');
    await fetchCategories();
    renderCategoriesTable();
  } catch (err) {
    alert(err.message);
  }
}

async function createCategory(event) {
  event.preventDefault();
  try {
    await apiCall('/categories', 'POST', {
      name: document.getElementById('categoryName').value.trim(),
      type: document.getElementById('categoryType').value,
    });
    event.target.reset();
    document.getElementById('categoryType').value = 'expense';
    await fetchCategories();
    renderCategoriesTable();
  } catch (err) {
    alert(err.message);
  }
}

async function initCategoriesPage() {
  if (!document.getElementById('categoriesTable')) return;
  try {
    await fetchCategories();
    renderCategoriesTable();
  } catch (err) {
    alert(err.message);
  }

  const form = document.getElementById('categoryForm');
  if (form) {
    form.onsubmit = createCategory;
  }
}

window.deleteCategory = deleteCategory;

initCategoriesPage();

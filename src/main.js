const splitModes = [
  { mode: 'Exact', description: 'Enter what each person owes down to the cent.' },
  { mode: 'Percentage', description: 'Assign custom percentages for unequal splits.' },
  { mode: 'Shares', description: 'Split by weighted portions such as rooms or nights.' },
  { mode: 'Adjustment', description: 'Add credits, caps, discounts, or manual tweaks.' },
];

const initialGroups = [
  {
    name: 'Lisbon Trip',
    icon: '✈️',
    members: [
      { name: 'Ava', avatar: 'AV' },
      { name: 'Leo', avatar: 'LE' },
      { name: 'Mia', avatar: 'MI' },
      { name: 'Noah', avatar: 'NO' },
    ],
    expenses: [
      { title: 'Apartment deposit', amount: 820, paidBy: 'Ava', mode: 'Shares', receipt: 'receipt-apartment.jpg' },
      { title: 'Seafood dinner', amount: 246.5, paidBy: 'Leo', mode: 'Exact' },
      { title: 'Museum passes', amount: 96, paidBy: 'Mia', mode: 'Percentage' },
    ],
  },
  {
    name: 'Housemates',
    icon: '🏡',
    members: [
      { name: 'Jordan', avatar: 'JO' },
      { name: 'Sam', avatar: 'SA' },
      { name: 'Taylor', avatar: 'TA' },
    ],
    expenses: [
      { title: 'Utilities', amount: 178.2, paidBy: 'Sam', mode: 'Adjustment', receipt: 'utility-bill.pdf' },
      { title: 'Groceries', amount: 131.75, paidBy: 'Taylor', mode: 'Shares' },
    ],
  },
];

const STORAGE_KEY = 'buddybill-state-v1';

const storedState = loadState();
let groups = Array.isArray(storedState.groups) && storedState.groups.length > 0 ? storedState.groups : initialGroups;
let users = Array.isArray(storedState.users) ? storedState.users : [];
let currentUser = storedState.currentUser ?? null;
let activeGroupIndex = Math.min(Math.max(storedState.activeGroupIndex ?? 0, 0), groups.length - 1);
let selectedSplitMode = 'Exact';
let receiptFileName = '';
let signupMessage = '';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const root = document.querySelector('#root');

function escapeHtml(value) {
  return String(value).replace(/[&<>\"']/g, (character) => {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#039;' };
    return entities[character];
  });
}

function loadState() {
  const fallback = { groups: null, users: [], currentUser: null, activeGroupIndex: 0 };

  if (typeof localStorage === 'undefined') {
    return fallback;
  }

  const savedState = localStorage.getItem(STORAGE_KEY);

  if (!savedState) {
    return fallback;
  }

  try {
    return JSON.parse(savedState);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return fallback;
  }
}

function saveState() {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      groups,
      users,
      currentUser,
      activeGroupIndex,
    }),
  );
}

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'BB';
}

function calculateTotals() {
  const totalSpend = groups.reduce(
    (sum, group) => sum + group.expenses.reduce((expenseSum, expense) => expenseSum + expense.amount, 0),
    0,
  );
  const totalPeople = new Set(groups.flatMap((group) => group.members.map((member) => member.name))).size;
  const attachedReceipts = groups.flatMap((group) => group.expenses).filter((expense) => expense.receipt).length;

  return { totalSpend, totalPeople, attachedReceipts };
}

function addGroup() {
  const nextNumber = groups.length + 1;
  groups.push({
    name: `New group ${nextNumber}`,
    icon: '🤝',
    members: [
      currentUser ? { name: currentUser.name, avatar: currentUser.avatar } : { name: 'You', avatar: 'YO' },
      { name: 'Friend', avatar: 'FR' },
    ],
    expenses: [],
  });
  activeGroupIndex = groups.length - 1;
  saveState();
  render();
}

function addExpense(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const titleInput = form.querySelector('#expense-title');
  const amountInput = form.querySelector('#expense-amount');
  const title = titleInput.value.trim();
  const amount = Number.parseFloat(amountInput.value);

  if (!title || Number.isNaN(amount) || amount <= 0) {
    return;
  }

  const activeGroup = groups[activeGroupIndex];
  activeGroup.expenses.unshift({
    title,
    amount,
    paidBy: currentUser?.name ?? activeGroup.members[0]?.name ?? 'You',
    mode: selectedSplitMode,
    receipt: receiptFileName || undefined,
  });

  titleInput.value = '';
  amountInput.value = '';
  receiptFileName = '';
  saveState();
  render();
}


function signUp(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const nameInput = form.querySelector('#signup-name');
  const emailInput = form.querySelector('#signup-email');
  const name = nameInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();

  if (!name || !email) {
    signupMessage = 'Enter your name and email to create a BuddyBill account on this device.';
    render();
    return;
  }

  const user = { name, email, avatar: getInitials(name) };
  const existingUserIndex = users.findIndex((savedUser) => savedUser.email === email);

  if (existingUserIndex >= 0) {
    users[existingUserIndex] = user;
    signupMessage = `Welcome back, ${name}. Your local BuddyBill account is active.`;
  } else {
    users.push(user);
    signupMessage = `Account created for ${name}. You were added to ${groups[activeGroupIndex].name}.`;
  }

  currentUser = user;

  const activeGroup = groups[activeGroupIndex];
  const alreadyInGroup = activeGroup.members.some((member) => member.name === name);

  if (!alreadyInGroup) {
    activeGroup.members.unshift({ name, avatar: user.avatar });
  }

  saveState();
  render();
}

function render() {
  const activeGroup = groups[activeGroupIndex];
  const totals = calculateTotals();

  root.innerHTML = `
    <main class="app-shell">
      <nav class="topbar" aria-label="Primary navigation">
        <a class="brand" href="#top" aria-label="BuddyBill home">
          <span class="brand-mark">BB</span>
          <span>BuddyBill</span>
        </a>
        <div class="nav-links" aria-label="Section links">
          <a href="#groups">Groups</a>
          <a href="#split-options">Split options</a>
          <a href="#receipts">Receipts</a>
        </div>
        <button class="menu-button" type="button" aria-label="Open menu">☰</button>
      </nav>

      <section class="hero" id="top">
        <div class="hero-copy">
          <span class="eyebrow">✨ Unlimited group expense splitting</span>
          <h1>Split every shared bill with friends, trips, and roommates.</h1>
          <p>
            BuddyBill is a mobile-friendly expense splitter where people can sign up, create as many groups as they
            need, add expenses, attach receipts, and settle who owes what with flexible split methods.
          </p>
          <div class="hero-actions">
            <a class="primary-action" href="#signup">Start splitting ›</a>
            <a class="secondary-action" href="#expense-form">Add an expense</a>
          </div>
        </div>

        <aside class="phone-preview" aria-label="BuddyBill mobile preview">
          <div class="phone-status"><span>9:41</span><span>5G ◐</span></div>
          <div class="phone-card highlighted">
            <span class="card-label">You are owed</span>
            <strong>${currency.format(312.44)}</strong>
            <p>Across ${groups.length} active groups</p>
          </div>
          <div class="mini-expense">
            <span class="mini-icon">🧾</span>
            <div>
              <strong>${escapeHtml(activeGroup.expenses[0]?.title ?? 'No expenses yet')}</strong>
              <span>${activeGroup.expenses[0] ? currency.format(activeGroup.expenses[0].amount) : 'Add your first bill'}</span>
            </div>
          </div>
          <div class="avatar-row" aria-label="Group members">
            ${activeGroup.members.map((member) => `<span>${escapeHtml(member.avatar)}</span>`).join('')}
          </div>
        </aside>
      </section>

      <section class="signup-card" id="signup" aria-labelledby="signup-title">
        <div>
          <span class="eyebrow dark">🛡️ Simple onboarding</span>
          <h2 id="signup-title">People can sign up and join groups in seconds.</h2>
          <p>Use this starter flow as a foundation for email, phone, or social authentication.</p>
        </div>
        <form class="signup-form" id="signup-form">
          <label>Full name<input id="signup-name" type="text" placeholder="Alex Chen" value="${escapeHtml(currentUser?.name ?? '')}" /></label>
          <label>Email<input id="signup-email" type="email" placeholder="alex@example.com" value="${escapeHtml(currentUser?.email ?? '')}" /></label>
          <button type="submit">${currentUser ? 'Update account' : 'Create account'}</button>
        </form>
        <p class="signup-message" role="status">
          ${escapeHtml(signupMessage || (currentUser ? `Signed in locally as ${currentUser.name}.` : 'Prototype signup stores your account in this browser.'))}
        </p>
      </section>

      <section class="dashboard-grid" id="groups">
        <div class="panel group-panel">
          <div class="section-heading">
            <div>
              <span class="eyebrow dark">👥 Unlimited groups</span>
              <h2>Manage every circle separately.</h2>
            </div>
            <button class="icon-button" type="button" id="add-group" aria-label="Create a new group">＋</button>
          </div>
          <div class="group-list">
            ${groups
              .map(
                (group, index) => `
                  <button class="group-item ${index === activeGroupIndex ? 'active' : ''}" type="button" data-group-index="${index}">
                    <span class="group-icon">${escapeHtml(group.icon)}</span>
                    <span><strong>${escapeHtml(group.name)}</strong><small>${group.members.length} people · ${group.expenses.length} expenses</small></span>
                  </button>
                `,
              )
              .join('')}
          </div>
        </div>

        <div class="panel stats-panel">
          <span class="eyebrow dark">💳 Snapshot</span>
          <div class="stats-grid">
            ${statCard('💵', 'Tracked spending', currency.format(totals.totalSpend))}
            ${statCard('👥', 'People included', String(totals.totalPeople))}
            ${statCard('📷', 'Receipts attached', String(totals.attachedReceipts))}
          </div>
        </div>
      </section>

      <section class="workspace">
        <div class="panel expense-panel" id="expense-form">
          <div class="section-heading compact">
            <div>
              <span class="eyebrow dark">🧾 Add expense</span>
              <h2>${escapeHtml(activeGroup.name)}</h2>
            </div>
          </div>
          <form class="expense-form" id="new-expense-form">
            <label>What was paid?<input id="expense-title" value="Airport rideshare" placeholder="Dinner" /></label>
            <label>Amount<input id="expense-amount" inputmode="decimal" value="54.90" placeholder="0.00" /></label>
            <fieldset>
              <legend>Split method</legend>
              <div class="split-selector">
                ${splitModes
                  .map(
                    (item) => `<button class="split-pill ${selectedSplitMode === item.mode ? 'selected' : ''}" type="button" data-split-mode="${item.mode}">${item.mode}</button>`,
                  )
                  .join('')}
              </div>
            </fieldset>
            <label class="upload-box" for="receipt-upload" id="receipts">
              <span>📷</span><span id="receipt-label">${escapeHtml(receiptFileName || 'Attach a photo or receipt')}</span>
              <input id="receipt-upload" type="file" accept="image/*,.pdf" />
            </label>
            <button class="primary-action full-width" type="submit">Add to group ＋</button>
          </form>
        </div>

        <div class="panel activity-panel">
          <div class="section-heading compact">
            <div>
              <span class="eyebrow dark">🏦 Recent activity</span>
              <h2>Expenses in ${escapeHtml(activeGroup.name)}</h2>
            </div>
          </div>
          <div class="expense-list">
            ${activeGroup.expenses.length ? activeGroup.expenses.map(expenseItem).join('') : '<p class="empty-state">No expenses yet. Add the first shared bill.</p>'}
          </div>
        </div>
      </section>

      <section class="split-options" id="split-options" aria-labelledby="split-title">
        <span class="eyebrow dark">📊 Flexible calculations</span>
        <h2 id="split-title">Choose the split style that matches real life.</h2>
        <div class="split-grid">
          ${splitModes
            .map(
              (item) => `
                <article class="split-card">
                  <span class="check-icon">✓</span>
                  <h3>${item.mode}</h3>
                  <p>${item.description}</p>
                </article>
              `,
            )
            .join('')}
        </div>
      </section>
    </main>
  `;

  bindEvents();
}

function statCard(icon, label, value) {
  return `<article class="stat-card"><span>${icon}</span><small>${label}</small><strong>${value}</strong></article>`;
}

function expenseItem(expense) {
  return `
    <article class="expense-item">
      <div class="expense-icon">🧾</div>
      <div>
        <strong>${escapeHtml(expense.title)}</strong>
        <small>Paid by ${escapeHtml(expense.paidBy)} · ${escapeHtml(expense.mode)} split</small>
        ${expense.receipt ? `<span class="receipt-chip">📎 ${escapeHtml(expense.receipt)}</span>` : ''}
      </div>
      <b>${currency.format(expense.amount)}</b>
    </article>
  `;
}

function bindEvents() {
  document.querySelector('#add-group').addEventListener('click', addGroup);
  document.querySelector('#signup-form').addEventListener('submit', signUp);
  document.querySelector('#new-expense-form').addEventListener('submit', addExpense);

  document.querySelectorAll('[data-group-index]').forEach((button) => {
    button.addEventListener('click', () => {
      activeGroupIndex = Number(button.dataset.groupIndex);
      render();
    });
  });

  document.querySelectorAll('[data-split-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedSplitMode = button.dataset.splitMode;
      document.querySelectorAll('[data-split-mode]').forEach((modeButton) => modeButton.classList.remove('selected'));
      button.classList.add('selected');
    });
  });

  const receiptUpload = document.querySelector('#receipt-upload');
  receiptUpload.addEventListener('change', () => {
    receiptFileName = receiptUpload.files?.[0]?.name ?? '';
    document.querySelector('#receipt-label').textContent = receiptFileName || 'Attach a photo or receipt';
  });
}

render();

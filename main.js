// 1. Import functions from the Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, push, remove, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// 2. Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDAi6YT-xtoNx7chLmcRWxZeS21aSz_3aY",
  authDomain: "sandali-201ca.firebaseapp.com",
  databaseURL: "https://sandali-201ca-default-rtdb.firebaseio.com",
  projectId: "sandali-201ca",
  storageBucket: "sandali-201ca.firebasestorage.app",
  messagingSenderId: "922702431327",
  appId: "1:922702431327:web:53a5a2c59f646c555907ea",
  measurementId: "G-7WFSHYD0NL"
};

// 3. Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const transactionsRef = ref(database, 'transactions');
const targetsRef = ref(database, 'targets');

// --- Get DOM Elements ---
const balance = document.getElementById('balance');
const totalIncome = document.getElementById('total-income');
const totalExpenses = document.getElementById('total-expenses');
const totalSavings = document.getElementById('total-savings');
const incomeList = document.getElementById('income-list');
const expenseList = document.getElementById('expense-list');
const savingList = document.getElementById('saving-list');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const dateInput = document.getElementById('date');
const monthFilter = document.getElementById('month-filter');
const monthlySummary = document.getElementById('monthly-summary');
const addIncomeBtn = document.getElementById('add-income-btn');
const addExpenseBtn = document.getElementById('add-expense-btn');
const addSavingBtn = document.getElementById('add-saving-btn');
const incomeTargetInput = document.getElementById('income-target');
const expenseTargetInput = document.getElementById('expense-target');
const savingTargetInput = document.getElementById('saving-target');
const setTargetBtn = document.getElementById('set-target-btn');
const incomeProgressBar = document.getElementById('income-progress-bar');
const expenseProgressBar = document.getElementById('expense-progress-bar');
const savingProgressBar = document.getElementById('saving-progress-bar');
const incomeProgressText = document.getElementById('income-progress-text');
const expenseProgressText = document.getElementById('expense-progress-text');
const savingProgressText = document.getElementById('saving-progress-text');
const financeChartCanvas = document.getElementById('finance-chart');
const toggleTargetsBtn = document.getElementById('toggle-targets-btn');
const targetForm = document.getElementById('target-form');
const monthlyViewBtn = document.getElementById('monthly-view-btn');
const weeklyViewBtn = document.getElementById('weekly-view-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
// NEW: Clear Targets Button
const clearTargetsBtn = document.getElementById('clear-targets-btn');


// --- Global State Variables ---
let allTransactions = [];
let allTargets = {};
let isInitialDataLoaded = false;
let financeChart; 
let currentChartView = 'monthly'; // 'monthly' or 'weekly'

// --- Firebase Data Listeners ---
onValue(transactionsRef, (snapshot) => {
    allTransactions = [];
    snapshot.forEach((childSnapshot) => {
        allTransactions.push({ id: childSnapshot.key, ...childSnapshot.val() });
    });
    if (isInitialDataLoaded) {
        populateMonthFilter();
        updateUI();
    }
});

onValue(targetsRef, (snapshot) => {
    allTargets = snapshot.val() || {};
    if (isInitialDataLoaded) {
        populateMonthFilter();
        updateUI();
    }
});

// --- Main UI Update Function ---
function updateUI() {
    const selectedMonth = monthFilter.value;
    if (!selectedMonth) return;

    const monthlyTransactions = selectedMonth === 'all'
        ? allTransactions
        : allTransactions.filter(t => t.date && t.date.substring(0, 7) === selectedMonth);

    updateSummaryValues();
    updateTransactionLists(monthlyTransactions);
    updateMonthlyAnalysis(monthlyTransactions);
    updateTargetProgress(monthlyTransactions, selectedMonth);
    updateChart(monthlyTransactions, selectedMonth); 
}

// --- Chart Generation Logic ---
function generateMonthlyChartData(monthlyTransactions, selectedMonth) {
    const year = parseInt(selectedMonth.split('-')[0]);
    const month = parseInt(selectedMonth.split('-')[1]);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const incomeData = new Array(daysInMonth).fill(0);
    const expenseData = new Array(daysInMonth).fill(0);

    monthlyTransactions.forEach(t => {
        const day = new Date(t.date).getUTCDate() - 1;
        if (day >= 0 && day < daysInMonth) {
            if (t.type === 'income') {
                incomeData[day] += t.amount;
            } 
            else if (t.type === 'expense' || t.type === 'saving') {
                expenseData[day] += t.amount;
            }
        }
    });

    return {
        labels: labels,
        datasets: [
            { label: 'Income', data: incomeData, backgroundColor: 'rgba(46, 204, 113, 0.7)' },
            { label: 'Expense', data: expenseData, backgroundColor: 'rgba(231, 76, 60, 0.7)' }
        ]
    };
}

function generateWeeklyChartData(monthlyTransactions) {
    const labels = ['Week 1 (1-7)', 'Week 2 (8-14)', 'Week 3 (15-21)', 'Week 4 (22-28)', 'Week 5 (29+)'];
    const incomeData = new Array(5).fill(0);
    const expenseData = new Array(5).fill(0);

    monthlyTransactions.forEach(t => {
        const day = new Date(t.date).getUTCDate();
        let weekIndex;
        if (day <= 7) weekIndex = 0;
        else if (day <= 14) weekIndex = 1;
        else if (day <= 21) weekIndex = 2;
        else if (day <= 28) weekIndex = 3;
        else weekIndex = 4;

        if (t.type === 'income') {
            incomeData[weekIndex] += t.amount;
        } 
        else if (t.type === 'expense' || t.type === 'saving') {
            expenseData[weekIndex] += t.amount;
        }
    });

    return {
        labels: labels,
        datasets: [
            { label: 'Income', data: incomeData, backgroundColor: 'rgba(46, 204, 113, 0.7)' },
            { label: 'Expense', data: expenseData, backgroundColor: 'rgba(231, 76, 60, 0.7)' }
        ]
    };
}

function updateChart(monthlyTransactions, selectedMonth) {
    const ctx = financeChartCanvas.getContext('2d');
    if (financeChart) {
        financeChart.destroy();
    }

    if (selectedMonth === 'all') {
        financeChartCanvas.style.display = 'none';
        return;
    }
    financeChartCanvas.style.display = 'block';

    let chartData;
    let xAxisTitle;

    if (currentChartView === 'weekly') {
        chartData = generateWeeklyChartData(monthlyTransactions, selectedMonth);
        xAxisTitle = `Weeks in ${new Date(selectedMonth + '-02').toLocaleString('default', { month: 'long', year: 'numeric' })}`;
    } else {
        chartData = generateMonthlyChartData(monthlyTransactions, selectedMonth);
        xAxisTitle = `Days in ${new Date(selectedMonth + '-02').toLocaleString('default', { month: 'long', year: 'numeric' })}`;
    }

    financeChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { callback: value => 'Rs ' + value } },
                x: { title: { display: true, text: xAxisTitle } }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) label += 'Rs ' + context.parsed.y.toFixed(2);
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// --- Data Manipulation Functions ---
function processTransaction(type) {
    if (!descriptionInput.value.trim() || !amountInput.value.trim() || !dateInput.value.trim()) {
        alert('Please fill all transaction fields: Description, Amount, and Date.');
        return;
    }
    const newTransaction = {
        description: descriptionInput.value,
        amount: Math.abs(+amountInput.value),
        date: dateInput.value,
        type: type
    };
    
    push(transactionsRef, newTransaction);
    
    descriptionInput.value = '';
    amountInput.value = '';
}

window.removeTransaction = function(id) {
    remove(ref(database, 'transactions/' + id));
}

function setTargets() {
    const selectedMonth = monthFilter.value;
    if (!selectedMonth || selectedMonth === 'all') {
        alert('Please select a specific month from the dropdown at the top first.');
        return;
    }
    const targetData = {
        income: +incomeTargetInput.value || 0,
        expense: +expenseTargetInput.value || 0,
        saving: +savingTargetInput.value || 0,
    };
    set(ref(database, `targets/${selectedMonth}`), targetData);
    alert(`Targets for ${monthFilter.options[monthFilter.selectedIndex].text} have been set!`);
}

// NEW: Function to clear targets for the selected month
function clearMonthlyTargets(event) {
    event.preventDefault();
    const selectedMonth = monthFilter.value;

    if (!selectedMonth || selectedMonth === 'all') {
        alert('Please select a specific month to clear its targets.');
        return;
    }

    const monthName = monthFilter.options[monthFilter.selectedIndex].text;
    const confirmation = confirm(`Are you sure you want to clear all targets for ${monthName}?`);

    if (confirmation) {
        remove(ref(database, `targets/${selectedMonth}`));
    }
}

function clearAllData() {
    const confirmation = confirm('Are you sure you want to delete ALL transactions and targets? This action cannot be undone.');
    if (confirmation) {
        remove(transactionsRef);
        remove(targetsRef);
        alert('All transactions and targets have been cleared.');
    }
}


function updateSummaryValues() {
    const income = allTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expenses = allTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const savings = allTransactions.filter(t => t.type === 'saving').reduce((acc, t) => acc + t.amount, 0);
    balance.innerText = `Rs ${(income - expenses - savings).toFixed(2)}`;
    totalIncome.innerText = `Rs ${income.toFixed(2)}`;
    totalExpenses.innerText = `Rs ${expenses.toFixed(2)}`;
    totalSavings.innerText = `Rs ${savings.toFixed(2)}`;
}

function updateTransactionLists(transactionsToDisplay) {
    incomeList.innerHTML = '';
    expenseList.innerHTML = '';
    savingList.innerHTML = '';
    const sortedTransactions = [...transactionsToDisplay].sort((a, b) => new Date(b.date) - new Date(a.date));
    sortedTransactions.forEach(transaction => {
        const item = document.createElement('li');
        item.classList.add(transaction.type);
        item.innerHTML = `
            ${transaction.description} <span>Rs ${transaction.amount.toFixed(2)}</span>
            <button class="delete-btn" onclick="removeTransaction('${transaction.id}')">x</button>
        `;
        if (transaction.type === 'income') incomeList.appendChild(item);
        else if (transaction.type === 'expense') expenseList.appendChild(item);
        else savingList.appendChild(item);
    });
}

function updateMonthlyAnalysis(monthlyTransactions) {
    if (monthFilter.value === 'all') {
        monthlySummary.innerHTML = '<p>Select a specific month to see its analysis.</p>';
        return;
    }
    const income = monthlyTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = monthlyTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const savings = monthlyTransactions.filter(t => t.type === 'saving').reduce((acc, t) => acc + t.amount, 0);
    monthlySummary.innerHTML = `
        <p><span>Income:</span> <span class="income-amount">Rs ${income.toFixed(2)}</span></p>
        <p><span>Expenses:</span> <span class="expense-amount">Rs ${expense.toFixed(2)}</span></p>
        <p><span>Savings:</span> <span class="saving-amount">Rs ${savings.toFixed(2)}</span></p>
        <p><strong><span>Net for month:</span> <span>Rs ${(income - expense - savings).toFixed(2)}</span></strong></p>
    `;
}

function updateTargetProgress(monthlyTransactions, selectedMonth) {
    const targets = allTargets[selectedMonth];
    incomeTargetInput.value = targets?.income || '';
    expenseTargetInput.value = targets?.expense || '';
    savingTargetInput.value = targets?.saving || '';
    if (selectedMonth === 'all' || !targets) {
        incomeProgressBar.style.width = '0%';
        expenseProgressBar.style.width = '0%';
        savingProgressBar.style.width = '0%';
        incomeProgressText.innerText = 'Select a month to see progress.';
        expenseProgressText.innerText = 'Select a month to see progress.';
        savingProgressText.innerText = 'Select a month to see progress.';
        return;
    }
    const currentIncome = monthlyTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const currentExpense = monthlyTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const currentSaving = monthlyTransactions.filter(t => t.type === 'saving').reduce((acc, t) => acc + t.amount, 0);
    const incomePercent = targets.income > 0 ? (currentIncome / targets.income) * 100 : 0;
    incomeProgressBar.style.width = `${Math.min(incomePercent, 100)}%`;
    incomeProgressText.innerText = `Rs ${currentIncome.toFixed(2)} / Rs ${targets.income.toFixed(2)}`;
    const expensePercent = targets.expense > 0 ? (currentExpense / targets.expense) * 100 : 0;
    expenseProgressBar.style.width = `${Math.min(expensePercent, 100)}%`;
    expenseProgressText.innerText = `Rs ${currentExpense.toFixed(2)} / Rs ${targets.expense.toFixed(2)}`;
    const savingPercent = targets.saving > 0 ? (currentSaving / targets.saving) * 100 : 0;
    savingProgressBar.style.width = `${Math.min(savingPercent, 100)}%`;
    savingProgressText.innerText = `Rs ${currentSaving.toFixed(2)} / Rs ${targets.saving.toFixed(2)}`;
}

function populateMonthFilter() {
    const currentSelected = monthFilter.value;
    const transactionMonths = allTransactions.map(t => t.date.substring(0, 7));
    const targetMonths = Object.keys(allTargets);
    const currentMonthStr = new Date().toISOString().substring(0, 7);
    const allMonthStrings = [...new Set([...transactionMonths, ...targetMonths, currentMonthStr])];
    allMonthStrings.sort().reverse();
    monthFilter.innerHTML = '<option value="all">All Time Summary</option>';
    allMonthStrings.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = new Date(month + '-02').toLocaleString('default', { month: 'long', year: 'numeric' });
        monthFilter.appendChild(option);
    });
    if (currentSelected && allMonthStrings.includes(currentSelected)) {
        monthFilter.value = currentSelected;
    } else {
        monthFilter.value = currentMonthStr;
    }
}

// --- Event Listeners ---
addIncomeBtn.addEventListener('click', (e) => { e.preventDefault(); processTransaction('income'); });
addExpenseBtn.addEventListener('click', (e) => { e.preventDefault(); processTransaction('expense'); });
addSavingBtn.addEventListener('click', (e) => { e.preventDefault(); processTransaction('saving'); }); 
setTargetBtn.addEventListener('click', (event) => {
    event.preventDefault();
    setTargets();
});
monthFilter.addEventListener('change', updateUI);
toggleTargetsBtn.addEventListener('click', () => {
    targetForm.classList.toggle('visible');
});

// Event listeners for chart view buttons
monthlyViewBtn.addEventListener('click', () => {
    if (currentChartView !== 'monthly') {
        currentChartView = 'monthly';
        monthlyViewBtn.classList.add('active');
        weeklyViewBtn.classList.remove('active');
        updateUI(); 
    }
});

weeklyViewBtn.addEventListener('click', () => {
    if (currentChartView !== 'weekly') {
        currentChartView = 'weekly';
        weeklyViewBtn.classList.add('active');
        monthlyViewBtn.classList.remove('active');
        updateUI();
    }
});

clearAllBtn.addEventListener('click', clearAllData);
// NEW: Event listener for clearing monthly targets
clearTargetsBtn.addEventListener('click', clearMonthlyTargets);


// --- Initializer ---
document.addEventListener('DOMContentLoaded', () => {
    dateInput.value = new Date().toISOString().slice(0, 10);
    populateMonthFilter();
    updateUI();
    isInitialDataLoaded = true;
});
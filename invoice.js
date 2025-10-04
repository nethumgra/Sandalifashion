import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Your Firebase configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const customersRef = ref(database, 'customers');

// Get DOM Elements
const sidebar = document.getElementById('sidebar');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const downloadPdfBtn = document.getElementById('download-pdf-btn');

// --- Control Panel Elements ---
const controls = document.getElementById('invoice-controls');
const fromNameInput = document.getElementById('from-name');
const fromAddressInput = document.getElementById('from-address');
const fromPhoneInput = document.getElementById('from-phone');
const issueDateInput = document.getElementById('issue-date');
const dueDateInput = document.getElementById('due-date');
const customerSelect = document.getElementById('customer-select');
const customerNameInput = document.getElementById('customer-name');
const customerAddressInput = document.getElementById('customer-address');
const itemsEditor = document.getElementById('items-editor');
const addItemBtn = document.getElementById('add-item-btn');
const taxRateInput = document.getElementById('tax-rate');
const termsInput = document.getElementById('terms');

// --- Preview Panel Elements ---
const invoicePreview = document.getElementById('invoice-preview');
const previewFromName = document.getElementById('preview-from-name');
const previewFromAddress = document.getElementById('preview-from-address');
const previewFromPhone = document.getElementById('preview-from-phone');
const previewToName = document.getElementById('preview-to-name');
const previewToAddress = document.getElementById('preview-to-address');
const previewInvoiceNumber = document.getElementById('preview-invoice-number');
const previewIssueDate = document.getElementById('preview-issue-date');
const previewDueDate = document.getElementById('preview-due-date');
const previewItemsBody = document.getElementById('preview-items-body');
const previewSubtotal = document.getElementById('preview-subtotal');
const previewTaxRate = document.getElementById('preview-tax-rate');
const previewTaxAmount = document.getElementById('preview-tax-amount');
const previewTotal = document.getElementById('preview-total');
const previewTerms = document.getElementById('preview-terms');

let allCustomers = {};
let itemCounter = 0;

// --- Main Update Function ---
function updatePreview() {
    // Your Details
    const fromName = fromNameInput.value || "Sandali Fashion's";
    const fromAddress = fromAddressInput.value || "123 Fashion Street, Colombo";
    const fromPhone = fromPhoneInput.value;
    
    previewFromName.textContent = fromName;
    previewFromAddress.textContent = fromAddress;
    previewFromPhone.textContent = fromPhone;

    // Save company details to localStorage for persistence
    localStorage.setItem('companyDetails', JSON.stringify({ name: fromName, address: fromAddress, phone: fromPhone }));

    // Customer Details
    previewToName.textContent = customerNameInput.value || 'Client Name';
    previewToAddress.textContent = customerAddressInput.value || 'Client Address';

    // Dates
    previewIssueDate.textContent = issueDateInput.value ? new Date(issueDateInput.value).toLocaleDateString() : 'N/A';
    previewDueDate.textContent = dueDateInput.value ? new Date(dueDateInput.value).toLocaleDateString() : 'N/A';

    // Items and Totals
    previewItemsBody.innerHTML = '';
    let subtotal = 0;
    itemsEditor.querySelectorAll('.item-editor-row').forEach(row => {
        const desc = row.querySelector('.item-desc').value;
        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const total = qty * price;
        subtotal += total;

        const previewRow = document.createElement('tr');
        previewRow.innerHTML = `
            <td class="p-2">${desc || '...'}</td>
            <td class="p-2 text-right">${qty}</td>
            <td class="p-2 text-right">Rs ${price.toFixed(2)}</td>
            <td class="p-2 text-right font-medium">Rs ${total.toFixed(2)}</td>
        `;
        previewItemsBody.appendChild(previewRow);
    });

    const taxRate = parseFloat(taxRateInput.value) || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const grandTotal = subtotal + taxAmount;

    previewSubtotal.textContent = `Rs ${subtotal.toFixed(2)}`;
    previewTaxRate.textContent = taxRate;
    previewTaxAmount.textContent = `Rs ${taxAmount.toFixed(2)}`;
    previewTotal.textContent = `Rs ${grandTotal.toFixed(2)}`;
    
    // Terms
    previewTerms.textContent = termsInput.value;
}


// --- Functions ---
function initializeInvoice() {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 30);
    
    issueDateInput.value = today.toISOString().split('T')[0];
    dueDateInput.value = futureDate.toISOString().split('T')[0];
    
    previewInvoiceNumber.textContent = `INV-${Date.now().toString().slice(-6)}`;
    
    itemsEditor.innerHTML = '';
    addNewItemEditorRow();
    updatePreview();
}

function addNewItemEditorRow() {
    itemCounter++;
    const div = document.createElement('div');
    div.className = 'item-editor-row grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_80px_100px_auto] gap-2 items-center';
    div.innerHTML = `
        <input type="text" placeholder="Item description" class="item-desc form-input col-span-4 sm:col-span-1">
        <input type="number" value="1" min="1" class="item-qty form-input text-right" placeholder="Qty">
        <input type="number" value="0.00" min="0" step="0.01" class="item-price form-input text-right" placeholder="Price">
        <button class="remove-item-btn text-red-500 hover:text-red-700 p-2"><i class="fas fa-trash-alt"></i></button>
    `;
    itemsEditor.appendChild(div);
}

function downloadInvoice() {
    const options = {
      margin: 0.5,
      filename: `Invoice-${previewInvoiceNumber.textContent}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(options).from(invoicePreview).save();
}

// --- Event Listeners ---
controls.addEventListener('input', updatePreview);
addItemBtn.addEventListener('click', addNewItemEditorRow);
itemsEditor.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.remove-item-btn');
    if (removeBtn) {
        if (itemsEditor.querySelectorAll('.item-editor-row').length > 1) {
            removeBtn.closest('.item-editor-row').remove();
            updatePreview();
        }
    }
});
downloadPdfBtn.addEventListener('click', downloadInvoice);

customerSelect.addEventListener('change', (e) => {
    const selectedId = e.target.value;
    if (selectedId && allCustomers[selectedId]) {
        const customer = allCustomers[selectedId];
        customerNameInput.value = customer.name;
        customerAddressInput.value = customer.address;
        updatePreview();
    }
});

// Firebase listener for customers
onValue(customersRef, (snapshot) => {
    const data = snapshot.val();
    allCustomers = data || {};
    customerSelect.innerHTML = '<option value="">-- Select --</option>'; // Reset
    if (data) {
        Object.entries(data).forEach(([key, customer]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = customer.name;
            customerSelect.appendChild(option);
        });
    }
});

// --- Theme & Sidebar Logic ---
const sunIcon = `<i class="fas fa-sun"></i> Light Mode`;
const moonIcon = `<i class="fas fa-moon"></i> Dark Mode`;

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        themeToggleBtn.innerHTML = sunIcon;
    } else {
        document.documentElement.classList.remove('dark');
        themeToggleBtn.innerHTML = moonIcon;
    }
}

themeToggleBtn.addEventListener('click', () => {
    const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
});

mobileMenuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('-translate-x-full');
});


// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    const savedDetails = JSON.parse(localStorage.getItem('companyDetails'));
    if (savedDetails) {
        fromNameInput.value = savedDetails.name || "Sandali Fashion's";
        fromAddressInput.value = savedDetails.address || "123 Fashion Street, Colombo";
        fromPhoneInput.value = savedDetails.phone || "";
    } else {
        fromNameInput.value = "Sandali Fashion's";
        fromAddressInput.value = "123 Fashion Street, Colombo";
    }

    initializeInvoice();
});


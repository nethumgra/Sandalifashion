// order.js

// 1. Import functions from the Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, push, remove, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// 2. Firebase Config
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
const ordersRef = ref(database, 'orders');

// 4. Global State
let allOrders = {};

// 5. Get DOM Elements
const ordersTableBody = document.getElementById('orders-table-body');
const searchInput = document.getElementById('search-input');
const filterStatus = document.getElementById('filter-status');
const orderForm = document.getElementById('order-form');
const productDropdown = document.getElementById('product');
const otherProductWrapper = document.getElementById('other-product-wrapper');
const editProductDropdown = document.getElementById('edit-product');
const editOtherProductWrapper = document.getElementById('edit-other-product-wrapper');
const totalOrdersStat = document.getElementById('total-orders-stat');
const totalRevenueStat = document.getElementById('total-revenue-stat');
const totalCostStat = document.getElementById('total-cost-stat');
const pendingOrdersStat = document.getElementById('pending-orders-stat');
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-order-form');
const closeModalBtn = document.getElementById('close-edit-modal-btn');
const invoiceModal = document.getElementById('invoice-modal');
const closeInvoiceBtn = invoiceModal.querySelector('.close-invoice-btn');
const downloadInvoiceBtn = document.getElementById('download-invoice-btn');
const invoiceContent = document.getElementById('invoice-content');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

// 6. Constants
const statusClasses = {
    Pending: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    Shipped: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    Delivered: 'bg-green-500/10 text-green-400 border border-green-500/20',
    Returned: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
    Canceled: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// --- Main Functions ---

function renderOrders(ordersObject) {
    ordersTableBody.innerHTML = ''; 
    if (Object.keys(ordersObject).length === 0) {
        ordersTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-slate-400">No orders found.</td></tr>';
        return;
    }
    const sortedOrders = Object.entries(ordersObject).sort(([, a], [, b]) => new Date(b.orderDate) - new Date(a.orderDate));
    for (const [key, order] of sortedOrders) {
        const row = document.createElement('tr');
        row.className = 'border-b border-slate-600 hover:bg-slate-600/50';
        row.dataset.id = key;
        row.innerHTML = `
            <td class="px-6 py-4 font-medium text-white">${order.customerName}</td>
            <td class="px-6 py-4 text-slate-300 font-semibold">${order.product || ''}</td>
            <td class="px-6 py-4 text-slate-300 max-w-xs truncate" title="${order.details}">${order.details}</td>
            <td class="px-6 py-4 text-slate-300">Rs ${(order.price || 0).toFixed(2)}</td>
            <td class="px-6 py-4 text-slate-300">${order.orderDate}</td>
            <td class="px-6 py-4">
                <span class="px-2.5 py-1 font-medium text-xs rounded-full ${statusClasses[order.status] || 'bg-slate-600 text-slate-300'}">
                    ${order.status}
                </span>
            </td>
            <td class="px-6 py-4 flex gap-4">
                <button class="invoice-btn text-slate-400 hover:text-green-500" title="Generate Invoice"><i class="fas fa-file-invoice"></i></button>
                <button class="edit-btn text-slate-400 hover:text-blue-500" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="delete-btn text-slate-400 hover:text-red-500" title="Delete"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        ordersTableBody.appendChild(row);
    }
}

function calculateStats(orders) {
    const ordersArray = Object.values(orders);
    totalOrdersStat.textContent = ordersArray.length;
    totalRevenueStat.textContent = ordersArray.reduce((sum, order) => sum + (order.price || 0), 0).toFixed(2);
    totalCostStat.textContent = ordersArray.reduce((sum, order) => sum + (order.cost || 0), 0).toFixed(2);
    pendingOrdersStat.textContent = ordersArray.filter(order => order.status === 'Pending').length;
}

function filterAndRender() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusFilterValue = filterStatus.value;
    const filteredOrders = Object.fromEntries(
        Object.entries(allOrders).filter(([, order]) => 
            (order.customerName.toLowerCase().includes(searchTerm) || order.details.toLowerCase().includes(searchTerm) || (order.product && order.product.toLowerCase().includes(searchTerm))) && 
            (statusFilterValue === 'all' || order.status === statusFilterValue)
        )
    );
    renderOrders(filteredOrders);
}

// --- CRUD & Other Functions ---

function addOrder(event) {
    event.preventDefault();
    const product = document.getElementById('product').value;
    let orderDetails = document.getElementById('order-details').value;
    
    if (product === 'Other') {
        const otherDetails = document.getElementById('other-product-details').value;
        orderDetails = `${otherDetails.trim()}: ${orderDetails}`;
    }

    const newOrder = {
        customerName: document.getElementById('customer-name').value,
        product: product,
        details: orderDetails,
        price: +document.getElementById('price').value,
        orderDate: document.getElementById('order-date').value,
        status: document.getElementById('delivery-status').value,
        cost: 0 
    };

    if (!newOrder.customerName.trim() || !newOrder.details.trim() || !newOrder.price || !newOrder.orderDate) {
        alert('Please fill out all required fields.');
        return;
    }

    push(ordersRef, newOrder);
    orderForm.reset();
    document.getElementById('order-date').value = new Date().toISOString().slice(0, 10);
    otherProductWrapper.classList.add('hidden');
}

function openEditModal(orderId) {
    const order = allOrders[orderId];
    if (!order) return;
    document.getElementById('edit-order-id').value = orderId;
    document.getElementById('edit-customer-name').value = order.customerName;
    document.getElementById('edit-product').value = order.product || 'Other';
    document.getElementById('edit-order-details').value = order.details;
    document.getElementById('edit-price').value = order.price;
    document.getElementById('edit-cost').value = order.cost || 0;
    document.getElementById('edit-order-date').value = order.orderDate;
    document.getElementById('edit-delivery-status').value = order.status;

    editProductDropdown.dispatchEvent(new Event('change'));
    
    const editCostWrapper = document.getElementById('edit-cost-wrapper');
    if (order.status === 'Delivered' || order.status === 'Shipped') {
        editCostWrapper.classList.remove('hidden');
    } else {
        editCostWrapper.classList.add('hidden');
    }

    editModal.classList.remove('hidden');
}

function handleUpdateOrder(event) {
    event.preventDefault();
    const orderId = document.getElementById('edit-order-id').value;
    if (!orderId) return;

    const updatedOrderData = {
        customerName: document.getElementById('edit-customer-name').value,
        product: document.getElementById('edit-product').value,
        details: document.getElementById('edit-order-details').value,
        price: +document.getElementById('edit-price').value,
        cost: +document.getElementById('edit-cost').value,
        orderDate: document.getElementById('edit-order-date').value,
        status: document.getElementById('edit-delivery-status').value,
    };
    const orderToUpdateRef = ref(database, `orders/${orderId}`);
    update(orderToUpdateRef, updatedOrderData).then(() => editModal.classList.add('hidden'));
}

function handleDeleteOrder(orderId) {
    if (confirm('Are you sure you want to delete this order?')) {
        remove(ref(database, 'orders/' + orderId));
    }
}

// --- Invoice Functions ---

function openInvoiceModal(orderId) {
    const order = allOrders[orderId];
    if (!order) return;

    const invNum = `INV-${orderId.slice(-6).toUpperCase()}`;
    const invDate = new Date().toLocaleDateString('en-CA');
    
    invoiceContent.innerHTML = `
        <div class="flex justify-between items-start mb-8">
            <div>
                <h1 class="text-3xl font-bold text-slate-800">INVOICE</h1>
                <p class="text-slate-500">Invoice #: ${invNum}</p>
                <p class="text-slate-500">Date: ${invDate}</p>
            </div>
            <div class="text-right">
                 <h2 class="text-2xl font-semibold">Sandali Fashion's</h2>
                 <p class="text-slate-600">Your Address Here</p>
                 <p class="text-slate-600">Your Contact Info</p>
            </div>
        </div>
        <div class="mb-8">
            <h3 class="text-lg font-semibold text-slate-700 mb-2">Bill To:</h3>
            <p class="text-slate-800 font-medium">${order.customerName}</p>
            <p class="text-slate-600">Order Date: ${order.orderDate}</p>
        </div>
        <table class="w-full text-left mb-8">
            <thead>
                <tr class="bg-slate-200">
                    <th class="p-3 font-semibold">Description</th>
                    <th class="p-3 font-semibold text-right">Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="p-3 border-b border-slate-200">${order.product} - ${order.details}</td>
                    <td class="p-3 border-b border-slate-200 text-right">Rs ${(order.price || 0).toFixed(2)}</td>
                </tr>
            </tbody>
            <tfoot>
                <tr>
                    <td class="p-3 font-bold text-right">Total</td>
                    <td class="p-3 font-bold text-right text-lg">Rs ${(order.price || 0).toFixed(2)}</td>
                </tr>
            </tfoot>
        </table>
        <div class="text-center text-slate-500 text-sm">
            <p>Thank you for your business!</p>
        </div>
    `;

    downloadInvoiceBtn.dataset.invoiceId = invNum;
    downloadInvoiceBtn.dataset.customerName = order.customerName;
    invoiceModal.classList.remove('hidden');
}

function downloadInvoiceAsPDF() {
    const invId = downloadInvoiceBtn.dataset.invoiceId;
    const custName = downloadInvoiceBtn.dataset.customerName;
    const filename = `Invoice-${invId}-${custName.replace(/\s/g, '_')}.pdf`;
    html2pdf().from(invoiceContent).set({
        margin: 0.5,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    }).save();
}

// --- Initializer & Event Listeners ---

function setupEventListeners() {
    // Add Order Form
    orderForm.addEventListener('submit', addOrder);
    productDropdown.addEventListener('change', () => {
        otherProductWrapper.classList.toggle('hidden', productDropdown.value !== 'Other');
    });

    // Edit Modal
    editForm.addEventListener('submit', handleUpdateOrder);
    closeModalBtn.addEventListener('click', () => editModal.classList.add('hidden'));
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) editModal.classList.add('hidden');
    });
    editProductDropdown.addEventListener('change', () => {
        editOtherProductWrapper.classList.toggle('hidden', editProductDropdown.value !== 'Other');
    });
    document.getElementById('edit-delivery-status').addEventListener('change', (e) => {
        const status = e.target.value;
        const editCostWrapper = document.getElementById('edit-cost-wrapper');
        editCostWrapper.classList.toggle('hidden', !(status === 'Delivered' || status === 'Shipped'));
    });

    // Table actions
    ordersTableBody.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        const orderId = button.closest('tr').dataset.id;
        if (button.classList.contains('delete-btn')) handleDeleteOrder(orderId);
        if (button.classList.contains('edit-btn')) openEditModal(orderId);
        if (button.classList.contains('invoice-btn')) openInvoiceModal(orderId);
    });

    // Filtering and Searching
    searchInput.addEventListener('input', filterAndRender);
    filterStatus.addEventListener('change', filterAndRender);

    // Invoice Modal
    downloadInvoiceBtn.addEventListener('click', downloadInvoiceAsPDF);
    closeInvoiceBtn.addEventListener('click', () => invoiceModal.classList.add('hidden'));
    invoiceModal.addEventListener('click', (e) => {
        if (e.target === invoiceModal) invoiceModal.classList.add('hidden');
    });

    // Hamburger Menu
    const toggleMenu = () => {
        sidebar.classList.toggle('-translate-x-full');
        sidebarOverlay.classList.toggle('hidden');
    };
    mobileMenuBtn.addEventListener('click', toggleMenu);
    sidebarOverlay.addEventListener('click', toggleMenu);
}

// **FIX:** Renamed this function to avoid conflict with the Firebase import.
function initializeOrderPage() {
    setupEventListeners();
    document.getElementById('order-date').value = new Date().toISOString().slice(0, 10);
}

// --- Firebase Realtime Listener ---

onValue(ordersRef, (snapshot) => {
    allOrders = snapshot.val() || {};
    calculateStats(allOrders);
    filterAndRender();
});

// --- Start the App ---
// **FIX:** Calling the newly renamed function.
document.addEventListener('DOMContentLoaded', initializeOrderPage);
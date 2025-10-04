// 1. Import functions from the Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, push, remove, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Firebase Config (remains the same)
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
const ordersRef = ref(database, 'orders');

// Global State
let allOrders = {};

// Get DOM Elements
const ordersTableBody = document.getElementById('orders-table-body');
const searchInput = document.getElementById('search-input');
const orderForm = document.getElementById('order-form');
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-order-form');
const closeModalBtn = document.getElementById('close-edit-modal-btn');

const productDropdown = document.getElementById('product');
const otherProductWrapper = document.getElementById('other-product-wrapper');
const editProductDropdown = document.getElementById('edit-product');
const editOtherProductWrapper = document.getElementById('edit-other-product-wrapper');

// Invoice Modal Elements
const invoiceModal = document.getElementById('invoice-modal');
const closeInvoiceBtn = invoiceModal.querySelector('.close-invoice-btn');
const downloadInvoiceBtn = document.getElementById('download-invoice-btn');
const invoiceContent = document.getElementById('invoice-content');
const invoiceNumber = document.getElementById('invoice-number');
const invoiceDate = document.getElementById('invoice-date');
const invoiceOrderDate = document.getElementById('invoice-order-date');
const invoiceCustomerName = document.getElementById('invoice-customer-name');
const invoiceDetails = document.getElementById('invoice-details');
const invoicePrice = document.getElementById('invoice-price');
const invoiceTotal = document.getElementById('invoice-total');


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
            <td class="px-6 py-4 text-slate-300">${order.details}</td>
            <td class="px-6 py-4 text-slate-300">${(order.price || 0).toFixed(2)}</td>
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

// --- CRUD & Other Functions ---

function addOrder(event) {
    event.preventDefault();
    const customerName = document.getElementById('customer-name').value;
    const product = document.getElementById('product').value;
    let orderDetails = document.getElementById('order-details').value;
    const price = document.getElementById('price').value;
    const orderDate = document.getElementById('order-date').value;
    const deliveryStatus = document.getElementById('delivery-status').value;

    if (product === 'Other') {
        const otherDetails = document.getElementById('other-product-details').value;
        if (otherDetails.trim() !== '') {
             orderDetails = `${otherDetails} (${orderDetails})`;
        }
    }

    if (!customerName.trim() || !orderDetails.trim() || !price || !orderDate) {
        alert('Please fill out all required fields.');
        return;
    }
    const newOrder = {
        customerName: customerName,
        product: product,
        details: orderDetails,
        price: +price,
        orderDate: orderDate,
        status: deliveryStatus,
    };
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
    document.getElementById('edit-order-date').value = order.orderDate;
    document.getElementById('edit-delivery-status').value = order.status;

    editProductDropdown.dispatchEvent(new Event('change'));
    editModal.classList.remove('hidden');
}

function closeEditModal() {
    editModal.classList.add('hidden');
}

function handleUpdateOrder(event) {
    event.preventDefault();
    const orderId = document.getElementById('edit-order-id').value;
    const product = document.getElementById('edit-product').value;
    let details = document.getElementById('edit-order-details').value;

    if (product === 'Other') {
        const otherDetails = document.getElementById('edit-other-product-details').value;
        if (otherDetails.trim() !== '') {
            details = `${otherDetails} (${details})`;
        }
    }

    const updatedOrderData = {
        customerName: document.getElementById('edit-customer-name').value,
        product: product,
        details: details,
        price: +document.getElementById('edit-price').value,
        orderDate: document.getElementById('edit-order-date').value,
        status: document.getElementById('edit-delivery-status').value,
    };
    const orderToUpdateRef = ref(database, `orders/${orderId}`);
    update(orderToUpdateRef, updatedOrderData).then(closeEditModal);
}

function calculateStats(orders) {
    const totalOrdersStat = document.getElementById('total-orders-stat');
    const totalRevenueStat = document.getElementById('total-revenue-stat');
    const pendingOrdersStat = document.getElementById('pending-orders-stat');
    
    const ordersArray = Object.values(orders);
    totalOrdersStat.textContent = ordersArray.length;
    totalRevenueStat.textContent = ordersArray.reduce((sum, order) => sum + (order.price || 0), 0).toFixed(2);
    pendingOrdersStat.textContent = ordersArray.filter(order => order.status === 'Pending').length;
}

function filterAndRender() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusFilter = document.getElementById('filter-status').value;
    const filteredOrders = Object.fromEntries(
        Object.entries(allOrders).filter(([, order]) => 
            (order.customerName.toLowerCase().includes(searchTerm) || order.details.toLowerCase().includes(searchTerm) || (order.product && order.product.toLowerCase().includes(searchTerm))) && 
            (statusFilter === 'all' || order.status === statusFilter)
        )
    );
    renderOrders(filteredOrders);
}

// --- Invoice Functions ---

function openInvoiceModal(orderId) {
    const order = allOrders[orderId];
    if (!order) return;

    const invNum = `INV-${orderId.slice(-6).toUpperCase()}`;
    invoiceNumber.textContent = invNum;
    
    invoiceDate.textContent = new Date().toLocaleDateString('en-CA');
    invoiceOrderDate.textContent = order.orderDate;
    invoiceCustomerName.textContent = order.customerName;
    
    let invoiceDesc = `${order.product} - ${order.details}`;
    if (order.product === 'Other') {
        invoiceDesc = order.details;
    }
    invoiceDetails.textContent = invoiceDesc;
    
    invoicePrice.textContent = (order.price || 0).toFixed(2);
    invoiceTotal.textContent = (order.price || 0).toFixed(2);
    
    downloadInvoiceBtn.dataset.invoiceId = invNum;
    downloadInvoiceBtn.dataset.customerName = order.customerName;

    invoiceModal.classList.remove('hidden');
}

function downloadInvoiceAsPDF() {
    const invId = downloadInvoiceBtn.dataset.invoiceId;
    const custName = downloadInvoiceBtn.dataset.customerName;
    const filename = `Invoice-${invId}-${custName.replace(/\s/g, '_')}.pdf`;

    const options = {
      margin: 0.5,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(options).from(invoiceContent).save();
}

// --- Event Listeners ---

productDropdown.addEventListener('change', () => {
    if (productDropdown.value === 'Other') {
        otherProductWrapper.classList.remove('hidden');
    } else {
        otherProductWrapper.classList.add('hidden');
    }
});

editProductDropdown.addEventListener('change', () => {
    if (editProductDropdown.value === 'Other') {
        editOtherProductWrapper.classList.remove('hidden');
    } else {
        editOtherProductWrapper.classList.add('hidden');
    }
});

orderForm.addEventListener('submit', addOrder);
editForm.addEventListener('submit', handleUpdateOrder);

ordersTableBody.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const orderId = button.closest('tr').dataset.id;
    if (button.classList.contains('delete-btn')) {
        if (confirm('Are you sure you want to delete this order?')) {
            remove(ref(database, 'orders/' + orderId));
        }
    } else if (button.classList.contains('edit-btn')) {
        openEditModal(orderId);
    } else if (button.classList.contains('invoice-btn')) {
        openInvoiceModal(orderId);
    }
});

searchInput.addEventListener('input', filterAndRender);
document.getElementById('filter-status').addEventListener('change', filterAndRender);
closeModalBtn.addEventListener('click', closeEditModal);
editModal.addEventListener('click', (event) => {
    if (event.target === editModal) {
        closeEditModal();
    }
});

downloadInvoiceBtn.addEventListener('click', downloadInvoiceAsPDF);
closeInvoiceBtn.addEventListener('click', () => invoiceModal.classList.add('hidden'));
invoiceModal.addEventListener('click', (event) => {
    if (event.target === invoiceModal) {
        invoiceModal.classList.add('hidden');
    }
});

onValue(ordersRef, (snapshot) => {
    const data = snapshot.val();
    allOrders = data || {};
    calculateStats(allOrders);
    filterAndRender();
});

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('order-date').value = new Date().toISOString().slice(0, 10);
});
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, push, remove, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Your Firebase configuration provided
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
const addCustomerForm = document.getElementById('add-customer-form');
const customersTableBody = document.getElementById('customers-table-body');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.getElementById('sidebar');

// Edit Modal Elements
const editModal = document.getElementById('edit-customer-modal');
const editCustomerForm = document.getElementById('edit-customer-form');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const editCustomerId = document.getElementById('edit-customer-id');
const editCustomerName = document.getElementById('edit-customer-name');
const editCustomerAddress = document.getElementById('edit-customer-address');
const editCustomerPhone = document.getElementById('edit-customer-phone');


// --- Add Customer Logic ---
addCustomerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const customerNameInput = document.getElementById('customer-name');
    const customerAddressInput = document.getElementById('customer-address');
    const customerPhoneInput = document.getElementById('customer-phone');

    if (!customerNameInput.value.trim() || !customerAddressInput.value.trim() || !customerPhoneInput.value.trim()) {
        alert('Please fill all the fields.');
        return;
    }

    const newCustomer = {
        name: customerNameInput.value,
        address: customerAddressInput.value,
        phone: customerPhoneInput.value,
    };

    push(customersRef, newCustomer)
        .then(() => {
            addCustomerForm.reset();
        })
        .catch((error) => {
            console.error("Error adding customer: ", error);
            alert("Failed to add customer. Please try again.");
        });
});

// --- Display Customers Logic ---
let allCustomersData = {}; // Store all customer data globally to access for editing

onValue(customersRef, (snapshot) => {
    customersTableBody.innerHTML = '';
    const data = snapshot.val();
    allCustomersData = data; // Update the global data object

    if (data) {
        const customerKeys = Object.keys(data).reverse();
        customerKeys.forEach(key => {
            const customer = data[key];
            const row = customersTableBody.insertRow();
            row.className = "border-b border-gray-200 dark:border-gray-700";
            row.innerHTML = `
                <td class="px-6 py-4 font-medium">${customer.name}</td>
                <td class="px-6 py-4">${customer.address}</td>
                <td class="px-6 py-4">${customer.phone}</td>
                <td class="px-6 py-4 flex gap-2">
                    <button data-key="${key}" class="edit-btn text-blue-500 hover:text-blue-700">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button data-key="${key}" class="delete-btn text-red-500 hover:text-red-700">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
        });
    } else {
        customersTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-10 text-gray-500">No customers found.</td></tr>`;
    }
});

// --- Edit and Delete Logic (using Event Delegation) ---
customersTableBody.addEventListener('click', (e) => {
    const target = e.target.closest('button');
    if (!target) return;

    const customerKey = target.dataset.key;

    // Handle Delete 🗑️
    if (target.classList.contains('delete-btn')) {
        if (confirm('Are you sure you want to delete this customer?')) {
            const customerToDeleteRef = ref(database, `customers/${customerKey}`);
            remove(customerToDeleteRef)
                .catch(error => {
                    console.error("Error deleting customer: ", error);
                    alert("Failed to delete customer.");
                });
        }
    }

    // Handle Edit 📝
    if (target.classList.contains('edit-btn')) {
        const customerData = allCustomersData[customerKey];
        if (customerData) {
            // Populate and show the modal
            editCustomerId.value = customerKey;
            editCustomerName.value = customerData.name;
            editCustomerAddress.value = customerData.address;
            editCustomerPhone.value = customerData.phone;
            editModal.classList.remove('hidden');
        }
    }
});

// --- Edit Modal Form Submission Logic ---
editCustomerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const customerKey = editCustomerId.value;
    const updatedData = {
        name: editCustomerName.value,
        address: editCustomerAddress.value,
        phone: editCustomerPhone.value,
    };

    const customerToUpdateRef = ref(database, `customers/${customerKey}`);
    update(customerToUpdateRef, updatedData)
        .then(() => {
            editModal.classList.add('hidden'); // Hide modal on success
        })
        .catch((error) => {
            console.error("Error updating customer: ", error);
            alert("Failed to update customer.");
        });
});

// --- Cancel Edit Button Logic ---
cancelEditBtn.addEventListener('click', () => {
    editModal.classList.add('hidden');
});


// --- Theme Toggle Logic ---
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
    const isDarkMode = document.documentElement.classList.contains('dark');
    const newTheme = isDarkMode ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
});

const savedTheme = localStorage.getItem('theme') || 'light';
applyTheme(savedTheme);


// --- Mobile Sidebar Toggle Logic ---
mobileMenuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('-translate-x-full');
});
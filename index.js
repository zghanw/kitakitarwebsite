// --- Constants & Config ---
const RATES = {
    plastic: 0.07,
    metal: 0.09,
    paper: 0.07,
    glass: 0.25,
    aluminum: 0.1,
    lawnwaste: 0.15,
    misc: 0.35,
    foodwaste: 0.4,
    electronicwaste: 0.5,
    usedtires: 0.6,
    usedoil: 1,
    carbatteries: 0.8,
    householdbatteries: 1.2,
    householdhazardouswaste: 1.5
};

// --- State Management ---
let currentUser = null;
let currentQr = null; // To clear previous QR codes
let currentQrLarge = null;

// --- DOM Elements ---
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');

// Forms & Inputs
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const calcForm = document.getElementById('calcForm');
const itemsContainer = document.getElementById('itemsContainer'); // New container

// Navigation
const loginView = document.getElementById('login-form');
const registerView = document.getElementById('register-form');
const forgotPasswordView = document.getElementById('forgot-password-form');
const navBtns = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view-section');

// Modal Elements
const qrModal = document.getElementById('qrModal');
const closeModal = document.getElementById('closeModal');
const qrArea = document.querySelector('.qr-area');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Check for existing session
    const savedUser = localStorage.getItem('kitakitar_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        initApp();
    }

    // Set Date
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', dateOptions);

    // Event Listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Auth Switching
    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        loginView.classList.add('hidden');
        registerView.classList.remove('hidden');
    });

    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        registerView.classList.add('hidden');
        loginView.classList.remove('hidden');
    });

    // Forgot Password
    // Forgot Password
    document.getElementById('forgotPassLink').addEventListener('click', (e) => {
        e.preventDefault();
        loginView.classList.add('hidden');
        forgotPasswordView.classList.remove('hidden');
    });

    document.getElementById('back-to-login').addEventListener('click', (e) => {
        e.preventDefault();
        forgotPasswordView.classList.add('hidden');
        loginView.classList.remove('hidden');
    });

    // Forgot Password Submit
    forgotPasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('forgotEmail').value;

        // Simulation of checking email
        const users = JSON.parse(localStorage.getItem('kitakitar_users') || '[]');
        const userExists = users.some(u => u.email === email);

        if (userExists) {
            alert(`Password reset link has been sent to ${email}.`);
            forgotPasswordView.classList.add('hidden');
            loginView.classList.remove('hidden');
        } else {
            // Security best practice: Don't reveal if user exists or not, but for this MVP/demo we can be specific or vague. 
            // Requirement says "email service will settle the rest", implying we just send it.
            // But for better UX let's just say sent.
            // However, to be helpful in this specific context (if it's a dev implementation), let's check existence. 
            // If we want to strictly follow "email service will settle the rest", we might just show success regardless.
            // Let's stick to the behavior similar to login: check if user exists.
            // Actually, usually you just say "If an account exists, an email has been sent."
            alert(`If an account exists for ${email}, a password reset link has been sent.`);
            forgotPasswordView.classList.add('hidden');
            loginView.classList.remove('hidden');
        }
    });

    // Login Logic
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        const users = JSON.parse(localStorage.getItem('kitakitar_users') || '[]');
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            currentUser = user;
            localStorage.setItem('kitakitar_user', JSON.stringify(user));
            initApp();
        } else {
            alert('Invalid credentials!');
        }
    });

    // Register Logic
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const centerName = document.getElementById('regCenterName').value;
        const address = document.getElementById('regAddress').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        const users = JSON.parse(localStorage.getItem('kitakitar_users') || '[]');

        if (users.some(u => u.email === email)) {
            alert('Email already registered!');
            return;
        }

        const newUser = {
            id: Date.now(),
            centerName,
            address,
            email,
            password,
            transactions: []
        };

        users.push(newUser);
        localStorage.setItem('kitakitar_users', JSON.stringify(users));

        // Auto Login
        currentUser = newUser;
        localStorage.setItem('kitakitar_user', JSON.stringify(newUser));
        initApp();
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('kitakitar_user');
        window.location.reload();
    });

    // Navigation
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active btn
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const viewName = btn.dataset.view;

            // Show view
            const targetId = `view-${viewName}`;
            views.forEach(view => {
                if (view.id === targetId) {
                    view.classList.remove('hidden');
                    view.classList.add('fade-in');
                } else {
                    view.classList.add('hidden');
                    view.classList.remove('fade-in');
                }
            });

            // Special Loaders
            if (viewName === 'leaderboard') {
                renderLeaderboard();
            }
        });
    });

    // Calculator: Add Item Logic
    document.getElementById('addItemBtn').addEventListener('click', () => {
        addCalculatorRow();
    });

    // Calculator & QR Logic
    calcForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const rows = document.querySelectorAll('.item-row');
        let totalPoints = 0;
        let items = [];

        rows.forEach(row => {
            const material = row.querySelector('.material-select').value;
            const weight = parseFloat(row.querySelector('.weight-input').value);

            if (weight > 0) {
                const rate = RATES[material];
                const points = weight * rate;
                totalPoints += points;
                items.push({ material, weight, points });
            }
        });

        if (items.length === 0) return;

        const finalPoints = totalPoints.toFixed(2);

        // Display Result
        document.getElementById('calcPoints').textContent = finalPoints;
        document.getElementById('resultCard').classList.remove('hidden');

        // Generate QR
        generateQR(finalPoints, items);

        // Save Transaction
        saveTransaction(items, finalPoints);
    });

    // QR Modal Logic
    qrArea.addEventListener('click', () => {
        const points = document.getElementById('calcPoints').textContent;
        if (points === '0') return;

        document.getElementById('modalPoints').textContent = `${points} Points`;
        qrModal.classList.remove('hidden');

        // Generate Large QR
        const qrContainerLarge = document.getElementById('qrcodeLarge');
        qrContainerLarge.innerHTML = '';
        currentQrLarge = new QRCode(qrContainerLarge, {
            text: qrSchemaCache, // Use the cached data string
            width: 256,
            height: 256,
            colorDark: "#2ecc71",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    });

    closeModal.addEventListener('click', () => {
        qrModal.classList.add('hidden');
    });

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === qrModal) {
            qrModal.classList.add('hidden');
        }
    });

    // Initial Row Remove Button Listener (delegation)
    itemsContainer.addEventListener('click', (e) => {
        if (e.target.closest('.btn-remove')) {
            const row = e.target.closest('.item-row');
            // Only remove if there's more than one row
            if (document.querySelectorAll('.item-row').length > 1) {
                row.remove();
                updateRemoveButtons();
            }
        }
    });
}

// --- Core Functions ---

let qrSchemaCache = "";

function initApp() {
    // Hide Auth, Show App
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    appContainer.classList.add('fade-in');

    // Set Sidebar Info
    document.getElementById('navCenterName').textContent = currentUser.centerName;
    document.getElementById('navCenterAddress').textContent = currentUser.address;

    // Load History
    renderHistory();
    updateRemoveButtons(); // Ensure button visibility correct
}

function addCalculatorRow() {
    const row = document.createElement('div');
    row.className = 'item-row fade-in';
    row.innerHTML = `
        <div class="input-group">
            <label>Material Type</label>
            <div class="select-wrapper">
                <select class="material-select" required>
                    <option value="plastic">Plastic (0.07 pts/kg)</option>
                    <option value="metal">Metal (0.09 pts/kg)</option>
                    <option value="paper">Paper/Cardboard (0.07 pts/kg)</option>
                    <option value="glass">Glass (0.25 pts/kg)</option>
                    <option value="aluminum">Aluminum (0.1 pts/kg)</option>
                    <option value="lawnwaste">Lawn/Yard Waste (0.15pts/kg)</option>
                    <option value="foodwaste">Food Waste (0.4pts/kg)</option>
                    <option value="electronicwaste">Electronics Waste (0.5pts/kg)</option>
                    <option value="usedtires">Used Tires (0.6pts/kg)</option>\
                    <option value="usedoil">Used Oil (1pts/kg)</option>
                    <option value="carbatteries">Batteries(Car) (0.8pts/kg)</option>
                    <option value="householdbatteries">Batteries(Household) (1.2pts/kg)</option>
                    <option value="householdhazardouswaste">Household Hazardous Waste (1.5pts/kg)</option>
                </select>
                <i class="fa-solid fa-chevron-down"></i>
            </div>
        </div>
        <div class="input-group">
            <label>Weight (kg)</label>
            <input type="number" class="weight-input" min="0.1" step="0.1" placeholder="0.0" required>
        </div>
        <button type="button" class="btn-remove"><i class="fa-solid fa-trash"></i></button>
    `;
    itemsContainer.appendChild(row);
    updateRemoveButtons();
}

function updateRemoveButtons() {
    const rows = document.querySelectorAll('.item-row');
    const buttons = document.querySelectorAll('.btn-remove');

    if (rows.length === 1) {
        buttons.forEach(btn => btn.classList.add('hidden'));
    } else {
        buttons.forEach(btn => btn.classList.remove('hidden'));
    }
}

function generateQR(points, items) {
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = ''; // Clear previous

    // Create summary string for QR
    const itemSummary = items.map(i => `${i.material}:${i.weight}kg`).join(';');

    // Data payload for the QR (JSON string)
    // Cache it for the modal
    qrSchemaCache = JSON.stringify({
        center: currentUser.centerName,
        items: items,
        totalPoints: points,
        date: new Date().toISOString()
    });

    currentQr = new QRCode(qrContainer, {
        text: qrSchemaCache,
        width: 128,
        height: 128,
        colorDark: "#2ecc71",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

function saveTransaction(items, totalPoints) {
    // Creating a summary string for display "Plastic (10kg), Metal (5kg)"
    // And calculate total weight for history display
    let rowTotalWeight = 0;
    const summary = items.map(i => {
        rowTotalWeight += i.weight;
        const mat = i.material.charAt(0).toUpperCase() + i.material.slice(1); // Capitalize
        return `${mat} (${i.weight}kg)`;
    }).join(', ');

    const transaction = {
        date: new Date().toLocaleString(),
        summary: summary,
        totalWeight: rowTotalWeight, // NEW: Persist calc weight
        itemsObject: items, // Save raw items too just in case
        points: parseFloat(totalPoints) // Ensure number
    };

    // Update current user state
    if (!currentUser.transactions) currentUser.transactions = [];
    currentUser.transactions.unshift(transaction); // Add to top

    // Persist to Global User List (simulating backend update)
    const users = JSON.parse(localStorage.getItem('kitakitar_users') || '[]');
    const userIndex = users.findIndex(u => u.email === currentUser.email);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        localStorage.setItem('kitakitar_users', JSON.stringify(users));
    }
    // Update Session
    localStorage.setItem('kitakitar_user', JSON.stringify(currentUser));

    renderHistory();
}

function renderHistory() {
    const tbody = document.getElementById('historyTableBody');
    const totalWeightEl = document.getElementById('historyTotalWeight');
    const totalPointsEl = document.getElementById('historyTotalPoints');

    tbody.innerHTML = '';

    const history = currentUser.transactions || [];

    let grandTotalWeight = 0;
    let grandTotalPoints = 0;

    if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: #7f8c8d;">No transactions yet. Start recycling!</td></tr>';
        totalWeightEl.textContent = '0 kg';
        totalPointsEl.textContent = '+0';
        return;
    }

    history.forEach(tx => {
        // Handle legacy data structure
        let displayItem = tx.summary;
        let displayWeight = tx.totalWeight || 0; // Default to stored total

        // Legacy Support Check: If tx.totalWeight is undefined, try to sum manually or use legacy single item weight
        if (displayWeight === 0) {
            if (tx.weight) {
                // Legacy single item
                displayItem = tx.material ? tx.material : tx.summary;
                displayWeight = tx.weight;
            } else if (tx.itemsObject) {
                // Re-calculate if missing
                displayWeight = tx.itemsObject.reduce((sum, i) => sum + i.weight, 0);
            }
        }

        // Accumulate Grand Totals
        grandTotalWeight += displayWeight;
        grandTotalPoints += parseFloat(tx.points);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${tx.date}</td>
            <td>${displayItem}</td>
            <td>${displayWeight.toFixed(1)} kg</td>
            <td style="font-weight: 700; color: #2ecc71;">+${tx.points}</td>
        `;
        tbody.appendChild(tr);
    });

    // Update Footer
    totalWeightEl.textContent = `${grandTotalWeight.toFixed(1)} kg`;
    totalPointsEl.textContent = `+${grandTotalPoints.toFixed(2)}`;
}

// --- Leaderboard Functionality ---

function renderLeaderboard() {
    const tbody = document.getElementById('leaderboardTableBody');
    tbody.innerHTML = '';

    // fetch all users from localStorage
    const allUsers = JSON.parse(localStorage.getItem('kitakitar_users') || '[]');

    // Calculate total points for each center
    const leaderboardData = allUsers.map(user => {
        const totalPoints = (user.transactions || []).reduce((sum, tx) => sum + parseFloat(tx.points), 0);

        let displayName = user.centerName;
        // Optionally mark the current user
        if (currentUser && user.email === currentUser.email) {
            displayName += " (You)";
        }

        return {
            name: displayName,
            points: totalPoints
        };
    });

    // Sort by Points Descending
    leaderboardData.sort((a, b) => b.points - a.points);

    if (leaderboardData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No centers registered yet.</td></tr>';
        return;
    }

    leaderboardData.forEach((center, index) => {
        const rank = index + 1;
        let rankClass = '';
        let icon = '';

        if (rank === 1) { rankClass = 'rank-1'; icon = '<i class="fa-solid fa-crown"></i> '; }
        else if (rank === 2) { rankClass = 'rank-2'; icon = '<i class="fa-solid fa-medal"></i> '; }
        else if (rank === 3) { rankClass = 'rank-3'; icon = '<i class="fa-solid fa-medal"></i> '; }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="${rankClass}">${icon}#${rank}</td>
            <td style="font-weight: 600;">${center.name}</td>
            <td style="font-weight: 700; color: #2ecc71;">${center.points.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pts</td>
        `;
        tbody.appendChild(tr);
    });
}

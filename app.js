document.addEventListener("DOMContentLoaded", () => {
    let balance = 15450.00;
    const history = [];

    const loginView = document.getElementById("login-view");
    const transferView = document.getElementById("transfer-view");
    const receiptView = document.getElementById("receipt-view");

    const loginForm = document.getElementById("login-form");
    const cardInput = document.getElementById("card-number");
    const nipInput = document.getElementById("card-nip");
    const loginError = document.getElementById("login-error");

    const transferForm = document.getElementById("transfer-form");
    const transferError = document.getElementById("transfer-error");
    const balanceDisplay = document.getElementById("balance-amount");
    const maskedCardDisplay = document.getElementById("masked-card");
    const historyList = document.getElementById("history-list");

    const receiptDetails = document.getElementById("receipt-details");
    const newTransferBtn = document.getElementById("new-transfer-btn");
    const logoutBtn = document.getElementById("logout-btn");

    // Formato automático de 4 en 4 dígitos para la tarjeta
    cardInput.addEventListener("input", (e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
        e.target.value = digits.replace(/(.{4})/g, "$1 ").trim();
    });

    // Solo números en el NIP
    nipInput.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4);
    });

    function showView(view) {
        [loginView, transferView, receiptView].forEach(v => v.classList.remove("active"));
        view.classList.add("active");
    }

    function formatCurrency(amount) {
        return amount.toLocaleString("es-MX", { style: "currency", currency: "MXN" }) + " MXN";
    }

    function updateHistoryUI() {
        if (history.length === 0) {
            historyList.innerHTML = `<li class="empty-history">Aún no hay transferencias realizadas.</li>`;
            return;
        }
        historyList.innerHTML = history.map(item => `
            <li>
                <span><strong>${item.name}</strong><br><small>${item.concept}</small></span>
                <span style="color:#dc2626; font-weight:600;">-${formatCurrency(item.amount)}</span>
            </li>
        `).join("");
    }

    // Validación de inicio de sesión
    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const rawCard = cardInput.value.replace(/\s/g, "");
        const nip = nipInput.value;

        if (rawCard.length !== 16) {
            loginError.textContent = "Ingresa los 16 dígitos de tu tarjeta.";
            return;
        }
        if (nip.length !== 4) {
            loginError.textContent = "El NIP debe contener exactamente 4 dígitos.";
            return;
        }

        loginError.textContent = "";
        maskedCardDisplay.textContent = `•••• ${rawCard.slice(-4)}`;
        balanceDisplay.textContent = formatCurrency(balance);
        showView(transferView);
    });

    // Procesar transferencia simulada
    transferForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("recipient-name").value.trim();
        const account = document.getElementById("recipient-account").value.replace(/\D/g, "");
        const amount = parseFloat(document.getElementById("transfer-amount").value);
        const concept = document.getElementById("transfer-concept").value.trim();

        if (account.length < 16) {
            transferError.textContent = "La cuenta o tarjeta destino debe tener 16 o 18 dígitos.";
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            transferError.textContent = "Ingresa un monto válido mayor a $0.";
            return;
        }
        if (amount > balance) {
            transferError.textContent = "Saldo insuficiente para realizar esta transferencia.";
            return;
        }

        transferError.textContent = "";
        balance -= amount;
        balanceDisplay.textContent = formatCurrency(balance);

        const folio = "FP-" + Math.floor(100000 + Math.random() * 900000);
        const date = new Date().toLocaleString("es-MX");

        history.unshift({ name, amount, concept });
        updateHistoryUI();

        receiptDetails.innerHTML = `
            <div><strong>Folio de rastreo:</strong> ${folio}</div>
            <div><strong>Destinatario:</strong> ${name}</div>
            <div><strong>Cuenta destino:</strong> •••• ${account.slice(-4)}</div>
            <div><strong>Monto enviado:</strong> ${formatCurrency(amount)}</div>
            <div><strong>Concepto:</strong> ${concept}</div>
            <div><strong>Fecha y hora:</strong> ${date}</div>
        `;

        transferForm.reset();
        showView(receiptView);
    });

    newTransferBtn.addEventListener("click", () => showView(transferView));

    logoutBtn.addEventListener("click", () => {
        loginForm.reset();
        showView(loginView);
    });
});
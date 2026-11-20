document.addEventListener("DOMContentLoaded", () => {
  let balance = 15450.0;
  let activeCard = "";
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
  const maskedCardDisplay = document.getElementById("masked-card-display");
  const historyList = document.getElementById("history-list");

  const receiptDetails = document.getElementById("receipt-details");
  const newTransferBtn = document.getElementById("new-transfer-btn");
  const logoutBtn = document.getElementById("logout-btn");

  // Formato automático de 4 en 4 dígitos para la tarjeta
  cardInput?.addEventListener("input", (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
    e.target.value = digits.replace(/(.{4})/g, "$1 ").trim();
  });

  // Validación de acceso
  function validarAcceso(cardValue, nipValue) {
    const cleanCard = (cardValue || "").replace(/\s+/g, "");
    const cleanNip = (nipValue || "").trim();

    if (!cleanCard || !cleanNip) {
      return { ok: false, message: "Completa el número de tarjeta y el NIP." };
    }
    if (cleanCard.length < 16) {
      return { ok: false, message: "El número de tarjeta debe tener 16 dígitos." };
    }
    if (cleanNip.length < 4) {
      return { ok: false, message: "El NIP debe tener al menos 4 dígitos." };
    }
    return { ok: true, card: cleanCard, nip: cleanNip };
  }

  // Cálculo de totales y comisión
  function calcularTotalesTransferencia(monto, porcentajeComision = 0.02) {
    const amount = Number(monto);
    if (Number.isNaN(amount) || amount <= 0) {
      return { ok: false, message: "Ingresa un monto válido mayor a $0.00." };
    }
    const fee = Number((amount * porcentajeComision).toFixed(2));
    const total = Number((amount + fee).toFixed(2));
    return { ok: true, amount, fee, total };
  }

  // Validación de transferencia
  function validarTransferencia(destinatario, monto, saldoActual, porcentajeComision = 0.02) {
    const recipient = (destinatario || "").trim();
    if (!recipient) {
      return { ok: false, message: "Ingresa el destinatario o cuenta destino." };
    }

    const calculo = calcularTotalesTransferencia(monto, porcentajeComision);
    if (!calculo.ok) {
      return calculo;
    }

    if (calculo.total > saldoActual) {
      return {
        ok: false,
        message: `Saldo insuficiente. Total con comisión: $${calculo.total.toFixed(2)}.`,
      };
    }

    return { ok: true, recipient, ...calculo };
  }

  function mostrarVista(vistaActiva) {
    [loginView, transferView, receiptView].forEach((view) => {
      if (!view) return;
      const esActiva = view === vistaActiva;
      view.classList.toggle("active", esActiva);
      view.classList.toggle("hidden", !esActiva);
    });
  }

  function actualizarEncabezadoSaldo() {
    if (balanceDisplay) {
      balanceDisplay.textContent = `$${balance.toFixed(2)}`;
    }
    if (maskedCardDisplay && activeCard) {
      const ultimos4 = activeCard.slice(-4);
      maskedCardDisplay.textContent = `•••• •••• •••• ${ultimos4}`;
    }
  }

  function registrarTransferencia(registro) {
    history.unshift(registro);
    if (!historyList) return;

    const esTabla = historyList.tagName === "TBODY";
    const item = document.createElement(esTabla ? "tr" : "li");

    if (esTabla) {
      item.innerHTML = `
        <td>${registro.recipient}</td>
        <td>$${registro.amount.toFixed(2)}</td>
        <td>$${registro.fee.toFixed(2)}</td>
        <td>$${registro.total.toFixed(2)}</td>
        <td>${registro.date}</td>
      `;
    } else {
      item.textContent = `${registro.recipient} — Monto: $${registro.amount.toFixed(2)} | Comisión: $${registro.fee.toFixed(2)} | Total: $${registro.total.toFixed(2)} (${registro.date})`;
    }

    historyList.prepend(item);
  }

  loginForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (loginError) loginError.textContent = "";

    const validacion = validarAcceso(cardInput?.value, nipInput?.value);
    if (!validacion.ok) {
      if (loginError) loginError.textContent = validacion.message;
      return;
    }

    activeCard = validacion.card;
    actualizarEncabezadoSaldo();
    mostrarVista(transferView);
  });

  transferForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (transferError) transferError.textContent = "";

    const destInput = transferForm.querySelector(
      "#recipient, #destination, #destinatario, input[type='text']"
    );
    const amountInput = transferForm.querySelector(
      "#amount, #monto, input[type='number']"
    );

    const validacion = validarTransferencia(
      destInput?.value,
      amountInput?.value,
      balance
    );

    if (!validacion.ok) {
      if (transferError) transferError.textContent = validacion.message;
      return;
    }

    balance = Number((balance - validacion.total).toFixed(2));
    actualizarEncabezadoSaldo();

    const registro = {
      recipient: validacion.recipient,
      amount: validacion.amount,
      fee: validacion.fee,
      total: validacion.total,
      date: new Date().toLocaleString("es-MX"),
    };

    registrarTransferencia(registro);

    if (receiptDetails) {
      receiptDetails.innerHTML = `
        <p><strong>Destinatario:</strong> ${registro.recipient}</p>
        <p><strong>Monto:</strong> $${registro.amount.toFixed(2)}</p>
        <p><strong>Comisión (2%):</strong> $${registro.fee.toFixed(2)}</p>
        <p><strong>Total descontado:</strong> $${registro.total.toFixed(2)}</p>
        <p><strong>Fecha:</strong> ${registro.date}</p>
      `;
    }

    transferForm.reset();
    mostrarVista(receiptView);
  });

  newTransferBtn?.addEventListener("click", () => {
    if (transferError) transferError.textContent = "";
    mostrarVista(transferView);
  });

  logoutBtn?.addEventListener("click", () => {
    activeCard = "";
    loginForm?.reset();
    if (loginError) loginError.textContent = "";
    mostrarVista(loginView);
  });

  window.FastPayLogic = {
    validarAcceso,
    calcularTotalesTransferencia,
    validarTransferencia,
  };
});
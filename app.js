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

  // --- VALIDACIONES Y CÁLCULOS (DÍA 5) ---
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

  function calcularTotalesTransferencia(monto, porcentajeComision = 0.02) {
    const amount = Number(monto);
    if (Number.isNaN(amount) || amount <= 0) {
      return { ok: false, message: "Ingresa un monto válido mayor a $0.00." };
    }
    const fee = Number((amount * porcentajeComision).toFixed(2));
    const total = Number((amount + fee).toFixed(2));
    return { ok: true, amount, fee, total };
  }

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

  // Exponer funciones auxiliares si se consultan o prueban
  window.FastPayLogic = {
    validarAcceso,
    calcularTotalesTransferencia,
    validarTransferencia,
  };
});
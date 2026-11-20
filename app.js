function mostrarVista(vistaActiva) {
    [loginView, transferView, receiptView].forEach((view) => {
      if (!view) return;
      view.classList.toggle("active", view === vistaActiva);
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

    // Si #history-list es un <tbody>, crea un <tr>; si es <ul>/<ol>/<div>, crea un <li> o <div>
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

    // Busca un input común de destinatario y monto dentro del formulario
    const destInput =
      transferForm.querySelector("#recipient, #destination, #destinatario, input[type='text']");
    const amountInput =
      transferForm.querySelector("#amount, #monto, input[type='number']");

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
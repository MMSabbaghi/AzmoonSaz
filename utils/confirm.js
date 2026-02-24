(function () {
  const css = `
      :root {
      --confirm-light: #f9f9f9;
      --border: #ddd;
    }
    .confirm-overlay {
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.4);
      display: none;
      align-items: flex-start;
      justify-content: center;
      z-index: 2000;
      animation: fadeIn 0.3s ease-out;
    }

    .confirm-box {
      background: var(--confirm-light);
      padding: 24px;
      margin-top:20px;
      border-radius: var(--radius);
      width: 320px;
      max-width: 90%;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      text-align: center;
      animation: slideDown 0.2s ease;
    }

    .confirm-box h3 {
      margin: 0 0 12px;
      color: var(--primary-dark);
    }

    .confirm-buttons {
      display: flex;
      gap: 8px;
      margin: 0;
    }

    .confirm-btn {
      flex: 1;
      padding: 10px;
      border: none;
      border-radius: var(--radius) ;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .confirm-btn-confirm {
      background: var(--primary);
      color: white;
    }

    .confirm-btn-cancel {
      background: var(--border);
      color: #333;
    }

    @keyframes fadeIn {
      from { background: rgba(0, 0, 0, 0); }
      to { background: rgba(0, 0, 0, 0.4); }
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes popupIn {
      from {
        transform: scale(0.8);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }
  `;

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // Create DOM elements
  const overlay = document.createElement("div");
  overlay.className = "confirm-overlay";
  overlay.innerHTML = `
    <div class="confirm-box">
      <h3 id="confirm-text">آیا اطمینان دارید؟</h3>
      <div class="confirm-buttons">
        <button class="confirm-btn confirm-btn-cancel" id="cancelBtn">
          <i class="bi bi-x-lg"></i>
          <span id="cancelText">لغو</span>
        </button>
        <button class="confirm-btn confirm-btn-confirm" id="confirmBtn">
          <i class="bi bi-check-lg"></i>
          <span id="confirmText">تأیید</span>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const cancelBtn = overlay.querySelector("#cancelBtn");
  const confirmBtn = overlay.querySelector("#confirmBtn");
  const cancelText = overlay.querySelector("#cancelText");
  const confirmText = overlay.querySelector("#confirmText");
  const confirmIcon = confirmBtn.querySelector("i");
  const cancelIcon = cancelBtn.querySelector("i");

  let onConfirm = null;
  let onCancel = null;

  function showConfirm({
    msg,
    on_confirm,
    on_cancel,
    confirmText: customConfirmText = "تأیید",
    cancelText: customCancelText = "لغو",
    confirmIcon: customConfirmIcon = "bi-check-lg",
    cancelIcon: customCancelIcon = "bi-x-lg",
  }) {
    onConfirm = on_confirm;
    onCancel = on_cancel;

    // Update text and icons
    overlay.querySelector("#confirm-text").innerHTML = msg;
    confirmText.textContent = customConfirmText;
    cancelText.textContent = customCancelText;

    // Update icons if provided
    if (customConfirmIcon) {
      confirmIcon.className = `bi ${customConfirmIcon}`;
    }
    if (customCancelIcon) {
      cancelIcon.className = `bi ${customCancelIcon}`;
    }

    overlay.style.display = "flex";
  }

  function hideConfirm() {
    overlay.style.display = "none";
  }

  cancelBtn.onclick = function () {
    hideConfirm();
    if (typeof onCancel === "function") onCancel();
  };

  confirmBtn.onclick = function () {
    hideConfirm();
    if (typeof onConfirm === "function") onConfirm();
  };

  // Optional: click outside to close
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      hideConfirm();
      if (typeof onCancel === "function") onCancel();
    }
  });

  // Expose globally
  window.showConfirm = showConfirm;
})();

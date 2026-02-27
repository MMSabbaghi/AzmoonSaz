(function () {
  const css = `
    .confirm-overlay {
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      background: var(--overlay);
      display: none;
      align-items: flex-start;
      justify-content: center;
      z-index: 2000;
      animation: fadeIn 0.3s ease-out;
    }

    .confirm-box {
      background: var(--surface);
      padding: 24px;
      margin-top:20px;
      border-radius: var(--radius);
      width: 320px;
      max-width: 90%;
      box-shadow: var(--shadow-lg);
      text-align: center;
      animation: slideDown 0.2s ease;
    }

    .confirm-box h3 {
      margin: 0 0 12px;
      color: var(--text-primary);
    }

    .confirm-input-container {
      margin-bottom: 16px;
      text-align: right;
    }

    .confirm-input-container input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: 14px;
      background: var(--surface);
      color: var(--text-primary);
      box-sizing: border-box;
    }

    .confirm-input-container input:focus {
      outline: none;
      border-color: var(--primary);
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
      border-radius: var(--radius);
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .confirm-btn-confirm {
      background: var(--primary);
      color: var(--text-inverse);
    }

    .confirm-btn-cancel {
      background: var(--border);
      color: var(--text-primary);
    }

    @keyframes fadeIn {
      from { background: rgba(0, 0, 0, 0); }
      to { background: var(--overlay); }
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
      <div class="confirm-input-container" id="confirm-input-container" style="display: none;">
        <input type="text" id="confirm-input" placeholder="..." />
      </div>
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

  const inputContainer = overlay.querySelector("#confirm-input-container");
  const inputField = overlay.querySelector("#confirm-input");

  let onConfirm = null;
  let onCancel = null;
  let inputConfig = null;

  function showConfirm({
    msg,
    on_confirm,
    on_cancel,
    confirmText: customConfirmText = "تأیید",
    cancelText: customCancelText = "لغو",
    confirmIcon: customConfirmIcon = "bi-check-lg",
    cancelIcon: customCancelIcon = "bi-x-lg",
    input, // { placeholder, value, required, label }
  }) {
    onConfirm = on_confirm;
    onCancel = on_cancel;
    inputConfig = input;

    overlay.querySelector("#confirm-text").innerHTML = msg;

    confirmText.textContent = customConfirmText;
    cancelText.textContent = customCancelText;

    if (customConfirmIcon) {
      confirmIcon.className = `bi ${customConfirmIcon}`;
    }
    if (customCancelIcon) {
      cancelIcon.className = `bi ${customCancelIcon}`;
    }

    if (input) {
      const placeholder = input.placeholder || "...";
      const initialValue = input.value || "";
      inputField.placeholder = placeholder;
      inputField.value = initialValue;

      inputContainer.style.display = "block";
    } else {
      inputContainer.style.display = "none";
      inputField.value = "";
    }

    overlay.style.display = "flex";
  }

  function hideConfirm() {
    overlay.style.display = "none";
    inputField.value = "";
  }

  cancelBtn.onclick = function () {
    hideConfirm();
    if (typeof onCancel === "function") onCancel();
  };

  confirmBtn.onclick = function () {
    let result = null;
    if (inputConfig) {
      result = inputField.value;
      if (inputConfig.required && !result.trim()) {
        if (typeof showToast === "function") {
          showToast("این فیلد نمی‌تواند خالی باشد", "error");
        } else {
          alert("این فیلد نمی‌تواند خالی باشد");
        }
        return;
      }
    }

    hideConfirm();
    if (typeof onConfirm === "function") {
      onConfirm(result);
    }
  };

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      hideConfirm();
      if (typeof onCancel === "function") onCancel();
    }
  });

  // Expose globally
  window.showConfirm = showConfirm;
})();

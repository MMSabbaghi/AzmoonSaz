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
      animation: fadeIn 0.2s ease-out;
    }

    .confirm-box {
      background: var(--surface);
      padding: 24px;
      margin-top: 20px;
      border-radius: var(--radius);
      width: 360px;
      max-width: 92%;
      box-shadow: var(--shadow-lg);
      text-align: center;
      animation: slideDown 0.18s ease;
      outline: none;
    }

    .confirm-message {
      margin: 0 0 16px;
      color: var(--text-primary);
      font-size: 15px;
      line-height: 1.6;
    }

    .confirm-input-container {
      margin-bottom: 16px;
      text-align: right;
    }

    .confirm-input-label {
      display: block;
      margin: 0 0 8px;
      color: var(--text-secondary, var(--text-primary));
      font-size: 13px;
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
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent);
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
      gap: 6px;
      user-select: none;
    }

    .confirm-btn:focus {
      outline: none;
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 25%, transparent);
    }

    .confirm-btn-confirm {
      background: var(--primary);
      color: var(--text-inverse);
    }

    .confirm-btn-cancel {
      background: var(--border);
      color: var(--text-primary);
    }

    .confirm-btn[disabled]{
      opacity: 0.65;
      cursor: not-allowed;
    }

    @keyframes fadeIn {
      from { background: rgba(0, 0, 0, 0); }
      to { background: var(--overlay); }
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-16px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // Create DOM elements
  const overlay = document.createElement("div");
  overlay.className = "confirm-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.innerHTML = `
    <div class="confirm-box" tabindex="-1" aria-labelledby="confirm-text">
      <div id="confirm-text" class="confirm-message">آیا اطمینان دارید؟</div>

      <div class="confirm-input-container" id="confirm-input-container" style="display: none;">
        <label class="confirm-input-label" id="confirm-input-label" for="confirm-input" style="display:none;"></label>
        <input type="text" id="confirm-input" placeholder="..." autocomplete="off" />
      </div>

      <div class="confirm-buttons">
        <button class="confirm-btn confirm-btn-cancel" id="cancelBtn" type="button">
          <i class="bi bi-x-lg" aria-hidden="true"></i>
          <span id="cancelText">لغو</span>
        </button>
        <button class="confirm-btn confirm-btn-confirm" id="confirmBtn" type="button">
          <i class="bi bi-check-lg" aria-hidden="true"></i>
          <span id="confirmText">تأیید</span>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const box = overlay.querySelector(".confirm-box");
  const cancelBtn = overlay.querySelector("#cancelBtn");
  const confirmBtn = overlay.querySelector("#confirmBtn");
  const cancelText = overlay.querySelector("#cancelText");
  const confirmText = overlay.querySelector("#confirmText");
  const confirmIcon = confirmBtn.querySelector("i");
  const cancelIcon = cancelBtn.querySelector("i");

  const inputContainer = overlay.querySelector("#confirm-input-container");
  const inputField = overlay.querySelector("#confirm-input");
  const inputLabel = overlay.querySelector("#confirm-input-label");

  let onConfirm = null;
  let onCancel = null;
  let inputConfig = null;
  let options = null;

  let lastActiveElement = null;
  let keydownHandler = null;

  const DEFAULTS = {
    closeOnBackdrop: true,
    confirmOnEnter: true,
    cancelOnEsc: true,
    autoFocus: true,
    selectOnFocus: true,
    preventBodyScroll: true,
    saveLastInput: false,
  };

  function getStorageKey(saveLastInput) {
    if (!saveLastInput) return null;
    if (saveLastInput === true) return "confirm:lastInput";
    if (typeof saveLastInput === "object" && saveLastInput.key)
      return saveLastInput.key;
    return "confirm:lastInput";
  }

  function setBodyScrollLock(lock) {
    if (!DEFAULTS.preventBodyScroll && !(options && options.preventBodyScroll))
      return;

    if (lock) {
      document.body.dataset.__confirmScrollLock = "1";
      document.body.style.overflow = "hidden";
    } else {
      if (document.body.dataset.__confirmScrollLock) {
        document.body.style.overflow = "";
        delete document.body.dataset.__confirmScrollLock;
      }
    }
  }

  function showConfirm({
    msg,
    html,
    on_confirm,
    on_cancel,
    confirmText: customConfirmText = "تأیید",
    cancelText: customCancelText = "لغو",
    confirmIcon: customConfirmIcon = "bi-check-lg",
    cancelIcon: customCancelIcon = "bi-x-lg",
    input, // { placeholder, value, required, label }
    // UX options:
    closeOnBackdrop,
    confirmOnEnter,
    cancelOnEsc,
    autoFocus,
    selectOnFocus,
    preventBodyScroll,
    saveLastInput, // false | true | { key: '...' }
  }) {
    onConfirm = on_confirm;
    onCancel = on_cancel;
    inputConfig = input;

    options = {
      ...DEFAULTS,
      closeOnBackdrop: closeOnBackdrop ?? DEFAULTS.closeOnBackdrop,
      confirmOnEnter: confirmOnEnter ?? DEFAULTS.confirmOnEnter,
      cancelOnEsc: cancelOnEsc ?? DEFAULTS.cancelOnEsc,
      autoFocus: autoFocus ?? DEFAULTS.autoFocus,
      selectOnFocus: selectOnFocus ?? DEFAULTS.selectOnFocus,
      preventBodyScroll: preventBodyScroll ?? DEFAULTS.preventBodyScroll,
      saveLastInput: saveLastInput ?? DEFAULTS.saveLastInput,
    };

    lastActiveElement = document.activeElement;

    // Use `html` if provided, otherwise fall back to `msg` (both can contain HTML)
    const messageContent = html !== undefined ? html : msg || "";
    overlay.querySelector("#confirm-text").innerHTML = messageContent;

    confirmText.textContent = customConfirmText;
    cancelText.textContent = customCancelText;

    if (customConfirmIcon) confirmIcon.className = `bi ${customConfirmIcon}`;
    if (customCancelIcon) cancelIcon.className = `bi ${customCancelIcon}`;

    // Input
    if (input) {
      const placeholder = input.placeholder || "...";
      const initialValue = typeof input.value === "string" ? input.value : null;

      // label (optional)
      if (input.label) {
        inputLabel.textContent = input.label;
        inputLabel.style.display = "block";
      } else {
        inputLabel.textContent = "";
        inputLabel.style.display = "none";
      }

      inputField.placeholder = placeholder;

      // saveLastInput support
      const storageKey = getStorageKey(options.saveLastInput);
      let savedValue = "";
      if (storageKey) {
        try {
          savedValue = localStorage.getItem(storageKey) || "";
        } catch (e) {}
      }

      // priority: explicit input.value > savedValue > ""
      inputField.value =
        initialValue !== null ? initialValue : savedValue || "";

      inputContainer.style.display = "block";
    } else {
      inputContainer.style.display = "none";
      inputLabel.textContent = "";
      inputLabel.style.display = "none";
      inputField.value = "";
    }

    overlay.style.display = "flex";
    setBodyScrollLock(true);

    // Key handlers
    if (keydownHandler) document.removeEventListener("keydown", keydownHandler);
    keydownHandler = (e) => {
      if (overlay.style.display !== "flex") return;

      // ESC = cancel
      if (options.cancelOnEsc && e.key === "Escape") {
        e.preventDefault();
        cancelBtn.click();
        return;
      }

      // Enter = confirm (mostly for input)
      if (options.confirmOnEnter && e.key === "Enter") {
        // if input is shown, Enter should confirm
        if (inputConfig) {
          e.preventDefault();
          confirmBtn.click();
          return;
        }

        // without input: allow Ctrl/Cmd+Enter (to avoid accidental submits)
        if (!inputConfig && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          confirmBtn.click();
          return;
        }
      }
    };
    document.addEventListener("keydown", keydownHandler);

    // Focus
    if (options.autoFocus) {
      setTimeout(() => {
        if (inputConfig) {
          inputField.focus({ preventScroll: true });
          if (options.selectOnFocus) {
            try {
              inputField.select();
            } catch (e) {}
          }
        } else {
          confirmBtn.focus({ preventScroll: true });
        }
      }, 0);
    }
  }

  function hideConfirm() {
    overlay.style.display = "none";
    inputField.value = "";

    setBodyScrollLock(false);

    if (keydownHandler) {
      document.removeEventListener("keydown", keydownHandler);
      keydownHandler = null;
    }

    // Restore focus
    if (lastActiveElement && typeof lastActiveElement.focus === "function") {
      try {
        lastActiveElement.focus({ preventScroll: true });
      } catch (e) {}
    }
    lastActiveElement = null;
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
        inputField.focus({ preventScroll: true });
        return;
      }

      const storageKey = getStorageKey(options && options.saveLastInput);
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, result);
        } catch (e) {}
      }
    }

    hideConfirm();
    if (typeof onConfirm === "function") onConfirm(result);
  };

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      if (options && options.closeOnBackdrop) {
        hideConfirm();
        if (typeof onCancel === "function") onCancel();
      }
    }
  });

  window.showConfirm = showConfirm;
})();

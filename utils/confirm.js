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
      z-index: 900;
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
        <button class="confirm-btn confirm-btn-cancel">
        <i class="bi bi-x-lg"></i>
        لغو
        </button>
        <button class="confirm-btn confirm-btn-confirm">
        <i class="bi bi-check-lg"></i>
        تأیید
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const cancel = overlay.querySelector(".confirm-btn-cancel");
  const confirm = overlay.querySelector(".confirm-btn-confirm");

  let onConfirm = null;

  function showConfirm({ msg, on_confirm }) {
    onConfirm = on_confirm;
    overlay.querySelector("#confirm-text").innerHTML = msg;
    overlay.style.display = "flex";
  }

  function hideConfirm() {
    overlay.style.display = "none";
  }

  cancel.onclick = hideConfirm;

  confirm.onclick = function () {
    hideConfirm();
    if (typeof onConfirm === "function") onConfirm();
  };

  // Optional: click outside to close
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) hideConfirm();
  });

  // Expose globally
  window.showConfirm = showConfirm;
})();

class Dropdown {
  constructor({
    rootId = "dropdownRoot",
    mobileQuery = "(max-width: 640px)",
    closeOnEsc = false,
    closeOnOutsideClick = false,
    closeOnBackdrop = false,
    animDuration = 140,
  } = {}) {
    this.root = document.getElementById(rootId);
    this.mobileQuery = mobileQuery;
    this.isOpen = false;
    this.animDuration = animDuration;

    this.closeOnEsc = closeOnEsc;
    this.closeOnOutsideClick = closeOnOutsideClick;

    this._onEsc = (e) => {
      if (e.key === "Escape") this.close();
    };
    this._onDocClick = (e) => {
      const inside = e.target.closest("[data-dd-panel]");
      if (!inside && this.isOpen) this.close();
    };

    this.closeOnBackdrop = closeOnBackdrop;
  }

  close() {
    if (!this.isOpen) return;

    const wrap = this.root.querySelector("[data-dd-wrap]");
    if (!wrap) {
      this.root.innerHTML = "";
      this.isOpen = false;
      return;
    }

    const backdrop = wrap.querySelector("[data-dd-backdrop]");
    const panel = wrap.querySelector("[data-dd-panel]");

    // reverse animation
    if (backdrop) backdrop.classList.add("opacity-0");
    if (panel) {
      panel.classList.add("opacity-0", "translate-y-2");
      panel.classList.add("scale-[.98]");
    }

    const cleanup = () => {
      this.root.innerHTML = "";
      this.isOpen = false;

      document.removeEventListener("keydown", this._onEsc);
      document.removeEventListener("click", this._onDocClick, true);
    };

    // نرم‌تر از setTimeout: اگر transitionend نیامد، با تایمر جمع می‌کنیم
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      cleanup();
    };

    if (panel) {
      panel.addEventListener("transitionend", finish, { once: true });
    }
    setTimeout(finish, this.animDuration + 60);
  }

  open({ anchorEl, title = "منو", render, onMount } = {}) {
    this.close();
    this.isOpen = true;

    const isMobile = window.matchMedia(this.mobileQuery).matches;

    const wrap = document.createElement("div");
    wrap.setAttribute("data-dd-wrap", "1");

    const backdrop = document.createElement("div");
    backdrop.setAttribute("data-dd-backdrop", "1");
    backdrop.className = `fixed inset-0 z-[1000] bg-[var(--overlay)] opacity-0 transition-opacity duration-${this.animDuration}`;

    if (this.closeOnBackdrop) {
      backdrop.addEventListener("click", () => this.close());
    }

    const panel = document.createElement("div");
    panel.setAttribute("data-dd-panel", "1");

    if (isMobile) {
      panel.className =
        `fixed z-[1000] bottom-3 left-3 right-3 ` +
        `rounded-[18px] border border-[var(--border-light)] bg-[var(--surface)] shadow-[var(--shadow-lg)] overflow-hidden ` +
        `max-h-[min(70vh,560px)] flex flex-col ` +
        `opacity-0 translate-y-3 transition-all duration-${this.animDuration}`;
    } else {
      panel.className =
        `fixed z-[1000] w-[min(320px,calc(100vw-24px))] ` +
        `rounded-[14px] border border-[var(--border-light)] bg-[var(--surface)] shadow-[var(--shadow-lg)] overflow-hidden ` +
        `opacity-0 translate-y-2 scale-[.98] transition-all duration-${this.animDuration} origin-top-right`;
    }

    if (!isMobile && anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      const margin = 12;
      const w = Math.min(
        320,
        document.documentElement.clientWidth - margin * 2,
      );
      const hGuess = 380;

      let left = Math.max(
        margin,
        Math.min(rect.left, window.innerWidth - margin - w),
      );
      let top = rect.bottom + 8;
      if (top + hGuess > window.innerHeight - margin) {
        top = Math.max(margin, rect.top - 8 - hGuess);
      }

      panel.style.left = left + "px";
      panel.style.top = top + "px";
    }

    panel.innerHTML = `
      <div class="px-3 py-2 bg-[var(--surface-dark)] border-b border-[var(--border-light)] flex items-center justify-between gap-2.5">
        <div class="font-extrabold text-[13px] text-[var(--text-primary)] inline-flex items-center gap-2">
          <i class="bi bi-tags text-muted"></i>
          ${sanitizeText(title)}
        </div>
        <button
          class="w-9 h-9 rounded-[12px] border border-[var(--border)] bg-[var(--surface)]
                 transition-colors duration-150
                 inline-flex items-center justify-center text-[var(--text-secondary)]
                 hover:bg-[var(--surface-darker)]"
          data-action="dd-close"
          type="button"
          title="بستن">
          <i class="bi bi-x"></i>
        </button>
      </div>

      <div class="max-h-[300px] p-2 overflow-y-auto [-webkit-overflow-scrolling:touch]" data-dd-body></div>
    `;

    wrap.appendChild(backdrop);
    wrap.appendChild(panel);
    this.root.appendChild(wrap);

    panel
      .querySelector("[data-action='dd-close']")
      .addEventListener("click", () => this.close());

    const body = panel.querySelector("[data-dd-body]");
    if (typeof render === "function") body.innerHTML = render();
    if (typeof onMount === "function")
      onMount({ panel, body, close: () => this.close() });

    // animate in
    requestAnimationFrame(() => {
      backdrop.classList.remove("opacity-0");
      backdrop.classList.add("opacity-100");

      panel.classList.remove("opacity-0");
      panel.classList.add("opacity-100");
      panel.classList.remove("translate-y-2", "translate-y-3", "scale-[.98]");
      panel.classList.add("translate-y-0", "scale-100");
    });

    // فقط اگر فعال باشند:
    if (this.closeOnEsc) document.addEventListener("keydown", this._onEsc);
    if (this.closeOnOutsideClick)
      document.addEventListener("click", this._onDocClick, true);
  }
}

class Modal {
  // ---------- Static stack management ----------
  static _openStack = [];
  static _baseZ = 1000;
  static _lockCount = 0;

  static _lockBody() {
    Modal._lockCount++;
    if (Modal._lockCount === 1) {
      document.documentElement.classList.add("overflow-hidden");
      document.body.classList.add("overflow-hidden");
    }
  }
  static _unlockBody() {
    Modal._lockCount = Math.max(0, Modal._lockCount - 1);
    if (Modal._lockCount === 0) {
      document.documentElement.classList.remove("overflow-hidden");
      document.body.classList.remove("overflow-hidden");
    }
  }

  static getTopInstance() {
    return Modal._openStack[Modal._openStack.length - 1] || null;
  }

  // ---------- Instance ----------
  constructor(modalRoot, options = {}) {
    this.root =
      typeof modalRoot === "string"
        ? document.querySelector(modalRoot)
        : modalRoot;

    if (!this.root) throw new Error("Modal: modal root not found.");

    this.options = {
      title: options.title ?? null,
      closeOnEscape: options.closeOnEscape ?? true,
      closeOnOverlayClick: options.closeOnOverlayClick ?? true,
      showCloseButton: options.showCloseButton ?? true,
      initialFocusSelector: options.initialFocusSelector ?? null,
      onOpen: options.onOpen ?? (() => {}),
      onClose: options.onClose ?? (() => {}),

      // ----- Mobile / Sheet -----
      mobile: {
        enabled: options.mobile?.enabled ?? "auto", // "auto" | true | false
        breakpointPx: options.mobile?.breakpointPx ?? 640, // زیر این => sheet
        swipeToClose: options.mobile?.swipeToClose ?? true,
        swipeCloseThresholdPx: options.mobile?.swipeCloseThresholdPx ?? 110,
        swipeVelocityToClose: options.mobile?.swipeVelocityToClose ?? 0.6, // px/ms
        rubberBand: options.mobile?.rubberBand ?? 0.35, // مقاومت کشیدن رو به بالا
      },

      wizard: {
        enabled: options.wizard?.enabled ?? "auto",
        startStep: options.wizard?.startStep ?? 1,
        loop: options.wizard?.loop ?? false,
        onStepChange: options.wizard?.onStepChange ?? (() => {}),
        labels: {
          next: options.wizard?.labels?.next ?? "بعدی",
          prev: options.wizard?.labels?.prev ?? "قبلی",
          finish: options.wizard?.labels?.finish ?? "اتمام",
        },
      },
    };

    this.isOpen = false;
    this.isWizard = false;
    this.currentStepIndex = 0;

    // built elements refs
    this.overlayEl = null;
    this.panelEl = null;
    this.headerEl = null;
    this.bodyEl = null;
    this.footerEl = null;
    this.handleEl = null;

    this.stepEls = [];
    this.prevBtn = null;
    this.nextBtn = null;

    this._built = false;
    this._lastActiveEl = null;

    // sheet state
    this._isMobile = false;
    this._dragging = false;
    this._dragStartY = 0;
    this._dragStartTime = 0;
    this._lastY = 0;
    this._lastTime = 0;
    this._currentTranslateY = 0;
    this._panelOpenTranslateY = 0; // usually 0
    this._panelClosedTranslateY = 0; // computed based on height
    this._raf = null;

    // bind handlers
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onOverlayClick = this._onOverlayClick.bind(this);
    this._onResize = this._onResize.bind(this);

    // pointer handlers (sheet)
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);

    this.build(); // build once
  }

  // ---------- Helpers ----------
  _computeIsMobile() {
    const mode = this.options.mobile.enabled;
    if (mode === true) return true;
    if (mode === false) return false;

    // auto
    return window.matchMedia(
      `(max-width: ${this.options.mobile.breakpointPx - 1}px)`,
    ).matches;
  }

  _applyPanelTransform(y, { withTransition = false } = {}) {
    if (!this.panelEl) return;
    if (withTransition) {
      this.panelEl.style.transitionProperty = "transform, opacity";
      this.panelEl.style.transitionDuration = "220ms";
      this.panelEl.style.transitionTimingFunction =
        "cubic-bezier(0.2, 0.8, 0.2, 1)";
    } else {
      this.panelEl.style.transitionProperty = "none";
      this.panelEl.style.transitionDuration = "0ms";
    }
    this.panelEl.style.transform = `translate3d(0, ${y}px, 0)`;
    this._currentTranslateY = y;
  }

  _syncSheetBounds() {
    if (!this.panelEl) return;
    // closed translate = panel height + safe extra
    const rect = this.panelEl.getBoundingClientRect();
    const h = rect.height || this.panelEl.scrollHeight || 0;
    this._panelClosedTranslateY = Math.max(0, h + 24);
    this._panelOpenTranslateY = 0;
  }

  _setOverlayOpacityByTranslate(y) {
    if (!this.overlayEl) return;
    // as y increases (closing), overlay fades out
    const t = this._panelClosedTranslateY || 1;
    const progress = Math.min(1, Math.max(0, y / t)); // 0 open -> 1 closed
    const opacity = 1 - progress;
    this.overlayEl.style.opacity = String(opacity);
  }

  _canStartDragFromEventTarget(target) {
    if (!this.options.mobile.swipeToClose) return false;
    if (!this._isMobile) return false;

    // allow drag from handle always
    if (
      this.handleEl &&
      (target === this.handleEl || this.handleEl.contains(target))
    )
      return true;

    // if drag starts inside body, only allow if body is scrolled to top
    if (this.bodyEl && this.bodyEl.contains(target)) {
      const atTop = (this.bodyEl.scrollTop || 0) <= 0;
      return atTop;
    }

    // header also ok (except when interacting with inputs maybe)
    if (this.headerEl && this.headerEl.contains(target)) return true;

    return false;
  }

  // ---------- Build ----------
  build() {
    if (this._built) return;

    // Root base classes (hidden by default)
    this.root.style.display = "none";
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-modal", "true");

    this.root.classList.add(
      "fixed",
      "inset-0",
      "p-4",
      "sm:p-6",
      "transition-opacity",
      "duration-200",
      "opacity-0",
    );

    // Find user-provided anchors
    const bodyAnchor = this.root.querySelector("[data-modal-body]");
    const footerAnchor = this.root.querySelector("[data-modal-footer]");

    // If no body anchor, do not force structure
    if (!bodyAnchor) {
      this._built = true;
      return;
    }

    // Create overlay if not exists
    this.overlayEl =
      this.root.querySelector("[data-modal-overlay]") ||
      this.root.querySelector(".modal-overlay");

    if (!this.overlayEl) {
      this.overlayEl = document.createElement("div");
      this.overlayEl.setAttribute("data-modal-overlay", "");
      this.root.prepend(this.overlayEl);
    }
    this.overlayEl.className = [
      "absolute",
      "inset-0",
      "bg-black/40",
      "backdrop-blur-sm",
      "opacity-0",
      "transition-opacity",
      "duration-200",
    ].join(" ");
    this.overlayEl.style.opacity = "0";

    // Create panel wrapper (modal content)
    this.panelEl =
      this.root.querySelector("[data-modal-panel]") ||
      this.root.querySelector(".modal-content");

    if (!this.panelEl) {
      this.panelEl = document.createElement("div");
      this.panelEl.setAttribute("data-modal-panel", "");
      this.root.appendChild(this.panelEl);
    }

    // Base panel classes (desktop default). We'll switch for mobile dynamically on open/resize.
    this.panelEl.className = [
      "relative",
      "z-10",
      "w-full",
      "max-w-3xl",
      "bg-white",
      "dark:bg-zinc-900",
      "text-zinc-900",
      "dark:text-zinc-100",
      "rounded-2xl",
      "shadow-2xl",
      "border",
      "border-zinc-200/70",
      "dark:border-zinc-800",
      "overflow-hidden",
      "max-h-[90vh]",
      "flex",
      "flex-col",
      "transform",
      "transition-all",
      "duration-200",
      "scale-95",
      "opacity-0",
      "sm:max-h-[85vh]",
    ].join(" ");

    // Move body/footer anchors into panel in a clean layout
    const existingHeader =
      this.root.querySelector("[data-modal-header]") ||
      this.panelEl.querySelector("[data-modal-header]");

    if (existingHeader) {
      this.headerEl = existingHeader;
    } else if (this.options.title || this.options.showCloseButton) {
      this.headerEl = document.createElement("div");
      this.headerEl.setAttribute("data-modal-header", "");
      this.headerEl.className = [
        "flex",
        "items-center",
        "gap-3",
        "px-4",
        "sm:px-6",
        "py-4",
        "border-b",
        "border-zinc-200/70",
        "dark:border-zinc-800",
      ].join(" ");

      const titleEl = document.createElement("h2");
      titleEl.className = "text-base sm:text-lg font-bold";
      titleEl.textContent = this.options.title ?? "";
      this.headerEl.appendChild(titleEl);

      if (this.options.showCloseButton) {
        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.setAttribute("data-modal-close", "");
        closeBtn.className = [
          "ms-auto",
          "inline-flex",
          "items-center",
          "justify-center",
          "h-10",
          "w-10",
          "rounded-xl",
          "hover:bg-zinc-100",
          "dark:hover:bg-zinc-800",
          "transition",
          "focus:outline-none",
          "focus:ring-2",
          "focus:ring-indigo-500/50",
        ].join(" ");
        closeBtn.innerHTML = `<span class="text-2xl leading-none">&times;</span>`;
        closeBtn.addEventListener("click", () => this.close());
        this.headerEl.appendChild(closeBtn);
      }

      this.panelEl.appendChild(this.headerEl);
    }

    // Mobile handle (we show/hide dynamically)
    this.handleEl = this.root.querySelector("[data-modal-handle]");
    if (!this.handleEl) {
      this.handleEl = document.createElement("div");
      this.handleEl.setAttribute("data-modal-handle", "");
      this.handleEl.className = [
        "hidden",
        "sm:hidden",
        "w-full",
        "pt-3",
        "pb-2",
        "flex",
        "items-center",
        "justify-center",
      ].join(" ");
      const bar = document.createElement("div");
      bar.className =
        "h-1.5 w-12 rounded-full bg-zinc-300/80 dark:bg-zinc-700/80";
      this.handleEl.appendChild(bar);

      // insert handle at top of panel (before header if exists)
      if (this.headerEl && this.headerEl.parentElement === this.panelEl) {
        this.panelEl.insertBefore(this.handleEl, this.headerEl);
      } else {
        this.panelEl.prepend(this.handleEl);
      }
    }

    // Body
    this.bodyEl = bodyAnchor;
    this.bodyEl.classList.add(
      "px-4",
      "sm:px-6",
      "py-4",
      "overflow-y-auto",
      "min-h-0",
    );
    // Improve mobile scroll feel
    this.bodyEl.style.webkitOverflowScrolling = "touch";
    this.bodyEl.style.overscrollBehavior = "contain";

    // Footer
    this.footerEl = footerAnchor || null;
    if (this.footerEl) {
      this.footerEl.classList.add(
        "px-4",
        "sm:px-6",
        "py-4",
        "border-t",
        "border-zinc-200/70",
        "dark:border-zinc-800",
        "flex",
        "items-center",
        "gap-2",
      );
    }

    const ensureInsidePanel = (el) => {
      if (!el) return;
      if (el.parentElement !== this.panelEl) {
        el.parentElement?.removeChild(el);
        this.panelEl.appendChild(el);
      }
    };
    ensureInsidePanel(this.bodyEl);
    ensureInsidePanel(this.footerEl);

    // Wizard detection
    this.stepEls = Array.from(this.bodyEl.querySelectorAll("[data-step]"));
    const wizardAuto = this.options.wizard.enabled === "auto";
    const wizardEnabled =
      this.options.wizard.enabled === true ||
      (wizardAuto && this.stepEls.length > 0);

    if (wizardEnabled) {
      if (this.stepEls.length === 0) {
        throw new Error(
          "Modal: wizard enabled but no [data-step] found inside [data-modal-body].",
        );
      }
      this.isWizard = true;
      this._setupWizardUI();
      this.goToStep(this.options.wizard.startStep, { silent: true });
    } else {
      this.isWizard = false;
    }

    // Overlay click
    if (this.options.closeOnOverlayClick) {
      this.overlayEl.addEventListener("click", this._onOverlayClick);
    }

    // Close buttons inside content
    this.root
      .querySelectorAll("[data-modal-close], .modal-close-btn")
      .forEach((btn) => {
        btn.addEventListener("click", () => this.close());
      });

    // Pointer events for mobile swipe
    // (We attach once; we decide to react only when mobile+open+top modal)
    this.panelEl.addEventListener("pointerdown", this._onPointerDown, {
      passive: false,
    });

    this._built = true;
  }

  _setupWizardUI() {
    if (!this.footerEl) {
      this.footerEl = document.createElement("div");
      this.footerEl.setAttribute("data-modal-footer", "");
      this.footerEl.className = [
        "px-4",
        "sm:px-6",
        "py-4",
        "border-t",
        "border-zinc-200/70",
        "dark:border-zinc-800",
        "flex",
        "items-center",
        "gap-2",
      ].join(" ");
      this.panelEl.appendChild(this.footerEl);
    }

    let prev = this.footerEl.querySelector("[data-wizard-prev]");
    let next = this.footerEl.querySelector("[data-wizard-next]");

    if (!prev) {
      prev = document.createElement("button");
      prev.type = "button";
      prev.setAttribute("data-wizard-prev", "");
      prev.className = [
        "inline-flex",
        "items-center",
        "justify-center",
        "px-4",
        "py-2.5",
        "rounded-xl",
        "border",
        "border-zinc-200",
        "dark:border-zinc-800",
        "bg-white",
        "dark:bg-zinc-900",
        "hover:bg-zinc-50",
        "dark:hover:bg-zinc-800",
        "transition",
        "disabled:opacity-50",
        "disabled:cursor-not-allowed",
        "focus:outline-none",
        "focus:ring-2",
        "focus:ring-indigo-500/40",
      ].join(" ");
      prev.textContent = this.options.wizard.labels.prev;
      this.footerEl.appendChild(prev);
    }

    if (!next) {
      next = document.createElement("button");
      next.type = "button";
      next.setAttribute("data-wizard-next", "");
      next.className = [
        "ms-auto",
        "inline-flex",
        "items-center",
        "justify-center",
        "px-4",
        "py-2.5",
        "rounded-xl",
        "bg-indigo-600",
        "text-white",
        "hover:bg-indigo-500",
        "transition",
        "disabled:opacity-50",
        "disabled:cursor-not-allowed",
        "focus:outline-none",
        "focus:ring-2",
        "focus:ring-indigo-500/40",
      ].join(" ");
      next.textContent = this.options.wizard.labels.next;
      this.footerEl.appendChild(next);
    }

    this.prevBtn = prev;
    this.nextBtn = next;

    this.prevBtn.addEventListener("click", () => this.prevStep());
    this.nextBtn.addEventListener("click", () => this.nextStep());

    this.stepEls.forEach((step) => {
      step.classList.add(
        "transition-all",
        "duration-200",
        "ease-out",
        "will-change-transform",
      );
    });
  }

  // ---------- Layout mode switching ----------
  _applyLayoutMode() {
    this._isMobile = this._computeIsMobile();

    if (!this.panelEl || !this.root) return;

    // Root alignment
    if (this._isMobile) {
      this.root.classList.remove("items-center", "justify-center");
      this.root.classList.add("flex", "items-end", "justify-center");
      this.root.style.padding = "0px"; // sheet -> no padding around
    } else {
      this.root.classList.remove("items-end");
      this.root.classList.add("flex", "items-center", "justify-center");
      this.root.style.padding = ""; // keep tailwind p-4/sm:p-6
    }

    // Panel look
    if (this._isMobile) {
      // show handle
      this.handleEl?.classList.remove("hidden");

      // sheet style
      this.panelEl.style.willChange = "transform";
      this.panelEl.style.borderBottomLeftRadius = "0px";
      this.panelEl.style.borderBottomRightRadius = "0px";

      // Tailwind-class-safe adjustments: just add some extra via classList
      this.panelEl.classList.add("w-full");
      this.panelEl.style.maxWidth = "100%";
      this.panelEl.style.maxHeight = "92vh";
      this.panelEl.style.margin = "0";
      this.panelEl.style.borderLeftWidth = "0";
      this.panelEl.style.borderRightWidth = "0";
      this.panelEl.style.borderBottomWidth = "0";
    } else {
      this.handleEl?.classList.add("hidden");

      // reset sheet inline styles
      this.panelEl.style.willChange = "";
      this.panelEl.style.transform = "";
      this.panelEl.style.transitionProperty = "";
      this.panelEl.style.transitionDuration = "";
      this.panelEl.style.transitionTimingFunction = "";
      this.panelEl.style.maxWidth = "";
      this.panelEl.style.maxHeight = "";
      this.panelEl.style.margin = "";
      this.panelEl.style.borderLeftWidth = "";
      this.panelEl.style.borderRightWidth = "";
      this.panelEl.style.borderBottomWidth = "";
      this.panelEl.style.borderBottomLeftRadius = "";
      this.panelEl.style.borderBottomRightRadius = "";
      this.overlayEl.style.opacity = "";
    }
  }

  // ---------- Open / Close ----------
  open() {
    this.build();
    this._lastActiveEl = document.activeElement;

    // stacking
    const z = Modal._baseZ + Modal._openStack.length * 10;
    this.root.style.zIndex = String(z);

    // show
    this.root.style.display = "flex";
    void this.root.offsetHeight;

    this.isOpen = true;
    Modal._openStack.push(this);
    Modal._lockBody();

    // layout mode
    this._applyLayoutMode();

    // animate in
    this.root.classList.remove("opacity-0");
    this.root.classList.add("opacity-100");

    // overlay in
    if (this.overlayEl) {
      this.overlayEl.classList.add("opacity-100");
      this.overlayEl.style.opacity = "1";
    }

    // panel in
    if (this.panelEl) {
      if (this._isMobile) {
        // start from bottom
        this.panelEl.classList.remove("opacity-0", "scale-95");
        this.panelEl.classList.add("opacity-100");
        this.panelEl.style.opacity = "1";

        this._syncSheetBounds();
        this._applyPanelTransform(this._panelClosedTranslateY, {
          withTransition: false,
        });
        this._setOverlayOpacityByTranslate(this._panelClosedTranslateY);

        // next frame animate to open
        requestAnimationFrame(() => {
          this._syncSheetBounds();
          this._applyPanelTransform(this._panelOpenTranslateY, {
            withTransition: true,
          });
          this._setOverlayOpacityByTranslate(this._panelOpenTranslateY);
        });
      } else {
        this.panelEl.classList.remove("opacity-0", "scale-95");
        this.panelEl.classList.add("opacity-100", "scale-100");
      }
    }

    document.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("resize", this._onResize, { passive: true });

    // focus
    setTimeout(() => {
      const focusTarget =
        (this.options.initialFocusSelector &&
          this.root.querySelector(this.options.initialFocusSelector)) ||
        this.root.querySelector("[data-modal-autofocus]") ||
        this.root.querySelector(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
        );

      focusTarget?.focus?.();
    }, 0);

    this.options.onOpen(this);
  }

  close() {
    if (!this.isOpen) return;

    const top = Modal.getTopInstance();
    if (top && top !== this) return; // فقط top بسته شود

    this.isOpen = false;

    // animate out
    this.root.classList.remove("opacity-100");
    this.root.classList.add("opacity-0");

    if (this.overlayEl) {
      this.overlayEl.classList.remove("opacity-100");
      this.overlayEl.style.opacity = "0";
    }

    if (this.panelEl) {
      if (this._isMobile) {
        this._syncSheetBounds();
        this._applyPanelTransform(this._panelClosedTranslateY, {
          withTransition: true,
        });
        this._setOverlayOpacityByTranslate(this._panelClosedTranslateY);
      } else {
        this.panelEl.classList.remove("opacity-100", "scale-100");
        this.panelEl.classList.add("opacity-0", "scale-95");
      }
    }

    document.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("resize", this._onResize);

    // remove from stack
    const idx = Modal._openStack.lastIndexOf(this);
    if (idx >= 0) Modal._openStack.splice(idx, 1);
    Modal._unlockBody();

    setTimeout(() => {
      this.root.style.display = "none";
      this._lastActiveEl?.focus?.();
      this.options.onClose(this);
    }, 220);
  }

  // ---------- Wizard API ----------
  goToStep(stepNumber, { silent = false } = {}) {
    if (!this.isWizard) return;

    const idx = this.stepEls.findIndex((el) => {
      const n = Number(el.getAttribute("data-step"));
      return n === Number(stepNumber);
    });
    if (idx === -1) return;

    this.currentStepIndex = idx;

    this.stepEls.forEach((el, i) => {
      const active = i === idx;
      if (active) {
        el.classList.remove(
          "hidden",
          "opacity-0",
          "translate-y-1",
          "scale-[0.99]",
        );
        el.classList.add("opacity-100", "translate-y-0", "scale-100");
      } else {
        el.classList.add(
          "hidden",
          "opacity-0",
          "translate-y-1",
          "scale-[0.99]",
        );
        el.classList.remove("opacity-100", "translate-y-0", "scale-100");
      }
    });

    const isFirst = this.currentStepIndex === 0;
    const isLast = this.currentStepIndex === this.stepEls.length - 1;

    if (this.prevBtn)
      this.prevBtn.disabled = !this.options.wizard.loop && isFirst;

    if (this.nextBtn) {
      this.nextBtn.textContent = isLast
        ? this.options.wizard.labels.finish
        : this.options.wizard.labels.next;
    }

    if (!silent) {
      const currentStepNo = Number(
        this.stepEls[this.currentStepIndex].getAttribute("data-step"),
      );
      this.options.wizard.onStepChange(currentStepNo, this);
    }
  }

  nextStep() {
    if (!this.isWizard) return;
    const isLast = this.currentStepIndex === this.stepEls.length - 1;
    if (isLast) return this.close();

    const nextEl = this.stepEls[this.currentStepIndex + 1];
    const nextNo = Number(nextEl.getAttribute("data-step"));
    this.goToStep(nextNo);
  }

  prevStep() {
    if (!this.isWizard) return;
    const isFirst = this.currentStepIndex === 0;

    if (isFirst) {
      if (this.options.wizard.loop) {
        const lastNo = Number(
          this.stepEls[this.stepEls.length - 1].getAttribute("data-step"),
        );
        this.goToStep(lastNo);
      }
      return;
    }

    const prevEl = this.stepEls[this.currentStepIndex - 1];
    const prevNo = Number(prevEl.getAttribute("data-step"));
    this.goToStep(prevNo);
  }

  // ---------- Events ----------
  _onOverlayClick(e) {
    if (!this.isOpen) return;
    if (Modal.getTopInstance() !== this) return;
    if (e.target !== this.overlayEl) return;
    this.close();
  }

  _onKeyDown(e) {
    if (!this.isOpen) return;
    if (Modal.getTopInstance() !== this) return;

    if (this.options.closeOnEscape && e.key === "Escape") {
      e.preventDefault();
      this.close();
      return;
    }

    if (this.isWizard) {
      if (e.key === "ArrowRight") this.nextStep();
      if (e.key === "ArrowLeft") this.prevStep();
    }
  }

  _onResize() {
    if (!this.isOpen) return;

    const wasMobile = this._isMobile;
    this._applyLayoutMode();

    // if still mobile, update bounds
    if (this._isMobile) {
      this._syncSheetBounds();
      // keep it open
      this._applyPanelTransform(this._panelOpenTranslateY, {
        withTransition: false,
      });
      this._setOverlayOpacityByTranslate(this._panelOpenTranslateY);
    } else if (wasMobile && !this._isMobile) {
      // switching to desktop: restore panel classes animation state
      if (this.panelEl) {
        this.panelEl.classList.remove("scale-95", "opacity-0");
        this.panelEl.classList.add("scale-100", "opacity-100");
      }
      if (this.overlayEl) this.overlayEl.style.opacity = "1";
    }
  }

  // ---------- Mobile sheet swipe ----------
  _onPointerDown(e) {
    if (!this.isOpen) return;
    if (Modal.getTopInstance() !== this) return;
    if (!this._isMobile) return;
    if (e.button != null && e.button !== 0) return; // only left click/touch

    const target = e.target;
    if (!this._canStartDragFromEventTarget(target)) return;

    // avoid dragging when interacting with inputs unless from handle
    const tag = (target?.tagName || "").toLowerCase();
    const isFormEl = ["input", "textarea", "select", "button"].includes(tag);
    if (isFormEl && !(this.handleEl && this.handleEl.contains(target))) return;

    this._dragging = true;
    this._dragStartY = e.clientY;
    this._dragStartTime = performance.now();
    this._lastY = e.clientY;
    this._lastTime = this._dragStartTime;

    this._syncSheetBounds();
    this.panelEl.setPointerCapture?.(e.pointerId);

    // remove transitions while dragging
    this._applyPanelTransform(this._currentTranslateY, {
      withTransition: false,
    });

    document.addEventListener("pointermove", this._onPointerMove, {
      passive: false,
    });
    document.addEventListener("pointerup", this._onPointerUp, {
      passive: true,
    });
    document.addEventListener("pointercancel", this._onPointerUp, {
      passive: true,
    });
  }

  _onPointerMove(e) {
    if (!this._dragging) return;
    if (!this._isMobile) return;

    // prevent page scroll while dragging
    e.preventDefault();

    const dy = e.clientY - this._dragStartY;

    // Allow downward drag freely; upward drag with rubber band
    let nextY = this._panelOpenTranslateY + dy;
    if (nextY < 0) {
      nextY = nextY * this.options.mobile.rubberBand;
    }

    // clamp
    nextY = Math.min(this._panelClosedTranslateY, nextY);

    // smooth via rAF
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => {
      this._applyPanelTransform(nextY, { withTransition: false });
      this._setOverlayOpacityByTranslate(nextY);
    });

    this._lastY = e.clientY;
    this._lastTime = performance.now();
  }

  _onPointerUp(e) {
    if (!this._dragging) return;

    this._dragging = false;

    document.removeEventListener("pointermove", this._onPointerMove);
    document.removeEventListener("pointerup", this._onPointerUp);
    document.removeEventListener("pointercancel", this._onPointerUp);

    const endTime = performance.now();
    const totalDy = (e.clientY ?? this._lastY) - this._dragStartY;
    const dt = Math.max(1, endTime - this._dragStartTime);
    const velocity = totalDy / dt; // px/ms (positive is down)

    const shouldClose =
      totalDy > this.options.mobile.swipeCloseThresholdPx ||
      velocity > this.options.mobile.swipeVelocityToClose;

    if (shouldClose) {
      this.close();
      return;
    }

    // snap back open
    this._applyPanelTransform(this._panelOpenTranslateY, {
      withTransition: true,
    });
    this._setOverlayOpacityByTranslate(this._panelOpenTranslateY);
  }
}

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

      <div class="p-2 [-webkit-overflow-scrolling:touch]" data-dd-body></div>
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

class Accordion {
  static ensureStyles() {
    if (document.getElementById("ui-accordion-styles")) return;

    const style = document.createElement("style");
    style.id = "ui-accordion-styles";
    style.textContent = `
      .ui-acc { border-radius: var(--radius, 14px); overflow: hidden; }
      .ui-acc__btn { -webkit-tap-highlight-color: transparent; }
      .ui-acc__panel {
        height: 0;
        overflow: hidden;
        will-change: height;
      }
      .ui-acc__panel-inner { padding: 12px; }
      .ui-acc__chev { transition: transform .25s ease; }
      .ui-acc[data-open="true"] .ui-acc__chev { transform: rotate(180deg); }
      @media (min-width: 768px) {
        .ui-acc__panel-inner { padding: 12px 14px 14px; }
      }
      @media (prefers-reduced-motion: reduce) {
        .ui-acc__chev { transition: none; }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * @param {object} opts
   * @param {string} opts.title
   * @param {string} [opts.iconClass]
   * @param {boolean} [opts.open=false]
   * @param {string} [opts.badgeText=""]
   * @param {HTMLElement | string} opts.content
   * @param {string} [opts.className=""]
   * @param {Function} [opts.onToggle]
   */
  constructor(opts) {
    Accordion.ensureStyles();
    this.opts = {
      open: false,
      badgeText: "",
      iconClass: "",
      className: "",
      ...opts,
    };

    this.el = document.createElement("section");
    this.el.className =
      "ui-acc bg-surface border border-border-light " +
      (this.opts.className || "");
    this.el.dataset.open = String(!!this.opts.open);

    const contentHtml =
      typeof this.opts.content === "string" ? this.opts.content : "";

    this.el.innerHTML = `
      <button type="button"
        class="ui-acc__btn w-full flex items-center justify-between px-3 py-2 md:px-3 md:py-2.5
               cursor-pointer select-none text-right"
        aria-expanded="${this.opts.open ? "true" : "false"}"
      >
        <div class="flex items-center gap-2 min-w-0">
          ${
            this.opts.iconClass
              ? `<i class="${this.opts.iconClass} text-secondary"></i>`
              : ""
          }
          <span class="text-primary text-sm font-medium truncate">${this.opts.title || ""}</span>
          <span class="ui-acc__badge text-xs text-muted shrink-0">${this.opts.badgeText || ""}</span>
        </div>

        <i class="bi bi-chevron-down ui-acc__chev text-muted"></i>
      </button>

      <div class="ui-acc__panel" role="region">
        <div class="ui-acc__panel-inner">
          ${contentHtml}
        </div>
      </div>
    `;

    this.btn = this.el.querySelector(".ui-acc__btn");
    this.panel = this.el.querySelector(".ui-acc__panel");
    this.panelInner = this.el.querySelector(".ui-acc__panel-inner");
    this.badgeEl = this.el.querySelector(".ui-acc__badge");

    if (typeof this.opts.content !== "string") {
      this.panelInner.innerHTML = "";
      this.panelInner.appendChild(this.opts.content);
    }

    this.btn.addEventListener("click", () => this.toggle());

    if (this.opts.open) {
      this.panel.style.height = this.panelInner.scrollHeight + "px";
    } else {
      this.panel.style.height = "0px";
    }
  }

  setBadge(text) {
    this.badgeEl.textContent = text || "";
  }

  isOpen() {
    return this.el.dataset.open === "true";
  }

  open() {
    if (this.isOpen()) return;
    this._animate(true);
  }

  close() {
    if (!this.isOpen()) return;
    this._animate(false);
  }

  toggle() {
    this._animate(!this.isOpen());
  }

  _animate(nextOpen) {
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;
    const currentHeight = this.panel.getBoundingClientRect().height;

    this.el.dataset.open = String(nextOpen);
    this.btn.setAttribute("aria-expanded", nextOpen ? "true" : "false");

    const targetHeight = nextOpen ? this.panelInner.scrollHeight : 0;

    if (reduceMotion) {
      this.panel.style.height = targetHeight + "px";
      this.opts.onToggle?.(nextOpen);
      return;
    }

    this.panel.style.height = currentHeight + "px";
    void this.panel.offsetHeight;

    this.panel.style.transition = "height 280ms cubic-bezier(.2,.9,.2,1)";
    this.panel.style.height = targetHeight + "px";

    const onEnd = (e) => {
      if (e.propertyName !== "height") return;
      this.panel.style.transition = "";
      this.panel.removeEventListener("transitionend", onEnd);
      this.opts.onToggle?.(nextOpen);
    };
    this.panel.addEventListener("transitionend", onEnd);
  }
}

class Tabs {
  constructor({
    containerClass = "",
    headerClass = "",
    titleText = "",
    titleIconClass = "",
    titleClass = "",
    buttonBaseClass = "",
    buttonActiveClass = "",
    buttonInactiveClass = "",
    panelWrapClass = "",
    backButtonClass = "",
    backButtonText = "بازگشت",
    backIconClass = "bi bi-arrow-right",
    onChange = null,
    tabs = [], // Tree: [{id,title,iconClass,panelEl, children:[...] }]
    initial = null, // null => هیچ تب فعال نیست
  } = {}) {
    this.onChange = onChange;
    this.tree = Array.isArray(tabs) ? tabs : [];
    this.activeId = initial ?? null;

    this._classes = {
      containerClass,
      headerClass,
      titleClass,
      buttonBaseClass,
      buttonActiveClass,
      buttonInactiveClass,
      panelWrapClass,
      backButtonClass,
    };

    this._title = { titleText, titleIconClass };
    this._back = { backButtonText, backIconClass };

    // سطح فعلی (لیست tabها) + تاریخچه برای بازگشت
    this._currentTabs = this.tree;
    this._stack = []; // [{tabs, activeIdBefore}]

    this._btns = new Map(); // id -> {btn}
    this._panels = new Map(); // id -> panelEl
    this._nodes = new Map(); // id -> node (برای پیدا کردن children)

    this._ensureStyles();

    // ریشه DOM
    this.el = document.createElement("div");
    this.el.className = containerClass;

    this.header = document.createElement("div");
    this.header.className = headerClass;

    // سمت چپ/راست داخل هدر
    this._headerLeft = document.createElement("div");
    this._headerRight = document.createElement("div");

    // شما می‌توانید با کلاس‌های Tailwind/… کنترل کنید
    // این‌ها صرفاً wrapper هستند
    this._headerLeft.className =
      "tabs-header-left flex items-center gap-2 min-w-0";
    this._headerRight.className = "tabs-header-right flex items-center gap-2";

    // عنوان
    this._titleEl = document.createElement("div");
    this._titleEl.className = titleClass || "flex items-center gap-2 min-w-0";
    this._titleEl.innerHTML = `
      ${titleIconClass ? `<i class="${titleIconClass}"></i>` : ""}
      ${titleText ? `<span class="truncate">${titleText}</span>` : ""}
    `;

    // دکمه بازگشت
    this._backBtn = document.createElement("button");
    this._backBtn.type = "button";
    this._backBtn.className =
      backButtonClass ||
      "tabs-back-btn px-2 py-2 rounded-custom border border-border-light bg-surface text-secondary text-xs md:text-[12px] hover:bg-surface-2 transition";
    this._backBtn.innerHTML = `
      ${backIconClass ? `<i class="${backIconClass}"></i>` : ""}
      <span>${backButtonText}</span>
    `;
    this._backBtn.addEventListener("click", () => this.back());

    // نوار دکمه‌های تب
    this.nav = document.createElement("div");
    // کلاس nav را از بیرون با headerClass/… کنترل کنید؛
    // این container برای دکمه‌های تب است.
    this.nav.className = "tabs-nav inline-flex min-w-0";

    // پنل‌ها
    this.panelsWrap = document.createElement("div");
    this.panelsWrap.className = panelWrapClass;

    // ساختار هدر
    this._headerLeft.appendChild(this._titleEl);
    this._headerRight.appendChild(this._backBtn);
    this._headerRight.appendChild(this.nav);

    this.header.appendChild(this._headerLeft);
    this.header.appendChild(this._headerRight);

    this.el.appendChild(this.header);
    this.el.appendChild(this.panelsWrap);

    // ایندکس کل درخت + mount پنل‌ها
    this._indexTreeAndMountPanels(this.tree);

    // رندر سطح اول
    this._renderLevel(this._currentTabs, { animate: false });

    // حالت اولیه: هیچ تب فعال نیست (اگر initial داده شده باشد، فعال می‌شود)
    if (this.activeId != null) {
      this.setActive(this.activeId, { fromInit: true });
    } else {
      this._hideAllPanels();
      this._updateBackVisibility();
    }
  }

  /* ---------- Public API ---------- */

  setActive(id, { fromInit = false } = {}) {
    const node = this._nodes.get(id);
    if (!node) return;

    // اگر این node دارای children باشد، وارد سطح زیرین شو
    if (Array.isArray(node.children) && node.children.length) {
      this.enter(id);
      return;
    }

    // Leaf: پنل نمایش داده شود
    this.activeId = id;
    this._syncButtonsState();
    this._showPanelOf(id);

    if (!fromInit && typeof this.onChange === "function") {
      this.onChange(id, node);
    }
  }

  enter(id) {
    const node = this._nodes.get(id);
    if (!node || !node.children || !node.children.length) return;

    // ذخیره وضعیت قبلی برای بازگشت
    this._stack.push({
      tabs: this._currentTabs,
      activeIdBefore: this.activeId,
    });

    // رفتن به سطح child
    this._currentTabs = node.children;

    // انیمیشن خروج/ورود برای nav
    this._renderLevel(this._currentTabs, { animate: true });

    this._updateBackVisibility();

    // طبق درخواست: وقتی وارد زیرتب‌ها می‌شویم، اولین زیرتب فعال شود
    const first = this._currentTabs[0];
    if (first) {
      // اگر خودش children داشت، به‌صورت بازگشتی وارد می‌شود تا به leaf برسد
      this.setActive(first.id);
    } else {
      this.activeId = null;
      this._hideAllPanels();
      this._syncButtonsState();
    }
  }

  back() {
    if (!this._stack.length) return;

    const prev = this._stack.pop();
    this._currentTabs = prev.tabs;

    // در بازگشت، activeId را null می‌کنیم تا «هیچ پنلی» نمایش داده نشود
    // (می‌توانید اگر دوست داشتید به prev.activeIdBefore برگردانید)
    this.activeId = null;

    this._renderLevel(this._currentTabs, { animate: true, reverse: true });

    this._hideAllPanels();
    this._syncButtonsState();
    this._updateBackVisibility();
  }

  /* ---------- Internal: render / state ---------- */

  _renderLevel(tabs, { animate = true, reverse = false } = {}) {
    // پاک‌سازی دکمه‌ها
    this._btns.clear();

    const doRender = () => {
      this.nav.innerHTML = "";

      // دکمه‌ها در یک wrapper با استایل دلخواه شما
      // (اگر می‌خواهید همان استایل قبلی حفظ شود، کلاس‌ها را از بیرون بدهید)
      const wrapper = document.createElement("div");
      wrapper.className = "tabs-btn-wrap flex gap-1 min-w-0";

      tabs.forEach((t) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.dataset.tabId = t.id;
        btn.className = this._classes.buttonBaseClass;

        btn.innerHTML = `
          ${t.iconClass ? `<i class="${t.iconClass}"></i>` : ""}
          <span class="truncate">${t.title ?? ""}</span>
        `;

        btn.addEventListener("click", () => {
          // اگر children دارد، وارد سطح بعدی شو
          if (t.children && t.children.length) this.enter(t.id);
          else this.setActive(t.id);
        });

        wrapper.appendChild(btn);
        this._btns.set(t.id, { btn });
      });

      this.nav.appendChild(wrapper);

      // بعد از رندر، وضعیت active/inactive اعمال شود
      this._syncButtonsState();
    };

    if (!animate) {
      doRender();
      return;
    }

    // animation: slide-out سپس render سپس slide-in
    const outClass = reverse ? "tabs-anim-out-right" : "tabs-anim-out-left";
    const inClass = reverse ? "tabs-anim-in-right" : "tabs-anim-in-left";

    this.nav.classList.remove(
      "tabs-anim-out-left",
      "tabs-anim-out-right",
      "tabs-anim-in-left",
      "tabs-anim-in-right",
    );
    this.nav.classList.add(outClass);

    const onOutEnd = () => {
      this.nav.removeEventListener("animationend", onOutEnd);

      doRender();

      this.nav.classList.remove(outClass);
      this.nav.classList.add(inClass);

      const onInEnd = () => {
        this.nav.removeEventListener("animationend", onInEnd);
        this.nav.classList.remove(inClass);
      };
      this.nav.addEventListener("animationend", onInEnd, { once: true });
    };

    this.nav.addEventListener("animationend", onOutEnd, { once: true });
  }

  _syncButtonsState() {
    // فقط دکمه‌های سطح فعلی را به active/inactive ست می‌کنیم
    this._currentTabs.forEach((t) => {
      const entry = this._btns.get(t.id);
      if (!entry) return;

      const isActive = this.activeId != null && t.id === this.activeId;
      entry.btn.className =
        this._classes.buttonBaseClass +
        " " +
        (isActive
          ? this._classes.buttonActiveClass
          : this._classes.buttonInactiveClass);
    });
  }

  _showPanelOf(id) {
    // همه پنل‌ها hidden؛ فقط پنل فعال نمایش داده شود
    this._hideAllPanels();

    const panel = this._panels.get(id);
    if (!panel) return;

    panel.classList.remove("hidden");
  }

  _hideAllPanels() {
    for (const panel of this._panels.values()) {
      panel.classList.add("hidden");
    }
  }

  _updateBackVisibility() {
    const hasBack = this._stack.length > 0;
    this._backBtn.classList.toggle("hidden", !hasBack);
  }

  _indexTreeAndMountPanels(nodes) {
    const walk = (arr) => {
      arr.forEach((n) => {
        this._nodes.set(n.id, n);

        // mount panel if exists
        if (n.panelEl) {
          const panel = n.panelEl;
          panel.dataset.tabPanel = n.id;
          panel.classList.add("hidden");
          this.panelsWrap.appendChild(panel);
          this._panels.set(n.id, panel);
        }

        if (Array.isArray(n.children) && n.children.length) {
          walk(n.children);
        }
      });
    };

    this.panelsWrap.innerHTML = "";
    walk(nodes);
  }

  _ensureStyles() {
    if (document.getElementById("nested-tabs-styles")) return;
    const style = document.createElement("style");
    style.id = "nested-tabs-styles";
    style.textContent = `
      @keyframes tabsOutLeft { from {opacity:1; transform:translateX(0)} to {opacity:0; transform:translateX(-10px)} }
      @keyframes tabsInLeft  { from {opacity:0; transform:translateX(10px)} to {opacity:1; transform:translateX(0)} }
      @keyframes tabsOutRight{ from {opacity:1; transform:translateX(0)} to {opacity:0; transform:translateX(10px)} }
      @keyframes tabsInRight { from {opacity:0; transform:translateX(-10px)} to {opacity:1; transform:translateX(0)} }

      .tabs-anim-out-left  { animation: tabsOutLeft .16s ease forwards; }
      .tabs-anim-in-left   { animation: tabsInLeft  .16s ease forwards; }
      .tabs-anim-out-right { animation: tabsOutRight .16s ease forwards; }
      .tabs-anim-in-right  { animation: tabsInRight  .16s ease forwards; }
    `;
    document.head.appendChild(style);
  }
}

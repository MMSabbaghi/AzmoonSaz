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

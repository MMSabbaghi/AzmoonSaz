(function () {
  // ====== Config ======
  const CONFIG = {
    offset: 8,
    viewportPadding: 6,
    showDelay: 80,
    hideDelay: 80,
    maxWidth: 260,
    zIndex: 9999,
    attribute: "data-tooltip",
    preferPlacement: "top", // "top" | "bottom" (اولویت)
  };

  // ====== Styles ======
  const style = document.createElement("style");
  style.textContent = `
    .custom-tooltip {
      position: fixed;
      background-color: var(--surface-darker, #2d3748);
      color: var(--text-primary, #f7fafc);
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius, 8px);
      font-size: 0.875rem;
      line-height: 1.5;
      max-width: ${CONFIG.maxWidth}px;
      white-space: normal;
      word-wrap: break-word;
      text-align: right;
      direction: rtl;
      box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.2));
      z-index: ${CONFIG.zIndex};
      pointer-events: none;
      opacity: 0;
      transform: translateY(2px);
      transition: opacity 0.15s ease, transform 0.15s ease;
      will-change: top, left, opacity, transform;
    }
    .custom-tooltip.visible {
      position: fixed;
      opacity: 1;
      transform: translateY(0);
    }

    .custom-tooltip::before {
      content: '';
      position: absolute;
      width: 0;
      height: 0;
      border: 6px solid transparent;
      left: var(--arrow-left, 50%);
      transform: translateX(-50%);
    }

    /* Arrow placement */
    .custom-tooltip.bottom::before {
  top: -6px;
  border-bottom-color: var(--surface-darker, #2d3748);
  border-top-width: 0;
    }
    .custom-tooltip.top::before {
  bottom: -6px;
  border-top-color: var(--surface-darker, #2d3748);
  border-bottom-width: 0;
    }

    @media (max-width: 768px) {
      .custom-tooltip {
        font-size: 0.82rem;
        padding: 0.45rem 0.65rem;
        max-width: 220px;
      }
    }
  `;
  document.head.appendChild(style);

  // ====== State ======
  let tooltipEl = null;
  let activeTarget = null;

  let showTimer = null;
  let hideTimer = null;
  let rafId = null;

  // برای رفع باگ حذف شدن هدف از DOM:
  let domObserver = null;

  // برای دسترس‌پذیری
  let tooltipIdCounter = 0;

  // ====== Helpers ======
  function isInDOM(node) {
    return node && node.isConnected;
  }

  function clearTimers() {
    if (showTimer) clearTimeout(showTimer);
    if (hideTimer) clearTimeout(hideTimer);
    showTimer = null;
    hideTimer = null;
  }

  function removeTooltip() {
    clearTimers();

    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;

    if (tooltipEl) {
      tooltipEl.remove();
      tooltipEl = null;
    }

    if (activeTarget) {
      // پاک کردن aria-describedby اگر خودمان اضافه کرده‌ایم
      const describedBy = activeTarget.getAttribute("aria-describedby");
      if (describedBy && describedBy.startsWith("custom-tooltip-")) {
        activeTarget.removeAttribute("aria-describedby");
      }
    }
    activeTarget = null;

    if (domObserver) {
      domObserver.disconnect();
      domObserver = null;
    }
  }

  function ensureObserverForTarget(target) {
    if (domObserver) domObserver.disconnect();

    domObserver = new MutationObserver(() => {
      // اگر target از DOM حذف شد یا attribute حذف شد => تولتیپ را ببند
      if (!isInDOM(target) || !target.hasAttribute(CONFIG.attribute)) {
        removeTooltip();
      }
    });

    // مشاهده کل سند (ساده و مطمئن برای حذف از هرجا)
    domObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [CONFIG.attribute],
    });
  }

  function computePlacement(targetRect, tooltipRect) {
    // اولویت کاربر
    const preferTop = CONFIG.preferPlacement === "top";

    const topPos = targetRect.top - tooltipRect.height - CONFIG.offset;
    const bottomPos = targetRect.bottom + CONFIG.offset;

    const fitsTop = topPos >= CONFIG.viewportPadding;
    const fitsBottom =
      bottomPos + tooltipRect.height <=
      window.innerHeight - CONFIG.viewportPadding;

    let placement;
    let top;

    if (preferTop) {
      if (fitsTop) {
        placement = "top";
        top = topPos;
      } else {
        placement = "bottom";
        top = bottomPos;
      }
    } else {
      if (fitsBottom) {
        placement = "bottom";
        top = bottomPos;
      } else {
        placement = "top";
        top = topPos;
      }
    }

    return { placement, top };
  }

  function positionTooltip(target) {
    if (!tooltipEl || !target) return;
    if (!isInDOM(target)) return removeTooltip();

    const targetRect = target.getBoundingClientRect();

    // اگر هدف مخفی/صفر بود، تولتیپ را نبندیم لزوماً؛ ولی بهتر است ببندیم
    if (targetRect.width === 0 && targetRect.height === 0) {
      return removeTooltip();
    }

    // ابتدا tooltip را در DOM داریم، حالا اندازه‌اش را می‌گیریم
    const tooltipRect = tooltipEl.getBoundingClientRect();

    const { placement, top } = computePlacement(targetRect, tooltipRect);

    let left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;

    // بعد از اینکه left نهایی tooltip مشخص شد و قبل از پایان تابع:
    const targetCenterX = targetRect.left + targetRect.width / 2;

    // محل فلش نسبت به خود tooltip (px)
    let arrowLeft = targetCenterX - left;

    // clamp برای اینکه فلش از گوشه‌ها بیرون نزند
    const arrowPadding = 12; // حداقل فاصله از لبه‌های tooltip
    arrowLeft = Math.max(
      arrowPadding,
      Math.min(tooltipRect.width - arrowPadding, arrowLeft),
    );

    tooltipEl.style.setProperty("--arrow-left", `${arrowLeft}px`);

    // clamp در عرض
    const minLeft = CONFIG.viewportPadding;
    const maxLeft =
      window.innerWidth - tooltipRect.width - CONFIG.viewportPadding;
    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = maxLeft;

    tooltipEl.style.top = `${Math.round(top)}px`;
    tooltipEl.style.left = `${Math.round(left)}px`;

    tooltipEl.classList.remove("top", "bottom");
    tooltipEl.classList.add(placement);
  }

  function createTooltip(text) {
    const el = document.createElement("div");
    el.className = "custom-tooltip";
    el.textContent = text;
    el.setAttribute("role", "tooltip");
    el.id = `custom-tooltip-${++tooltipIdCounter}`;
    document.body.appendChild(el);
    return el;
  }

  function showTooltip(target) {
    if (!target) return;

    const text = target.getAttribute(CONFIG.attribute);
    if (!text) return;

    // اگر هدف عوض شده، قبلی را ببند
    if (activeTarget && target !== activeTarget) {
      removeTooltip();
    }

    activeTarget = target;

    // دسترس‌پذیری
    if (!activeTarget.getAttribute("aria-describedby")) {
      // بعد از ساخت tooltip تنظیم می‌کنیم
    }

    // بساز/نمایش بده
    if (!tooltipEl) {
      tooltipEl = createTooltip(text);
      activeTarget.setAttribute("aria-describedby", tooltipEl.id);
    } else {
      tooltipEl.textContent = text;
    }

    ensureObserverForTarget(activeTarget);

    // position در یک فریم برای جلوگیری از پرش
    rafId = requestAnimationFrame(() => {
      positionTooltip(activeTarget);
      // visible با یک tick کوتاه
      requestAnimationFrame(
        () => tooltipEl && tooltipEl.classList.add("visible"),
      );
    });
  }

  function scheduleShow(target) {
    clearTimers();
    showTimer = setTimeout(() => showTooltip(target), CONFIG.showDelay);
  }

  function scheduleHide() {
    clearTimers();
    hideTimer = setTimeout(() => removeTooltip(), CONFIG.hideDelay);
  }

  function getTooltipTargetFromEvent(e) {
    if (!e || !e.target) return null;
    const el = e.target.closest(`[${CONFIG.attribute}]`);
    return el || null;
  }

  // ====== Events (Mouse + Keyboard) ======
  document.addEventListener(
    "pointerover",
    (e) => {
      // فقط mouse/pen (برای touch معمولاً hover نداریم)
      if (e.pointerType === "touch") return;

      const target = getTooltipTargetFromEvent(e);
      if (!target) return;

      // اگر روی همان هدف هستیم کاری نکن
      if (target === activeTarget && tooltipEl) return;

      scheduleShow(target);
    },
    true,
  );

  document.addEventListener(
    "pointerout",
    (e) => {
      if (e.pointerType === "touch") return;

      const target = getTooltipTargetFromEvent(e);
      if (!target) return;

      // اگر خروج از داخل همان عنصر به یکی از فرزندانش بود، نبند
      const related = e.relatedTarget;
      if (related && target.contains(related)) return;

      scheduleHide();
    },
    true,
  );

  // فوکوس با کیبورد
  document.addEventListener(
    "focusin",
    (e) => {
      const target = getTooltipTargetFromEvent(e);
      if (!target) return;
      scheduleShow(target);
    },
    true,
  );

  document.addEventListener(
    "focusout",
    (e) => {
      const target = getTooltipTargetFromEvent(e);
      if (!target) return;
      scheduleHide();
    },
    true,
  );

  // ESC برای بستن
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") removeTooltip();
  });

  // Scroll/Resize => reposition یا hide
  window.addEventListener(
    "scroll",
    () => {
      // اگر هدف وجود ندارد یا از DOM حذف شده => ببند
      if (!activeTarget || !tooltipEl) return;
      if (!isInDOM(activeTarget)) return removeTooltip();

      // به جای hide، بهتر است موقعیت آپدیت شود
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => positionTooltip(activeTarget));
    },
    { passive: true, capture: true },
  );

  window.addEventListener(
    "resize",
    () => {
      if (!activeTarget || !tooltipEl) return;
      if (!isInDOM(activeTarget)) return removeTooltip();

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => positionTooltip(activeTarget));
    },
    { passive: true },
  );

  // اگر صفحه مخفی شد (tab change) تولتیپ را ببند
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) removeTooltip();
  });
})();

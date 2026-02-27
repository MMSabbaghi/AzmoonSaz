(function () {
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
      max-width: 250px;
      white-space: normal;
      word-wrap: break-word;
      text-align: right;
      direction: rtl;
      box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.2));
      z-index: 9999;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .custom-tooltip.visible {
      opacity: 1;
    }
    .custom-tooltip::before {
      content: '';
      position: absolute;
      width: 0;
      height: 0;
      border: 6px solid transparent;
    }
    .custom-tooltip.bottom::before {
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border-top-color: var(--surface-darker, #2d3748);
      border-bottom-width: 0;
    }
    .custom-tooltip.top::before {
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      border-bottom-color: var(--surface-darker, #2d3748);
      border-top-width: 0;
    }
    @media (max-width: 768px) {
      .custom-tooltip {
        font-size: 0.8rem;
        padding: 0.4rem 0.6rem;
        max-width: 200px;
      }
    }
  `;
  document.head.appendChild(style);

  let currentTooltip = null;
  let hideTimeout = null;
  let activeTarget = null;

  function showTooltip(target) {
    if (!target) return;
    const text = target.getAttribute("data-tooltip");
    if (!text) return;

    if (currentTooltip) currentTooltip.remove();
    if (hideTimeout) clearTimeout(hideTimeout);

    const tooltip = document.createElement("div");
    tooltip.className = "custom-tooltip";
    tooltip.textContent = text;
    document.body.appendChild(tooltip);

    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    let top = targetRect.top - tooltipRect.height - 8;
    let left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
    let placement = "bottom";

    if (top < 0) {
      top = targetRect.bottom + 8;
      placement = "top";
    }

    if (left < 4) left = 4;
    else if (left + tooltipRect.width > viewportWidth - 4) {
      left = viewportWidth - tooltipRect.width - 4;
    }

    tooltip.style.top = top + "px";
    tooltip.style.left = left + "px";
    tooltip.classList.add(placement);
    setTimeout(() => tooltip.classList.add("visible"), 10);
    currentTooltip = tooltip;
    activeTarget = target;
  }

  function hideTooltip() {
    if (currentTooltip) {
      currentTooltip.remove();
      currentTooltip = null;
    }
    activeTarget = null;
    if (hideTimeout) clearTimeout(hideTimeout);
  }

  document.addEventListener("mouseover", (e) => {
    const target = e.target.closest("[data-tooltip]");
    if (target) {
      if (target !== activeTarget) {
        hideTooltip();
        showTooltip(target);
      }
    }
  });

  document.addEventListener("mouseout", (e) => {
    const target = e.target.closest("[data-tooltip]");
    if (target) {
      hideTimeout = setTimeout(() => {
        const related = e.relatedTarget;
        if (related && target.contains(related)) return;
        hideTooltip();
      }, 50);
    }
  });

  window.addEventListener("scroll", hideTooltip, {
    passive: true,
    capture: true,
  });
  window.addEventListener("resize", hideTooltip);
})();

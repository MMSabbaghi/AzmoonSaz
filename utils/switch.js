(() => {
  const instances = new WeakMap();

  const defaults = {
    wrapperClass: "inline-flex items-center gap-2",
    trackBaseClass:
      "relative rounded-custom transition-all duration-200 ease-out " +
      "bg-surface-darker hover:brightness-110 active:brightness-95 " +
      "focus-within:ring-2 focus-within:ring-primary/40",
    knobBaseClass:
      "absolute rounded-custom bg-surface shadow-md " +
      "transition-transform duration-200 ease-out will-change-transform",

    activeClass: "bg-primary",

    disabledClass: "opacity-60 cursor-not-allowed",
    disabledTrackClass: "pointer-events-none",

    ariaLabel: "Switch",
    injectPosition: "end", // "start" | "end"

    sizes: {
      sm: {
        track: "min-w-[30px] h-[16px]",
        knob: "top-[2px] left-[2px] w-[12px] h-[12px]",
        knobOn: "translate-x-3.5", // ~14px
      },
      md: {
        track: "min-w-[38px] h-[20px]",
        knob: "top-[2px] left-[2px] w-[16px] h-[16px]",
        knobOn: "translate-x-4", // 16px
      },
      lg: {
        track: "min-w-[48px] h-[26px]",
        knob: "top-[3px] left-[3px] w-[20px] h-[20px]",
        knobOn: "translate-x-5", // 20px
      },
    },
  };

  function parseBool(value, fallback) {
    if (value == null) return fallback;
    const v = String(value).toLowerCase().trim();
    if (["1", "true", "yes", "on"].includes(v)) return true;
    if (["0", "false", "no", "off"].includes(v)) return false;
    return fallback;
  }

  function getOptions(container, userOptions) {
    const ds = container.dataset;

    const sizeKey = (ds.switchSize || userOptions?.size || "md").toLowerCase();
    const size = defaults.sizes[sizeKey] || defaults.sizes.md;

    return {
      ...defaults,
      ...userOptions,
      sizeKey,
      size,
      activeClass:
        ds.switchActiveClass ||
        userOptions?.activeClass ||
        defaults.activeClass,
      ariaLabel:
        ds.switchAriaLabel || userOptions?.ariaLabel || defaults.ariaLabel,
      injectPosition:
        ds.switchInjectPosition ||
        userOptions?.injectPosition ||
        defaults.injectPosition,
      name: ds.switchName || userOptions?.name || container.id || null,
    };
  }

  function build(container, options) {
    const switchRoot = document.createElement("div");
    switchRoot.className = options.wrapperClass;

    const button = document.createElement("button");
    button.type = "button";
    button.className = `${options.trackBaseClass} ${options.size.track}`;
    button.setAttribute("role", "switch");
    button.setAttribute("aria-checked", "false");
    button.setAttribute("aria-label", options.ariaLabel);

    const knob = document.createElement("span");
    knob.className = `${options.knobBaseClass} ${options.size.knob}`;

    button.appendChild(knob);
    switchRoot.appendChild(button);

    if (options.injectPosition === "start") container.prepend(switchRoot);
    else container.appendChild(switchRoot);

    // برای چینش label کنار سوئیچ (اگر خود container را هم استفاده می‌کنی)
    container.classList.add("flex", "items-center", "gap-2");

    return { switchRoot, button, track: button, knob };
  }

  function dispatch(container, type, detail) {
    container.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        detail,
      }),
    );
  }

  function ensure(container, userOptions = {}) {
    if (!(container instanceof Element)) {
      throw new Error("Switch: container must be a DOM Element");
    }

    if (instances.has(container)) {
      // اگر قبلاً ساخته شده، فقط options جدید را merge نمی‌کنیم تا رفتار غیرمنتظره نشود
      return instances.get(container);
    }

    const options = getOptions(container, userOptions);
    const ds = container.dataset;

    const state = {
      container,
      options,
      name: options.name,
      checked: parseBool(ds.switchChecked, false),
      disabled: parseBool(ds.switchDisabled, false),
      ui: null,
      handlers: {},
    };

    state.ui = build(container, options);

    Object.defineProperties(container, {
      setChecked: {
        configurable: true,
        value: (value, { silent = false } = {}) =>
          setChecked(state, value, { silent }),
      },
      toggle: {
        configurable: true,
        value: () => toggle(state),
      },
      setDisabled: {
        configurable: true,
        value: (value, { silent = false } = {}) =>
          setDisabled(state, value, { silent }),
      },
      isChecked: {
        configurable: true,
        value: () => state.checked,
      },
      destroySwitch: {
        configurable: true,
        value: () => destroy(state),
      },
    });

    bind(state);

    // sync اولیه (silent)
    setChecked(state, state.checked, { silent: true });
    setDisabled(state, state.disabled, { silent: true });

    instances.set(container, state);
    return state;
  }

  function setChecked(state, value, { silent = false } = {}) {
    const next = !!value;
    const changed = state.checked !== next;

    state.checked = next;

    state.ui.track.classList.toggle(state.options.activeClass, state.checked);
    state.ui.knob.classList.toggle(state.options.size.knobOn, state.checked);
    state.ui.button.setAttribute("aria-checked", String(state.checked));

    if (changed && !silent) {
      dispatch(state.container, "switch:change", {
        checked: state.checked,
        name: state.name,
        instance: state.container,
      });
    }
  }

  function toggle(state) {
    if (state.disabled) return;
    setChecked(state, !state.checked);
  }

  function setDisabled(state, value, { silent = false } = {}) {
    const next = !!value;
    if (state.disabled === next) return;

    state.disabled = next;

    state.container.classList.toggle(
      state.options.disabledClass,
      state.disabled,
    );
    state.ui.track.classList.toggle(
      state.options.disabledTrackClass,
      state.disabled,
    );

    state.ui.button.disabled = state.disabled;
    state.ui.button.setAttribute("aria-disabled", String(state.disabled));

    if (!silent) {
      dispatch(state.container, "switch:disabled", {
        disabled: state.disabled,
        name: state.name,
        instance: state.container,
      });
    }
  }

  function bind(state) {
    const onClick = () => toggle(state);

    const onKeyDown = (e) => {
      if (state.disabled) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        toggle(state);
      }
    };

    state.handlers.onClick = onClick;
    state.handlers.onKeyDown = onKeyDown;

    state.ui.button.addEventListener("click", onClick);
    state.ui.button.addEventListener("keydown", onKeyDown);
  }

  function destroy(state) {
    const { button } = state.ui;

    button?.removeEventListener("click", state.handlers.onClick);
    button?.removeEventListener("keydown", state.handlers.onKeyDown);

    state.ui.switchRoot?.remove();
    instances.delete(state.container);

    delete state.container.setChecked;
    delete state.container.toggle;
    delete state.container.setDisabled;
    delete state.container.isChecked;
    delete state.container.destroySwitch;
  }

  function initAll(root = document, userOptions = {}) {
    root
      .querySelectorAll?.("[data-switch]")
      .forEach((el) => ensure(el, userOptions));
  }

  function observe({ root = document.body, options = {} } = {}) {
    initAll(root, options);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!(node instanceof Element)) continue;

          if (node.matches?.("[data-switch]")) ensure(node, options);
          node
            .querySelectorAll?.("[data-switch]")
            .forEach((el) => ensure(el, options));
        }
      }
    });

    observer.observe(root, { childList: true, subtree: true });
    return observer;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => observe());
  } else {
    observe();
  }

  window.Switch = {
    ensure,
    initAll,
    observe,
  };
})();

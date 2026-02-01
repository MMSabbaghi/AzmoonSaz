(function () {
  function toPersianDigits(str) {
    return str.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
  }

  function toEnglishDigits(str) {
    return str
      .replace(/[۰-۹]/g, (d) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(d)])
      .replace(/\//g, "."); // تبدیل / به .
  }

  function enhanceInput(input) {
    if (input.__enhanced || input.type !== "text") return;
    input.__enhanced = true;

    const originalDescriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    );

    Object.defineProperty(input, "value", {
      get: function () {
        const val = originalDescriptor.get.call(this);
        return toEnglishDigits(val);
      },
      set: function (v) {
        const newVal = toPersianDigits(String(v));
        originalDescriptor.set.call(this, newVal);
      },
      configurable: true,
      enumerable: true,
    });

    // 🔧 تبدیل مقدار اولیه (در صورت وجود)
    const initialValue = originalDescriptor.get.call(input);
    if (initialValue) {
      originalDescriptor.set.call(input, toPersianDigits(initialValue));
    }

    input.addEventListener("input", () => {
      const original = originalDescriptor.get.call(input);
      let cleaned = toPersianDigits(original);

      cleaned = cleaned.replace(/[-]/g, "");

      const isNumberInput = input.dataset.numberInput === "true";
      const isFloatAllowed = input.dataset.float !== "false";

      if (isNumberInput) {
        if (isFloatAllowed) {
          cleaned = cleaned.replace(/[^\d۰-۹\.\/]/g, "");
        } else {
          cleaned = cleaned.replace(/[^\d۰-۹]/g, "");
          cleaned = cleaned.replace(/^۰+/, "");
        }
      }

      const selectionStart = input.selectionStart;
      const selectionEnd = input.selectionEnd;

      originalDescriptor.set.call(input, cleaned);

      const offset = cleaned.length - original.length;
      if (input.type !== "checkbox") {
        input.setSelectionRange(selectionStart + offset, selectionEnd + offset);
      }
    });
  }

  function applyToAllInputs() {
    document.querySelectorAll("input").forEach(enhanceInput);
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;

        if (node.matches?.("input")) {
          enhanceInput(node);
        }

        node.querySelectorAll?.("input").forEach(enhanceInput);
      }
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      applyToAllInputs();
      observer.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    applyToAllInputs();
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();

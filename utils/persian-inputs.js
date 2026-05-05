(function () {
  function toPersianDigits(str) {
    return str.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
  }

  function toEnglishDigits(str) {
    return str.replace(/[۰-۹]/g, (d) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(d)]);
  }

  function sanitize(input, value) {
    let cleaned = toPersianDigits(String(value));
    const isNumberInput = input.dataset.numberInput === "true";
    const isFloatAllowed = input.dataset.float !== "false";

    if (isNumberInput) {
      cleaned = cleaned.replace(/[-]/g, "");

      if (isFloatAllowed) {
        cleaned = cleaned.replace(/[^\d۰-۹\.\/]/g, "");
        const firstSep = cleaned.search(/[\.\/]/);
        if (firstSep !== -1) {
          const before = cleaned.substring(0, firstSep);
          const after = cleaned.substring(firstSep + 1).replace(/[\.\/]/g, "");
          cleaned = before + "." + after;
        } else {
          cleaned = cleaned.replace(/\//g, ".");
        }
      } else {
        cleaned = cleaned.replace(/[^\d۰-۹]/g, "");
        cleaned = cleaned.replace(/^۰+/, "");
      }
    }

    return cleaned;
  }

  function enhanceInput(input) {
    if (input.__enhanced || input.type !== "text") return;
    input.__enhanced = true;

    const originalDescriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    );

    Object.defineProperty(input, "value", {
      get: function () {
        let val = originalDescriptor.get.call(this);
        val = toEnglishDigits(val);
        if (this.dataset.numberInput === "true") {
          val = val.replace(/\//g, ".");
        }
        return val;
      },
      set: function (v) {
        const cleaned = sanitize(this, v);
        originalDescriptor.set.call(this, cleaned);
      },
      configurable: true,
      enumerable: true,
    });

    const initialValue = originalDescriptor.get.call(input);
    if (initialValue != null) {
      const cleaned = sanitize(input, initialValue);
      if (cleaned !== initialValue) {
        originalDescriptor.set.call(input, cleaned);
      }
    }

    input.addEventListener("input", function () {
      const original = originalDescriptor.get.call(this);
      const cleaned = sanitize(this, original);

      if (cleaned !== original) {
        const selectionStart = this.selectionStart;
        const selectionEnd = this.selectionEnd;

        const before = original.substring(0, selectionStart);
        const cleanedBefore = sanitize(this, before);
        const offset = cleanedBefore.length - before.length;

        originalDescriptor.set.call(this, cleaned);
        this.setSelectionRange(selectionStart + offset, selectionEnd + offset);
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

(function (global) {
  // ========== helpers ==========
  const MATH_RENDER_DELIMITERS = [
    { left: "$$", right: "$$", display: true },
    { left: "$", right: "$", display: false },
    { left: "\\(", right: "\\)", display: false },
    { left: "\\[", right: "\\]", display: true },
  ];

  const LATEX_TOOL_GROUPS = [
    {
      title: "پایه",
      key: "basic",
      tools: [
        { label: "\\frac{a}{b}", snippet: "\\frac{a}{b}", title: "کسر" },
        { label: "a^{n}", snippet: "^{n}", title: "توان" },
        { label: "\\sqrt{a}", snippet: "\\sqrt{a}", title: "رادیکال" },
        {
          label: "\\sqrt[n]{a}",
          snippet: "\\sqrt[n]{a}",
          title: "رادیکال با فرجه",
        },
        { label: "|a|", snippet: "|a|", title: "قدر مطلق" },
      ],
    },
    {
      title: "عملگرها",
      key: "operators",
      tools: [
        { label: "\\times", snippet: "\\times", title: "علامت ضرب" },
        { label: "\\div", snippet: "\\div", title: "علامت تقسیم" },
        { label: "\\geq", snippet: "\\geq", title: "بزرگتر مساوی" },
        { label: "\\leq", snippet: "\\leq", title: "کوچکتر مساوی" },
        { label: "\\cong", snippet: "\\cong", title: "علامت همنهشتی" },
      ],
    },
    {
      title: "مجموعه‌ها",
      key: "sets",
      tools: [
        { label: "\\in", snippet: "\\in", title: "عضویت در مجموعه" },
        { label: "\\subseteq", snippet: "\\subseteq", title: "زیرمجموعه" },
        { label: "\\emptyset", snippet: "\\emptyset", title: "مجموعه تهی" },
        { label: "\\mathbb{N}", snippet: "\\mathbb{N}", title: "اعداد طبیعی" },
        { label: "\\mathbb{Z}", snippet: "\\mathbb{Z}", title: "اعداد صحیح" },
        {
          label: "\\mathbb{W}",
          snippet: "\\mathbb{W}",
          title: "طبیعی صفر و بالاتر",
        },
        { label: "\\mathbb{R}", snippet: "\\mathbb{R}", title: "اعداد حقیقی" },
        { label: "\\mathbb{Q}", snippet: "\\mathbb{Q}", title: "اعداد گویا" },
        { label: "\\cup", snippet: "\\cup", title: "اجتماع" },
        { label: "\\cap", snippet: "\\cap", title: "اشتراک" },
      ],
    },
    {
      title: "متفرقه",
      key: "misc",
      tools: [
        { label: "\\pi", snippet: "\\pi", title: "عدد پی" },
        { label: "(x, y)", snippet: "(x, y)", title: "مختصات" },
        { label: "\\bar{x}", snippet: "\\bar{x}", title: "نماد بار" },
        {
          label: "\\begin{cases} ... \\end{cases}",
          snippet:
            "\\begin{cases}\n" +
            "a x + b y = c \\\\\n" +
            "d x + e y = f\n" +
            "\\end{cases}",
          title: "دستگاه معادلات",
        },
      ],
    },
  ];

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function escapeAttr(str) {
    return escapeHtml(str).replaceAll("\n", "&#10;");
  }

  let savedRange = null;

  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRange = sel.getRangeAt(0).cloneRange();
    }
  }

  function saveSelectionWithin(editor) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0);
      if (isRangeInsideEditor(r, editor)) savedRange = r.cloneRange();
    }
  }

  function isRangeInsideEditor(range, editor) {
    if (!range) return false;
    const c = range.commonAncestorContainer;
    return editor.contains(c.nodeType === 1 ? c : c.parentNode);
  }

  function placeCaretAtEnd(editor) {
    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    savedRange = range.cloneRange();
  }

  function restoreSelectionOrMoveToEnd(editor) {
    const sel = window.getSelection();
    if (!savedRange) {
      placeCaretAtEnd(editor);
      return;
    }
    try {
      if (!isRangeInsideEditor(savedRange, editor)) {
        placeCaretAtEnd(editor);
        return;
      }
      sel.removeAllRanges();
      sel.addRange(savedRange);
    } catch (e) {
      placeCaretAtEnd(editor);
    }
  }

  function insertMathSpanAtSelection(editor, latex) {
    restoreSelectionOrMoveToEnd(editor);

    const sel = window.getSelection();
    const range = sel.rangeCount ? sel.getRangeAt(0) : null;

    const span = document.createElement("span");
    span.className = "math-inline cursor-pointer hover:bg-gray-100 p-1";
    span.setAttribute("data-latex", latex);
    span.style.position = "relative";
    span.innerHTML = `
    <span data-latex="${latex}" class="math-inline-cover w-full h-full z-[2] absolute top-0 left-0"></span>
    <span class="z-[1]">$${latex}$</span>
    `;
    renderMathInContainer(span);

    const spacer = document.createTextNode("​");

    if (range) {
      range.deleteContents();
      range.insertNode(spacer);
      range.insertNode(span);

      range.setStartAfter(spacer);
      range.setEndAfter(spacer);
      sel.removeAllRanges();
      sel.addRange(range);
      savedRange = range.cloneRange();
    } else {
      editor.appendChild(span);
      editor.appendChild(spacer);
      placeCaretAtEnd(editor);
    }

    return span;
  }

  // ========== Math Rendering ==========
  function convertDigitsToPersianInsideContainer(container) {
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
      false,
    );

    let node;
    while ((node = walker.nextNode())) {
      if (/\d/.test(node.nodeValue)) {
        node.nodeValue = toPersianDigits(node.nodeValue);
      }
    }
  }

  function renderMathInContainer(container) {
    if (typeof renderMathInElement === "undefined") {
      console.warn("KaTeX auto-render not available");
      return;
    }

    const inlineNodes = container.querySelectorAll(".math-inline");
    inlineNodes.forEach((node) => {
      const tex = node.getAttribute("data-latex") || node.textContent || "";
      node.className = "math-inline";
      node.textContent = `$${tex}$`;
    });

    try {
      renderMathInElement(container, {
        delimiters: MATH_RENDER_DELIMITERS,
        throwOnError: false,
      });
      convertDigitsToPersianInsideContainer(container);
    } catch (e) {
      console.error("Math rendering error:", e);
    }
  }

  function createMathEditorModal({ onClose = () => {}, onSave = () => {} }) {
    const modal = document.createElement("div");
    modal.id = "latex-modal";
    modal.className =
      "fixed inset-0 z-[1000] flex items-end sm:items-center justify-center " +
      "bg-black/50 backdrop-blur-sm p-0 sm:p-4 invisible opacity-0 transition-all";

    modal.innerHTML = `
  <div class="bg-white w-full sm:max-w-3xl sm:rounded-xl rounded-t-2xl shadow-xl flex flex-col overflow-hidden"
       dir="rtl"
       style="max-height: min(92vh, 920px);">

    <!-- Header -->
    <div class="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b bg-white sticky top-0 z-10">
        <h2 class="text-base sm:text-lg font-semibold" id="latex-modal-title">افزودن فرمول</h2>

      <button type="button" id="latex-close-btn"
        class="h-9 w-9 grid place-items-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition"
        aria-label="بستن">
        <svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- Body -->
    <div class="px-4 sm:px-6 py-4 flex flex-col gap-4 overflow-auto">

      <!-- Toolbars -->
      <div class="flex gap-2 flex-wrap items-center" id="latex-toolbars"></div>

      <!-- Input + Preview (Responsive) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div class="flex flex-col gap-2">
          <label for="latex-input" class="text-sm font-medium">فرمول : </label>
          <textarea id="latex-input"
            class="w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[120px] lg:min-h-[160px] resize-none
                   focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
            dir="ltr" spellcheck="false"
            placeholder="مثلاً: \\frac{a}{b} + \\sqrt{x}"></textarea>

          <div class="flex items-center justify-between gap-2 text-[11px] text-gray-500">
            <span>پیش‌نمایش به صورت خودکار به‌روزرسانی می‌شود</span>
            <button type="button" id="latex-clear-btn"
              class="px-2 py-1 rounded-md hover:bg-gray-100 active:bg-gray-200 transition text-gray-700">
              پاک کردن
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <div class="text-sm font-medium">پیش‌نمایش</div>
          </div>

          <div id="latex-preview"
            class="min-h-[120px] lg:min-h-[160px] border border-gray-300 rounded-lg p-3 bg-gray-50 overflow-auto text-center text-lg
                   flex items-center justify-center">
            <span class="text-gray-400 text-sm">هنوز چیزی وارد نشده</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-4 sm:px-6 py-3 border-t bg-white sticky bottom-0">
      <div class="flex gap-2 justify-end">
        <button type="button" id="latex-cancel-btn"
          class="px-4 py-2 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 transition">
          انصراف
        </button>
        <button type="button" id="latex-save-btn"
          class="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition">
          ذخیره
        </button>
      </div>
    </div>

  </div>
  `;

    const input = modal.querySelector("#latex-input");
    const saveBtn = modal.querySelector("#latex-save-btn");
    const cancelBtn = modal.querySelector("#latex-cancel-btn");
    const closeBtn = modal.querySelector("#latex-close-btn");
    const clearBtn = modal.querySelector("#latex-clear-btn");
    const toolbars = modal.querySelector("#latex-toolbars");
    const preview = modal.querySelector("#latex-preview");

    let currentMathNode = null;
    let openDropdownKey = null;

    // --- Build toolbars ---
    toolbars.innerHTML = LATEX_TOOL_GROUPS.map((group) => {
      const toolsArr = group.tools?.map((tool) => {
        return { ...tool, label: `$${tool.label}$` };
      });
      const buttonText = toolsArr[0]?.label ? toolsArr[0].label : group.title;

      return `
      <div class="relative" data-group="${group.key}">
        <button type="button"
          class="toolbar-btn px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 transition
                 text-[12px] font-medium flex items-center gap-2"
          aria-haspopup="menu"
          aria-expanded="false"
          aria-controls="dropdown-${group.key}">
          <span class="font-mono text-[12px]">${escapeHtml(buttonText)}</span>
          <svg class="w-4 h-4 shrink-0 text-gray-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>

        <div id="dropdown-${group.key}" role="menu"
          class="dropdown hidden absolute right-0 mt-2 z-20 bg-white border border-gray-200 rounded-xl shadow-lg
                 min-w-[220px] max-w-[90vw] max-h-72 overflow-auto p-2">
          <div class="text-[11px] text-gray-500 px-2 py-1">${escapeHtml(group.title)}</div>
          ${toolsArr
            .map(
              (tool) => `
                <button type="button"
                  class="w-full text-right px-2 py-2 rounded-lg hover:bg-blue-50 active:bg-blue-100 transition
                         flex items-center justify-between gap-3"
                  data-snippet="${escapeAttr(tool.snippet)}"
                  title="${escapeAttr(tool.title || "")}">
                  <span class="text-[12px] text-gray-800">${escapeHtml(tool.title || tool.label)}</span>
                  <span class="font-mono text-[12px] text-gray-600 ltr" dir="ltr">${escapeHtml(tool.label)}</span>
                </button>
              `,
            )
            .join("")}
        </div>
      </div>
    `;
    }).join("");

    renderMathInContainer(toolbars);
    // --- Dropdown behavior (click/tap, close on outside, ESC) ---
    function setDropdownOpen(key, open) {
      openDropdownKey = open ? key : null;

      toolbars.querySelectorAll("[data-group]").forEach((wrap) => {
        const k = wrap.getAttribute("data-group");
        const btn = wrap.querySelector(".toolbar-btn");
        const dd = wrap.querySelector(".dropdown");
        const isOpen = openDropdownKey === k;

        dd.classList.toggle("hidden", !isOpen);
        btn.setAttribute("aria-expanded", String(isOpen));
      });
    }

    toolbars.querySelectorAll(".toolbar-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const wrap = btn.closest("[data-group]");
        const key = wrap.getAttribute("data-group");
        setDropdownOpen(key, openDropdownKey !== key);
      });
    });

    toolbars.querySelectorAll("button[data-snippet]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const snippet = btn.dataset.snippet || "";
        insertSnippetIntoTextarea(input, snippet);
        input.focus();
        updatePreview();
        setDropdownOpen(null, false);
      });
    });

    // close dropdown when clicking outside toolbar
    document.addEventListener("click", (e) => {
      if (!modal.classList.contains("invisible")) {
        if (!toolbars.contains(e.target)) setDropdownOpen(null, false);
      }
    });

    function insertSnippetIntoTextarea(textarea, snippet) {
      const start = textarea.selectionStart ?? textarea.value.length;
      const end = textarea.selectionEnd ?? textarea.value.length;
      const before = textarea.value.slice(0, start);
      const after = textarea.value.slice(end);
      textarea.value = before + snippet + after;
      const pos = start + snippet.length;
      textarea.setSelectionRange(pos, pos);
    }

    function updatePreview() {
      const latex = (input.value || "").trim();
      if (!latex) {
        preview.innerHTML = `<span class="text-gray-400 text-sm">هنوز چیزی وارد نشده</span>`;
        return;
      }
      preview.textContent = `$${latex}$`;
      renderMathInContainer(preview);
    }

    function open({ title, initialValue, mathNode = null }) {
      currentMathNode = mathNode || null;
      modal.querySelector("#latex-modal-title").textContent =
        title || "ویرایشگر ریاضی";
      input.value = initialValue || "";
      setDropdownOpen(null, false);

      modal.classList.remove("invisible", "opacity-0");
      setTimeout(() => {
        input.focus();
        updatePreview();
      }, 50);
    }

    function close() {
      setDropdownOpen(null, false);
      onClose();
      modal.classList.add("invisible", "opacity-0");
    }

    cancelBtn.addEventListener("click", close);
    closeBtn.addEventListener("click", close);

    // close on overlay click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });

    // ESC to close
    document.addEventListener("keydown", (e) => {
      if (modal.classList.contains("invisible")) return;
      if (e.key === "Escape") close();
    });

    saveBtn.addEventListener("click", () => {
      const latex = (input.value || "").trim();
      if (!latex) {
        currentMathNode = null;
        close();
        return;
      }
      onSave(latex, currentMathNode);
      currentMathNode = null;
      close();
    });

    clearBtn.addEventListener("click", () => {
      input.value = "";
      updatePreview();
      input.focus();
    });

    let previewTimeout;
    input.addEventListener("input", () => {
      clearTimeout(previewTimeout);
      previewTimeout = setTimeout(updatePreview, 200);
    });

    return { element: modal, open, close };
  }

  function buildToolbarHTML(features) {
    const groups = {
      style: ["bold", "italic", "underline", "strike"],
      align: ["align-left", "align-center", "align-right", "align-justify"],
      color: ["color"],
      fontSize: ["fontSize"],
      undoRedo: ["undo", "redo"],
    };

    const icons = {
      bold: "type-bold",
      italic: "type-italic",
      underline: "type-underline",
      strike: "type-strikethrough",
      "align-left": "justify-left",
      "align-center": "text-center",
      "align-right": "justify-right",
      "align-justify": "justify",
      color: "palette",
      fontSize: "font-size",
      undo: "arrow-counterclockwise",
      redo: "arrow-clockwise",
    };

    const commands = {
      bold: "bold",
      italic: "italic",
      underline: "underline",
      strike: "strikeThrough",
      "align-left": "justifyLeft",
      "align-center": "justifyCenter",
      "align-right": "justifyRight",
      "align-justify": "justifyFull",
    };

    let html =
      '<div class="toolbar-scroll inline-flex items-center gap-1 md:contents">';

    // گروه استایل
    if (features.some((f) => groups.style.includes(f))) {
      html +=
        '<div class="toolbar-group inline-flex items-center gap-0.5 px-1 border-l border-border-light">';
      groups.style.forEach((f) => {
        if (features.includes(f)) {
          const icon = icons[f];
          const cmd = commands[f];
          html += `<button type="button" class="toolbar-btn bg-transparent border-none rounded-circle p-2 text-secondary hover:bg-surface-darker active:scale-95 transition-all duration-150 min-w-[36px] min-h-[36px] flex items-center justify-center" data-command="${cmd}" title="${f}"><i class="bi bi-${icon}"></i></button>`;
        }
      });
      html += "</div>";
    }

    // گروه چینش
    if (features.some((f) => groups.align.includes(f))) {
      html +=
        '<div class="toolbar-group inline-flex items-center gap-0.5 px-1 border-l border-border-light">';
      groups.align.forEach((f) => {
        if (features.includes(f)) {
          const icon = icons[f];
          const cmd = commands[f];
          html += `<button type="button" class="toolbar-btn bg-transparent border-none rounded-circle p-2 text-secondary hover:bg-surface-darker active:scale-95 transition-all duration-150 min-w-[36px] min-h-[36px] flex items-center justify-center" data-command="${cmd}" title="${f}"><i class="bi bi-${icon}"></i></button>`;
        }
      });
      html += "</div>";
    }

    // رنگ
    if (features.includes("color")) {
      const colorId =
        "color-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
      html += `
      <div class="toolbar-group inline-flex items-center gap-0.5 px-1 border-l border-border-light">
        <div class="toolbar-color-picker relative inline-flex items-center">
          <input type="color" class="color-input absolute opacity-0 w-0 h-0" id="${colorId}" value="#333333">
          <label for="${colorId}" class="color-label inline-flex items-center gap-1 px-3 h-9 rounded-circle bg-transparent text-secondary hover:bg-surface-darker cursor-pointer"><i class="bi bi-palette"></i> رنگ</label>
        </div>
      </div>`;
    }

    // اندازه فونت
    if (features.includes("fontSize")) {
      html += `
      <div class="toolbar-group inline-flex items-center gap-0.5 px-1 border-l border-border-light">
        <select class="font-size-select h-9 px-3 border border-border-light bg-surface text-secondary text-sm cursor-pointer outline-none focus:border-primary" title="اندازه فونت">
          <option value="12">۱۲</option>
          <option value="14">۱۴</option>
          <option value="16" selected>۱۶</option>
          <option value="18">۱۸</option>
          <option value="20">۲۰</option>
          <option value="24">۲۴</option>
          <option value="28">۲۸</option>
          <option value="32">۳۲</option>
        </select>
      </div>`;
    }

    if (features.includes("latex")) {
      html += `
    <div class="toolbar-group inline-flex items-center gap-0.5 px-1 border-l border-border-light">
      <button type="button"
        class="toolbar-btn bg-transparent border-none rounded-circle px-3 py-2 text-secondary hover:bg-surface-darker active:scale-95 transition-all duration-150 flex items-center justify-center gap-1 latex-modal-open">
        <i class="bi bi-function"></i>
        <span class="text-sm"> <i class="bi bi-superscript"></i> افزودن فرمول </span>
      </button>
    </div>`;
    }

    // undo/redo
    if (features.includes("undo") || features.includes("redo")) {
      html +=
        '<div class="toolbar-group inline-flex items-center gap-0.5 px-1">';
      if (features.includes("undo")) {
        html += `<button type="button" class="toolbar-btn bg-transparent border-none rounded-circle p-2 text-secondary hover:bg-surface-darker active:scale-95 transition-all duration-150 min-w-[36px] min-h-[36px] flex items-center justify-center" data-action="undo" title="بازگشت"><i class="bi bi-arrow-counterclockwise"></i></button>`;
      }
      if (features.includes("redo")) {
        html += `<button type="button" class="toolbar-btn bg-transparent border-none rounded-circle p-2 text-secondary hover:bg-surface-darker active:scale-95 transition-all duration-150 min-w-[36px] min-h-[36px] flex items-center justify-center" data-action="redo" title="انجام دوباره"><i class="bi bi-arrow-clockwise"></i></button>`;
      }
      html += "</div>";
    }

    html += "</div>";
    return html;
  }

  function createRichTextEditor(container, options = {}) {
    const {
      features = [
        "bold",
        "italic",
        "underline",
        "strike",
        "align-left",
        "align-center",
        "align-right",
        "align-justify",
        "color",
        "fontSize",
        "undo",
        "redo",
        "latex",
      ],
      placeholder = "",
      contentId = "rich-editor-content-" + Date.now(),
      toolbarId = "rich-editor-toolbar-" + Date.now(),
      initialContent = "",
      onContentChange = null,
    } = options;

    // پاک کردن محتوای قبلی container
    container.innerHTML = "";

    // ساختار کلی ادیتور
    const wrapper = document.createElement("div");
    wrapper.className =
      "rich-editor-wrapper relative w-full bg-surface border border-border-light mb-4";
    wrapper.setAttribute("dir", "rtl");

    // ساخت تولبار
    const toolbar = document.createElement("div");
    toolbar.id = toolbarId;
    toolbar.className =
      "rich-editor-toolbar bg-surface-dark border-b border-border-light p-2 z-20 w-full overflow-x-auto whitespace-nowrap md:overflow-visible md:whitespace-normal md:flex md:flex-wrap md:items-center md:gap-2";
    toolbar.innerHTML = buildToolbarHTML(features);
    wrapper.appendChild(toolbar);

    // محتوای قابل ویرایش
    const editor = document.createElement("div");
    editor.id = contentId;
    editor.className =
      "rich-editor-content h-[100px] overflow-y-auto p-4 leading-relaxed outline-none bg-surface";
    editor.setAttribute("contenteditable", "true");
    editor.setAttribute("data-placeholder", placeholder);
    editor.innerHTML = initialContent;
    wrapper.appendChild(editor);

    container.appendChild(wrapper);

    // تابع به‌روزرسانی وضعیت دکمه‌های تولبار (bold, italic, ...)
    const updateToolbarState = () => {
      toolbar.querySelectorAll("[data-command]").forEach((btn) => {
        try {
          const active = document.queryCommandState(btn.dataset.command);
          btn.classList.toggle("active", active);
        } catch (e) {}
      });
    };

    // اتصال رویدادها به دکمه‌های تولبار
    toolbar.querySelectorAll("[data-command]").forEach((btn) => {
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        document.execCommand(btn.dataset.command, false, null);
        editor.focus();
        updateToolbarState();
        if (onContentChange) onContentChange(editor.innerHTML);
      });
    });

    // رنگ
    const colorInput = toolbar.querySelector(".color-input");
    if (colorInput) {
      colorInput.addEventListener("input", (e) => {
        document.execCommand("foreColor", false, e.target.value);
        editor.focus();
        if (onContentChange) onContentChange(editor.innerHTML);
      });
    }

    // اندازه فونت
    const fontSizeSelect = toolbar.querySelector(".font-size-select");
    if (fontSizeSelect) {
      fontSizeSelect.addEventListener("change", (e) => {
        const size = e.target.value;
        try {
          document.execCommand("fontSize", false, "7");
          const selection = window.getSelection();
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const span = document.createElement("span");
            span.style.fontSize = size + "px";
            span.appendChild(range.extractContents());
            range.insertNode(span);
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            selection.addRange(newRange);
          }
        } catch (err) {
          console.warn("Font size error:", err);
        }
        editor.focus();
        if (onContentChange) onContentChange(editor.innerHTML);
      });
    }

    // undo/redo
    toolbar.querySelectorAll('[data-action="undo"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        document.execCommand("undo");
        updateToolbarState();
        if (onContentChange) onContentChange(editor.innerHTML);
      });
    });
    toolbar.querySelectorAll('[data-action="redo"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        document.execCommand("redo");
        updateToolbarState();
        if (onContentChange) onContentChange(editor.innerHTML);
      });
    });

    // latex
    if (features.includes("latex")) {
      const mathEditorModal = createMathEditorModal({
        onSave: (latex, mathNode) => {
          if (mathNode) {
            mathNode.setAttribute("data-latex", latex);
            mathNode.textContent = latex;
          } else {
            insertMathSpanAtSelection(editor, latex);
          }

          if (onContentChange) onContentChange(editor.innerHTML);
          editor.focus();
        },
      });

      document.body.appendChild(mathEditorModal.element);

      const latexBtn = toolbar.querySelector(".latex-modal-open");
      if (latexBtn) {
        latexBtn.addEventListener("mousedown", (e) => {
          e.preventDefault();
          saveSelection();
          mathEditorModal.open({
            title: "افزودن فرمول",
            initialValue: "",
            mathNode: null,
          });
        });
      }

      editor.addEventListener("click", (e) => {
        const target = e.target;
        if (
          target &&
          target.classList &&
          target.classList.contains("math-inline-cover")
        ) {
          const latex =
            target.getAttribute("data-latex") || target.textContent || "";
          saveSelection();
          mathEditorModal.open({
            title: "ویرایش فرمول",
            initialValue: latex,
            mathNode: target,
          });
        }
      });

      saveSelection();
    }

    editor.addEventListener("mouseup", () => {
      saveSelectionWithin(editor);
      updateToolbarState();
    });

    editor.addEventListener("keyup", () => {
      saveSelectionWithin(editor);
      updateToolbarState();
    });

    editor.addEventListener("input", () => {
      saveSelectionWithin(editor);
      if (onContentChange) onContentChange(editor.innerHTML);
    });

    editor.addEventListener("paste", function (event) {
      event.preventDefault();

      let text;

      if (event.clipboardData) {
        text = event.clipboardData.getData("text/plain");
      } else if (window.clipboardData && window.clipboardData.getData) {
        text = window.clipboardData.getData("Text");
      }

      if (text) document.execCommand("insertText", false, text);
    });

    return {
      getEditorElement: () => editor,
      setContent: (html) => {
        editor.innerHTML = html;
      },
      getContent: () => editor.innerHTML,
      setAlignment: (align) => {
        editor.style.textAlign = align;
      },
      getAlignment: () => editor.style.textAlign,
    };
  }

  global.renderMathInContainer = renderMathInContainer;
  global.createRichTextEditor = createRichTextEditor;
})(window);

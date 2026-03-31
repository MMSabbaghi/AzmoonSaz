(function (global) {
  // ========== helpers ==========
  const MATH_RENDER_DELIMITERS = [
    { left: "$$", right: "$$", display: true },
    { left: "$", right: "$", display: false },
    { left: "\$$", right: "\$$", display: false },
    { left: "\$$", right: "\$$", display: true },
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

  // ========== selection ==========
  let savedRange = null;

  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRange = sel.getRangeAt(0).cloneRange();
  }

  function isRangeInsideEditor(range, editor) {
    if (!range) return false;
    const c = range.commonAncestorContainer;
    return editor.contains(c.nodeType === 1 ? c : c.parentNode);
  }

  function saveSelectionWithin(editor) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0);
      if (isRangeInsideEditor(r, editor)) savedRange = r.cloneRange();
    }
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
    if (!savedRange) return placeCaretAtEnd(editor);
    try {
      if (!isRangeInsideEditor(savedRange, editor))
        return placeCaretAtEnd(editor);
      sel.removeAllRanges();
      sel.addRange(savedRange);
    } catch (e) {
      placeCaretAtEnd(editor);
    }
  }

  // ========== block/line model (برای اینکه "کل خط" align بگیرد) ==========
  // هر خط را داخل یک بلاک (div.editor-line) نگه می‌داریم.
  function isLineBlock(el) {
    return (
      el &&
      el.nodeType === 1 &&
      el.tagName &&
      el.tagName.toLowerCase() === "div" &&
      el.classList.contains("editor-line")
    );
  }

  function createEmptyLine() {
    const line = document.createElement("div");
    line.className = "editor-line";
    line.appendChild(document.createElement("br"));
    return line;
  }

  function getClosestBlock(node, editor) {
    if (!node) return null;
    let el = node.nodeType === 1 ? node : node.parentElement;
    while (el && el !== editor) {
      if (isLineBlock(el)) return el;
      const tag = el.tagName?.toLowerCase();
      if (tag === "div" || tag === "p" || tag === "li") return el; // fallback
      el = el.parentElement;
    }
    return null;
  }

  // اگر محتوای ادیتور مستقیم textNode یا span و... بود، آن را به خطوط div.editor-line نرمال می‌کنیم.
  function normalizeEditorLines(editor) {
    // اگر خالی است، یک خط خالی بساز
    if (!editor.firstChild) {
      editor.appendChild(createEmptyLine());
      return;
    }

    // اگر همه بچه‌ها line هستند، کاری نکن
    const children = Array.from(editor.childNodes);
    const allLines = children.every((n) => n.nodeType === 1 && isLineBlock(n));
    if (allLines) return;

    // محتوا را به lineها تبدیل کن:
    // - هر <div>/<p>/<li> موجود را به عنوان یک line نگه می‌داریم (با افزودن کلاس editor-line)
    // - بقیه نودها را داخل یک line جدید جمع می‌کنیم
    const frag = document.createDocumentFragment();
    let currentLine = document.createElement("div");
    currentLine.className = "editor-line";

    function flushLineIfNeeded() {
      if (!currentLine) return;
      if (!currentLine.childNodes.length) return;
      frag.appendChild(currentLine);
      currentLine = document.createElement("div");
      currentLine.className = "editor-line";
    }

    children.forEach((node) => {
      // خطوط موجود
      if (
        node.nodeType === 1 &&
        ["div", "p", "li"].includes(node.tagName.toLowerCase())
      ) {
        flushLineIfNeeded();
        // تبدیل به editor-line
        if (!node.classList.contains("editor-line"))
          node.classList.add("editor-line");
        frag.appendChild(node);
        return;
      }

      // اگر br بین خطوط بود
      if (node.nodeType === 1 && node.tagName.toLowerCase() === "br") {
        // پایان خط
        if (!currentLine.childNodes.length)
          currentLine.appendChild(document.createElement("br"));
        flushLineIfNeeded();
        return;
      }

      // سایر نودها داخل خط فعلی
      currentLine.appendChild(node);
    });

    flushLineIfNeeded();

    editor.innerHTML = "";
    editor.appendChild(frag);

    // اگر هنوز خالی شد
    if (!editor.firstChild) editor.appendChild(createEmptyLine());
  }

  function ensureSelectionInLine(editor) {
    restoreSelectionOrMoveToEnd(editor);
    const sel = window.getSelection();
    const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
    if (!range) {
      normalizeEditorLines(editor);
      placeCaretAtEnd(editor);
      return getClosestBlock(editor.lastChild, editor);
    }

    normalizeEditorLines(editor);
    let block = getClosestBlock(range.startContainer, editor);

    // اگر هنوز بلاک پیدا نشد (مثلاً selection روی خود editor بود)
    if (!block) {
      // اگر ادیتور خطی ندارد، بساز
      if (!editor.firstChild) editor.appendChild(createEmptyLine());
      // سعی کن caret را به اولین/آخرین خط منتقل کنی
      block =
        editor.lastChild && isLineBlock(editor.lastChild)
          ? editor.lastChild
          : null;
      if (!block) {
        block = createEmptyLine();
        editor.appendChild(block);
      }
      // caret داخل block
      const r = document.createRange();
      r.selectNodeContents(block);
      r.collapse(false);
      sel.removeAllRanges();
      sel.addRange(r);
      savedRange = r.cloneRange();
    }

    return block;
  }

  function splitLineOnEnter(editor) {
    const line = ensureSelectionInLine(editor);

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const range = sel.getRangeAt(0);

    // محتوا بعد از caret را به خط جدید منتقل کن
    const afterRange = range.cloneRange();
    afterRange.setEndAfter(line);
    const tail = afterRange.extractContents(); // از caret تا انتهای line

    // خط جدید
    const newLine = document.createElement("div");
    newLine.className = "editor-line";
    if (tail && tail.childNodes && tail.childNodes.length) {
      newLine.appendChild(tail);
    } else {
      newLine.appendChild(document.createElement("br"));
    }

    // اگر خط فعلی خالی شد، br بگذار
    if (
      !line.textContent &&
      !line.querySelector("span, img, br, .katex, .math-inline")
    ) {
      line.innerHTML = "";
      line.appendChild(document.createElement("br"));
    }

    // درج خط جدید بعد از خط فعلی
    if (line.nextSibling) editor.insertBefore(newLine, line.nextSibling);
    else editor.appendChild(newLine);

    // caret ابتدای خط جدید
    const r = document.createRange();
    r.selectNodeContents(newLine);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
    savedRange = r.cloneRange();
  }

  // ========== Math nodes ==========
  function setMathSpanData(span, latex) {
    span.setAttribute("data-latex", latex);
    span.innerHTML = `
      <span data-latex="${latex}" class="math-inline-cover pointer-events-auto w-full h-full z-[2] absolute top-0 left-0"></span>
      <span class="z-[1] pointer-events-none">$${latex}$</span>
    `;
  }

  function createMathSpan(latex) {
    const span = document.createElement("span");
    // نکته مهم: inline-block (نه inline-flex) تا text-align روی خط درست و قابل پیش‌بینی کار کند
    span.className =
      "math-inline inline-block cursor-pointer hover:bg-gray-100 p-1";
    span.setAttribute("contenteditable", false);
    span.style.position = "relative";
    setMathSpanData(span, latex);
    return span;
  }

  function insertMathSpanAtSelection(editor, latex) {
    // تضمین اینکه داخل یک "خط" هستیم
    const line = ensureSelectionInLine(editor);

    const sel = window.getSelection();
    const range = sel.rangeCount ? sel.getRangeAt(0) : null;

    const span = createMathSpan(latex);
    renderMathInContainer(span);

    // spacer برای اینکه بعد از فرمول بتوان تایپ کرد
    const spacer = document.createTextNode("​");

    if (range) {
      range.deleteContents();

      // اگر caret عملاً بیرون line باشد، caret را انتهای line ببریم
      if (!line.contains(range.startContainer)) {
        const r2 = document.createRange();
        r2.selectNodeContents(line);
        r2.collapse(false);
        sel.removeAllRanges();
        sel.addRange(r2);
        savedRange = r2.cloneRange();
      }

      const r = sel.getRangeAt(0);
      r.insertNode(spacer);
      r.insertNode(span);

      // caret بعد از spacer
      r.setStartAfter(spacer);
      r.setEndAfter(spacer);
      sel.removeAllRanges();
      sel.addRange(r);
      savedRange = r.cloneRange();
    } else {
      line.appendChild(span);
      line.appendChild(spacer);
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
      if (/\d/.test(node.nodeValue))
        node.nodeValue = toPersianDigits(node.nodeValue);
    }
  }

  function renderMathInContainer(container) {
    if (typeof renderMathInElement === "undefined") {
      console.warn("KaTeX auto-render not available");
      return;
    }

    const inlineNodes = container.querySelectorAll(".math-inline");
    inlineNodes.forEach((node) => {
      if (!node.getAttribute("data-rendered")) {
        const tex = node.getAttribute("data-latex") || node.textContent || "";
        node.setAttribute("data-rendered", true);
        node.className = "math-inline";
        node.textContent = `$${tex}$`;
      }
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

  // ========== Modal ==========
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

        <div class="px-4 sm:px-6 py-4 flex flex-col gap-4 overflow-auto">
          <div class="flex gap-2 flex-wrap items-center" id="latex-toolbars"></div>

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

    toolbars.innerHTML = LATEX_TOOL_GROUPS.map((group) => {
      const toolsArr = group.tools?.map((tool) => ({
        ...tool,
        label: `$${tool.label}$`,
      }));
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

    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });

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

  // ========== toolbar html ==========
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

  // ========== alignment (روی نزدیک‌ترین بلاک/خط اعمال شود) ==========
  function applyAlign(editor, align) {
    const block = ensureSelectionInLine(editor); // تضمین line
    if (block) {
      block.style.textAlign = align;
      return;
    }

    // fallback
    const map = {
      left: "justifyLeft",
      center: "justifyCenter",
      right: "justifyRight",
      justify: "justifyFull",
    };
    document.execCommand(map[align] || "justifyLeft");
  }

  // ========== main editor ==========
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

    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className =
      "rich-editor-wrapper relative w-full bg-surface border border-border-light mb-4";
    wrapper.setAttribute("dir", "rtl");

    const toolbar = document.createElement("div");
    toolbar.id = toolbarId;
    toolbar.className =
      "rich-editor-toolbar bg-surface-dark border-b border-border-light p-2 z-20 w-full overflow-x-auto whitespace-nowrap md:overflow-visible md:whitespace-normal md:flex md:flex-wrap md:items-center md:gap-2";
    toolbar.innerHTML = buildToolbarHTML(features);
    wrapper.appendChild(toolbar);

    const editor = document.createElement("div");
    editor.id = contentId;
    editor.className =
      "rich-editor-content h-[100px] overflow-y-auto p-4 leading-relaxed outline-none bg-surface";
    editor.setAttribute("contenteditable", "true");
    editor.setAttribute("data-placeholder", placeholder);
    editor.innerHTML = initialContent;
    wrapper.appendChild(editor);

    container.appendChild(wrapper);

    // نرمال‌سازی خطی (برای اینکه align همیشه روی یک بلاک اعمال شود)
    normalizeEditorLines(editor);

    // رندر KaTeX روی محتوای اولیه
    renderMathInContainer(editor);

    function getEditorHtml() {
      const clonedEditor = editor.cloneNode(true);

      const inlineNodes = clonedEditor.querySelectorAll(".math-inline");
      inlineNodes.forEach((node) => {
        const latex = node.getAttribute("data-latex") || node.textContent || "";
        node.setAttribute("data-rendered", false);
        setMathSpanData(node, latex);
      });
      return clonedEditor.innerHTML;
    }

    function handleContentChange() {
      if (!onContentChange) return;
      onContentChange(getEditorHtml());
    }

    const updateToolbarState = () => {
      toolbar.querySelectorAll("[data-command]").forEach((btn) => {
        try {
          const active = document.queryCommandState(btn.dataset.command);
          btn.classList.toggle("active", active);
        } catch (e) {}
      });
    };

    // commands (bold/italic/underline/strike + align)
    toolbar.querySelectorAll("[data-command]").forEach((btn) => {
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();

        const cmd = btn.dataset.command;

        // Align ها را روی "خط" اعمال کن تا فرمول داخل خط هم درست تراز شود
        if (cmd === "justifyCenter") applyAlign(editor, "center");
        else if (cmd === "justifyRight") applyAlign(editor, "right");
        else if (cmd === "justifyLeft") applyAlign(editor, "left");
        else if (cmd === "justifyFull") applyAlign(editor, "justify");
        else document.execCommand(cmd, false, null);

        editor.focus();
        updateToolbarState();
        handleContentChange();
      });
    });

    // color
    const colorInput = toolbar.querySelector(".color-input");
    if (colorInput) {
      colorInput.addEventListener("input", (e) => {
        document.execCommand("foreColor", false, e.target.value);
        editor.focus();
        handleContentChange();
      });
    }

    // font size
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
        handleContentChange();
      });
    }

    // undo/redo
    toolbar.querySelectorAll('[data-action="undo"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        document.execCommand("undo");
        updateToolbarState();
        handleContentChange();
      });
    });
    toolbar.querySelectorAll('[data-action="redo"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        document.execCommand("redo");
        updateToolbarState();
        handleContentChange();
      });
    });

    // latex modal
    if (features.includes("latex")) {
      const mathEditorModal = createMathEditorModal({
        onSave: (latex, mathNode) => {
          if (mathNode) {
            setMathSpanData(mathNode, latex);
            renderMathInContainer(mathNode);
          } else {
            insertMathSpanAtSelection(editor, latex);
          }

          // بعد از درج/ویرایش، خطوط را نرمال نگه دار
          normalizeEditorLines(editor);

          handleContentChange();
          editor.focus();
        },
      });

      document.body.appendChild(mathEditorModal.element);

      const latexBtn = toolbar.querySelector(".latex-modal-open");
      if (latexBtn) {
        latexBtn.addEventListener("mousedown", (e) => {
          e.preventDefault();
          saveSelectionWithin(editor);
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
          saveSelectionWithin(editor);
          mathEditorModal.open({
            title: "ویرایش فرمول",
            initialValue: latex,
            mathNode: target.parentNode,
          });
        }
      });

      saveSelectionWithin(editor);
    }

    // --- Enter behavior: همیشه خط جدید (div.editor-line) بساز تا align روی "کل خط" اعمال شود
    editor.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        splitLineOnEnter(editor);
        handleContentChange();
      }
    });

    editor.addEventListener("mouseup", () => {
      saveSelectionWithin(editor);
      updateToolbarState();
    });

    editor.addEventListener("keyup", () => {
      saveSelectionWithin(editor);
      updateToolbarState();
    });

    editor.addEventListener("input", () => {
      normalizeEditorLines(editor);
      saveSelectionWithin(editor);
      handleContentChange();
    });

    editor.addEventListener("paste", function (event) {
      event.preventDefault();

      const cb = event.clipboardData;
      if (!cb) return;

      const html = cb.getData("text/html") || "";
      const text = cb.getData("text/plain") || "";

      if (html && html.includes("math-inline")) {
        document.execCommand("insertHTML", false, html);
        normalizeEditorLines(editor);
        saveSelectionWithin(editor);
        handleContentChange();
        return;
      }

      if (text) {
        document.execCommand("insertText", false, text);
        normalizeEditorLines(editor);
      }
    });

    return {
      getEditorElement: () => editor,
      setContent: (html) => {
        editor.innerHTML = html;
        normalizeEditorLines(editor);
        renderMathInContainer(editor);
      },
      getContent: getEditorHtml,
      setAlignment: (align) => {
        applyAlign(editor, align);
      },
      getAlignment: () => {
        const sel = window.getSelection();
        const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
        const block = range
          ? getClosestBlock(range.startContainer, editor)
          : null;
        return block?.style?.textAlign || "";
      },
    };
  }

  global.renderMathInContainer = renderMathInContainer;
  global.createRichTextEditor = createRichTextEditor;
})(window);

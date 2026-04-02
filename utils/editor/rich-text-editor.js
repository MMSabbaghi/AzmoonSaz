(function (global) {
  // ========== helpers ==========
  const ZWSP = "​";

  const MATH_RENDER_DELIMITERS = [
    { left: "$$", right: "$$", display: true },
    { left: "$", right: "$", display: false },
    { left: "\\$$", right: "\\$$", display: false },
    { left: "\\$$", right: "\\$$", display: true },
  ];

  const LATEX_TOOL_GROUPS = [
    {
      title: "پایه",
      key: "basic",
      tools: [
        { label: "\\frac{a}{b}", snippet: "\\frac{a}{b}", title: "کسر" },
        {
          label: "\\dfrac{a}{b}",
          snippet: "\\dfrac{a}{b}",
          title: "کسر نمایشی (Display)",
        },
        { label: "a^{n}", snippet: "^{n}", title: "توان" },
        { label: "a_{n}", snippet: "_{n}", title: "اندیس" },
        { label: "\\sqrt{a}", snippet: "\\sqrt{a}", title: "رادیکال" },
        {
          label: "\\sqrt[n]{a}",
          snippet: "\\sqrt[n]{a}",
          title: "رادیکال با فرجه",
        },
        { label: "|a|", snippet: "|a|", title: "قدر مطلق" },
        {
          label: "\\left( \\right)",
          snippet: "\\left(  \\right)",
          title: "پرانتز خودکار",
        },
        {
          label: "\\left[ \\right]",
          snippet: "\\left[  \\right]",
          title: "براکت خودکار",
        },
        {
          label: "\\left\\{ \\right\\}",
          snippet: "\\left\\{  \\right\\}",
          title: "آکولاد خودکار",
        },
        {
          label: "\\overline{a}",
          snippet: "\\overline{a}",
          title: "خط روی عبارت",
        },
        {
          label: "\\underline{a}",
          snippet: "\\underline{a}",
          title: "خط زیر عبارت",
        },
        { label: "\\pm", snippet: "\\pm", title: "بعلاوه/منها" },
        { label: "\\mp", snippet: "\\mp", title: "منها/بعلاوه" },
      ],
    },

    {
      title: "عملگرها و روابط",
      key: "operators",
      tools: [
        { label: "\\times", snippet: "\\times", title: "علامت ضرب" },
        { label: "\\div", snippet: "\\div", title: "علامت تقسیم" },
        { label: "\\leq", snippet: "\\leq", title: "کوچکتر مساوی" },
        { label: "\\geq", snippet: "\\geq", title: "بزرگتر مساوی" },
        { label: "\\sim", snippet: "\\sim", title: "مشابهت" },
        { label: "\\cong", snippet: "\\cong", title: "همنهشتی" },
        { label: "\\equiv", snippet: "\\equiv", title: "هم‌ارزی" },
        { label: "\\propto", snippet: "\\propto", title: "متناسب با" },
      ],
    },
    {
      title: "مجموعه‌ها",
      key: "sets",
      tools: [
        { label: "\\in", snippet: "\\in", title: "عضویت در مجموعه" },
        { label: "\\notin", snippet: "\\notin", title: "عدم عضویت" },
        { label: "\\subseteq", snippet: "\\subseteq", title: "زیرمجموعه" },
        { label: "\\subset", snippet: "\\nsubseteq", title: "عدم زیر مجموعه" },

        { label: "\\emptyset", snippet: "\\emptyset", title: "مجموعه تهی" },
        { label: "\\cup", snippet: "\\cup", title: "اجتماع" },
        { label: "\\cap", snippet: "\\cap", title: "اشتراک" },

        { label: "\\mathbb{N}", snippet: "\\mathbb{N}", title: "اعداد طبیعی" },
        { label: "\\mathbb{Z}", snippet: "\\mathbb{Z}", title: "اعداد صحیح" },
        {
          label: "\\mathbb{W}",
          snippet: "\\mathbb{W}",
          title: "طبیعی صفر و بالاتر",
        },
        { label: "\\mathbb{Q}", snippet: "\\mathbb{Q}", title: "اعداد گویا" },
        { label: "\\mathbb{R}", snippet: "\\mathbb{R}", title: "اعداد حقیقی" },
        { label: "\\forall", snippet: "\\forall", title: "برای همه" },
        { label: "\\exists", snippet: "\\exists", title: "وجود دارد" },
        { label: "\\nexists", snippet: "\\nexists", title: "وجود ندارد" },
      ],
    },

    {
      title: "منطق و نمادگذاری",
      key: "logic",
      tools: [
        { label: "\\implies", snippet: "\\implies", title: "⇒ (implies)" },
        { label: "\\land", snippet: "\\land", title: "و (AND)" },
        { label: "\\lor", snippet: "\\lor", title: "یا (OR)" },
        { label: "\\lnot", snippet: "\\lnot", title: "نقیض (NOT)" },
        {
          label: "\\Rightarrow",
          snippet: "\\Rightarrow",
          title: "نتیجه می‌دهد",
        },
        {
          label: "\\Leftarrow",
          snippet: "\\Leftarrow",
          title: "از آن نتیجه می‌شود",
        },
        {
          label: "\\Leftrightarrow",
          snippet: "\\Leftrightarrow",
          title: "اگر و تنها اگر",
        },
        { label: "\\iff", snippet: "\\iff", title: "⇔ (iff)" },
        { label: "\\therefore", snippet: "\\therefore", title: "بنابراین" },
        { label: "\\because", snippet: "\\because", title: "زیرا" },
      ],
    },

    {
      title: "حسابان عمومی",
      key: "calculus",
      tools: [
        { label: "\\lim_{x\\to a}", snippet: "\\lim_{x\\to a}", title: "حد" },
        { label: "\\to", snippet: "\\to", title: "میل می‌کند به" },
        { label: "\\infty", snippet: "\\infty", title: "بی‌نهایت" },
        {
          label: "\\log_{a} b",
          snippet: "\\log_{a} b",
          title: "لگاریتم با پایه",
        },
        { label: "\\ln", snippet: "\\ln", title: "لگاریتم طبیعی" },
        { label: "e^{x}", snippet: "e^{x}", title: "نمایی" },
      ],
    },

    {
      title: "ماتریس و دستگاه‌ها",
      key: "matrices",
      tools: [
        {
          label: "\\begin{matrix} ... \\end{matrix}",
          snippet: "\\begin{matrix}\n a & b \\\\\n c & d\n\\end{matrix}",
          title: "ماتریس ساده",
        },
        {
          label: "\\begin{pmatrix} ... \\end{pmatrix}",
          snippet: "\\begin{pmatrix}\n a & b \\\\\n c & d\n\\end{pmatrix}",
          title: "ماتریس با پرانتز",
        },
        {
          label: "\\begin{bmatrix} ... \\end{bmatrix}",
          snippet: "\\begin{bmatrix}\n a & b \\\\\n c & d\n\\end{bmatrix}",
          title: "ماتریس با براکت",
        },
        {
          label: "\\begin{vmatrix} ... \\end{vmatrix}",
          snippet: "\\begin{vmatrix}\n a & b \\\\\n c & d\n\\end{vmatrix}",
          title: "دترمینان",
        },
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
    {
      title: "یونانی‌ها",
      key: "greek",
      tools: [
        { label: "\\alpha", snippet: "\\alpha", title: "آلفا" },
        { label: "\\beta", snippet: "\\beta", title: "بتا" },
        { label: "\\gamma", snippet: "\\gamma", title: "گاما" },
        { label: "\\delta", snippet: "\\delta", title: "دلتا" },
        { label: "\\epsilon", snippet: "\\epsilon", title: "اپسیلون" },
        {
          label: "\\varepsilon",
          snippet: "\\varepsilon",
          title: "اپسیلون (فرم دیگر)",
        },
        { label: "\\theta", snippet: "\\theta", title: "تتا" },
        { label: "\\vartheta", snippet: "\\vartheta", title: "تتا (فرم دیگر)" },
        { label: "\\lambda", snippet: "\\lambda", title: "لامبدا" },
        { label: "\\mu", snippet: "\\mu", title: "مو" },
        { label: "\\nu", snippet: "\\nu", title: "نو" },
        { label: "\\pi", snippet: "\\pi", title: "پی" },
        { label: "\\varpi", snippet: "\\varpi", title: "پی (فرم دیگر)" },
        { label: "\\rho", snippet: "\\rho", title: "رو" },
        { label: "\\sigma", snippet: "\\sigma", title: "سیگما" },
        { label: "\\Sigma", snippet: "\\Sigma", title: "سیگما بزرگ" },
        { label: "\\tau", snippet: "\\tau", title: "تاو" },
        { label: "\\phi", snippet: "\\phi", title: "فی" },
        { label: "\\varphi", snippet: "\\varphi", title: "فی (فرم دیگر)" },
        { label: "\\omega", snippet: "\\omega", title: "اُمگا" },
        { label: "\\Omega", snippet: "\\Omega", title: "اُمگا بزرگ" },
        { label: "\\Delta", snippet: "\\Delta", title: "دلتا بزرگ" },
      ],
    },

    {
      title: "هندسه",
      key: "geometry",
      tools: [
        { label: "\\angle ABC", snippet: "\\angle ABC", title: "زاویه" },
        { label: "\\triangle ABC", snippet: "\\triangle ABC", title: "مثلث" },
        {
          label: "\\overline{AB}",
          snippet: "\\overline{AB}",
          title: "پاره‌خط",
        },
        { label: "\\parallel", snippet: "\\parallel", title: "موازی" },
        { label: "\\perp", snippet: "\\perp", title: "عمود" },
        { label: "\\circ", snippet: "^{\\circ}", title: "درجه" },
        { label: "\\vec{v}", snippet: "\\vec{v}", title: "بردار" },
      ],
    },

    {
      title: "متفرقه",
      key: "misc",
      tools: [
        { label: "(x, y)", snippet: "(x, y)", title: "مختصات" },
        { label: "f(x)", snippet: "f(x)", title: "تابع" },
        { label: "\\bar{x}", snippet: "\\bar{x}", title: "نماد بار" },
        { label: "\\hat{x}", snippet: "\\hat{x}", title: "نماد کلاه" },
        { label: "\\tilde{x}", snippet: "\\tilde{x}", title: "نماد تیلدا" },
        {
          label: "\\mathrm{a}",
          snippet: "\\mathrm{a}",
          title: "حروف رومن (متن داخل فرمول)",
        },
        {
          label: "\\text{متن}",
          snippet: "\\text{متن}",
          title: "متن داخل فرمول",
        },
        { label: "\\boxed{x}", snippet: "\\boxed{x}", title: "کادر دور عبارت" },
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

  function stripZwsp(s) {
    return String(s ?? "").replaceAll(ZWSP, "");
  }

  function isEditorEmpty(editor) {
    if (!editor) return true;

    // اگر فرمول داریم => خالی نیست
    if (editor.querySelector(".math-inline")) return false;

    // متن را بدون ZWSP و whitespace بررسی کنیم
    const text = stripZwsp(editor.textContent || "").replace(/\s+/g, "");
    if (text.length > 0) return false;

    // اگر تنها ساختارهای line/br باشند هم خالی حساب شود
    // (textContent در این حالت معمولاً خالی است)
    return true;
  }

  // ========== selection ==========
  let savedRange = null;

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

  // ========== block/line model ==========
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
      if (tag === "div" || tag === "p" || tag === "li") return el;
      el = el.parentElement;
    }
    return null;
  }

  function normalizeEditorLines(editor) {
    if (!editor.firstChild) {
      editor.appendChild(createEmptyLine());
      return;
    }

    const children = Array.from(editor.childNodes);
    const allLines = children.every((n) => n.nodeType === 1 && isLineBlock(n));
    if (allLines) return;

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
      if (
        node.nodeType === 1 &&
        ["div", "p", "li"].includes(node.tagName.toLowerCase())
      ) {
        flushLineIfNeeded();
        if (!node.classList.contains("editor-line"))
          node.classList.add("editor-line");
        frag.appendChild(node);
        return;
      }

      if (node.nodeType === 1 && node.tagName.toLowerCase() === "br") {
        if (!currentLine.childNodes.length)
          currentLine.appendChild(document.createElement("br"));
        flushLineIfNeeded();
        return;
      }

      currentLine.appendChild(node);
    });

    flushLineIfNeeded();
    editor.innerHTML = "";
    editor.appendChild(frag);

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

    if (!block) {
      if (!editor.firstChild) editor.appendChild(createEmptyLine());
      block =
        editor.lastChild && isLineBlock(editor.lastChild)
          ? editor.lastChild
          : null;
      if (!block) {
        block = createEmptyLine();
        editor.appendChild(block);
      }
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

    const afterRange = range.cloneRange();
    afterRange.setEndAfter(line);
    const tail = afterRange.extractContents();

    const newLine = document.createElement("div");
    newLine.className = "editor-line";
    if (tail && tail.childNodes && tail.childNodes.length)
      newLine.appendChild(tail);
    else newLine.appendChild(document.createElement("br"));

    if (
      !line.textContent &&
      !line.querySelector("span, img, br, .katex, .math-inline")
    ) {
      line.innerHTML = "";
      line.appendChild(document.createElement("br"));
    }

    if (line.nextSibling) editor.insertBefore(newLine, line.nextSibling);
    else editor.appendChild(newLine);

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
      <span data-latex="${escapeAttr(latex)}" class="math-inline-cover"></span>
      <span class="math-inline-tex">$${escapeHtml(latex)}$</span>
    `;
  }

  function createMathSpan(latex) {
    const span = document.createElement("span");
    span.className = "math-inline";
    span.setAttribute("contenteditable", false);
    setMathSpanData(span, latex);
    return span;
  }

  function lineIsEffectivelyEmpty(line) {
    if (!line) return true;
    // اگر فقط br دارد یا فقط whitespace/ZWSP دارد
    const hasMath = !!line.querySelector(".math-inline");
    if (hasMath) return false;

    const text = stripZwsp(line.textContent || "").replace(/\s+/g, "");
    if (text.length > 0) return false;

    // اگر فقط یک br یا هیچ
    const nonEmptyEls = Array.from(line.childNodes).filter((n) => {
      if (n.nodeType === 3) {
        const t = stripZwsp(n.nodeValue || "").replace(/\s+/g, "");
        return t.length > 0;
      }
      if (n.nodeType === 1) {
        const tag = n.tagName.toLowerCase();
        if (tag === "br") return false;
        if (tag === "span" && n.classList.contains("math-inline")) return true;
        // عناصر دیگر را غیرخالی فرض کن
        return true;
      }
      return false;
    });

    return nonEmptyEls.length === 0;
  }

  function clearLineBrIfEmpty(line) {
    if (!line) return;
    if (lineIsEffectivelyEmpty(line)) {
      line.innerHTML = "";
    } else {
      // اگر علاوه بر محتوا br اضافه‌ای باشد، حذفش کن (اختیاری)
      // اینجا دخالت نمی‌کنیم مگر لازم شود
    }
  }

  function insertMathSpanAtSelection(editor, latex) {
    const line = ensureSelectionInLine(editor);
    const sel = window.getSelection();
    const range = sel.rangeCount ? sel.getRangeAt(0) : null;

    // === Fix #1: وقتی خط خالی است، br را قبل از درج پاک کن تا یک خط اضافی ایجاد نشود
    clearLineBrIfEmpty(line);

    const span = createMathSpan(latex);
    renderMathInContainer(span);

    const spacer = document.createTextNode(ZWSP);

    if (range) {
      range.deleteContents();

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
    if (typeof toPersianDigits !== "function") return;

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

  function renderMathWithPersianDigits(container) {
    if (typeof renderMathInElement === "undefined") {
      console.warn("KaTeX auto-render not available");
      return;
    }
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

  function renderMathInContainer(container) {
    const inlineNodes = container.querySelectorAll(".math-inline");
    inlineNodes.forEach((node) => {
      const tex = node.getAttribute("data-latex") || node.textContent || "";
      node.classList.add("rendered");
      node.textContent = `$${tex}$`;
    });
    renderMathWithPersianDigits(container);
  }

  // ========== Modal ==========
  function createMathEditorModal({ onClose = () => {}, onSave = () => {} }) {
    const modal = document.createElement("div");
    modal.id = "latex-modal";
    modal.className = "rte-modal";
    modal.setAttribute("dir", "rtl");

    modal.innerHTML = `
      <div class="rte-modal-card">
        <div class="rte-modal-header">
          <div class="rte-modal-title" id="latex-modal-title">افزودن فرمول</div>
          <button type="button" class="rte-icon-btn" id="latex-close-btn" aria-label="بستن">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="rte-modal-body">
          <div class="rte-tools" id="latex-toolbars"></div>

          <div class="rte-modal-grid">
            <div class="rte-field">
              <label for="latex-input">فرمول</label>
              <textarea id="latex-input" class="rte-textarea ltr" dir="ltr" spellcheck="false"
                placeholder="مثلاً: \\frac{a}{b} + \\sqrt{x}"></textarea>

              <div class="rte-hintbar">
                <span>پیش‌نمایش به‌صورت خودکار به‌روزرسانی می‌شود</span>
                <button type="button" class="rte-linklike" id="latex-clear-btn">پاک کردن</button>
              </div>
            </div>

            <div class="rte-field">
              <label>پیش‌نمایش</label>
              <div id="latex-preview" class="rte-preview">
                <span class="rte-empty">هنوز چیزی وارد نشده</span>
              </div>
            </div>
          </div>
        </div>

        <div class="rte-modal-footer">
          <button type="button" class="rte-btn-ghost" id="latex-cancel-btn">انصراف</button>
          <button type="button" class="rte-btn-solid" id="latex-save-btn">ذخیره</button>
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

    // === Fix #6: دراپ‌داون Grid سه‌تایی + حذف title هر ابزار (نمایش فقط فرمول)
    toolbars.innerHTML = LATEX_TOOL_GROUPS.map((group) => {
      const toolsArr = group.tools?.map((tool) => ({
        ...tool,
        label: `$${tool.label}$`,
      }));

      // متن دکمه (اولین فرمول)
      const buttonText = toolsArr[0]?.label ? toolsArr[0].label : group.title;

      return `
        <div class="rte-dd-wrap" data-group="${escapeAttr(group.key)}">
          <button type="button" class="rte-dd-btn" aria-haspopup="menu" aria-expanded="false"
            aria-controls="dropdown-${escapeAttr(group.key)}">
            <span class="ltr" dir="ltr" style="font-family: var(--rte-mono); font-size:12px; color: var(--rte-text-2);">
              ${escapeHtml(buttonText)}
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>

          <div id="dropdown-${escapeAttr(group.key)}" role="menu" class="rte-dd-menu">
            <div class="rte-dd-title">${escapeHtml(group.title)}</div>
            <div class="rte-dd-grid">
              ${toolsArr
                .map(
                  (tool) => `
                    <button type="button" class="rte-dd-item"
                      data-snippet="${escapeAttr(tool.snippet)}"
                      aria-label="${escapeAttr(tool.title || "")}">
                      <span class="t2">${escapeHtml(tool.label)}</span>
                    </button>
                  `,
                )
                .join("")}
            </div>
          </div>
        </div>
      `;
    }).join("");

    renderMathInContainer(toolbars);

    // === Fix #4: جلوگیری از hidden شدن منو کنار لبه‌های مدال
    // منوها position:fixed هستند و هنگام باز شدن کنار دکمه قرار می‌گیرند
    function positionDropdownMenu(wrap) {
      const btn = wrap.querySelector(".rte-dd-btn");
      const dd = wrap.querySelector(".rte-dd-menu");
      if (!btn || !dd) return;

      const rect = btn.getBoundingClientRect();
      const gap = 8;

      // پیش‌فرض: زیر دکمه
      let top = rect.bottom + gap;
      let left = rect.left;

      dd.style.position = "fixed";
      dd.style.top = top + "px";
      dd.style.left = left + "px";
      dd.style.right = "auto";

      // بعد از نمایش، اندازه را چک کن تا از viewport بیرون نزند
      // (نیاز به یک tick)
      requestAnimationFrame(() => {
        const ddRect = dd.getBoundingClientRect();

        // اگر از راست زد بیرون، به اندازه شیفت بده
        if (ddRect.right > window.innerWidth - 8) {
          const shift = ddRect.right - (window.innerWidth - 8);
          dd.style.left = Math.max(8, ddRect.left - shift) + "px";
        }

        // اگر از چپ زد بیرون
        const ddRect2 = dd.getBoundingClientRect();
        if (ddRect2.left < 8) dd.style.left = "8px";

        // اگر پایین زد بیرون، بالا باز کن
        const ddRect3 = dd.getBoundingClientRect();
        if (ddRect3.bottom > window.innerHeight - 8) {
          const aboveTop = rect.top - gap - ddRect3.height;
          if (aboveTop >= 8) dd.style.top = aboveTop + "px";
          else {
            // اگر جا نیست، max-height بده
            dd.style.maxHeight =
              Math.max(120, window.innerHeight - rect.bottom - 16) + "px";
            dd.style.top = top + "px";
          }
        }
      });
    }

    function setDropdownOpen(key, open) {
      openDropdownKey = open ? key : null;
      toolbars.querySelectorAll("[data-group]").forEach((wrap) => {
        const k = wrap.getAttribute("data-group");
        const btn = wrap.querySelector(".rte-dd-btn");
        const dd = wrap.querySelector(".rte-dd-menu");
        const isOpen = openDropdownKey === k;

        dd.classList.toggle("is-open", isOpen);
        btn.setAttribute("aria-expanded", String(isOpen));

        if (isOpen) positionDropdownMenu(wrap);
      });
    }

    toolbars.querySelectorAll(".rte-dd-btn").forEach((btn) => {
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

    function closeDropdownIfClickedOutside(e) {
      if (!modal.classList.contains("is-open")) return;
      if (!toolbars.contains(e.target)) setDropdownOpen(null, false);
    }
    document.addEventListener("click", closeDropdownIfClickedOutside);

    window.addEventListener("resize", () => {
      if (!openDropdownKey) return;
      const wrap = toolbars.querySelector(
        `[data-group="${CSS.escape(openDropdownKey)}"]`,
      );
      if (wrap) positionDropdownMenu(wrap);
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
        preview.innerHTML = `<span class="rte-empty">هنوز چیزی وارد نشده</span>`;
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

      modal.classList.add("is-open");
      setTimeout(() => {
        input.focus();
        updatePreview();
      }, 30);
    }

    function close() {
      setDropdownOpen(null, false);
      onClose();
      modal.classList.remove("is-open");
    }

    cancelBtn.addEventListener("click", close);
    closeBtn.addEventListener("click", close);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });

    document.addEventListener("keydown", (e) => {
      if (!modal.classList.contains("is-open")) return;
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
      previewTimeout = setTimeout(updatePreview, 160);
    });

    return {
      element: modal,
      open,
      close,
      destroy: () => {
        document.removeEventListener("click", closeDropdownIfClickedOutside);
      },
    };
  }

  // ========== toolbar html ==========
  function buildToolbarHTML(features) {
    const groups = {
      style: ["bold", "italic", "underline", "strike"],
      align: ["align-right", "align-center", "align-left", "align-justify"],
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

    let html = `<div class="toolbar-scroll">`;

    function btn(cmd, icon, title, label = "") {
      return `
        <button type="button" class="rte-btn" data-command="${escapeAttr(cmd)}" title="${escapeAttr(title)}">
          <i class="bi bi-${escapeAttr(icon)}"></i>
          ${label ? `<span class="rte-btn-label">${escapeHtml(label)}</span>` : ""}
        </button>
      `;
    }

    if (features.some((f) => groups.style.includes(f))) {
      html += `<div class="toolbar-group">`;
      groups.style.forEach((f) => {
        if (features.includes(f)) html += btn(commands[f], icons[f], f);
      });
      html += `</div>`;
    }

    if (features.some((f) => groups.align.includes(f))) {
      html += `<div class="toolbar-group">`;
      groups.align.forEach((f) => {
        if (features.includes(f)) html += btn(commands[f], icons[f], f);
      });
      html += `</div>`;
    }

    if (features.includes("color")) {
      const colorId =
        "color-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
      html += `
        <div class="toolbar-group">
          <div class="toolbar-color-picker" style="position:relative; display:inline-flex; align-items:center;">
            <input type="color" class="color-input" id="${escapeAttr(colorId)}" value="#111827"
              style="position:absolute; opacity:0; width:0; height:0;">
            <label for="${escapeAttr(colorId)}" class="rte-color-label">
              <span class="rte-color-dot" aria-hidden="true"></span>
              <i class="bi bi-${icons.color}" style="font-size:18px;"></i>
              <span>رنگ</span>
            </label>
          </div>
        </div>`;
    }

    if (features.includes("fontSize")) {
      html += `
        <div class="toolbar-group">
          <select class="font-size-select rte-select" title="اندازه فونت">
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
        <div class="toolbar-group">
          <button type="button" class="rte-btn latex-modal-open" title="افزودن فرمول">
            <i class="bi bi-function"></i>
            <span class="rte-btn-label">افزودن فرمول</span>
          </button>
        </div>`;
    }

    if (features.includes("undo") || features.includes("redo")) {
      html += `<div class="toolbar-group">`;
      if (features.includes("undo")) {
        html += `<button type="button" class="rte-btn" data-action="undo" title="بازگشت"><i class="bi bi-${icons.undo}"></i></button>`;
      }
      if (features.includes("redo")) {
        html += `<button type="button" class="rte-btn" data-action="redo" title="انجام دوباره"><i class="bi bi-${icons.redo}"></i></button>`;
      }
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  }

  // ========== alignment ==========
  function applyAlign(editor, align) {
    const block = ensureSelectionInLine(editor);
    if (block) {
      block.style.textAlign = align;
      return;
    }
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
    wrapper.className = "rich-editor-wrapper";
    wrapper.setAttribute("dir", "rtl");

    const toolbar = document.createElement("div");
    toolbar.id = toolbarId;
    toolbar.className = "rich-editor-toolbar";
    toolbar.innerHTML = buildToolbarHTML(features);
    wrapper.appendChild(toolbar);

    const placeholderEl = document.createElement("div");
    placeholderEl.className = "rte-placeholder";
    placeholderEl.textContent = placeholder || "";
    wrapper.appendChild(placeholderEl);

    const editor = document.createElement("div");
    editor.id = contentId;
    editor.className = "rich-editor-content";
    editor.setAttribute("contenteditable", "true");
    editor.innerHTML = initialContent;
    wrapper.appendChild(editor);

    container.appendChild(wrapper);

    normalizeEditorLines(editor);
    renderMathInContainer(editor);

    function updatePlaceholder() {
      if (!placeholder) {
        placeholderEl.style.display = "none";
        return;
      }
      placeholderEl.style.display = isEditorEmpty(editor) ? "block" : "none";
    }

    updatePlaceholder();

    function getEditorHtml() {
      if (isEditorEmpty(editor)) return "";

      const clonedEditor = editor.cloneNode(true);
      const inlineNodes = clonedEditor.querySelectorAll(".math-inline");
      inlineNodes.forEach((node) => {
        const latex = node.getAttribute("data-latex") || node.textContent || "";
        setMathSpanData(node, latex);
      });

      const tmp = document.createElement("div");
      tmp.innerHTML = clonedEditor.innerHTML;
      if (isEditorEmpty(tmp)) return "";

      return clonedEditor.innerHTML;
    }

    function handleContentChange() {
      updatePlaceholder();
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

    // commands
    toolbar.querySelectorAll("[data-command]").forEach((btn) => {
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const cmd = btn.dataset.command;

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
    const colorDot = toolbar.querySelector(".rte-color-dot");
    if (colorInput) {
      const updateDot = () => {
        if (colorDot) colorDot.style.background = colorInput.value || "#111827";
      };
      updateDot();
      colorInput.addEventListener("input", (e) => {
        updateDot();
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
    let mathEditorModal = null;
    if (features.includes("latex")) {
      mathEditorModal = createMathEditorModal({
        onSave: (latex, mathNode) => {
          if (mathNode) {
            setMathSpanData(mathNode, latex);
            renderMathInContainer(mathNode);
          } else {
            insertMathSpanAtSelection(editor, latex);
          }
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

    // Enter -> new line block
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
        handleContentChange();
      }
    });

    placeholderEl.addEventListener("mousedown", (e) => {
      e.preventDefault();
      editor.focus();
      placeCaretAtEnd(editor);
    });

    // initial state
    updatePlaceholder();

    return {
      getEditorElement: () => editor,
      setContent: (html) => {
        editor.innerHTML = html || "";
        normalizeEditorLines(editor);
        renderMathWithPersianDigits(editor);
        updatePlaceholder();
      },
      getContent: getEditorHtml,
      setAlignment: (align) => applyAlign(editor, align),
      getAlignment: () => {
        const sel = window.getSelection();
        const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
        const block = range
          ? getClosestBlock(range.startContainer, editor)
          : null;
        return block?.style?.textAlign || "";
      },
      destroy: () => {
        if (mathEditorModal?.element?.parentNode) {
          mathEditorModal.element.parentNode.removeChild(
            mathEditorModal.element,
          );
        }
        mathEditorModal?.destroy?.();
      },
    };
  }

  global.renderMathInContainer = renderMathInContainer;
  global.createRichTextEditor = createRichTextEditor;
})(window);

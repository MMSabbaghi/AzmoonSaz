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

  // undo/redo
  if (features.includes("undo") || features.includes("redo")) {
    html += '<div class="toolbar-group inline-flex items-center gap-0.5 px-1">';
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

  // رویداد تغییر در محتوا
  editor.addEventListener("input", () => {
    if (onContentChange) onContentChange(editor.innerHTML);
  });

  // به‌روزرسانی وضعیت دکمه‌ها هنگام انتخاب متن
  editor.addEventListener("mouseup", updateToolbarState);
  editor.addEventListener("keyup", updateToolbarState);

  // بازگرداندن آبجکت برای دسترسی به editor
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

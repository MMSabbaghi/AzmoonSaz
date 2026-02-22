// ========== Shared Utilities ==========
function toPersianDigits(str) {
  return (str + "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

function isMobile() {
  return window.innerWidth <= 768;
}

function createRandomId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return prefix + "-" + crypto.randomUUID();
  } else {
    return (
      prefix +
      "-" +
      Date.now() +
      "-" +
      Math.random().toString(36).substring(2, 9)
    );
  }
}

function getAlignmentClass(align) {
  const classes = { RIGHT: "ml-auto", LEFT: "mr-auto", CENTER: "mx-auto" };
  return classes[align] || "";
}

function fisherYatesShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandomItems(source, count) {
  if (!Array.isArray(source) || source.length === 0 || count <= 0) return [];
  const shuffled = fisherYatesShuffle(source);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function normalizeMathSpaces(text) {
  return text
    .replace(/\$[ \t]+/g, "$")
    .replace(/[ \t]+\$/g, "$")
    .replace(/\$\$[ \t]+/g, "$$")
    .replace(/[ \t]+\$\$/g, "$$");
}

async function copyToClipboard(textToCopy) {
  try {
    await navigator.clipboard.writeText(textToCopy);
    showToast("کپی شد!");
    return true;
  } catch (err) {
    console.error("خطا در کپی کردن: ", err);
    showToast("خطا در کپی کردن!", "error");
    return false;
  }
}

function setElementState({ target, stateClasses, isActive }) {
  target.classList.remove(...stateClasses.on, ...stateClasses.off);
  target.classList.add(...stateClasses[isActive ? "on" : "off"]);
}

function handleSwitchElement({ container, onChange }) {
  const sw = container.querySelector("#switch");
  const knob = container.querySelector("#knob");
  let on = false;
  sw.addEventListener("click", () => {
    on = !on;
    const func = on ? "add" : "remove";
    sw.classList[func]("bg-surface");
    knob.classList[func]("translate-x-4", "scale-105");
    onChange(on);
  });
}

function handleFileUpload({ target, onChange, readAs }) {
  target.addEventListener("change", (e) => {
    Array.from(e.target.files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => onChange(ev.target.result);
      reader[`readAs${readAs}`](file);
    });
    e.target.value = "";
  });
}

// ========== Global State Management ==========
const appState = {
  ranges: [],
  names: [],
  namesCount: 1,
  font: "'Vazirmatn', sans-serif",
  modal: {
    isOpen: false,
    rangeId: null,
    itemId: null,
    tempItem: null,
  },
  aiModal: {
    isOpen: false,
    rangeId: null,
    topic: "",
  },
};

const TEXT_DEFAULTS = {
  html: "",
  align: "RIGHT",
};

const IMAGE_DEFAULTS = {
  height: 75,
  align: "RIGHT",
  showText: true,
};

const MATH_RENDER_DELIMITERS = [
  { left: "$$", right: "$$", display: true },
  { left: "$", right: "$", display: false },
  { left: "\\(", right: "\\)", display: false },
  { left: "\\[", right: "\\]", display: true },
];

// ---------- State update helpers ----------
function updateRangeInState(rangeId, updates) {
  const index = appState.ranges.findIndex((r) => r.id === rangeId);
  if (index !== -1) {
    appState.ranges[index] = { ...appState.ranges[index], ...updates };
  }
}

function updateItemInState(rangeId, itemId, updates) {
  const range = appState.ranges.find((r) => r.id === rangeId);
  if (!range) return;
  const itemIndex = range.items.findIndex((it) => it.id === itemId);
  if (itemIndex !== -1) {
    range.items[itemIndex] = { ...range.items[itemIndex], ...updates };
  }
}

function removeItemFromState(rangeId, itemId) {
  const range = appState.ranges.find((r) => r.id === rangeId);
  if (range) {
    range.items = range.items.filter((it) => it.id !== itemId);
  }
}

function reorderRangesInState(newOrderIds) {
  appState.ranges = newOrderIds
    .map((id) => appState.ranges.find((r) => r.id === id))
    .filter(Boolean);
}

// ========== Item Creation ==========
function createTextItem(
  html = TEXT_DEFAULTS.html,
  align = TEXT_DEFAULTS.align,
) {
  return {
    id: createRandomId("item"),
    text: { html, align },
    image: null,
  };
}

function createImageItem(
  src,
  imageId = createRandomId("img"),
  height = IMAGE_DEFAULTS.height,
  align = IMAGE_DEFAULTS.align,
  showText = IMAGE_DEFAULTS.showText,
) {
  return {
    id: createRandomId("item"),
    text: null,
    image: { src, height, align, showText, imageId },
  };
}

let justSwiped = false;

// ========== Animation Helpers ==========
function animateAddElement(element, enterClass) {
  element.classList.add(enterClass);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      element.classList.remove(enterClass);
    });
  });
}

function animateRemoveRange(element, callback) {
  const height = element.offsetHeight;
  element.style.transition =
    "opacity 0.3s ease, transform 0.3s ease, height 0.3s ease, margin 0.3s ease, padding 0.3s ease";
  element.style.overflow = "hidden";
  element.style.height = height + "px";
  element.offsetHeight;
  element.style.opacity = "0";
  element.style.transform = "scale(0.8)";
  element.style.height = "0";
  element.style.margin = "0";
  element.style.padding = "0";

  const onTransitionEnd = (e) => {
    if (e.target === element && e.propertyName === "height") {
      element.removeEventListener("transitionend", onTransitionEnd);
      element.remove();
      if (callback) callback();
    }
  };
  element.addEventListener("transitionend", onTransitionEnd);
  setTimeout(() => {
    element.removeEventListener("transitionend", onTransitionEnd);
    element.remove();
    if (callback) callback();
  }, 400);
}

function animateRemoveItem(element, callback) {
  element.classList.add("item-thumbnail-exit");
  const onTransitionEnd = (e) => {
    if (e.target === element && e.propertyName === "opacity") {
      element.removeEventListener("transitionend", onTransitionEnd);
      element.remove();
      if (callback) callback();
    }
  };
  element.addEventListener("transitionend", onTransitionEnd);
  setTimeout(() => {
    element.removeEventListener("transitionend", onTransitionEnd);
    element.remove();
    if (callback) callback();
  }, 300);
}

// ========== Item Rendering ==========
function renderItemContent(item, options = {}) {
  const { rangeDesc = "", imageClass = "", textClass = "" } = options;
  let html = "";

  if (item.image && item.image.showText) {
    const text = item.text ? item.text.html : rangeDesc;
    if (text) {
      const align = item.text ? item.text.align.toLowerCase() : "right";
      html += `<div class="${textClass}" style="text-align: ${align};">${text}</div>`;
    }
  } else if (item.text && !item.image) {
    html += `<div class="${textClass}" style="text-align: ${item.text.align.toLowerCase()};">${item.text.html}</div>`;
  }

  if (item.image) {
    const img = item.image;
    const alignClass = getAlignmentClass(img.align);
    const classNames = [alignClass, imageClass].filter(Boolean).join(" ");
    html += `<img src="${img.src}" style="height: ${img.height}px; width: auto; display: block;" class="${classNames}" alt="">`;
  }

  return html;
}

function renderRangeItems(rangeElement, rangeId) {
  const range = appState.ranges.find((r) => r.id === rangeId);
  if (!range) return;
  const preview = rangeElement.querySelector(".items-preview");
  preview.innerHTML = "";
  const fragment = document.createDocumentFragment();
  range.items.forEach((item) => {
    const itemContainer = createItemThumbnailElement(
      item,
      rangeElement,
      rangeId,
    );
    itemContainer.classList.add("item-thumbnail-enter");
    fragment.appendChild(itemContainer);
  });
  preview.appendChild(fragment);
  requestAnimationFrame(() => {
    preview.querySelectorAll(".item-thumbnail-enter").forEach((el) => {
      el.classList.remove("item-thumbnail-enter");
    });
  });

  if (range.itemsCollapsed) {
    preview.classList.add("collapsed");
  } else {
    preview.classList.remove("collapsed");
  }
}

function createItemThumbnailElement(item, rangeDiv, rangeId) {
  const container = document.createElement("div");
  container.className =
    "item-thumbnail max-md:p-[8px] relative border border-[#ddd] rounded-[6px] p-1 bg-white transition-all duration-200 cursor-pointer hover:border-[#333] hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)]";
  container.dataset.itemId = item.id;
  container.innerHTML =
    renderItemContent(item) +
    `<button class="remove-item absolute -top-1 -left-1 w-4 h-4 bg-error-light text-white rounded-full flex items-center justify-center text-[0.8rem] opacity-70 transition-opacity duration-200 border-0 cursor-pointer hover:opacity-100 max-md:w-6 max-md:h-6 max-md:text-base max-md:-top-1.5 max-md:-left-1.5">&times;</button>`;

  const removeBtn = container.querySelector(".remove-item");
  removeBtn.onclick = (e) => {
    e.stopPropagation();
    showConfirm({
      msg: "آیتم حذف شود؟",
      on_confirm: () => {
        animateRemoveItem(container, () => {
          removeItemFromState(rangeId, item.id);
          updateRangeItemCountBadge(rangeDiv);
        });
      },
    });
  };

  container.addEventListener("click", (e) => openItemModal(rangeId, item.id));

  return container;
}

function updateRangeItemCountBadge(rangeDiv) {
  const itemsCount = rangeDiv.querySelector(".items-preview").children.length;
  rangeDiv.querySelector(".range-total").textContent =
    toPersianDigits(itemsCount);
}

// ========== Range DOM Building ==========
const rangesContainer = document.getElementById("ranges");
let activeRangeId = null; // last clicked range (for paste)

function getRangeHTML(rangeData) {
  return isMobile()
    ? getMobileRangeHTML(rangeData)
    : getDesktopRangeHTML(rangeData);
}

function getMobileRangeHTML(rangeData) {
  const fileID = createRandomId("file");
  return `
    <div class="relative range-card-mobile my-1 rounded-custom bg-surface border border-border-light/80 p-5 transition-all">
      <!-- بخش تنظیمات -->
      <div class="settings-section mb-4">
        <!-- ردیف اول: عنوان + تعداد + منوی سه‌نقطه -->
        <div class="flex justify-between items-center mb-4">
          <div class="flex items-center gap-2 flex-1">
            <div class="relative flex-1">
              <input value="${rangeData.rangeName}" type="text" placeholder="عنوان مبحث" 
                     class="range-name w-full border-0 border-b-2 border-border-light bg-transparent px-1 py-2 text-base font-medium text-primary focus:border-primary-dark focus:ring-0 transition-all">
              <span class="absolute right-0 top-0 text-xs text-muted bg-surface px-1"> مبحث</span>
            </div>
          </div>
          <!-- منوی کشویی (dropdown) -->
          <div class="dropdown relative">
            <button class="dropdown-toggle action-circle border-0">
              <i class="bi bi-three-dots-vertical text-lg text-secondary"></i>
            </button>
            <div class="dropdown-menu hidden min-w-[140px] absolute top-full left-0 right-auto bg-surface border border-border-light rounded-custom p-2 shadow-lg z-50 flex-col gap-1">
              <button class="copy-range flex items-center gap-2 px-4 py-2.5 text-sm text-secondary hover:bg-surface-dark rounded-custom transition-all w-full text-right"><i class="bi bi-copy text-muted"></i> کپی</button>
              <button class="paste-range flex items-center gap-2 px-4 py-2.5 text-sm text-secondary hover:bg-surface-dark rounded-custom w-full text-right"><i class="bi bi-clipboard-plus text-muted"></i> چسباندن</button>
              <button class="remove-range flex items-center gap-2 px-4 py-2.5 text-sm text-secondary hover:bg-surface-dark rounded-custom transition-all w-full text-right"><i class="bi bi-trash3 text-muted"></i> حذف</button>
            </div>
          </div>
        </div>

        <!-- ردیف دوم: تعداد، نمره، دکمه‌های جابجایی -->
        <div class="flex items-center gap-2 mb-4 overflow-x-auto scrollable-x pb-1">
          <div class="flex items-center gap-1 bg-surface-dark px-3 py-2 rounded-custom border border-border-light flex-shrink-0">
            <label class="text-sm text-secondary ml-1">تعداد:</label>
            <input value="${rangeData.count}" data-number-input="true" data-float="false" 
                   class="range-count w-14 text-center bg-transparent border-0 p-1 text-base font-medium text-primary focus:ring-1 focus:ring-primary-light rounded-custom">
          </div>
          <div class="flex items-center gap-1 bg-surface-dark px-3 py-2 rounded-custom border border-border-light flex-shrink-0">
            <label class="text-sm text-secondary ml-1">نمره:</label>
            <input value="${rangeData.score}" data-number-input="true" 
                   class="range-score w-14 text-center bg-transparent border-0 p-1 text-base font-medium text-primary focus:ring-1 focus:ring-primary-light rounded-custom">
          </div>
          <button class="move-up action-circle flex-shrink-0"><i class="bi bi-arrow-up-short text-xl"></i></button>
          <button class="move-down action-circle flex-shrink-0"><i class="bi bi-arrow-down-short text-xl"></i></button>
        </div>

        <!-- ردیف سوم: دکمه‌های افزودن متن، تصویر و هوش مصنوعی -->
        <div class="flex gap-2">
          <button class="add-text-item flex-1 flex items-center justify-center gap-2 bg-surface-dark hover:bg-surface-darker text-secondary rounded-custom py-3 text-sm font-medium transition-all active:scale-[0.98]">
            <i class="bi bi-plus-lg text-lg"></i> <span>افزودن سوال</span>
          </button>
          <!-- آپلود تصویر -->
          <input type="file" id="${fileID}" accept="image/*" multiple class="sr-only range-images">
          <label for="${fileID}" class="hidden flex-1 flex items-center justify-center gap-2 bg-surface-dark hover:bg-surface-darker text-secondary rounded-custom py-3 text-sm font-medium transition-all active:scale-[0.98]">
            <i class="bi bi-image text-lg"></i> <span>تصویر</span>
          </label>
          <button class="ai-range flex-1 flex items-center justify-center gap-2 bg-surface-dark hover:bg-surface-darker text-secondary rounded-custom py-3 text-sm font-medium transition-all active:scale-[0.98]">
            <i class="bi bi-openai text-lg"></i> <span>هوش مصنوعی</span>
          </button>
        </div>

        <!-- سوییچ و تکست‌آریا برای توضیحات مبحث -->
        <div class="hidden flex items-center gap-2 mt-3">
          <label class="text-sm text-secondary">متن سوال:</label>
          <div id="switch" class="relative w-[42px] h-[24px] bg-border-dark rounded-custom cursor-pointer transition-all duration-300 ease-out shadow-inner">
            <div id="knob" class="absolute top-[2px] left-[3px] w-[20px] h-[20px] bg-surface rounded-custom transition-all duration-500 shadow-md"></div>
          </div>
        </div>
        <div id="textareaBox" class="overflow-hidden max-h-0 opacity-0 blur-sm -translate-y-3 transition-all duration-500 ease-out">
          <textarea class="range-desc w-full h-15 border border-border-light rounded-custom p-3 text-sm focus:outline-none placeholder-muted" placeholder="متن سوال را اینجا بنویسید.">${rangeData.desc || ""}</textarea>
        </div>
      </div>

      <!-- بخش پیش‌نمایش آیتم‌ها -->
      <div class="preview-section border-t border-border-light pt-3 mt-1">
        <button class="toggle-items-btn flex gap-2 items-center w-full bg-surface-dark hover:bg-surface-darker rounded-custom px-4 py-3 transition-all ${rangeData.itemsCollapsed ? "collapsed" : ""}">
          <span class="text-sm font-medium text-secondary flex items-center gap-2"><i class="bi bi-grid-3x3-gap-fill text-muted"></i>سوالات تعریف شده</span>
            <span class="range-total flex items-center justify-center min-w-[2rem] h-8 px-2 bg-surface-darker text-secondary rounded-circle text-sm font-semibold">${toPersianDigits(rangeData.items.length)}</span>
          <i class="mr-auto transition-transform duration-300 bi-chevron-down text-muted toggle-arrow text-lg"></i>
        </button>
        <div class="items-preview grid grid-cols-2 gap-[5px] mt-1 ${rangeData.itemsCollapsed ? "collapsed" : ""} mt-3">
          <!-- آیتم‌ها -->
        </div>
      </div>
    </div>
  `;
}

function getDesktopRangeHTML(rangeData) {
  const fileID = createRandomId("file");
  return `
  <div class="border border-border-dark p-2 rounded-custom bg-surface-dark relative overflow-visible">
    <div class="range-header flex justify-between items-center font-bold my-1">
      <div class="flex items-center gap-2">
        <div class="relative">
          <label class="font-normal text-muted"> مبحث: </label>
          <input value="${rangeData.rangeName}" type="text" class="border border-border-light rounded-custom p-2 range-name" placeholder="عنوان مبحث">
          <span class="range-total absolute -top-2 -left-2 bg-error text-inverse text-xs font-bold rounded-circle w-5 h-5 flex items-center justify-center">
            ${toPersianDigits(rangeData.items.length)}
          </span>
        </div>
        <div>
          <label class="font-normal text-muted"> تعداد: </label>
          <input value="${rangeData.count}" data-number-input="true" data-float="false" class="w-20 border border-border-light rounded-custom p-2 range-count" placeholder="تعداد">
        </div>
        <div>
          <label class="font-normal text-muted" > نمره: </label>
          <input value="${rangeData.score}" data-number-input="true" class="w-20 border border-border-light rounded-custom p-2 range-score" placeholder="نمره">
        </div>
        <div class="inline-block">
          <div class="file-input">
            <input type="file" id="${fileID}" accept="image/*" multiple class="file sr-only range-images">
            <label for="${fileID}" class="btn btn-outline px-4 py-2 rounded-custom relative flex items-center justify-center"><i class="bi bi-image"></i></label>
          </div>
        </div>
        <button class="add-text-item btn btn-outline px-3 py-2 rounded-custom"><i class="bi bi-type"></i></button>
        <button class="ai-range btn btn-outline px-3 py-2 rounded-custom"><i class="bi bi-openai"></i></button>
        <label class="font-normal text-muted" > متن سوال: </label>
        <div id="switch" class="relative w-[42px] h-[24px] bg-border-dark rounded-custom cursor-pointer transition-all duration-300 ease-out shadow-inner">
          <div id="knob" class="absolute top-[2px] left-[3px] w-[20px] h-[20px] bg-surface rounded-custom transition-all duration-500 shadow-md"></div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button class="p-1 text-muted hover:text-error rounded-custom remove-range transition-all duration-500 ease-out"><i class="bi bi-trash3"></i></button>
        <button class="p-1 text-muted hover:text-primary rounded-custom copy-range transition-all duration-500 ease-out"><i class="bi bi-copy"></i></button>
        <button class="p-1 text-muted hover:text-primary rounded-custom paste-range transition-all duration-500 ease-out"><i class="bi bi-clipboard-plus"></i></button>
      </div>
    </div>
    <div id="textareaBox" class="overflow-hidden max-h-0 opacity-0 blur-sm -translate-y-3 transition-all duration-500 ease-out">
      <textarea class="range-desc w-full h-15 border border-border-light rounded-custom p-3 text-sm focus:outline-none placeholder-muted" placeholder="متن سوال را اینجا بنویسید.">${rangeData.desc || ""}</textarea>
    </div>
    <div class="items-preview grid grid-cols-6 gap-[5px] mt-1 ${rangeData.itemsCollapsed ? "collapsed" : ""}"></div>
  <div>  
  `;
}

function setupRangeInputs(rangeElement, rangeId) {
  rangeElement.querySelectorAll(".range-name").forEach((el) => {
    el.addEventListener("input", (e) => {
      const newVal = e.target.value;
      updateRangeInState(rangeId, { rangeName: newVal });
      rangeElement.querySelectorAll(".range-name").forEach((other) => {
        if (other !== e.target) other.value = newVal;
      });
    });
  });
  rangeElement.querySelectorAll(".range-count").forEach((el) => {
    el.addEventListener("input", (e) => {
      updateRangeInState(rangeId, { count: parseInt(e.target.value) || 0 });
    });
  });
  rangeElement.querySelectorAll(".range-score").forEach((el) => {
    el.addEventListener("input", (e) => {
      updateRangeInState(rangeId, { score: e.target.value });
    });
  });
  rangeElement.querySelector(".range-desc")?.addEventListener("input", (e) => {
    updateRangeInState(rangeId, { desc: e.target.value });
  });
}

function setupRangeButtons(rangeElement, rangeId) {
  setupRemoveRangeButton(rangeElement, rangeId);
  setupAiRangeButton(rangeElement, rangeId);
  setupCopyRangeButton(rangeElement, rangeId);
  setupPasteRangeButton(rangeElement, rangeId);
  setupMoveButtons(rangeElement, rangeId);
  setupAddTextItemButton(rangeElement, rangeId);
  setupToggleItemsButton(rangeElement, rangeId);
}

function setupRemoveRangeButton(rangeElement, rangeId) {
  rangeElement.querySelectorAll(".remove-range").forEach((btn) => {
    btn.onclick = () => {
      showConfirm({
        msg: "آیا از حذف این مبحث اطمینان دارید؟",
        on_confirm: () => {
          animateRemoveRange(rangeElement, () => {
            appState.ranges = appState.ranges.filter((r) => r.id !== rangeId);
          });
        },
      });
    };
  });
}

function setupAiRangeButton(rangeElement, rangeId) {
  rangeElement.querySelectorAll(".ai-range").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const range = appState.ranges.find((r) => r.id === rangeId);
      if (range) {
        openAIModal(rangeId, range.rangeName || "");
      }
    });
  });
}

function setupCopyRangeButton(rangeElement, rangeId) {
  rangeElement.querySelectorAll(".copy-range").forEach((btn) => {
    btn.addEventListener("click", () => {
      const items = appState.ranges.find((r) => r.id === rangeId)?.items || [];
      if (items.length) {
        copyToClipboard(JSON.stringify(items));
      } else {
        showToast("آیتمی برای کپی وجود ندارد.", "error");
      }
    });
  });
}

function setupPasteRangeButton(rangeElement, rangeId) {
  rangeElement.querySelectorAll(".paste-range").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      pasteItemsToRange(rangeId);
    });
  });
}

function setupMoveButtons(rangeElement, rangeId) {
  rangeElement.querySelectorAll(".move-up").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      moveRange(rangeId, "up");
    });
  });
  rangeElement.querySelectorAll(".move-down").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      moveRange(rangeId, "down");
    });
  });
}

function setupAddTextItemButton(rangeElement, rangeId) {
  rangeElement.querySelectorAll(".add-text-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const newItem = createTextItem();
      openModalForNewItem(rangeId, newItem);
    });
  });
}

function setupToggleItemsButton(rangeElement, rangeId) {
  const toggleBtn = rangeElement.querySelector(".toggle-items-btn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const range = appState.ranges.find((r) => r.id === rangeId);
      if (range) {
        range.itemsCollapsed = !range.itemsCollapsed;
        const preview = rangeElement.querySelector(".items-preview");
        if (range.itemsCollapsed) {
          preview.classList.add("collapsed");
          toggleBtn.classList.add("collapsed");
          toggleBtn.setAttribute("aria-expanded", "false");
        } else {
          preview.classList.remove("collapsed");
          toggleBtn.classList.remove("collapsed");
          toggleBtn.setAttribute("aria-expanded", "true");
        }
      }
    });
  }
}

function setupFileUploadOnRange(rangeElement, rangeId) {
  handleFileUpload({
    target: rangeElement.querySelector(".range-images"),
    onChange: (src) => {
      const newItem = createImageItem(src);
      openModalForNewItem(rangeId, newItem);
    },
    readAs: "DataURL",
  });
}

function setupSwitchOnRange(rangeElement) {
  handleSwitchElement({
    container: rangeElement,
    onChange: (isActive) => {
      setElementState({
        target: rangeElement.querySelector("#textareaBox"),
        stateClasses: {
          on: ["max-h-60", "opacity-100", "blur-0", "translate-y-0"],
          off: ["max-h-0", "opacity-0", "blur-sm", "-translate-y-3"],
        },
        isActive,
      });
    },
  });
}

function setupDropdownMenu(rangeElement) {
  const dropdownToggle = rangeElement.querySelector(".dropdown-toggle");
  const dropdownMenu = rangeElement.querySelector(".dropdown-menu");
  if (!dropdownToggle || !dropdownMenu) return;

  dropdownToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle("hidden");
  });

  const closeDropdownOnOutsideClick = (e) => {
    if (!dropdown.contains(e.target) && !dropdownToggle.contains(e.target)) {
      dropdownMenu.classList.remove("hidden");
    }
  };
  document.addEventListener("click", closeDropdownOnOutsideClick);
}

function attachRangeEvents(rangeElement, rangeId) {
  rangeElement.addEventListener("click", (e) => {
    if (rangeElement.dataset.swiping === "true") {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (!e.target.closest("button")) {
      activeRangeId = rangeId;
    }
  });

  if (isMobile()) {
    rangeElement.draggable = false;
  }

  setupSwitchOnRange(rangeElement);
  setupDropdownMenu(rangeElement);
  setupFileUploadOnRange(rangeElement, rangeId);
  setupRangeButtons(rangeElement, rangeId);
  setupRangeInputs(rangeElement, rangeId);
  renderRangeItems(rangeElement, rangeId);
}

function buildRangeDOM(rangeData) {
  const div = document.createElement("div");
  div.id = rangeData.id;
  div.draggable = !isMobile();
  div.className =
    "range-item transition-transform duration-200 ease-out overflow-auto";
  div.innerHTML = getRangeHTML(rangeData);
  return div;
}

function createRangeElement(rangeData = null) {
  if (!rangeData) {
    const newRange = {
      id: createRandomId("range-item"),
      rangeName: "",
      count: 1,
      score: 1,
      desc: "",
      items: [],
      itemsCollapsed: false,
    };
    appState.ranges.push(newRange);
    rangeData = newRange;
  }
  const el = buildRangeDOM(rangeData);
  attachRangeEvents(el, rangeData.id);
  return el;
}

function addItemToRange(rangeId, item) {
  const range = appState.ranges.find((r) => r.id === rangeId);
  if (!range) return;
  range.items.push(item);
  const rangeDiv = document.getElementById(rangeId);
  if (rangeDiv) {
    renderRangeItems(rangeDiv, rangeId);
    updateRangeItemCountBadge(rangeDiv);
  }
}

function moveRange(rangeId, direction) {
  const index = appState.ranges.findIndex((r) => r.id === rangeId);
  let newIndex;
  if (direction === "up" && index > 0) {
    newIndex = index - 1;
  } else if (direction === "down" && index < appState.ranges.length - 1) {
    newIndex = index + 1;
  } else {
    return;
  }

  [appState.ranges[newIndex], appState.ranges[index]] = [
    appState.ranges[index],
    appState.ranges[newIndex],
  ];

  rangesContainer.innerHTML = "";
  appState.ranges.forEach((r) => {
    const el = createRangeElement(r);
    rangesContainer.appendChild(el);
  });
}

document.getElementById("addRange").onclick = () => {
  const newRangeDiv = createRangeElement();
  newRangeDiv.classList.add("range-item-enter");
  rangesContainer.appendChild(newRangeDiv);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      newRangeDiv.classList.remove("range-item-enter");
    });
  });
};

// ========== Names Section ==========
let namesUI = null;

function createNamesUI() {
  const container = document.createElement("div");
  container.className = "names-section w-full";

  container.innerHTML = `
    <div class="flex items-center gap-2 flex-wrap">
      <div>
        <label class="text-secondary">تعداد:</label>
        <input type="text" class="names-count-input border border-border-light rounded-custom p-2 w-10 md:w-20" value="${appState.names.length || appState.namesCount}" data-number-input="true" ${appState.names.length ? "disabled" : ""}>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-secondary">فونت:</label>
        <select class="font-selector border border-border-light rounded-custom p-2 text-sm bg-surface text-primary">
          <option value="'Vazirmatn', sans-serif">وزیرمتن</option>
          <option value="'Shabnam', sans-serif">شبنم</option>
          <option value="'BNazanin', sans-serif">نازنین</option>
        </select>
      </div>
      <div class="names-switch flex gap-1">
        <label class="text-secondary">نمایش نام:</label>
        <div id="switch" class="relative w-[42px] h-[24px] bg-border-dark rounded-custom cursor-pointer transition-all duration-300 ease-out shadow-inner">
          <div id="knob" class="absolute top-[2px] left-[3px] w-[20px] h-[20px] bg-surface rounded-custom transition-all duration-500 shadow-md"></div>
        </div>
      </div>
      <div class="flex gap-2 md:mr-auto w-full md:w-fit">
      <button class="generate-btn btn px-4 py-2 w-full md:w-fit"><i class="bi bi-clipboard2-check"></i> تولید آزمون</button>
      <button class="print-btn btn btn-secondary px-4 py-2 w-full md:w-fit"><i class="bi bi-printer"></i> چاپ خروجی</button>
      </div>
    </div>  
    <div class="names-textarea-container overflow-hidden max-h-0 opacity-0 blur-sm -translate-y-3 transition-all duration-500 ease-out">
      <textarea class="names-textarea mt-1 w-full h-15 border border-border-light rounded-custom p-3 text-sm focus:outline-none placeholder-muted" rows="5" placeholder="نام دانش‌آموزان هر کدام در یک خط">${appState.names.join("\n")}</textarea>
    </div>
  `;
  const fontSelect = container.querySelector(".font-selector");
  fontSelect.value = appState.font;

  const countInput = container.querySelector(".names-count-input");
  countInput.addEventListener("input", (e) => {
    const val = parseInt(e.target.value) || 1;
    appState.namesCount = val;
    if (!appState.names.length) {
      document.querySelectorAll(".names-count-input").forEach((other) => {
        if (other !== e.target) other.value = val;
      });
    }
  });

  fontSelect.addEventListener("change", (e) => {
    appState.font = e.target.value;
    document.body.style.fontFamily = appState.font;
    document.querySelectorAll(".font-selector").forEach((other) => {
      if (other !== e.target) other.value = appState.font;
    });
  });

  const textarea = container.querySelector(".names-textarea");
  textarea.addEventListener("input", (e) => {
    appState.names = e.target.value
      .split("\n")
      .filter((name) => name.trim() !== "");
    document.querySelectorAll(".names-count-input").forEach((input) => {
      input.value = appState.names.length || appState.namesCount;
      input.disabled = appState.names.length > 0;
    });
  });

  const switchContainer = container.querySelector(".names-switch");
  const textareaContainer = container.querySelector(
    ".names-textarea-container",
  );
  handleSwitchElement({
    container: switchContainer,
    onChange: (isActive) => {
      setElementState({
        target: textareaContainer,
        stateClasses: {
          on: ["max-h-60", "opacity-100", "blur-0", "translate-y-0"],
          off: ["max-h-0", "opacity-0", "blur-sm", "-translate-y-3"],
        },
        isActive,
      });
    },
  });

  container
    .querySelector(".generate-btn")
    .addEventListener("click", handleGenerateClick);
  container
    .querySelector(".print-btn")
    .addEventListener("click", () => window.print());

  return container;
}

function placeNamesUI() {
  if (!namesUI) return;

  const mobile = isMobile();
  const desktopContainer = document.getElementById("sticky");
  let mobileContainer = document.getElementById("mobile-bottom-bar");

  if (mobile) {
    if (!mobileContainer) {
      mobileContainer = document.createElement("div");
      mobileContainer.id = "mobile-bottom-bar";
      document.body.appendChild(mobileContainer);
    }
    if (!mobileContainer.contains(namesUI)) {
      mobileContainer.appendChild(namesUI);
    }
    if (desktopContainer.contains(namesUI)) {
      desktopContainer.removeChild(namesUI);
    }
    document.body.style.paddingBottom = mobileContainer.offsetHeight + "px";
    updateToTopPosition();
  } else {
    if (!desktopContainer.contains(namesUI)) {
      desktopContainer.appendChild(namesUI);
    }
    if (mobileContainer && mobileContainer.contains(namesUI)) {
      mobileContainer.removeChild(namesUI);
    }
    document.body.style.paddingBottom = "";
  }
}

function renderNamesSection() {
  document.querySelectorAll(".names-textarea").forEach((textarea) => {
    textarea.value = appState.names.join("\n");
  });

  document.querySelectorAll(".names-count-input").forEach((input) => {
    if (appState.names.length > 0) {
      input.value = appState.names.length;
      input.disabled = true;
    } else {
      input.value = appState.namesCount;
      input.disabled = false;
    }
  });

  document.querySelectorAll(".font-selector").forEach((select) => {
    select.value = appState.font;
  });
}

function updateNamesFromElement(element) {
  if (element && element.tagName === "TEXTAREA") {
    appState.names = element.value.split("\n");
  } else if (
    element &&
    element.tagName === "INPUT" &&
    element.dataset.numberInput
  ) {
    const value = parseInt(element.value) || 1;
    appState.namesCount = value;
  }
  renderNamesSection();
}

function syncNamesFromTextarea(sourceElement) {
  updateNamesFromElement(
    sourceElement || document.querySelector(".names-textarea"),
  );
}

function adjustMobilePadding() {
  if (!isMobile()) return;
  const bottomBar = document.getElementById("mobile-bottom-bar");
  if (!bottomBar) return;
  const barHeight = bottomBar.offsetHeight;
  document.getElementById("app-container").style.paddingBottom =
    barHeight + "px";
  updateToTopPosition();
}

// ========== Paste Handlers ==========
async function handlePasteInModal(items) {
  if (cropper) destroyCropper();

  const imageProcessed = await tryProcessImagePasteInModal(items);
  if (!imageProcessed) {
    await tryProcessTextPasteInModal(items);
  }
}

async function tryProcessImagePasteInModal(items) {
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf("image") !== -1) {
      const blob = items[i].getAsFile();
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target.result;
        const temp = appState.modal.tempItem;
        if (!temp.image) {
          temp.image = {
            src,
            height: IMAGE_DEFAULTS.height,
            align: IMAGE_DEFAULTS.align,
            showText: modalShowText.checked,
            imageId: createRandomId("img"),
          };
          updateModalPreviewFromTemp();
        } else {
          showConfirm({
            msg: "آیا تصویر فعلی جایگزین شود؟",
            on_confirm: () => {
              if (cropper) destroyCropper();
              temp.image.src = src;
              temp.image.imageId = createRandomId("img");
              updateModalPreviewFromTemp();
            },
          });
        }
      };
      reader.readAsDataURL(blob);
      return true;
    }
  }
  return false;
}

async function tryProcessTextPasteInModal(items) {
  let html = null;
  let text = null;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type === "text/html") {
      html = await new Promise((resolve) => items[i].getAsString(resolve));
      break;
    } else if (items[i].type === "text/plain") {
      text = await new Promise((resolve) => items[i].getAsString(resolve));
    }
  }
  modalTextEditor.focus();
  if (html) {
    document.execCommand("insertHTML", false, html);
  } else if (text) {
    document.execCommand("insertText", false, text);
  }
  updateTempItemFromTextEditor();
}

async function handlePasteOutsideModal(items) {
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf("image") !== -1) {
      const blob = items[i].getAsFile();
      const reader = new FileReader();
      reader.onload = (ev) => {
        const newItem = createImageItem(ev.target.result);
        openModalForNewItem(activeRangeId, newItem);
      };
      reader.readAsDataURL(blob);
      return;
    }
  }

  try {
    const text = await navigator.clipboard.readText();
    const pastedArray = JSON.parse(text);
    if (Array.isArray(pastedArray)) {
      const itemsToAdd = pastedArray.map((item) => {
        if (item.image || item.text) {
          return {
            id: item.id || createRandomId("item"),
            text: item.text ? { ...item.text } : null,
            image: item.image
              ? {
                  ...item.image,
                  imageId: item.image.imageId || createRandomId("img"),
                }
              : null,
          };
        } else {
          return createImageItem(
            item.src,
            item.imageId,
            item.height,
            item.align,
            item.showCaption !== false,
          );
        }
      });
      itemsToAdd.forEach((item) => addItemToRange(activeRangeId, item));
    }
  } catch (err) {
    console.error("Invalid JSON:", err);
    showToast("محتوا معتبر نیست و نمی‌تواند به عنوان آیتم اضافه شود.", "error");
  }
}

document.addEventListener("paste", async (e) => {
  if (!activeRangeId && !appState.modal.tempItem) return;

  const items = e.clipboardData?.items;
  if (!items) return;

  e.preventDefault();

  if (appState.modal.tempItem) {
    await handlePasteInModal(items);
  } else {
    await handlePasteOutsideModal(items);
  }
});

async function pasteItemsToRange(rangeId) {
  try {
    const text = await navigator.clipboard.readText();
    const items = JSON.parse(text);
    if (!Array.isArray(items)) throw new Error("Not an array");
    items.forEach((item) => {
      const newItem = {
        id: item.id || createRandomId("item"),
        text: item.text ? { ...item.text } : null,
        image: item.image
          ? {
              ...item.image,
              imageId: item.image.imageId || createRandomId("img"),
            }
          : null,
      };
      addItemToRange(rangeId, newItem);
    });
    showToast("آیتم‌ها با موفقیت اضافه شدند.");
  } catch (err) {
    showToast("محتوای کلیپ‌بورد معتبر نیست.", "error");
  }
}

// ========== Quiz Generation ==========
function buildQuizData(names, ranges) {
  const finalData = Object.fromEntries(names.map((n) => [n, []]));
  ranges.forEach((r) => {
    const items = Array.isArray(r.items) ? r.items : [];
    names.forEach((student) => {
      finalData[student].push({
        rangeName: r.rangeName,
        items: pickRandomItems(items, r.count),
        score: r.score,
        desc: r.desc,
      });
    });
  });
  return finalData;
}

function renderItemForQuiz(item, rangeDesc) {
  const imageClass = item.image ? `max-h-[${item.image.height}px]` : "";
  return renderItemContent(item, { rangeDesc, imageClass });
}

function createQuestionRowHtml(qNum, item, range) {
  return `
    <tr>
      <td class="w-10 text-center font-bold">
        ${toPersianDigits(qNum)}
        <span class="font-normal text-xs">
          ${+range.score > 0 ? `(${toPersianDigits(range.score)}نمره)` : ``}
        </span>
      </td>
      <td class="p-0">
        ${renderItemForQuiz(item, range.desc)}
      </td>
    </tr>`;
}

function createStudentTableHtml(studentQuiz, name) {
  let qNum = 1;
  const rows = studentQuiz
    .flatMap((range) =>
      range.items.map((item) => createQuestionRowHtml(qNum++, item, range)),
    )
    .join("");
  return `
    <table class="w-full border-collapse">
      <tr class="bg-gray-200">
        <td class="w-10"></td>
        <td class="p-1">نام و نام خانوادگی: ${name} </td>
      </tr>
      ${rows}
    </table>`;
}

function generateAnonymousStudentNames(count) {
  return Array.from({ length: count }, (_, i) => i + 1);
}

function getStudentNames() {
  const validNames = appState.names.filter((name) => name.trim() !== "");
  return {
    names: validNames.length
      ? validNames
      : generateAnonymousStudentNames(appState.namesCount),
    showNames: validNames.length > 0,
  };
}

function validateQuizInputs() {
  if (!appState.namesCount && !appState.names.length) {
    showToast("لطفا تعداد را وارد کنید", "error");
    return false;
  }
  const validRanges = appState.ranges.filter(
    (r) => r.items.length && r.count > 0,
  );
  if (!validRanges.length) {
    showToast("حداقل یک مبحث معتبر تعریف کنید.", "error");
    return false;
  }
  return validRanges;
}

function buildQuizHtml(validRanges) {
  const { names, showNames } = getStudentNames();
  const quizData = buildQuizData(names, validRanges);

  return names
    .map(
      (student) => `
      <tr>
        <td class="questions">
          ${createStudentTableHtml(quizData[student], showNames ? student : ``)}
        </td>
      </tr>
    `,
    )
    .join("");
}

function generateQuizHtml() {
  const validRanges = validateQuizInputs();
  if (!validRanges) return false;

  const html = buildQuizHtml(validRanges);
  document.getElementById("printable").innerHTML = `
    <table class="w-full">
      <tbody>${html}</tbody>
    </table>`;
  return true;
}

function handleGenerateClick(e) {
  const isGenerated = generateQuizHtml();
  if (isGenerated) {
    e.target.scrollIntoView({ behavior: "smooth" });
    renderMathInContainer(document.getElementById("printable"));
  }
}

// ========== Modal Utilities ==========
function openModalElement(modalElement) {
  modalElement.style.display = "flex";
  void modalElement.offsetHeight; // force reflow
  modalElement.classList.add("modal--visible");
  document.body.classList.add("overflow-hidden");
}

function closeModalElement(modalElement) {
  modalElement.classList.remove("modal--visible");
  document.body.classList.remove("overflow-hidden");
  setTimeout(() => {
    modalElement.style.display = "none";
  }, 300); // مطابق با transition
}

function setupModal(modalElement, options = {}) {
  const { closeOnEscape = true, closeOnOverlayClick = true } = options;

  const overlaySelector = ".modal-overlay";
  const closeButtonSelector = ".modal-close-btn";

  // کلیک روی overlay
  if (closeOnOverlayClick) {
    const overlay = modalElement.querySelector(overlaySelector);
    if (overlay) {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          closeModalElement(modalElement);
        }
      });
    }
  }

  if (closeButtonSelector) {
    const closeBtn = modalElement.querySelector(closeButtonSelector);
    if (closeBtn) {
      closeBtn.addEventListener("click", () => closeModalElement(modalElement));
    }
  }

  if (closeOnEscape) {
    const escapeHandler = (e) => {
      if (
        e.key === "Escape" &&
        modalElement.classList.contains("modal--visible")
      ) {
        closeModalElement(modalElement);
      }
    };
    document.addEventListener("keydown", escapeHandler);
  }
}

// ========== Edit modal ==========
const modalEdit = document.querySelector(".modal-edit");
const modalEditPreviewCell = modalEdit.querySelector(".modal-preview-cell");
const modalTextEditor = document.getElementById("modal-text-editor");
const modalShowText = document.getElementById("modal-show-text");
const modalImageUpload = document.getElementById("modalImageUpload");
const modalImageUploadContainer = document.getElementById(
  "modalImageUploadContainer",
);
const removeImageBtn = document.getElementById("removeImageBtn");
const saveModalBtn = document.getElementById("save-modal-btn");
const modalQscore = document.getElementById("modal-Qscore");
const previewImageToolbar = document.getElementById("previewImageToolbar");
const previewImgHeight = document.getElementById("previewImgHeight");
const previewImgHeightValue = document.getElementById("previewImgHeightValue");
const previewImgBrightness = document.getElementById("previewImgBrightness");
const previewImgContrast = document.getElementById("previewImgContrast");
const previewCropBtn = document.getElementById("previewCropBtn");

function updateTempItemFromTextEditor() {
  const temp = appState.modal.tempItem;
  if (!temp) return;

  const editor = modalTextEditor;
  const hasContent = editor.innerText.trim() !== "";

  if (hasContent) {
    if (!temp.text) {
      temp.text = { html: editor.innerHTML, align: "RIGHT" };
    } else {
      temp.text.html = editor.innerHTML;
    }
  } else {
    temp.text = null;
  }

  updateModalPreviewFromTemp();
}

function openModalForNewItem(rangeId, newItem) {
  appState.modal.rangeId = rangeId;
  appState.modal.itemId = null;
  appState.modal.tempItem = JSON.parse(JSON.stringify(newItem));
  openModalWithTempItem();
}

function openItemModal(rangeId, itemId) {
  const range = appState.ranges.find((r) => r.id === rangeId);
  const item = range?.items.find((it) => it.id === itemId);
  if (!item) return;

  appState.modal.rangeId = rangeId;
  appState.modal.itemId = itemId;
  appState.modal.tempItem = JSON.parse(JSON.stringify(item));
  openModalWithTempItem();
}

function openModalWithTempItem() {
  const temp = appState.modal.tempItem;
  if (!temp) return;

  setupModalEditorFromTemp(temp);
  updateModalPreviewFromTemp();
  updateModalImageUI();

  modalShowText.checked = temp.image ? temp.image.showText : false;

  openModalElement(modalEdit);
}

function setupModalEditorFromTemp(temp) {
  if (temp.text) {
    modalTextEditor.innerHTML = temp.text.html;
    modalTextEditor.style.textAlign = temp.text.align.toLowerCase();
  } else {
    modalTextEditor.innerHTML = "";
    modalTextEditor.style.textAlign = "right";
  }
}

function updateModalImageUI() {
  const hasImage = appState.modal.tempItem && appState.modal.tempItem.image;
  modalImageUploadContainer.classList.toggle("hidden", hasImage);
  previewImageToolbar.classList.toggle("hidden", !hasImage);

  if (hasImage) {
    syncImageToolbarWithCurrentImage();
  }
}

function syncImageToolbarWithCurrentImage() {
  const img = modalEditPreviewCell.querySelector("img");
  if (!img) return;
  const height =
    parseInt(img.style.height) || appState.modal.tempItem.image.height || 300;
  previewImgHeight.value = height;
  previewImgHeightValue.textContent = height + "px";

  const filter = img.style.filter || "";
  const brightnessMatch = filter.match(/brightness\((\d+)%\)/);
  const contrastMatch = filter.match(/contrast\((\d+)%\)/);
  previewImgBrightness.value = brightnessMatch
    ? parseInt(brightnessMatch[1])
    : 100;
  previewImgContrast.value = contrastMatch ? parseInt(contrastMatch[1]) : 100;
}

function updateModalPreviewFromTemp() {
  const temp = appState.modal.tempItem;
  if (!temp) return;

  const range = appState.ranges.find((r) => r.id === appState.modal.rangeId);
  if (!range) return;

  modalQscore.innerHTML = `
    ${toPersianDigits(1)}
    <span class="font-normal text-xs">
      ${+range.score > 0 ? `(${toPersianDigits(range.score)}نمره)` : ``}
    </span>
  `;

  modalEditPreviewCell.innerHTML = renderItemContent(temp, {
    rangeDesc: range.desc,
  });
  renderMathInContainer(modalEditPreviewCell);
}

function saveModalChanges() {
  const { rangeId, itemId } = appState.modal;

  updateTempItemFromTextEditor();

  const tempItem = appState.modal.tempItem;
  if (!rangeId || !tempItem) return;

  if (itemId === null) {
    addItemToRange(rangeId, tempItem);
    showToast("آیتم جدید اضافه شد.");
  } else {
    updateItemInState(rangeId, itemId, tempItem);
    const rangeDiv = document.getElementById(rangeId);
    if (rangeDiv) renderRangeItems(rangeDiv, rangeId);
    showToast("تغییرات ذخیره شد.");
  }

  closeEditModal();
}

function closeEditModal() {
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }

  appState.modal.rangeId = null;
  appState.modal.itemId = null;
  appState.modal.tempItem = null;

  closeModalElement(modalEdit);

  setTimeout(() => {
    modalTextEditor.innerHTML = "";
  }, 300);
}

modalTextEditor.addEventListener("focus", function () {
  if (appState.modal.tempItem && appState.modal.tempItem.image) {
    if (!modalShowText.checked) {
      modalShowText.checked = true;
      appState.modal.tempItem.image.showText = true;
      updateModalPreviewFromTemp();
    }
  }
});

modalShowText.addEventListener("change", function (e) {
  if (appState.modal.tempItem?.image) {
    appState.modal.tempItem.image.showText = e.target.checked;
    updateModalPreviewFromTemp();
  }
});

saveModalBtn.addEventListener("click", () => {
  showConfirm({
    msg: "آیا از ذخیره تغییرات اطمینان دارید؟",
    on_confirm: saveModalChanges,
  });
});

modalImageUpload.addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (file && appState.modal.tempItem) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      appState.modal.tempItem.image = {
        src: ev.target.result,
        height: IMAGE_DEFAULTS.height,
        align: IMAGE_DEFAULTS.align,
        showText: modalShowText.checked,
        imageId: createRandomId("img"),
      };
      updateModalPreviewFromTemp();
      updateModalImageUI();
    };
    reader.readAsDataURL(file);
  }
  e.target.value = "";
});

removeImageBtn.addEventListener("click", () => {
  if (appState.modal.tempItem) {
    appState.modal.tempItem.image = null;
    updateModalPreviewFromTemp();
    updateModalImageUI();
  }
});

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

// ========== AI Prompt Modal ==========
const modalAI = document.querySelector(".modal-ai");
const aiModalContent = modalAI.querySelector(".modal-content");
const aiPromptDisplay = document.getElementById("aiPromptDisplay");
const aiJsonInput = document.getElementById("aiJsonInput");
const copyAiPromptBtn = document.getElementById("copyAiPromptBtn");
const pasteAiJsonBtn = document.getElementById("pasteAiJsonBtn");
const aiItemsContainer = document.getElementById("aiItemsContainer");
const aiPreviewContainer = document.getElementById("aiPreviewContainer");
const aiEmptyPreviewMsg = document.getElementById("aiEmptyPreviewMsg");
const addAiItemsToRangeBtn = document.getElementById("addAiItemsToRangeBtn");
const aiTopicInput = document.getElementById("aiTopicInput");
const aiCountInput = document.getElementById("aiCountInput");

function openAIModal(rangeId, topic) {
  appState.aiModal.rangeId = rangeId;
  appState.aiModal.topic = topic;
  appState.aiModal.isOpen = true;

  const range = appState.ranges.find((r) => r.id === rangeId);
  aiTopicInput.value = topic;
  aiCountInput.value = range ? range.count : 3;

  updatePromptDisplay();

  aiJsonInput.value = "";
  aiItemsContainer.innerHTML = "";
  aiEmptyPreviewMsg.classList.add("hidden");

  openModalElement(modalAI);
}

function closeAIModal() {
  appState.aiModal.rangeId = null;
  appState.aiModal.topic = "";
  appState.aiModal.isOpen = false;

  closeModalElement(modalAI);
}

function generatePrompt() {
  const topic = aiTopicInput.value.trim();
  const count = aiCountInput.value;
  return getAIPrompt(topic, count);
}

function updatePromptDisplay() {
  aiPromptDisplay.textContent = generatePrompt();
}

aiTopicInput.addEventListener("input", updatePromptDisplay);
aiCountInput.addEventListener("input", updatePromptDisplay);

copyAiPromptBtn.addEventListener("click", () => {
  const topic = aiTopicInput.value.trim();
  const count = aiCountInput.value;

  if (!topic || !count) {
    showToast("لطفا توضیحات و تعداد سوال را وارد کنید.", "error");
    return;
  }
  copyToClipboard(aiPromptDisplay.textContent);
});

pasteAiJsonBtn.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    aiJsonInput.value = text;
    const raw = text.trim();
    if (!raw) {
      showToast("لطفاً داده ها را وارد کنید", "error");
      return;
    }

    processAIPasteData(raw);
  } catch (err) {
    showToast("خطا در چسباندن", "error");
  }
});

function processAIPasteData(raw) {
  try {
    const data = extractJSON(raw);

    aiItemsContainer.innerHTML = "";
    if (data.items.length === 0) {
      aiEmptyPreviewMsg.classList.remove("hidden");
      return;
    } else {
      aiEmptyPreviewMsg.classList.add("hidden");
      aiPreviewContainer.classList.remove("hidden");
    }

    renderAIPreviewItems(data.items);

    aiModalContent.scrollTo({
      top: aiPreviewContainer.offsetTop - aiModalContent.offsetTop,
      behavior: "smooth",
    });
  } catch (error) {
    showToast("داده نامعتبر است.", "error");
  }
}

function renderAIPreviewItems(items) {
  items.forEach((item, idx) => {
    if (!item.text || typeof item.text !== "string") return;

    const card = document.createElement("div");
    card.className =
      "border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow transition";

    const header = document.createElement("div");
    header.className =
      "text-xs text-gray-400 mb-2 border-b pb-1 flex items-center gap-1";
    header.innerHTML = `<i class="bi bi-card-text"></i> آیتم ${toPersianDigits(idx + 1)}`;
    card.appendChild(header);

    const textDiv = document.createElement("div");
    textDiv.className = "card-text text-gray-800";
    textDiv.textContent = normalizeMathSpaces(item.text);
    card.appendChild(textDiv);

    aiItemsContainer.appendChild(card);
  });

  renderMathInElement(aiItemsContainer, {
    delimiters: MATH_RENDER_DELIMITERS,
    throwOnError: false,
  });
}

addAiItemsToRangeBtn.addEventListener("click", () => {
  const rangeId = appState.aiModal.rangeId;
  if (!rangeId) {
    showToast("مشکلی پیش آمده، لطفاً دوباره تلاش کنید", "error");
    return;
  }

  const cards = aiItemsContainer.querySelectorAll(".card-text");
  if (cards.length === 0) {
    showToast("ابتدا پیش‌نمایش را بررسی کنید", "error");
    return;
  }

  try {
    const data = extractJSON(aiJsonInput.value.trim());
    if (!Array.isArray(data.items)) throw new Error("items آرایه نیست");

    data.items.forEach((item) => {
      if (item.text) {
        const newItem = createTextItem(item.text, "RIGHT");
        addItemToRange(rangeId, newItem);
      }
    });

    showToast(`${data.items.length} آیتم به مبحث اضافه شد`);
    closeAIModal();
  } catch (err) {
    showToast("خطا در افزودن آیتم‌ها: " + err.message, "error");
  }
});

// ========== Drag & Drop ==========
let draggedElement = null;
const dragPlaceholder = document.createElement("div");
dragPlaceholder.className =
  "placeholder  h-20 border-2 border-dashed border-[var(--primary)] rounded-[var(--radius)]";
let isTouchDevice = false;

function handleDragStart(e) {
  if (isMobile()) {
    e.preventDefault();
    return;
  }
  if (!e.target.classList.contains("range-item")) return;
  draggedElement = e.target;
  draggedElement.classList.add("opacity-50");
  setTimeout(() => draggedElement.classList.add("hidden"), 0);
}

function handleDragOver(e) {
  if (isMobile()) {
    e.preventDefault();
    return;
  }
  if (isTouchDevice || !draggedElement) return;
  e.preventDefault();
  handleDragMove(e.clientY);
}

function handleDrop(e) {
  if (isMobile()) {
    e.preventDefault();
    return;
  }
  e.preventDefault();

  const oldRects = captureCurrentRects();
  if (dragPlaceholder.parentNode) {
    rangesContainer.insertBefore(draggedElement, dragPlaceholder);
    dragPlaceholder.remove();
    reorderRangesAfterDrag(oldRects);
  }
  dragCleanup();
}

function handleTouchStartDrag(e) {
  if (isMobile()) return;
  const target = e.target.closest(".range-item");
  if (!target) return;
  isTouchDevice = true;
  draggedElement = target;
  draggedElement.classList.add("opacity-50");
}

function handleTouchMoveDrag(e) {
  if (isMobile()) return;
  if (!draggedElement) return;
  handleDragMove(e.touches[0].clientY);
}

function handleTouchEndDrag() {
  if (isMobile()) return;
  const oldRects = captureCurrentRects();
  if (dragPlaceholder.parentNode) {
    rangesContainer.insertBefore(draggedElement, dragPlaceholder);
    dragPlaceholder.remove();
    reorderRangesAfterDrag(oldRects);
  }
  dragCleanup();
}

function handleDragMove(pointerY) {
  const items = [
    ...rangesContainer.querySelectorAll(".range-item:not(.opacity-50)"),
  ];
  for (const item of items) {
    const rect = item.getBoundingClientRect();
    if (pointerY < rect.top + rect.height / 2) {
      item.before(dragPlaceholder);
      return;
    }
  }
  rangesContainer.appendChild(dragPlaceholder);
}

function captureCurrentRects() {
  const items = [...rangesContainer.querySelectorAll(".range-item")];
  return items.map((el) => ({ el, rect: el.getBoundingClientRect() }));
}

function reorderRangesAfterDrag(oldRects) {
  const newItems = [...rangesContainer.querySelectorAll(".range-item")];
  newItems.forEach((el) => {
    const old = oldRects.find((item) => item.el === el);
    if (old) {
      const newRect = el.getBoundingClientRect();
      const dx = old.rect.left - newRect.left;
      const dy = old.rect.top - newRect.top;
      if (dx || dy) {
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        el.style.transition = "none";
        requestAnimationFrame(() => {
          el.style.transform = "";
          el.style.transition = "transform 0.3s ease";
        });
      }
    }
  });

  const newOrder = newItems.map((el) => el.id);
  reorderRangesInState(newOrder);
}

function dragCleanup() {
  if (!draggedElement) return;
  draggedElement.classList.remove("opacity-50", "hidden");
  dragPlaceholder.remove();
  draggedElement = null;
  isTouchDevice = false;
  document.querySelectorAll(".range-item").forEach((el) => {
    el.style.transform = "";
    el.style.transition = "";
  });
}

rangesContainer.addEventListener("dragstart", handleDragStart);
rangesContainer.addEventListener("dragend", dragCleanup);
rangesContainer.addEventListener("dragover", handleDragOver);
rangesContainer.addEventListener("drop", handleDrop);
rangesContainer.addEventListener("touchstart", handleTouchStartDrag, {
  passive: true,
});
rangesContainer.addEventListener("touchmove", handleTouchMoveDrag, {
  passive: false,
});
rangesContainer.addEventListener("touchend", handleTouchEndDrag);

// ========== Import/Export ==========
function buildItemsFromRangeData(rangeData) {
  if (rangeData.items) {
    return rangeData.items.map((it) => ({
      id: it.id || createRandomId("item"),
      text: it.text ? { ...it.text } : null,
      image: it.image
        ? {
            ...it.image,
            imageId: it.image.imageId || createRandomId("img"),
          }
        : null,
    }));
  } else if (rangeData.images) {
    return rangeData.images.map((img) => ({
      id: createRandomId("item"),
      text: null,
      image: {
        src: img.src,
        height: img.height || IMAGE_DEFAULTS.height,
        align: img.align || IMAGE_DEFAULTS.align,
        showText: img.showCaption !== false,
        imageId: img.imageId || createRandomId("img"),
      },
    }));
  }
  return [];
}

function importRangesFromData(data) {
  appState.ranges = [];
  appState.names = data.names || [];
  appState.namesCount = data.namesCount || 1;

  (data.ranges || []).forEach((r) => {
    const items = buildItemsFromRangeData(r);
    const rangeWithId = {
      id: createRandomId("range-item"),
      rangeName: r.rangeName || "",
      count: r.count || 1,
      score: r.score || 1,
      desc: r.desc || "",
      items,
      itemsCollapsed: false,
    };
    appState.ranges.push(rangeWithId);
  });
}

function processImportedFile(fileContent) {
  try {
    const data = JSON.parse(fileContent);
    importRangesFromData(data);

    rangesContainer.innerHTML = "";
    appState.ranges.forEach((r, index) => {
      setTimeout(() => {
        const el = createRangeElement(r);
        el.classList.add("range-item-enter");
        rangesContainer.appendChild(el);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            el.classList.remove("range-item-enter");
          });
        });
      }, index * 100);
    });

    renderNamesSection();
  } catch (err) {
    console.error("Invalid JSON file:", err);
    showToast("فایل JSON نامعتبر است!", "error");
  }
}

function handleExportJson() {
  const exportData = {
    names: appState.names,
    namesCount: appState.namesCount,
    ranges: appState.ranges.map((r) => ({
      rangeName: r.rangeName,
      count: r.count,
      score: r.score,
      desc: r.desc,
      items: r.items,
    })),
  };
  const blob = new Blob([JSON.stringify(exportData)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "data.json";
  a.click();
}

document.getElementById("exportJson").onclick = handleExportJson;

handleFileUpload({
  target: document.getElementById("importJson"),
  onChange: processImportedFile,
  readAs: "Text",
});

// ========== UI Helpers (Sticky, To Top) ==========
const moveToTopBtn = document.getElementById("toTop");
const sticky = document.getElementById("sticky");
const sentinel = document.getElementById("sentinel");

const observer = new IntersectionObserver(
  ([entry]) => {
    const isActive = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    sticky.classList[isActive ? "add" : "remove"]("is-sticky");
  },
  { root: null, threshold: 0 },
);
observer.observe(sentinel);

function updateToTopPosition() {
  const bottomBar = document.getElementById("mobile-bottom-bar");
  if (bottomBar) {
    const barHeight = bottomBar.offsetHeight;
    moveToTopBtn.style.bottom = barHeight + 16 + "px";
  }
}

window.addEventListener("scroll", () => {
  setElementState({
    target: moveToTopBtn,
    stateClasses: {
      on: ["opacity-100", "visible", "translate-y-0"],
      off: ["opacity-0", "invisible", "translate-y-6"],
    },
    isActive: window.scrollY > 300,
  });
});

moveToTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ========== Rich Text Editor Initialization ==========
function initRichTextEditor() {
  const toolbar = document.getElementById("modal-toolbar");
  if (!toolbar) return;

  setupToolbarCommands(toolbar);
  setupColorPicker(toolbar);
  setupFontSizeSelector(toolbar);
  setupUndoRedo(toolbar);
  setupToolbarState(toolbar);

  modalTextEditor.addEventListener("input", updateTempItemFromTextEditor);
  modalTextEditor.addEventListener("blur", updateTempItemFromTextEditor);
}

function setupToolbarCommands(toolbar) {
  const commandButtons = toolbar.querySelectorAll("[data-command]");
  commandButtons.forEach((btn) => {
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      document.execCommand(btn.dataset.command, false, null);
      modalTextEditor.focus();
      updateTempItemFromTextEditor();
    });
  });
}

function setupColorPicker(toolbar) {
  const colorInput = toolbar.querySelector("#modal-text-color");
  if (!colorInput) return;

  colorInput.addEventListener("input", (e) => {
    document.execCommand("foreColor", false, e.target.value);
    modalTextEditor.focus();
    updateTempItemFromTextEditor();
  });
}

function setupFontSizeSelector(toolbar) {
  const fontSizeSelect = toolbar.querySelector("#modal-font-size");
  if (!fontSizeSelect) return;

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
      console.warn("Font size change error:", err);
    }
    modalTextEditor.focus();
    updateTempItemFromTextEditor();
  });
}

function setupUndoRedo(toolbar) {
  const undoBtns = toolbar.querySelectorAll('[data-action="undo"]');
  const redoBtns = toolbar.querySelectorAll('[data-action="redo"]');

  undoBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      document.execCommand("undo");
      updateTempItemFromTextEditor();
    });
  });

  redoBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      document.execCommand("redo");
      updateTempItemFromTextEditor();
    });
  });
}

function setupToolbarState(toolbar) {
  const updateState = () => {
    toolbar.querySelectorAll("[data-command]").forEach((btn) => {
      try {
        const active = document.queryCommandState(btn.dataset.command);
        btn.classList.toggle("active", active);
      } catch (err) {}
    });
  };

  modalTextEditor.addEventListener("mouseup", updateState);
  modalTextEditor.addEventListener("keyup", updateState);
}

// ========== Preview Image Toolbar ==========
let selectedPreviewImage = null;
let cropper = null;

function initPreviewImageToolbar() {
  setupHeightSlider();
  setupBrightnessContrast();
  setupAlignmentButtons();
  setupCropButton();
}

function setupHeightSlider() {
  previewImgHeight.addEventListener("input", (e) => {
    const img = modalEditPreviewCell.querySelector("img");
    if (!img) return;
    const val = e.target.value;
    img.style.height = val + "px";
    img.style.maxHeight = val + "px";
    img.style.width = "auto";
    previewImgHeightValue.textContent = val + "px";
    if (appState.modal.tempItem?.image) {
      appState.modal.tempItem.image.height = parseInt(val);
    }
  });
}

function setupBrightnessContrast() {
  function applyPreviewImageFilters() {
    const img = modalEditPreviewCell.querySelector("img");
    if (!img) return;
    const b = previewImgBrightness.value;
    const c = previewImgContrast.value;
    img.style.filter = `brightness(${b}%) contrast(${c}%)`;
  }
  previewImgBrightness.addEventListener("input", applyPreviewImageFilters);
  previewImgContrast.addEventListener("input", applyPreviewImageFilters);
}

function setupAlignmentButtons() {
  document.querySelectorAll("[data-align]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const img = modalEditPreviewCell.querySelector("img");
      if (!img) return;
      const align = e.currentTarget.dataset.align;
      img.classList.remove("ml-auto", "mr-auto", "mx-auto");
      if (align === "left") {
        img.classList.add("mr-auto");
      } else if (align === "center") {
        img.classList.add("mx-auto");
      } else if (align === "right") {
        img.classList.add("ml-auto");
      }
      if (appState.modal.tempItem?.image && align) {
        appState.modal.tempItem.image.align = align.toUpperCase();
      }
    });
  });
}

function setupCropButton() {
  previewCropBtn.addEventListener("click", () => {
    const img = modalEditPreviewCell.querySelector("img");
    if (!img) return;
    selectedPreviewImage = img;
    document.getElementById("cropImage").src = img.src;
    document.getElementById("cropModal").classList.add("visible");
    document.getElementById("cropImage").onload = () => {
      if (cropper) cropper.destroy();
      cropper = new Cropper(document.getElementById("cropImage"), {
        aspectRatio: NaN,
        viewMode: 1,
        background: false,
        autoCropArea: 1,
      });
    };
  });
}

// ========== Initialization ==========
document.addEventListener("DOMContentLoaded", function () {
  document.body.style.fontFamily = appState.font;

  namesUI = createNamesUI();
  placeNamesUI();

  initRichTextEditor();
  initPreviewImageToolbar();

  setupModal(modalEdit);
  setupModal(modalAI);

  document.getElementById("applyCrop").addEventListener("click", function () {
    if (!cropper || !selectedPreviewImage) return;
    const canvas = cropper.getCroppedCanvas();
    if (canvas) {
      selectedPreviewImage.src = canvas.toDataURL("image/png");
      selectedPreviewImage.style.filter = "none";
      previewImgBrightness.value = 100;
      previewImgContrast.value = 100;
      if (appState.modal.tempItem?.image) {
        appState.modal.tempItem.image.src = selectedPreviewImage.src;
      }
    }
    document.getElementById("cropModal").classList.remove("visible");
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
  });

  document.getElementById("cancelCrop").addEventListener("click", function () {
    document.getElementById("cropModal").classList.remove("visible");
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
  });

  window.addEventListener("resize", () => {
    const isNowMobile = window.innerWidth <= 768;
    document.querySelectorAll(".range-item").forEach((el) => {
      el.draggable = !isNowMobile;
    });

    placeNamesUI();
    adjustMobilePadding();
    updateToTopPosition();
  });
});

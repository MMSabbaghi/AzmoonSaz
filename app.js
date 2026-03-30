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

function pickRandomItemsUniqueLabels(items, count) {
  if (!Array.isArray(items) || items.length === 0 || count <= 0) return [];

  const labeled = items.filter((it) => !!it.labelId);
  const unlabeled = items.filter((it) => !it.labelId);

  const byLabel = new Map();
  labeled.forEach((it) => {
    if (!byLabel.has(it.labelId)) byLabel.set(it.labelId, []);
    byLabel.get(it.labelId).push(it);
  });

  const distinctLabelsCount = byLabel.size;

  const maxPossible = distinctLabelsCount + unlabeled.length;
  if (count > maxPossible) return null;

  const result = [];

  const labelIds = fisherYatesShuffle([...byLabel.keys()]);
  for (const lid of labelIds) {
    if (result.length >= count) break;
    const group = byLabel.get(lid);
    const pick = pickRandomItems(group, 1)[0];
    if (pick) result.push(pick);
  }

  if (result.length < count) {
    const remaining = count - result.length;
    const extra = pickRandomItems(unlabeled, remaining);
    result.push(...extra);
  }

  return result;
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

function handleSwitchElement({
  container,
  onChange,
  activeBgColor = "bg-primary",
  initialState = false,
}) {
  const sw = container.querySelector(".switch");
  const knob = container.querySelector(".knob");

  let isActive = initialState;

  function setState(state) {
    const method = state ? "add" : "remove";
    sw.classList[method](activeBgColor);
    knob.classList[method]("translate-x-4", "scale-105");
    isActive = state;
    onChange(isActive);
  }

  setState(isActive);

  sw.addEventListener("click", () => {
    setState(!isActive);
  });

  return {
    container,
    on: () => setState(true),
    off: () => setState(false),
    isActive: () => isActive,
  };
}

function handleFileUpload({ target, onChange, readAs = "DataURL" }) {
  target.addEventListener("change", (e) => {
    Array.from(e.target.files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => onChange(ev.target.result);
      reader[`readAs${readAs}`](file);
    });
    e.target.value = "";
  });
}

function exportDataObject(data, filename) {
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function debounce(fn, delay) {
  let timerId;
  return function (...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * ساخت پروکسی عمیق با ارسال مسیر دقیق تغییر
 * @param {object|array} target آبجکت مورد نظر
 * @param {Array<function>} callbacks آرایه کال‌بک
 * @param {Array<string|number>} path آرایه مسیر فعلی (برای ردیابی)
 * @param {WeakMap} proxies کش پروکسی‌ها
 * @returns پروکسی
 */
function createDeepProxy(
  target,
  callbacks,
  path = [],
  proxies = new WeakMap(),
) {
  if (typeof target !== "object" || target === null) {
    return target;
  }

  if (proxies.has(target)) {
    return proxies.get(target);
  }

  const handler = {
    get(obj, prop) {
      const value = obj[prop];

      if (
        Array.isArray(obj) &&
        [
          "push",
          "pop",
          "shift",
          "unshift",
          "splice",
          "sort",
          "reverse",
        ].includes(prop)
      ) {
        return function (...args) {
          const result = Array.prototype[prop].apply(obj, args);
          const pathStr = path.join(".");
          callbacks.forEach((cb) => {
            if (!cb) return;
            cb(pathStr);
          });
          return result;
        };
      }

      if (value && typeof value === "object") {
        return createDeepProxy(value, callbacks, path.concat(prop), proxies);
      }

      return value;
    },

    set(obj, prop, newValue) {
      const oldValue = obj[prop];
      if (oldValue === newValue) return true;
      obj[prop] = newValue;
      const pathStr = path.concat(prop).join(".");
      callbacks.forEach((cb) => {
        if (!cb) return;
        cb(pathStr);
      });
      return true;
    },

    deleteProperty(obj, prop) {
      const pathStr = path.concat(prop).join(".");
      delete obj[prop];
      callbacks.forEach((cb) => {
        if (!cb) return;
        cb(pathStr);
      });
      return true;
    },
  };

  const proxy = new Proxy(target, handler);
  proxies.set(target, proxy);
  return proxy;
}

async function pasteToTextarea(textareaId) {
  try {
    const text = await navigator.clipboard.readText();
    const textarea = document.getElementById(textareaId);
    if (textarea) {
      textarea.value = text;
      showToast("متن با موفقیت چسبانده شد");
    } else {
      showToast("عنصر مورد نظر یافت نشد", "error");
    }
  } catch (err) {
    console.error("خطا در خواندن کلیپ‌بورد:", err);
    showToast("خطا در خواندن کلیپ‌بورد", "error");
  }
}

function addItemsFromJSONToRange(rangeId, jsonString) {
  try {
    const range = findRangeById(rangeId);
    if (!range) return;
    ensureRangeLabels(range);

    const parsed = JSON.parse(jsonString);

    // New format
    if (
      parsed &&
      parsed.type === "quizapp-items-v1" &&
      Array.isArray(parsed.items)
    ) {
      const incomingLabels = Array.isArray(parsed.labels) ? parsed.labels : [];
      mergeLabelsIntoRange(range, incomingLabels);

      const itemsToAdd = parsed.items.map((item) => createItemFromData(item));
      itemsToAdd.forEach((it) => {
        normalizeItemLabelForRange(range, it);
        addItemToRange(rangeId, it);
      });

      showToast(
        `${toPersianDigits(itemsToAdd.length)} آیتم با موفقیت اضافه شد.`,
      );
      return;
    }

    // Old format: array of items only
    if (Array.isArray(parsed)) {
      const itemsToAdd = parsed.map((item) => createItemFromData(item));
      itemsToAdd.forEach((it) => {
        // چون لیبل‌ها همراهش نیامده، اگر labelId ناشناخته باشد حذف می‌کنیم
        normalizeItemLabelForRange(range, it);
        addItemToRange(rangeId, it);
      });
      showToast(
        `${toPersianDigits(itemsToAdd.length)} آیتم با موفقیت اضافه شد.`,
      );
      return;
    }

    throw new Error("Unsupported clipboard payload");
  } catch (err) {
    console.error("Invalid JSON:", err);
  }
}

function createItemFromData(dataItem) {
  return {
    id: createRandomId("item"),
    text: dataItem.text ? { ...dataItem.text } : null,
    image: dataItem.image
      ? { ...dataItem.image, imageId: createRandomId("img") }
      : null,
    showText: dataItem.showText !== false,
    labelId: dataItem.labelId || null,
  };
}

async function tryPasteJSONToRange(rangeId) {
  try {
    const text = await navigator.clipboard.readText();
    addItemsFromJSONToRange(rangeId, text);
  } catch (err) {
    console.error("Failed to read clipboard text:", err);
  }
}

async function getImageFromClipboard() {
  try {
    const clipboardItems = await navigator.clipboard.read();
    const clipboardItem = clipboardItems[0];

    let imageType = clipboardItem.types.find((type) =>
      type.startsWith("image/"),
    );
    if (imageType) {
      const blob = await clipboardItem.getType(imageType);
      return URL.createObjectURL(blob);
    }

    const htmlType = clipboardItem.types.find((type) => type === "text/html");
    if (htmlType) {
      const htmlBlob = await clipboardItem.getType(htmlType);
      const htmlText = await htmlBlob.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, "text/html");
      const img = doc.querySelector("img");
      if (img) {
        let src = img.src;
        if (!src.startsWith("data:")) {
          const response = await fetch(src);
          const blob = await response.blob();
          return URL.createObjectURL(blob);
        } else {
          return src;
        }
      }
    }

    return null;
  } catch (err) {
    console.error("clipboard error:", err);
    return null;
  }
}

function getPrintArea() {
  return document.getElementById("printable");
}

function calculateTotalScore() {
  return appState.ranges.reduce((acc, { count, score, items }) => {
    const isValidScore = score && count && items.length > 0;
    return isValidScore ? acc + +score : acc;
  }, 0);
}

function sanitizeText(str = "") {
  return String(str).replace(/[<>]/g, "");
}

function ensureRangeLabels(range) {
  if (!range) return;
  if (!Array.isArray(range.labels)) range.labels = [];
}

function findLabelById(range, labelId) {
  if (!range || !labelId) return null;
  ensureRangeLabels(range);
  return range.labels.find((l) => l.id === labelId) || null;
}

function getItemLabelName(range, item) {
  if (!item?.labelId) return null;
  const lbl = findLabelById(range, item.labelId);
  return lbl?.name || null;
}

function createRangeLabel(range, name) {
  ensureRangeLabels(range);
  const newLabel = {
    id: createRandomId("lbl"),
    name: (name || "برچسب جدید").trim() || "برچسب جدید",
  };
  range.labels.unshift(newLabel);
  return newLabel;
}

function mergeLabelsIntoRange(range, labelsToMerge = []) {
  ensureRangeLabels(range);
  const byId = new Map(range.labels.map((l) => [l.id, l]));
  labelsToMerge.forEach((l) => {
    if (!l?.id) return;
    if (!byId.has(l.id)) {
      range.labels.push({ id: l.id, name: l.name || "بدون نام" });
      byId.set(l.id, l);
    }
  });
}

function normalizeItemLabelForRange(range, item, labelIdRemap = null) {
  ensureRangeLabels(range);
  if (!item?.labelId) return;

  const exists = !!findLabelById(range, item.labelId);
  if (exists) return;

  if (labelIdRemap && labelIdRemap[item.labelId]) {
    item.labelId = labelIdRemap[item.labelId];
    return;
  }

  item.labelId = null;
}

function buildClipboardPayloadForItems(rangeId, items) {
  const range = findRangeById(rangeId);
  ensureRangeLabels(range);

  const usedLabelIds = new Set(items.map((it) => it.labelId).filter(Boolean));
  const labels = range.labels.filter((l) => usedLabelIds.has(l.id));

  return {
    type: "quizapp-items-v1",
    labels,
    items,
  };
}

function normalizeLabelName(name) {
  return (name || "").trim().replace(/\s+/g, " ");
}

function isDuplicateLabelName(range, name, exceptId = null) {
  ensureRangeLabels(range);
  const n = normalizeLabelName(name).toLocaleLowerCase();
  return range.labels.some(
    (l) =>
      l.id !== exceptId && normalizeLabelName(l.name).toLocaleLowerCase() === n,
  );
}

function setLabelButtonUI(buttonEl, range, labelId) {
  const name = labelId ? findLabelById(range, labelId)?.name : null;
  const textEl = buttonEl.querySelector("span");
  const iconEl = buttonEl.querySelector("i.bi");
  if (textEl) textEl.textContent = name ? sanitizeText(name) : "افزودن برچسب";
  if (iconEl) {
    iconEl.classList.toggle("bi-tag", !!name);
    iconEl.classList.toggle("bi-plus-lg", !name);
  }
}

// ========== Proxy ==========
const _autoSaveProxy = debounce(() => {
  saveStateToDB(appState).catch((err) => console.warn("Auto-save error:", err));
}, 2000);

const _totalScoreProxy = (pathStr) => {
  if (pathStr.startsWith("ranges")) updateRangesTotalScoreUI();
};

// ========== Global State Management ==========
const rawState = {
  ranges: [],
  names: [],
  namesCount: 1,
  font: "'BNazanin', sans-serif",
  modal: {
    isOpen: false,
    rangeId: null,
    itemId: null,
    tempItem: null,
  },
};

let appState = createDeepProxy(rawState, [_autoSaveProxy, _totalScoreProxy]);

const ITEM_DEFAULTS = {
  text: { html: "", align: "RIGHT" },
  image: { height: 75, align: "RIGHT" },
  showText: true,
};
// ---------- State helpers ----------

function findRangeById(id) {
  return appState.ranges.find((r) => r.id === id);
}

function updateRangeInState(rangeId, updates) {
  const index = appState.ranges.findIndex((r) => r.id === rangeId);
  if (index !== -1) {
    appState.ranges[index] = { ...appState.ranges[index], ...updates };
  }
}

function updateItemInState(rangeId, itemId, updates) {
  const range = findRangeById(rangeId);
  if (!range) return;
  const itemIndex = range.items.findIndex((it) => it.id === itemId);
  if (itemIndex !== -1) {
    range.items[itemIndex] = { ...range.items[itemIndex], ...updates };
  }
}

function removeItemFromState(rangeId, itemId) {
  const range = findRangeById(rangeId);
  if (range) {
    range.items = range.items.filter((it) => it.id !== itemId);
  }
}

function reorderRangesInState(newOrderIds) {
  appState.ranges = newOrderIds.map((id) => findRangeById(id)).filter(Boolean);
}

// ========== Item Creation ==========
function createTextItem(
  html = ITEM_DEFAULTS.text.html,
  align = ITEM_DEFAULTS.text.align,
  showText = ITEM_DEFAULTS.showText,
) {
  return {
    id: createRandomId("item"),
    text: { html, align },
    image: null,
    showText,
    labelId: null,
  };
}

function createImageItem({
  src,
  imageId = createRandomId("img"),
  height = ITEM_DEFAULTS.image.height,
  align = ITEM_DEFAULTS.image.align,
  showText = ITEM_DEFAULTS.showText,
}) {
  return {
    id: createRandomId("item"),
    text: null,
    image: { src, height, align, imageId },
    showText,
    labelId: null,
  };
}

// ========== Animation Helpers ==========
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

function renderRangesWithAnimation() {
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
}

// ========== Item Rendering ==========
function renderItemContent(item, options = {}) {
  const { rangeDesc = "", imageClass = "", textClass = "" } = options;
  let html = "";

  const { showText, text } = item;
  let textPrefix = showText && rangeDesc ? rangeDesc : "";
  let textContent = textPrefix + (text?.html || "");
  const textPos = item.image?.float ? "position: absolute;" : "";
  textContent = String(textContent);
  if (textContent && textContent.trim() !== "") {
    const align = item.text ? item.text.align.toLowerCase() : "right";
    html += `<div class="${textClass}" style="${textPos} text-align: ${align};">${textContent}</div>`;
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
  const range = findRangeById(rangeId);
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

  preview.querySelectorAll(".item-thumbnail").forEach((thumb) => {
    renderMathInContainer(thumb);
  });

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

function updateThumbnailLabelUI(rangeId, itemId) {
  const rangeDiv = document.getElementById(rangeId);
  if (!rangeDiv) return;
  const thumb = rangeDiv.querySelector(
    `.item-thumbnail[data-item-id="${itemId}"]`,
  );
  if (!thumb) return;
  const btn = thumb.querySelector(`[data-action="open-item-label"]`);
  if (!btn) return;

  const range = findRangeById(rangeId);
  const item = range?.items.find((it) => it.id === itemId);
  if (!range || !item) return;

  setLabelButtonUI(btn, range, item.labelId);
}

function updateAllThumbnailsForLabel(rangeId, labelId) {
  const range = findRangeById(rangeId);
  const rangeDiv = document.getElementById(rangeId);
  if (!range || !rangeDiv) return;

  range.items.forEach((it) => {
    if (it.labelId === labelId) updateThumbnailLabelUI(rangeId, it.id);
  });
}

function createItemThumbnailElement(item, rangeDiv, rangeId) {
  const container = document.createElement("div");
  container.className =
    "item-thumbnail  h-[100px] text-xs overflow-hidden max-md:p-[8px] relative border border-[#ddd] rounded-[6px] p-1 bg-white transition-all duration-200 cursor-pointer hover:border-[#333] hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)]";
  container.dataset.itemId = item.id;

  const range = findRangeById(rangeId);
  const rangeDesc = range ? range.desc : "";

  const labelName = range ? getItemLabelName(range, item) : null;
  const labelBtnText = labelName ? sanitizeText(labelName) : "افزودن برچسب";
  const labelBtnIcon = labelName ? "bi-tag" : "bi-plus-lg";

  container.innerHTML = `
    <button
    class="z-[10] absolute top-1 left-1 max-w-[80%] inline-flex items-center gap-1 px-2 py-1
           rounded-full bg-surface-dark text-secondary border border-border-light
           text-[11px] hover:bg-surface-darker transition"
    data-action="open-item-label"
    data-range-id="${rangeId}"
    data-item-id="${item.id}"
    title="برچسب">
    <i class="bi ${labelBtnIcon}"></i>
    <span class="truncate">${labelBtnText}</span>
    <i class="bi bi-chevron-down"></i>
  </button>
  
  ${renderItemContent(item, { rangeDesc })}
  <div class="w-full flex absolute bottom-0 right-0">
  <button title="حذف" class="remove-item w-full bg-error py-1 text-white flex items-center justify-center text-[0.8rem] opacity-70 transition-opacity duration-200 border-0 cursor-pointer hover:opacity-100  max-md:py-0 max-md:h-6 max-md:text-base"><i class="bi bi-trash3"></i></button>
  <button title="ویرایش" class="edit-item w-full bg-primary py-1 text-white flex items-center justify-center text-[0.8rem] opacity-70 transition-opacity duration-200 border-0 cursor-pointer hover:opacity-100 max-md:py-0 max-md:h-6 max-md:text-base"> <i class="bi bi-pencil-square"></i> </button>
  <button title="کپی" class="copy-item w-full bg-secondary py-1 text-white flex items-center justify-center text-[0.8rem] opacity-70 transition-opacity duration-200 border-0 cursor-pointer hover:opacity-100 max-md:py-0 max-md:h-6 max-md:text-base"> <i class="bi bi-copy"></i></button>
  </div>
  `;

  const removeBtn = container.querySelector(".remove-item");
  const copyItemBtn = container.querySelector(".copy-item");
  const editItemBtn = container.querySelector(".edit-item");

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

  copyItemBtn.onclick = (e) => {
    e.stopPropagation();
    const payload = buildClipboardPayloadForItems(rangeId, [item]);
    copyToClipboard(JSON.stringify(payload));
  };

  editItemBtn.addEventListener("click", (e) => openItemModal(rangeId, item.id));

  return container;
}

function updateRangeItemCountBadge(rangeDiv) {
  const itemsCount = rangeDiv.querySelector(".items-preview").children.length;
  rangeDiv.querySelector(".range-total").textContent =
    toPersianDigits(itemsCount);
}

// ========== Lable DropDown ==========

const labelsDropdown = new Dropdown({
  rootId: "dropdownRoot",
  closeOnEsc: false,
  closeOnOutsideClick: false,
  closeOnBackdrop: false,
  animDuration: 140,
});

function openLabelDropdown({
  rangeId,
  getActiveLabelId,
  setActiveLabelId,
  anchorEl,
  onAfterChange = () => {},
}) {
  const range = findRangeById(rangeId);
  if (!range) return;
  ensureRangeLabels(range);

  const render = () => {
    const activeId = getActiveLabelId();

    const addandclearRow = `
    <div class="flex items-center gap-1">
      <button class="btn btn-outline w-full text-right rounded-[12px] px-2.5 py-2.5 flex items-center gap-2"
              data-action="add-label">
        <i class="bi bi-plus-lg"></i>
        <span class="text-[13px] font-bold">افزودن برچسب</span>
      </button>
    <button class="btn btn-outline btn-dashed w-full text-right rounded-[12px] px-2.5 py-2.5 flex items-center gap-2"
            data-action="clear-label">
      <i class="bi bi-x-lg"></i>
      <span class="text-[13px] font-bold">بدون برچسب</span>
    </button>
    </div>
    `;

    const rows = range.labels
      .map((l) => {
        const isActive = l.id === activeId;
        return `
        <div class="w-full rounded-[12px] px-2.5 py-2.5 flex items-center justify-between gap-2
                    hover:bg-surface-dark border border-transparent hover:border-border-light"
             data-row-label-id="${l.id}">
          <button class="flex-1 text-right inline-flex items-center gap-2"
                  style="background:transparent;border:none;padding:0;"
                  data-action="set-label"
                  data-label-id="${l.id}">
            <span class="text-[13px] font-bold truncate" data-role="label-name">${sanitizeText(l.name)}</span>
          </button>

          <div class="inline-flex items-center gap-2">
            ${isActive ? `<i class="bi bi-check2 text-success text-lg"></i>` : `<span class="w-[18px]"></span>`}

            <button class="w-9 h-9 rounded-[12px] border border-border-light bg-surface hover:bg-surface-darker"
                    data-action="rename-label" data-label-id="${l.id}" title="تغییر نام">
              <i class="bi bi-pen"></i>
            </button>

            <button class="w-9 h-9 rounded-[12px] border border-border-light bg-surface hover:bg-surface-darker"
                    data-action="delete-label" data-label-id="${l.id}" title="حذف برچسب">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </div>
      `;
      })
      .join("");

    return addandclearRow + rows;
  };

  labelsDropdown.open({
    anchorEl,
    title: "برچسب‌ها",
    render,
    onMount: ({ body }) => {
      body.addEventListener("click", (e) => {
        const t = e.target;

        const setBtn = t.closest("[data-action='set-label']");
        if (setBtn) {
          const lid = setBtn.dataset.labelId;
          setActiveLabelId(lid);
          onAfterChange();
          labelsDropdown.close?.();
          return;
        }

        const clearBtn = t.closest("[data-action='clear-label']");
        if (clearBtn) {
          setActiveLabelId(null);
          onAfterChange();
          labelsDropdown.close?.();
          return;
        }

        const addBtn = t.closest("[data-action='add-label']");
        if (addBtn) {
          let base = "برچسب جدید";
          let name = base;
          let i = 1;
          while (isDuplicateLabelName(range, name)) name = `${base} ${++i}`;

          const newLbl = createRangeLabel(range, name);

          body.innerHTML = render();
          requestAnimationFrame(() => {
            const pen = body.querySelector(
              `[data-action="rename-label"][data-label-id="${newLbl.id}"]`,
            );
            if (pen) pen.click();
          });
          return;
        }

        const deleteBtn = t.closest("[data-action='delete-label']");
        if (deleteBtn) {
          const lid = deleteBtn.dataset.labelId;
          const lbl = findLabelById(range, lid);
          if (!lbl) return;

          showConfirm({
            msg: `برچسب «${sanitizeText(lbl.name)}» حذف شود؟ (از آیتم‌ها هم پاک می‌شود)`,
            on_confirm: () => {
              range.labels = range.labels.filter((l) => l.id !== lid);
              range.items.forEach((it) => {
                if (it.labelId === lid) it.labelId = null;
              });

              body.innerHTML = render();
              range.items.forEach((it) => {
                if (it.labelId === null) updateThumbnailLabelUI(rangeId, it.id);
              });
            },
          });
          return;
        }

        const renameBtn = t.closest("[data-action='rename-label']");
        if (renameBtn) {
          const lid = renameBtn.dataset.labelId;
          const lbl = findLabelById(range, lid);
          if (!lbl) return;

          const row = body.querySelector(`[data-row-label-id="${lid}"]`);
          if (!row) return;
          if (row.querySelector("input[data-role='rename-input']")) return;

          const nameEl = row.querySelector("[data-role='label-name']");
          if (!nameEl) return;

          const setButton = row.querySelector("[data-action='set-label']");
          if (!setButton) return;

          const container = document.createElement("div");
          container.className = "flex-1";

          const input = document.createElement("input");
          input.setAttribute("data-role", "rename-input");
          input.className =
            "w-full border border-border rounded-custom px-2 py-1 bg-surface";
          input.value = lbl.name || "";
          input.dir = "rtl";

          container.appendChild(input);
          setButton.replaceWith(container);

          input.focus();
          input.select();

          const commit = () => {
            const newName = normalizeLabelName(input.value) || "بدون نام";
            if (isDuplicateLabelName(range, newName, lid)) {
              showToast("نام برچسب تکراری است.", "error");
              input.focus();
              input.select();
              return;
            }
            lbl.name = newName;

            body.innerHTML = render();
            updateAllThumbnailsForLabel(rangeId, lid);
            onAfterChange();
          };

          input.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter") commit();
            if (ev.key === "Escape") body.innerHTML = render();
          });
          input.addEventListener("blur", commit);
        }
      });
    },
  });
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest('[data-action="open-item-label"]');
  if (!btn) return;
  e.stopPropagation();

  const rangeId = btn.dataset.rangeId;
  const itemId = btn.dataset.itemId;

  const range = findRangeById(rangeId);
  const item = range?.items.find((it) => it.id === itemId);
  if (!range || !item) return;

  openLabelDropdown({
    rangeId,
    anchorEl: btn,
    getActiveLabelId: () => item.labelId,
    setActiveLabelId: (lid) => {
      item.labelId = lid;
    },
    onAfterChange: () => {
      updateThumbnailLabelUI(rangeId, itemId);
    },
  });
});

// ========== Range DOM Building ==========
const rangesContainer = document.getElementById("ranges");
const totalScoreEl = document.getElementById("total-ranges-score");

let activeRangeId = null; // last clicked range (for paste)

function getRangeHTML(rangeData) {
  return isMobile()
    ? getMobileRangeHTML(rangeData)
    : getDesktopRangeHTML(rangeData);
}

function getMobileRangeHTML(rangeData) {
  const fileID = createRandomId("file");
  return `
    <div class="relative range-card-mobile my-1 rounded-custom bg-surface border border-border-light/80 p-4 transition-all">
      <!-- بخش تنظیمات -->
      <div class="settings-section mb-3">
        <!-- ردیف اول: عنوان + دکمه‌های جابجایی + منوی سه‌نقطه -->
        <div class="flex justify-between items-center mb-3">
          <div class="flex items-center gap-2 flex-1">
            <div class="relative flex-1">
              <input value="${rangeData.rangeName}" type="text" placeholder="عنوان مبحث" 
                     class="range-name w-full border-0 border-b-2 border-border-light bg-transparent px-1 py-2 text-base font-medium text-primary focus:border-primary-dark focus:ring-0 transition-all">
            </div>
          </div>
          <!-- گروه دکمه‌های کناری -->
          <div class="flex items-center gap-1">
            <button class="move-up action-circle flex-shrink-0 w-8 h-8 flex items-center justify-center">
              <i class="bi bi-arrow-up-short text-lg"></i>
            </button>
            <button class="move-down action-circle flex-shrink-0 w-8 h-8 flex items-center justify-center">
              <i class="bi bi-arrow-down-short text-lg"></i>
            </button>
            <div class="dropdown relative">
              <button class="dropdown-toggle action-circle border-0 w-8 h-8 flex items-center justify-center">
                <i class="bi bi-three-dots-vertical text-base text-secondary"></i>
              </button>
              <div class="dropdown-menu hidden min-w-[140px] absolute top-full left-0 right-auto bg-surface border border-border-light rounded-custom p-2 shadow-lg z-50 flex-col gap-1">
                <button class="copy-range flex items-center gap-2 px-4 py-2.5 text-sm text-secondary hover:bg-surface-dark rounded-custom transition-all w-full text-right"><i class="bi bi-copy text-muted"></i> کپی</button>
                <button class="paste-range flex items-center gap-2 px-4 py-2.5 text-sm text-secondary hover:bg-surface-dark rounded-custom w-full text-right"><i class="bi bi-clipboard-plus text-muted"></i> چسباندن</button>
                <button class="remove-range flex items-center gap-2 px-4 py-2.5 text-sm text-secondary hover:bg-surface-dark rounded-custom transition-all w-full text-right"><i class="bi bi-trash3 text-muted"></i> حذف</button>
              </div>
            </div>
          </div>
        </div>

        <!-- ردیف دوم: تعداد و نمره (دکمه‌های جابجایی به بالا منتقل شدند) -->
        <div class="flex items-center gap-2 mb-2 overflow-x-auto scrollable-x pb-1">
          <div class="flex items-center gap-1 px-3 py-2 rounded-custom border border-border-light w-full">
            <label class="text-sm text-secondary ml-1">تعداد:</label>
            <input value="${rangeData.count}" data-number-input="true" data-float="false" 
                   class="range-count w-14 text-center bg-transparent border-0 p-1 text-base font-medium text-primary focus:ring-1 focus:ring-primary-light rounded-custom">
          </div>
          <div class="flex items-center gap-1 px-3 py-2 rounded-custom border border-border-light w-full">
            <label class="text-sm text-secondary ml-1">نمره:</label>
            <input value="${rangeData.score}" data-number-input="true" 
                   class="range-score w-14 text-center bg-transparent border-0 p-1 text-base font-medium text-primary focus:ring-1 focus:ring-primary-light rounded-custom">
          </div>
        </div>

        <!-- ردیف سوم: دکمه‌های افزودن متن، تصویر و هوش مصنوعی -->
        <div class="flex gap-2">
          <button class="add-text-item flex-1 flex items-center justify-center gap-2 bg-surface-dark hover:bg-surface-darker text-secondary rounded-custom py-2.5 text-sm font-medium transition-all active:scale-[0.98]">
            <i class="bi bi-plus-lg text-lg"></i> <span>افزودن سوال</span>
          </button>
          <!-- آپلود تصویر -->
          <input type="file" id="${fileID}" accept="image/*" multiple class="sr-only range-images">
          <label for="${fileID}" class="flex-1 flex items-center justify-center gap-2 bg-surface-dark hover:bg-surface-darker text-secondary rounded-custom py-2.5 text-sm font-medium transition-all active:scale-[0.98]">
            <i class="bi bi-image text-lg"></i> <span>تصویر سوال</span>
          </label>
        </div>
        <div class="flex gap-2 my-2">
          <button class="ai-range flex-1 flex items-center justify-center gap-2 bg-surface-dark hover:bg-surface-darker text-secondary rounded-custom py-2.5 text-sm font-medium transition-all active:scale-[0.98]">
            <i class="bi bi-openai text-lg"></i> <span>هوش مصنوعی</span>
          </button>
          <button class="range-desc-switch flex-1 flex items-center justify-center gap-2 bg-surface-dark hover:bg-surface-darker text-secondary rounded-custom py-2.5 text-sm font-medium transition-all active:scale-[0.98]">
            <i class="bi bi-input-cursor-text text-lg"></i> <span>متن ثابت</span>
          </button>
        </div>

        <!-- تکست‌آریا برای توضیحات مبحث -->
        <div id="textareaBox" class="overflow-hidden max-h-0 opacity-0 blur-sm -translate-y-3 transition-all duration-500 ease-out">
          <textarea class="range-desc w-full h-15 border border-border-light rounded-custom p-3 text-sm focus:outline-none placeholder-muted" placeholder="متن سوال را اینجا بنویسید.">${rangeData.desc || ""}</textarea>
        </div>
      </div>

      <!-- بخش پیش‌نمایش آیتم‌ها -->
      <div class="preview-section border-t border-border-light pt-3 mt-1">
        <button class="toggle-items-btn flex gap-2 items-center w-full bg-surface-dark hover:bg-surface-darker rounded-custom px-4 py-2.5 transition-all ${rangeData.itemsCollapsed ? "collapsed" : ""}">
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
        </div>
        <div>
          <label class="font-normal text-muted"> تعداد: </label>
          <input value="${rangeData.count}" data-number-input="true" data-float="false" class="w-20 border border-border-light rounded-custom p-2 range-count" placeholder="تعداد">
        </div>
        <div>
          <label class="font-normal text-muted" > نمره: </label>
          <input value="${rangeData.score}" data-number-input="true" class="w-20 border border-border-light rounded-custom p-2 range-score" placeholder="نمره">
        </div>
        <button data-tooltip="متن ثابت سوالات" class="range-desc-switch btn btn-outline btn-dashed px-3 py-2 rounded-custom"><i class="bi bi-input-cursor-text"></i></button>
        <div class="inline-block">
          <div class="file-input">
            <input type="file" id="${fileID}" accept="image/*" multiple class="file sr-only range-images">
            <label data-tooltip="تصویر سوال" for="${fileID}" class="btn btn-outline btn-dashed px-4 py-2 rounded-custom relative flex items-center justify-center"><i class="bi bi-image"></i></label>
          </div>
        </div>
        <button data-tooltip="تعریف سوال" class="add-text-item btn btn-outline btn-dashed px-3 py-2 rounded-custom"><i class="bi bi-type"></i></button>
        <button data-tooltip="هوش مصنوعی" class="ai-range btn btn-outline btn-dashed px-3 py-2 rounded-custom"><i class="bi bi-openai"></i></button>
      </div>
      <div class="flex items-center gap-2">
      <button data-tooltip="کپی آیتم ها" class="p-1 text-muted hover:text-primary rounded-custom copy-range transition-all duration-500 ease-out"><i class="bi bi-copy"></i></button>
      <button data-tooltip="چسباندن" class="p-1 text-muted hover:text-primary rounded-custom paste-range transition-all duration-500 ease-out"><i class="bi bi-clipboard-plus"></i></button>
      <button data-tooltip="حذف مبحث" class="p-1 text-muted hover:text-error rounded-custom remove-range transition-all duration-500 ease-out"><i class="bi bi-trash3"></i></button>
      </div>
    </div>
    <div id="textareaBox" class="overflow-hidden max-h-0 opacity-0 blur-sm -translate-y-3 transition-all duration-500 ease-out">
      <textarea class="range-desc w-full h-15 border border-border-light rounded-custom p-3 text-sm focus:outline-none placeholder-muted" placeholder="متن سوال را اینجا بنویسید.">${rangeData.desc || ""}</textarea>
    </div>
    <div class="preview-section border-t border-border-light">
      <button class="toggle-items-btn flex gap-2 items-center w-full bg-surface-dark hover:bg-surface-darker rounded-custom py-2 transition-all ${rangeData.itemsCollapsed ? "collapsed" : ""}">
        <span class="text-sm font-medium text-secondary flex items-center gap-2"><i class="bi bi-grid-3x3-gap-fill text-muted"></i>سوالات تعریف شده</span>
        <span class="range-total flex items-center justify-center min-w-[2rem] h-8 px-2 bg-surface-darker text-secondary rounded-circle text-sm font-semibold">${toPersianDigits(rangeData.items.length)}</span>
        <i class="mr-auto transition-transform duration-300 bi-chevron-down text-muted toggle-arrow text-lg"></i>
      </button>
      <div class="items-preview grid grid-cols-6 gap-[5px] mt-1 ${rangeData.itemsCollapsed ? "collapsed" : ""}">
        <!-- آیتم‌ها -->
      </div>
    </div>
  </div>  
  `;
}

function updateRangesTotalScoreUI() {
  const totalScore = calculateTotalScore();
  totalScoreEl.classList.toggle("hidden", !!!totalScore);
  totalScoreEl.innerHTML = `جمع بارم: ${toPersianDigits(totalScore || 0)} نمره`;
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

function setupCopyRangeButton(rangeElement, rangeId) {
  rangeElement.querySelectorAll(".copy-range").forEach((btn) => {
    btn.addEventListener("click", () => {
      const items = findRangeById(rangeId)?.items || [];
      if (items.length) {
        const payload = buildClipboardPayloadForItems(rangeId, items);
        copyToClipboard(JSON.stringify(payload));
      } else showToast("آیتمی برای کپی وجود ندارد.", "error");
    });
  });
}

function setupPasteRangeButton(rangeElement, rangeId) {
  rangeElement.querySelectorAll(".paste-range").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await handlePasteInsideRange(rangeId);
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
      const range = findRangeById(rangeId);
      if (range) {
        range.itemsCollapsed = !range.itemsCollapsed;
        const preview = rangeElement.querySelector(".items-preview");
        const itemsCollapsed = range.itemsCollapsed;
        preview.classList.toggle("collapsed", !!itemsCollapsed);
        toggleBtn.classList.toggle("collapsed", !!itemsCollapsed);
        toggleBtn.setAttribute("aria-expanded", String(!!!itemsCollapsed));
      }
    });
  }
}

function setupFileUploadOnRange(rangeElement, rangeId) {
  handleFileUpload({
    target: rangeElement.querySelector(".range-images"),
    onChange: (src) => {
      const newItem = createImageItem({ src });
      openModalForNewItem(rangeId, newItem);
    },
  });
}

function setupSwitchOnRange(rangeElement) {
  let isActive = false;
  rangeElement
    .querySelector(".range-desc-switch")
    .addEventListener("click", () => {
      isActive = !isActive;
      setElementState({
        target: rangeElement.querySelector("#textareaBox"),
        stateClasses: {
          on: ["max-h-60", "opacity-100", "blur-0", "translate-y-0"],
          off: ["max-h-0", "opacity-0", "blur-sm", "-translate-y-3"],
        },
        isActive,
      });
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
    if (
      !dropdownMenu.contains(e.target) &&
      !dropdownToggle.contains(e.target)
    ) {
      dropdownMenu.classList.add("hidden");
    }
  };
  document.addEventListener("click", closeDropdownOnOutsideClick);
}

function setActiveRangeStyle(rangeId) {
  document
    .querySelectorAll(".range-item")
    .forEach((item) => item.classList.remove("shadow-default"));
  document.getElementById(rangeId).classList.add("shadow-default");
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
      setActiveRangeStyle(rangeId);
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
    "range-item transition-transform duration-200 ease-out overflow-auto rounded-custom";
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
      labels: [],
    };
    appState.ranges.push(newRange);
    rangeData = newRange;
  }
  const el = buildRangeDOM(rangeData);
  attachRangeEvents(el, rangeData.id);
  return el;
}

function addItemToRange(rangeId, item) {
  const range = findRangeById(rangeId);
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
let hasGeneratedTable = false;

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
        <div class="switch relative w-[42px] h-[24px] bg-surface-darker rounded-custom cursor-pointer transition-all duration-300 ease-out">
          <div class="knob absolute top-[2px] left-[3px] w-[20px] h-[20px] bg-surface rounded-custom transition-all duration-500 shadow-md"></div>
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
    getPrintArea().style.fontFamily = appState.font;
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
  container.querySelector(".print-btn").addEventListener("click", () => {
    if (hasGeneratedTable) window.print();
    else showToast("برگه ای برای چاپ وجود ندارد!", "error");
  });

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
async function handlePasteImageInModal(showError = true) {
  if (cropper) destroyCropper();
  const src = await getImageFromClipboard();
  if (src) handleModalImageChange(src);
  else if (showError) showToast("تصویری کپی نشده است!", "error");
}

async function handlePasteInsideRange(rangeId) {
  const src = await getImageFromClipboard();
  if (src) {
    const newItem = createImageItem({ src });
    addItemToRange(rangeId, newItem);
  } else await tryPasteJSONToRange(rangeId);
}

document.addEventListener("paste", async () => {
  if (wizardState.isOpen) return;
  else if (appState.modal.isOpen) await handlePasteImageInModal(false);
  else if (activeRangeId) await handlePasteInsideRange(activeRangeId);
});

// ========== Quiz Generation ==========
const printArea = getPrintArea();

const persianParts = ["الف", "ب", "ج", "د", "ه", "و", "ز", "ح", "ط", "ی"];

function partLabel(i) {
  return persianParts[i] || `${toPersianDigits(i + 1)}`;
}

function renderRangeAsMultiPart(range) {
  const items = range.items;
  const partsHtml = items
    .map((item, idx) => {
      return `
        <div class="flex gap-1">
          <div class="font-bold whitespace-nowrap ${items.length < 2 ? "hidden" : ""}">${partLabel(idx)})</div>
          <div class="flex-1">${renderItemForQuiz(item, null)}</div>
        </div>
      `;
    })
    .join("");

  return `<div class="space-y-1">${partsHtml}</div>`;
}

function createQuestionRowHtmlMulti(qNum, range) {
  return `
    <tr>
      <td class="w-10 text-center font-bold align-top">
        ${toPersianDigits(qNum)}
        <span class="font-normal text-xs">
          ${+range.score > 0 ? `(${toPersianDigits(range.score)}نمره)` : ``}
        </span>
      </td>
      <td class="px-2">
      <p> ${range.desc}  </p>
        ${renderRangeAsMultiPart(range)}
      </td>
    </tr>`;
}

function buildQuizData(names, ranges) {
  const finalData = Object.fromEntries(names.map((n) => [n, []]));

  ranges.forEach((r) => {
    const items = Array.isArray(r.items) ? r.items : [];

    names.forEach((student) => {
      const picked = pickRandomItemsUniqueLabels(items, r.count);
      if (!picked) {
        throw new Error(
          `مبحث «${r.rangeName || "بدون عنوان"}»: تعداد درخواستی (${r.count}) بیشتر از ظرفیت یکتا بر اساس برچسب‌هاست.`,
        );
      }

      finalData[student].push({
        rangeName: r.rangeName,
        items: picked,
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
      <td class="px-2">
        ${renderItemForQuiz(item, range.desc)}
      </td>
    </tr>`;
}

function createStudentTableHtml(studentQuiz, name) {
  let qNum = 1;

  const rows = studentQuiz
    .map((range) => createQuestionRowHtmlMulti(qNum++, range))
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

  let quizData;
  try {
    quizData = buildQuizData(names, validRanges);
  } catch (err) {
    showToast(err.message, "error");
    return null;
  }

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
  if (!html) return false;

  printArea.innerHTML = `<table class="w-full"><tbody>${html}</tbody></table>`;
  return true;
}

function hideQuizHtml() {
  hasGeneratedTable = false;
  printArea.innerHTML = `
  <div class="flex items-center justify-center">
    <img src="images/no_data.jpg" alt="no_data" style="max-height: 380px;">
  </div>
  `;
}

function handleGenerateClick(e) {
  hasGeneratedTable = generateQuizHtml();
  if (hasGeneratedTable) {
    e.target.scrollIntoView({ behavior: "smooth" });
    renderMathInContainer(printArea);
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
  }, 300);
}

function setupModal(modalElement, options = {}) {
  const {
    closeOnEscape = true,
    closeOnOverlayClick = true,
    onClose = () => {},
  } = options;

  const overlaySelector = ".modal-overlay";
  const closeButtonSelector = ".modal-close-btn";

  if (closeOnOverlayClick) {
    const overlay = modalElement.querySelector(overlaySelector);
    if (overlay) {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          closeModalElement(modalElement);
          onClose();
        }
      });
    }
  }

  if (closeButtonSelector) {
    const closeBtn = modalElement.querySelector(closeButtonSelector);
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        closeModalElement(modalElement);
        onClose();
      });
    }
  }

  if (closeOnEscape) {
    const escapeHandler = (e) => {
      if (
        e.key === "Escape" &&
        modalElement.classList.contains("modal--visible")
      ) {
        closeModalElement(modalElement);
        onClose();
      }
    };
    document.addEventListener("keydown", escapeHandler);
  }
}

// ========== Edit modal ==========
const modalEdit = document.querySelector(".modal-edit");
const modalEditPreviewCell = modalEdit.querySelector(".modal-preview-cell");
const modalPasteImageBtn = document.getElementById("modalPasteImageBtn");
const modalClipboardImageAddBtn = document.getElementById(
  "modalClipboardImageAddBtn",
);
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
const previewImgFloat = document.getElementById("previewImgFloat");
const modalLabelBtn = document.getElementById("modalLabelBtn");

function updateModalLabelBtnUI() {
  const range = findRangeById(appState.modal.rangeId);
  const temp = appState.modal.tempItem;
  if (!range || !temp || !modalLabelBtn) return;
  setLabelButtonUI(modalLabelBtn, range, temp.labelId);
}

modalLabelBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  const rangeId = appState.modal.rangeId;
  const range = findRangeById(rangeId);
  const temp = appState.modal.tempItem;
  if (!range || !temp) return;

  openLabelDropdown({
    rangeId,
    anchorEl: modalLabelBtn,
    getActiveLabelId: () => temp.labelId,
    setActiveLabelId: (lid) => {
      temp.labelId = lid;
    },
    onAfterChange: updateModalLabelBtnUI,
  });
});

function updateTempItemFromTextEditor() {
  const temp = appState.modal.tempItem;
  if (!temp) return;

  temp.text = {
    html: editModalEditor.getContent(),
    align: ITEM_DEFAULTS.text.align,
  };
  updateModalPreviewFromTemp();
}

function openModalForNewItem(rangeId, newItem) {
  appState.modal.rangeId = rangeId;
  appState.modal.itemId = null;
  appState.modal.isOpen = true;
  appState.modal.tempItem = JSON.parse(JSON.stringify(newItem));
  openModalWithTempItem(rangeId);
}

function openItemModal(rangeId, itemId) {
  const range = findRangeById(rangeId);
  const item = range?.items.find((it) => it.id === itemId);
  if (!item) return;

  appState.modal.rangeId = rangeId;
  appState.modal.isOpen = true;
  appState.modal.itemId = itemId;
  appState.modal.tempItem = JSON.parse(JSON.stringify(item));
  openModalWithTempItem(rangeId);
}

const modalShowText = handleSwitchElement({
  container: document.getElementById("modal-show-text"),
  onChange: (isActive) => {
    const temp = appState.modal.tempItem;
    if (!temp) return;
    temp.showText = isActive;
    updateModalPreviewFromTemp();
  },
});

function openModalWithTempItem(rangeId) {
  const range = findRangeById(rangeId);
  const temp = appState.modal.tempItem;
  if (!temp) return;

  updateModalLabelBtnUI();
  setupModalEditorFromTemp(temp);
  updateModalPreviewFromTemp();
  updateModalImageUI();
  setupModalShowTextSwitch(temp, range);
  openModalElement(modalEdit);
}

function setupModalShowTextSwitch(temp, range) {
  const hasDesc = !!range.desc;
  modalShowText.container.classList.toggle("hidden", !hasDesc);
  if (hasDesc) {
    const showText = temp.showText !== false;
    showText ? modalShowText.on() : modalShowText.off();
  }
}

function setupModalEditorFromTemp(temp) {
  if (temp.text) {
    editModalEditor.setContent(temp.text.html);
    editModalEditor.setAlignment(temp.text.align.toLowerCase());
  } else {
    editModalEditor.setContent("");
    editModalEditor.setAlignment("right");
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

function setTextFloat() {
  const txtContainer = modalEditPreviewCell.querySelector("div");
  const isFloat = appState.modal.tempItem.image?.float;

  if (txtContainer) {
    previewImgFloat.classList.remove("hidden");
    txtContainer.style.position = isFloat ? "absolute" : "initial";
  } else previewImgFloat.classList.add("hidden");
}

function syncImageToolbarWithCurrentImage() {
  const img = modalEditPreviewCell.querySelector("img");
  if (!img) return;
  const tempItemImg = appState.modal.tempItem.image;

  const height = parseInt(img.style.height) || tempItemImg.height || 300;
  previewImgHeight.value = height;
  previewImgHeightValue.textContent = height + "px";

  const filter = img.style.filter || "";
  const brightnessMatch = filter.match(/brightness\((\d+)%\)/);
  const contrastMatch = filter.match(/contrast\((\d+)%\)/);
  previewImgBrightness.value = brightnessMatch
    ? parseInt(brightnessMatch[1])
    : 100;
  previewImgContrast.value = contrastMatch ? parseInt(contrastMatch[1]) : 100;
  setTextFloat();

  handleSwitchElement({
    container: previewImgFloat,
    initialState: !!tempItemImg.float,
    onChange: (isActive) => {
      appState.modal.tempItem.image.float = isActive;
      setTextFloat();
    },
  });
}

function updateModalPreviewFromTemp() {
  const temp = appState.modal.tempItem;
  if (!temp) return;

  const range = findRangeById(appState.modal.rangeId);
  if (!range) return;

  modalQscore.innerHTML = `
    ${toPersianDigits(1)}
    <span class="font-normal text-xs">
      ${+range.score > 0 ? `(${toPersianDigits(range.score)}نمره)` : ""}
    </span>
  `;

  modalEditPreviewCell.innerHTML = renderItemContent(temp, {
    rangeDesc: range.desc,
  });
  renderMathInContainer(modalEditPreviewCell);
  setTextFloat();
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

function destroyEditModal() {
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }

  appState.modal.rangeId = null;
  appState.modal.itemId = null;
  appState.modal.tempItem = null;
  appState.modal.isOpen = false;

  setTimeout(() => {
    editModalEditor.setContent("");
  }, 300);
}

function closeEditModal() {
  closeModalElement(modalEdit);
  destroyEditModal();
}

saveModalBtn.addEventListener("click", () => {
  showConfirm({
    msg: "آیا از ذخیره تغییرات اطمینان دارید؟",
    on_confirm: saveModalChanges,
  });
});

function handleModalImageChange(src) {
  const temp = appState.modal.tempItem;
  if (!temp.image) {
    temp.image = {
      src,
      height: ITEM_DEFAULTS.image.height,
      align: ITEM_DEFAULTS.image.align,
      imageId: createRandomId("img"),
    };
    updateModalPreviewFromTemp();
    updateModalImageUI();
  } else {
    showConfirm({
      msg: "آیا تصویر جایگزین شود؟",
      on_confirm: () => {
        temp.image.src = src;
        temp.image.imageId = createRandomId("img");
        updateModalPreviewFromTemp();
        updateModalImageUI();
      },
    });
  }
}

handleFileUpload({
  target: document.getElementById("modalImageUpload"),
  onChange: (src) => handleModalImageChange(src),
});

handleFileUpload({
  target: document.getElementById("modalReplaceImageUpload"),
  onChange: (src) => handleModalImageChange(src),
});

modalPasteImageBtn.addEventListener("click", handlePasteImageInModal);
modalClipboardImageAddBtn.addEventListener("click", handlePasteImageInModal);

removeImageBtn.addEventListener("click", () => {
  showConfirm({
    msg: "آیا از حذف تصویر اطمینان دارید؟",
    on_confirm: () => {
      if (appState.modal.tempItem) {
        appState.modal.tempItem.image = null;
        updateModalPreviewFromTemp();
        updateModalImageUI();
      }
    },
  });
});

// ========== AI Wizard ==========

const wizardState = {
  isOpen: false,
  mode: "extract",
  step: 1,
  rangeId: null,
  extractedItem: null,
  sourceItem: null,
  generatedItems: [],
  count: 5,
};

function showWizardStep(step) {
  if (wizardState.transitioning) return;
  wizardState.transitioning = true;

  const steps = document.querySelectorAll(".modal-ai .step");
  const currentStepEl = document.querySelector(
    `.modal-ai .step-${wizardState.step}`,
  );
  const nextStepEl = document.querySelector(`.modal-ai .step-${step}`);

  if (currentStepEl && currentStepEl !== nextStepEl) {
    currentStepEl.classList.add("opacity-0", "scale-95", "pointer-events-none");
    setTimeout(() => currentStepEl.classList.add("hidden"), 200);
  }

  nextStepEl.classList.remove("hidden");
  setTimeout(() => {
    nextStepEl.classList.remove("opacity-0", "scale-95", "pointer-events-none");
  }, 50);

  setTimeout(() => {
    wizardState.step = step;
    wizardState.transitioning = false;
    updateWizardUI();
  }, 250);
}

function validateStep2() {
  const raw = document.getElementById("extractResponseInput").value.trim();
  if (!raw) {
    showToast("لطفاً پاسخ را وارد کنید", "error");
    return false;
  }
  try {
    const data = extractJSON(raw);
    if (!data.items?.length) throw new Error("آیتمی یافت نشد");
    wizardState.extractedItem = {
      id: createRandomId("item"),
      text: { ...data.items[0].text },
      image: null,
      showText: true,
    };
    return true;
  } catch (err) {
    showToast(err.message, "error");
    return false;
  }
}

function validateStep3() {
  const html = wizardTextEditor.getContent();
  if (!html.trim()) {
    showToast("لطفاً متن سوال را وارد کنید", "error");
    return false;
  }
  if (!wizardState.extractedItem) {
    wizardState.extractedItem = {
      id: createRandomId("item"),
      text: null,
      image: null,
      showText: true,
    };
  }
  if (!wizardState.extractedItem.text) {
    wizardState.extractedItem.text = { html, align: "RIGHT" };
  } else {
    wizardState.extractedItem.text.html = html;
    const align = wizardTextEditor.getAlignment();
    if (align) wizardState.extractedItem.text.align = align.toUpperCase();
  }

  const countInput = document.getElementById("wizard-similar-count");
  wizardState.count = countInput ? parseInt(countInput.value) || 5 : 5;

  wizardState.mode = "generate";
  wizardState.sourceItem = wizardState.extractedItem;
  return true;
}

function nextStep() {
  if (wizardState.transitioning) return;

  if (wizardState.step === 2 && !validateStep2()) return;
  if (wizardState.step === 3 && !validateStep3()) return;

  if (wizardState.step === 5) {
    closeWizard();
    return;
  }

  const next = wizardState.step + 1;
  if (next > 5) return;
  showWizardStep(next);
}

function prevStep() {
  const prev = wizardState.step - 1;
  if (prev < 1) return;
  if (wizardState.step === 4 && prev === 3 && wizardState.extractedItem) {
    wizardState.mode = "extract";
    showWizardStep(3);
    return;
  }
  showWizardStep(prev);
}

function updateStepIndicators() {
  document.querySelectorAll(".modal-ai .step-item").forEach((item, idx) => {
    const stepNum = idx + 1;
    const circle = item.querySelector(".step-circle");
    if (stepNum === wizardState.step) {
      circle.classList.add("bg-primary", "text-white");
      circle.classList.remove(
        "bg-surface-dark",
        "text-secondary",
        "bg-success",
      );
    } else if (stepNum < wizardState.step) {
      circle.classList.add("bg-success", "text-white");
      circle.classList.remove(
        "bg-surface-dark",
        "text-secondary",
        "bg-primary",
      );
    } else {
      circle.classList.add("bg-surface-dark", "text-secondary");
      circle.classList.remove("bg-primary", "bg-success", "text-white");
    }
  });
}

function updateNavigationButtons() {
  const prevBtn = document.getElementById("wizardPrevBtn");
  const nextBtn = document.getElementById("wizardNextBtn");

  if (wizardState.step === 1) {
    prevBtn.classList.add("hidden");
  } else {
    prevBtn.classList.remove("hidden");
  }
  prevBtn.disabled = false;

  nextBtn.disabled = false;
  nextBtn.textContent = wizardState.step === 5 ? "پایان" : "بعدی";
}

function updateStepContent() {
  if (wizardState.step === 1) {
    document.getElementById("extractPromptDisplay").textContent = getAIPrompt({
      task: "extract",
    });
  } else if (wizardState.step === 3) {
    const item = wizardState.extractedItem;
    if (item?.text) {
      wizardTextEditor.setContent(item.text.html);
      wizardTextEditor.setAlignment(item.text.align.toLowerCase);
    } else {
      wizardTextEditor.setContent("");
      wizardTextEditor.setAlignment("right");
    }
    const countInput = document.getElementById("wizard-similar-count");
    if (countInput) countInput.value = wizardState.count;
    updateWizardPreview();
  } else if (wizardState.step === 4) {
    updateGeneratePrompt();
  } else if (wizardState.step === 5) {
    document.getElementById("generateResponseInput").value = "";
    document.getElementById("generatePreviewContainer").classList.add("hidden");
    document.getElementById("addGeneratedBtn").disabled = true;
    wizardState.generatedItems = [];
  }
}

function updateWizardUI() {
  updateStepIndicators();
  updateNavigationButtons();
  updateStepContent();
}

function updateWizardPreview() {
  const tempItem = wizardState.extractedItem;
  if (!tempItem) return;
  const range = findRangeById(wizardState.rangeId);
  const previewCell = document.getElementById("wizard-preview-cell");
  const scoreCell = document.getElementById("wizard-preview-score");
  const score =
    range?.score > 0 ? `(${toPersianDigits(range.score)} نمره)` : "";
  scoreCell.innerHTML = `${toPersianDigits(1)} <span class="font-normal text-xs">${score}</span>`;
  previewCell.innerHTML = renderItemContent(tempItem, {
    rangeDesc: range?.desc || "",
  });
  renderMathInContainer(previewCell);
}

function updateGeneratePrompt() {
  if (!wizardState.sourceItem?.text) return;
  const count = wizardState.count;
  const type = detectQuestionType(wizardState.sourceItem.text.html);
  const prompt = getAIPrompt({
    task: "generate-similar",
    sampleText: wizardState.sourceItem.text.html,
    count,
    type,
  });
  document.getElementById("generatePromptDisplay").textContent = prompt;
}

function openWizard(mode, rangeId, sourceItem = null) {
  wizardState.mode = mode;
  wizardState.rangeId = rangeId;
  wizardState.isOpen = true;
  wizardState.generatedItems = [];
  wizardState.extractedItem = null;
  wizardState.sourceItem = sourceItem;
  wizardState.step = mode === "extract" ? 1 : 4;
  wizardState.count = appState.namesCount || 5;

  const modal = document.querySelector(".modal-ai");
  openModalElement(modal);

  document.querySelectorAll(".modal-ai .step").forEach((el) => {
    el.classList.add("hidden", "opacity-0", "scale-95");
  });
  const startStep = document.querySelector(
    `.modal-ai .step-${wizardState.step}`,
  );
  startStep.classList.remove("hidden");
  setTimeout(() => startStep.classList.remove("opacity-0", "scale-95"), 50);

  updateWizardUI();
}

function closeWizard() {
  closeModalElement(document.querySelector(".modal-ai"));
  wizardState.isOpen = false;
  wizardState.mode = "extract";
  wizardState.step = 1;
  wizardState.rangeId = null;
  wizardState.extractedItem = null;
  wizardState.sourceItem = null;
  wizardState.generatedItems = [];
  wizardState.count = 5;
  document.getElementById("extractResponseInput").value = "";
  document.getElementById("generateResponseInput").value = "";
  document.getElementById("generatePreviewContainer").classList.add("hidden");
}

function detectQuestionType(text) {
  if (text.includes("؟") && text.includes("1.") && text.includes("2."))
    return "multiple_choice";
  if (text.includes("صحیح") || text.includes("غلط")) return "true_false";
  if (text.includes("........")) return "fill_blank";
  return "descriptive";
}

function previewGeneratedItems() {
  const raw = document.getElementById("generateResponseInput").value.trim();
  if (!raw) {
    showToast("لطفاً پاسخ را وارد کنید", "error");
    return;
  }
  try {
    const data = extractJSON(raw);
    const items = data.items.map((item) => ({
      id: createRandomId("item"),
      text: { ...item.text },
      image: null,
      showText: true,
    }));
    wizardState.generatedItems = items;
    renderGeneratedPreview(
      items,
      "generateItemsPreview",
      "generateEmptyPreview",
    );
    document
      .getElementById("generatePreviewContainer")
      .classList.remove("hidden");
    document.getElementById("addGeneratedBtn").disabled = false;
  } catch (err) {
    showToast(err.message, "error");
  }
}

function addGeneratedItemsToRange() {
  if (!wizardState.generatedItems.length) return;
  wizardState.generatedItems.forEach((item) =>
    addItemToRange(wizardState.rangeId, item),
  );
  showToast(
    `${toPersianDigits(wizardState.generatedItems.length)} آیتم به مبحث اضافه شد`,
  );
  closeWizard();
}

function removeGeneratedItem(index) {
  wizardState.generatedItems.splice(index, 1);
  if (wizardState.generatedItems.length === 0) {
    document.getElementById("generatePreviewContainer").classList.add("hidden");
    document.getElementById("addGeneratedBtn").disabled = true;
  } else {
    renderGeneratedPreview(
      wizardState.generatedItems,
      "generateItemsPreview",
      "generateEmptyPreview",
    );
  }
}

function renderGeneratedPreview(items, containerId, emptyId) {
  const container = document.getElementById(containerId);
  const empty = document.getElementById(emptyId);
  container.innerHTML = "";
  if (items.length === 0) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  items.forEach((item, index) => {
    const card = document.createElement("div");
    card.className =
      "relative bg-surface border border-border-light rounded-custom p-3 text-sm";
    const deleteBtn = document.createElement("button");
    deleteBtn.className =
      "absolute top-2 left-2 w-6 h-6 bg-error-light text-error rounded-full flex items-center justify-center text-sm opacity-70 hover:opacity-100 border-0 cursor-pointer";
    deleteBtn.innerHTML = "&times;";
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      removeGeneratedItem(index);
    };
    card.appendChild(deleteBtn);
    const header = document.createElement("div");
    header.className =
      "text-xs text-muted mb-1 pb-1 border-b border-border-light flex items-center gap-1";
    header.innerHTML = `<i class="bi bi-card-text"></i> آیتم ${toPersianDigits(index + 1)}`;
    card.appendChild(header);
    const content = document.createElement("div");
    content.className = "text-secondary";
    content.innerHTML = item.text.html;
    card.appendChild(content);
    container.appendChild(card);
  });
  renderMathInContainer(container);
}

function updateWizardPreviewFromEditor() {
  if (!wizardState.extractedItem) return;
  const html = wizardTextEditor.getContent();
  if (!wizardState.extractedItem.text) {
    wizardState.extractedItem.text = { html, align: "RIGHT" };
  } else {
    wizardState.extractedItem.text.html = html;
    const align = wizardTextEditor.getAlignment();
    if (align) wizardState.extractedItem.text.align = align.toUpperCase();
  }
  updateWizardPreview();
}

function initWizardEvents() {
  document
    .getElementById("copyExtractPromptBtn")
    ?.addEventListener("click", () => {
      copyToClipboard(
        document.getElementById("extractPromptDisplay").textContent,
      );
    });
  document
    .getElementById("copyGeneratePromptBtn")
    ?.addEventListener("click", () => {
      copyToClipboard(
        document.getElementById("generatePromptDisplay").textContent,
      );
    });
  document
    .getElementById("processExtractBtn")
    ?.addEventListener("click", () => pasteToTextarea("extractResponseInput"));

  document
    .getElementById("pasteGenerateBtn")
    ?.addEventListener("click", () => pasteToTextarea("generateResponseInput"));

  document
    .getElementById("previewGenerateBtn")
    ?.addEventListener("click", previewGeneratedItems);

  document
    .getElementById("addGeneratedBtn")
    ?.addEventListener("click", addGeneratedItemsToRange);

  document.getElementById("wizardPrevBtn")?.addEventListener("click", prevStep);
  document.getElementById("wizardNextBtn")?.addEventListener("click", nextStep);
  document
    .querySelectorAll(".modal-ai .modal-close-btn")
    .forEach((btn) => btn.addEventListener("click", closeWizard));
}

function setupAiRangeButton(rangeElement, rangeId) {
  rangeElement.querySelectorAll(".ai-range").forEach((btn) => {
    btn.replaceWith(btn.cloneNode(true));
    const newBtn = rangeElement.querySelector(".ai-range");
    newBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openWizard("extract", rangeId);
    });
  });
}

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

// ========== IndexedDB Storage ==========
const APP_DB_NAME = "QuizAppDB";
const APP_STATE_KEY = "appState";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(APP_DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(APP_STATE_KEY)) {
        db.createObjectStore(APP_STATE_KEY, { keyPath: "id" });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function saveStateToDB(state) {
  const db = await openDB();
  const tx = db.transaction(APP_STATE_KEY, "readwrite");
  const store = tx.objectStore(APP_STATE_KEY);
  const plainState = JSON.parse(JSON.stringify(state));
  store.put({ id: "currentState", data: plainState });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function loadStateFromDB() {
  const db = await openDB();
  const tx = db.transaction(APP_STATE_KEY, "readonly");
  const store = tx.objectStore(APP_STATE_KEY);
  const request = store.get("currentState");
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result?.data);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function clearStateFromDB() {
  const db = await openDB();
  const tx = db.transaction(APP_STATE_KEY, "readwrite");
  const store = tx.objectStore(APP_STATE_KEY);
  store.delete("currentState");
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function saveStateToIndexedDB() {
  try {
    await saveStateToDB(appState);
    showToast(
      "داده‌ها در حافظه موقت ذخیره شدند. برای ذخیره دائمی، خروجی بگیرید.",
    );
  } catch (err) {
    console.error(err);
    showToast("خطا در ذخیره‌سازی", "error");
  }
}

document
  .getElementById("saveToIndexedDB")
  .addEventListener("click", saveStateToIndexedDB);

// ========== Auto save and Restore data ==========
function clearAppState() {
  appState.ranges = [];
  appState.names = [];
  appState.namesCount = 1;
  rangesContainer.innerHTML = "";
  renderNamesSection();
}

async function checkAndRestoreFromDB() {
  try {
    const savedState = await loadStateFromDB();
    if (savedState && savedState.ranges && savedState.ranges.length) {
      applyImportedData(savedState);
      showToast("داده‌های قبلی بازیابی شدند.");
    }
  } catch (err) {
    console.warn("خطا در بازیابی از IndexedDB", err);
  }
}

function handleNewAttempt() {
  async function changeHandler() {
    await clearStateFromDB();
    clearAppState();
    hideQuizHtml();
  }

  if (appState.ranges.length) {
    showConfirm({
      msg: "آیا مطمئن هستید؟ همه داده‌های فعلی پاک می‌شوند.",
      on_confirm: () => {
        changeHandler();
        showToast("داده‌ها پاک شدند.");
      },
    });
  } else changeHandler();
}

// ========== Import/Export ==========
function buildItemsFromRangeData(rangeData) {
  if (rangeData.items) {
    return rangeData.items.map((it) => createItemFromData(it));
  } else if (rangeData.images) {
    return rangeData.images.map((img) => createItemFromData(img));
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
      labels: Array.isArray(r.labels)
        ? r.labels.map((l) => ({ id: l.id, name: l.name }))
        : [],
      items,
      itemsCollapsed: true,
    };
    ensureRangeLabels(rangeWithId);
    items.forEach((it) => normalizeItemLabelForRange(rangeWithId, it));
    appState.ranges.push(rangeWithId);
  });
}

function applyImportedData(data) {
  importRangesFromData(data);
  renderRangesWithAnimation();
  renderNamesSection();
}

function processImportedFile(fileContent) {
  try {
    const data = JSON.parse(fileContent);
    applyImportedData(data);
  } catch (err) {
    console.error("Invalid JSON file:", err);
    showToast("فایل JSON نامعتبر است!", "error");
  }
}

function exportData() {
  const defaultFilename = "";
  showConfirm({
    msg: "نام فایل را وارد کنید:",
    on_confirm: (fileName) => {
      if (fileName && fileName.trim() !== "") {
        const data = {
          names: appState.names,
          namesCount: appState.namesCount,
          ranges: appState.ranges.map((r) => ({
            rangeName: r.rangeName,
            count: r.count,
            score: r.score,
            desc: r.desc,
            labels: Array.isArray(r.labels) ? r.labels : [],
            items: r.items.map((item) => ({
              ...item,
              showText: item.showText !== false,
              labelId: item.labelId || null,
            })),
          })),
        };
        exportDataObject(data, fileName);
      } else {
        showToast("یک نام معتبر وارد کنید.", "error");
      }
    },
    input: {
      placeholder: "مثال: آزمون ریاضی",
      value: defaultFilename,
      required: false,
    },
    confirmText: "ذخیره",
    cancelText: "انصراف",
  });
}

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

function setupCropModalEvents() {
  const applyBtn = document.getElementById("applyCrop");
  const cancelBtn = document.getElementById("cancelCrop");
  const cropModal = document.getElementById("cropModal");

  applyBtn.addEventListener("click", function () {
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

    cropModal.classList.remove("visible");
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
  });

  cancelBtn.addEventListener("click", function () {
    cropModal.classList.remove("visible");
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
  });
}

// ========== Header menu ==========
function initializeDesktopButtons() {
  const newBtn = document.getElementById("newButton");
  const saveBtn = document.getElementById("saveToIndexedDB");
  const exportBtn = document.getElementById("exportJson");

  if (newBtn) newBtn.addEventListener("click", handleNewAttempt);
  if (saveBtn) saveBtn.addEventListener("click", saveStateToIndexedDB);
  if (exportBtn) exportBtn.addEventListener("click", exportData);
}

function initializeMobileButtons() {
  const newMobileBtn = document.getElementById("newButtonMobile");
  const saveMobileBtn = document.getElementById("saveToIndexedDBMobile");
  const exportMobileBtn = document.getElementById("exportJsonMobile");

  if (newMobileBtn) newMobileBtn.addEventListener("click", handleNewAttempt);
  if (saveMobileBtn)
    saveMobileBtn.addEventListener("click", saveStateToIndexedDB);
  if (exportMobileBtn) exportMobileBtn.addEventListener("click", exportData);
}

function initializeFileUpload() {
  const MobileImportInput = document.getElementById("importJsonMobile");
  const DesktopImportInput = document.getElementById("importJson");

  function changeHandler(file) {
    processImportedFile(file);
    hideQuizHtml();
    showToast("داده ها با موفقیت وارد شدند!");
  }

  [MobileImportInput, DesktopImportInput].forEach((input) => {
    if (input) {
      handleFileUpload({
        target: input,
        onChange: (file) => {
          if (appState.ranges.length) {
            showConfirm({
              msg: "آیا مطمئن هستید؟ همه داده‌های فعلی پاک می‌شوند.",
              on_confirm: () => changeHandler(file),
            });
          } else changeHandler(file);
        },
        readAs: "Text",
      });
    }
  });
}

function initializeHamburgerMenu() {
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const drawer = document.getElementById("mobileDrawer");
  const backdrop = document.getElementById("drawerBackdrop");

  if (!hamburgerBtn || !drawer || !backdrop) return;

  function openDrawer() {
    drawer.classList.remove("translate-x-full");
    drawer.classList.add("translate-x-0");
    backdrop.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
  }

  function closeDrawer() {
    drawer.classList.add("translate-x-full");
    drawer.classList.remove("translate-x-0");
    backdrop.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  }

  hamburgerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (drawer.classList.contains("translate-x-full")) {
      openDrawer();
    } else {
      closeDrawer();
    }
  });

  backdrop.addEventListener("click", closeDrawer);

  drawer.querySelectorAll("button, label").forEach((el) => {
    el.addEventListener("click", closeDrawer);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !drawer.classList.contains("translate-x-full")) {
      closeDrawer();
    }
  });
}

// ========== Mobile UX ==========
function setupMobileSwipeToClose(modalElement) {
  const content = modalElement.querySelector(".modal-content");
  if (!content) return;

  let startY = 0;
  let currentY = 0;
  let isDragging = false;
  const threshold = 100;

  const onTouchStart = (e) => {
    if (!modalElement.classList.contains("modal--visible")) return;
    if (content.scrollTop > 0) return;
    if (e.touches.length > 1) return;
    startY = e.touches[0].clientY;
    isDragging = true;
    content.style.transition = "none";
  };

  const onTouchMove = (e) => {
    if (!isDragging) return;

    const deltaY = e.touches[0].clientY - startY;
    if (deltaY <= 0) {
      isDragging = false;
      return;
    }

    e.preventDefault();
    currentY = deltaY;

    const translateY = Math.min(deltaY, 200);
    content.style.transform = `translateY(${translateY}px)`;
    content.style.opacity = 1 - deltaY / 300;
  };

  const onTouchEnd = () => {
    if (!isDragging) return;
    content.style.transition = "transform 0.3s ease, opacity 0.3s ease";

    if (currentY > threshold) {
      closeModalElement(modalElement);
    } else {
      content.style.transform = "";
      content.style.opacity = "";
    }

    isDragging = false;
    startY = 0;
    currentY = 0;
  };

  content.addEventListener("touchstart", onTouchStart, { passive: false });
  content.addEventListener("touchmove", onTouchMove, { passive: false });
  content.addEventListener("touchend", onTouchEnd);
  content.addEventListener("touchcancel", onTouchEnd);
}

function setupInputScrollOnFocus() {
  document.addEventListener("focusin", (e) => {
    const target = e.target;
    if (target.matches('input, textarea, [contenteditable="true"]')) {
      setTimeout(() => {
        target.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }, 100);
    }
  });
}

// ========== Initialization ==========

getPrintArea().style.fontFamily = appState.font;
namesUI = createNamesUI();
placeNamesUI();
initializeDesktopButtons();
initializeMobileButtons();
initializeFileUpload();
initializeHamburgerMenu();
checkAndRestoreFromDB();
initPreviewImageToolbar();

setupModal(modalEdit, { onClose: destroyEditModal });
if (isMobile()) {
  setupMobileSwipeToClose(modalEdit);
}

initWizardEvents();
setupInputScrollOnFocus();
setupCropModalEvents();

const modalPlaceholder = document.getElementById(
  "modal-rich-editor-placeholder",
);

const editModalEditor = createRichTextEditor(modalPlaceholder, {
  features: [
    "bold",
    "italic",
    "underline",
    "strike",
    "align-left",
    "align-center",
    "align-right",
    "align-justify",
    "undo",
    "redo",
    "latex",
  ],
  placeholder: "متن سوال را بنویسید...",
  contentId: "modal-text-editor",
  toolbarId: "modal-toolbar",
  onContentChange: updateTempItemFromTextEditor,
});

const wizardPlaceholder = document.getElementById(
  "wizard-rich-editor-placeholder",
);

const wizardTextEditor = createRichTextEditor(wizardPlaceholder, {
  features: [
    "bold",
    "italic",
    "underline",
    "strike",
    "align-left",
    "align-center",
    "align-right",
    "align-justify",
    "undo",
    "redo",
  ],
  placeholder: "متن سوال را ویرایش کنید...",
  contentId: "wizard-text-editor",
  toolbarId: "wizard-toolbar",
  onContentChange: updateWizardPreviewFromEditor,
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

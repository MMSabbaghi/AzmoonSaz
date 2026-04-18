"use strict";

/* =========================
   Utilities
========================= */
function toPersianDigits(str) {
  return (str + "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

function isMobile() {
  return window.innerWidth <= 768;
}

function createRandomId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function sanitizeText(str = "") {
  return String(str).replace(/[<>]/g, "");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
  return fisherYatesShuffle(source).slice(0, Math.min(count, source.length));
}

function pickRandomItemsUniqueLabels(items, count, isPreviewMode = false) {
  if (!Array.isArray(items) || items.length === 0 || count <= 0) return [];

  const labeled = items.filter((it) => !!it.labelId);
  const unlabeled = items.filter((it) => !it.labelId);

  const byLabel = new Map();
  labeled.forEach((it) => {
    if (!byLabel.has(it.labelId)) byLabel.set(it.labelId, []);
    byLabel.get(it.labelId).push(it);
  });

  const maxPossible = byLabel.size + unlabeled.length;
  const safeCount = Math.min(count, maxPossible);

  let result = [];

  if (!isPreviewMode) {
    const labelIds = fisherYatesShuffle([...byLabel.keys()]);
    for (const lid of labelIds) {
      if (result.length >= safeCount) break;
      const group = byLabel.get(lid);
      const pick = pickRandomItems(group, 1)[0];
      if (pick) result.push(pick);
    }

    if (result.length < safeCount) {
      result.push(...pickRandomItems(unlabeled, safeCount - result.length));
    }
  } else {
    for (const group of byLabel.values()) {
      if (result.length >= safeCount) break;
      if (group?.[0]) result.push(group[0]);
    }

    if (result.length < safeCount) {
      result.push(...unlabeled.slice(0, safeCount - result.length));
    }
  }

  return result;
}

function debounce(fn, delay) {
  let timerId;
  return function (...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn.apply(this, args), delay);
  };
}

function setElementState({ target, stateClasses, isActive }) {
  target.classList.remove(...stateClasses.on, ...stateClasses.off);
  target.classList.add(...stateClasses[isActive ? "on" : "off"]);
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

/* =========================
   Clipboard helpers
========================= */
async function copyToClipboard(textToCopy) {
  try {
    await navigator.clipboard.writeText(textToCopy);
    showToast("متن در کلیپ‌بورد کپی شد.");
    return true;
  } catch (err) {
    console.error("Clipboard copy error:", err);
    showToast("کپی کردن ناموفق بود. دسترسی کلیپ‌بورد را بررسی کنید.", "error");
    return false;
  }
}

async function getImageFromClipboard() {
  const blobToDataURL = (blob) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });

  try {
    const clipboardItems = await navigator.clipboard.read();
    const item = clipboardItems?.[0];
    if (!item) return null;

    const imageType = item.types.find((t) => t.startsWith("image/"));
    if (imageType) {
      const blob = await item.getType(imageType);
      return await blobToDataURL(blob);
    }

    const htmlType = item.types.find((t) => t === "text/html");
    if (htmlType) {
      const htmlBlob = await item.getType(htmlType);
      const htmlText = await htmlBlob.text();
      const doc = new DOMParser().parseFromString(htmlText, "text/html");
      const img = doc.querySelector("img");
      if (!img?.src) return null;

      if (img.src.startsWith("data:")) return img.src;

      const res = await fetch(img.src);
      const blob = await res.blob();
      return await blobToDataURL(blob);
    }

    return null;
  } catch (err) {
    console.error("Clipboard image error:", err);
    return null;
  }
}

async function pasteFromClipboard({ onImage, onText, onNone } = {}) {
  const src = await getImageFromClipboard();
  if (src) return onImage?.(src);

  const text = await navigator.clipboard.readText().catch(() => "");
  if (text && text.trim()) return onText?.(text);

  return onNone?.();
}

/* =========================
   Items / Labels helpers
========================= */
const ITEM_DEFAULTS = {
  text: { html: "" },
  image: { height: 75, align: "RIGHT" },
};

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
  return findLabelById(range, item.labelId)?.name || null;
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

  if (findLabelById(range, item.labelId)) return;

  if (labelIdRemap && labelIdRemap[item.labelId]) {
    item.labelId = labelIdRemap[item.labelId];
    return;
  }

  item.labelId = null;
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

function createItemFromData(dataItem) {
  return {
    id: createRandomId("item"),
    text: dataItem.text ? { ...dataItem.text } : null,
    image: dataItem.image
      ? { ...dataItem.image, imageId: createRandomId("img") }
      : null,
    labelId: dataItem.labelId || null,
  };
}

function buildClipboardPayloadForItems(rangeId, items) {
  const range = findRangeById(rangeId);
  ensureRangeLabels(range);
  const usedLabelIds = new Set(items.map((it) => it.labelId).filter(Boolean));
  const labels = range.labels.filter((l) => usedLabelIds.has(l.id));
  return { type: "quizapp-items-v1", labels, items };
}

function addItemsFromJSONToRange(rangeId, jsonString) {
  try {
    const range = findRangeById(rangeId);
    if (!range) return;
    ensureRangeLabels(range);

    const parsed = JSON.parse(jsonString);

    function addItems(items) {
      const itemsToAdd = items.map((item) => createItemFromData(item));
      itemsToAdd.forEach((it) => {
        normalizeItemLabelForRange(range, it);
        addItemToRange(rangeId, it);
      });
      showToast(
        `${toPersianDigits(itemsToAdd.length)} آیتم با موفقیت اضافه شد.`,
      );
    }

    // New format
    if (
      parsed &&
      parsed.type === "quizapp-items-v1" &&
      Array.isArray(parsed.items)
    ) {
      const incomingLabels = Array.isArray(parsed.labels) ? parsed.labels : [];
      mergeLabelsIntoRange(range, incomingLabels);
      addItems(parsed.items);
      return;
    }

    // Old format: array of items only
    if (Array.isArray(parsed)) {
      addItems(parsed);
      return;
    }

    throw new Error("Unsupported clipboard payload");
  } catch (err) {
    console.error("Invalid JSON:", err);
  }
}

// ========== Range Part Rendering Settings ==========
const RANGE_PART_LABEL_MODES = {
  NONE: "NONE",
  PERSIAN: "PERSIAN", // الف، ب، ج...
  NUMBER: "NUMBER", // 1,2,3...
  ENGLISH: "ENGLISH", // A,B,C...
};

const RANGE_PART_DIVIDER_STYLES = {
  NONE: "NONE",
  SOLID: "SOLID",
  DOTTED: "DOTTED",
  DASHED: "DASHED",
};

const PERSIAN_PARTS = ["الف", "ب", "ج", "د", "ه", "و", "ز", "ح", "ط", "ی"];

function formatPartLabel(labelText, labelAlign) {
  const t = String(labelText || "").trim();
  if (!t) return "";
  return labelAlign === "LEFT" ? `${t})` : `(${t}`;
}

function partLabel(i) {
  return PERSIAN_PARTS[i] || `${toPersianDigits(i + 1)}`;
}

function normalizeRangePartSettings(r) {
  r.partSettings = r.partSettings || {};

  if (
    !Object.values(RANGE_PART_LABEL_MODES).includes(r.partSettings.labelMode)
  ) {
    r.partSettings.labelMode = RANGE_PART_LABEL_MODES.PERSIAN;
  }

  if (!["RIGHT", "LEFT"].includes(r.partSettings.labelAlign)) {
    r.partSettings.labelAlign = "RIGHT";
  }

  const cols = parseInt(r.partSettings.columns, 10);
  r.partSettings.columns = Number.isFinite(cols)
    ? Math.max(1, Math.min(cols, 6))
    : 1;

  if (
    !Object.values(RANGE_PART_DIVIDER_STYLES).includes(
      r.partSettings.dividerStyle,
    )
  ) {
    r.partSettings.dividerStyle = RANGE_PART_DIVIDER_STYLES.NONE;
  }
}

function getPartLabelByMode(idx, mode) {
  if (mode === RANGE_PART_LABEL_MODES.NONE) return "";
  if (mode === RANGE_PART_LABEL_MODES.PERSIAN) return partLabel(idx);
  if (mode === RANGE_PART_LABEL_MODES.NUMBER) return toPersianDigits(idx + 1);
  if (mode === RANGE_PART_LABEL_MODES.ENGLISH) {
    const n = idx;
    let s = "";
    let x = n;
    do {
      s = String.fromCharCode(65 + (x % 26)) + s;
      x = Math.floor(x / 26) - 1;
    } while (x >= 0);
    return s;
  }
  return partLabel(idx);
}

/* =========================
   Deep Proxy + Global State
========================= */
function createDeepProxy(
  target,
  callbacks,
  path = [],
  proxies = new WeakMap(),
) {
  if (typeof target !== "object" || target === null) return target;
  if (proxies.has(target)) return proxies.get(target);

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
          callbacks.forEach((cb) => cb?.(pathStr));
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
      callbacks.forEach((cb) => cb?.(pathStr));
      return true;
    },

    deleteProperty(obj, prop) {
      const pathStr = path.concat(prop).join(".");
      delete obj[prop];
      callbacks.forEach((cb) => cb?.(pathStr));
      return true;
    },
  };

  const proxy = new Proxy(target, handler);
  proxies.set(target, proxy);
  return proxy;
}

const initialPrintSetting = {
  templateId: "classic",
  sheet: {
    bordered: true,
    striped: false,
    compact: false,
    threeColScoreLeft: false,
    showScore: true,
  },
  header: {
    columns: 2,
    showStudentName: false,
    blocks: [
      { id: "name", type: "name", title: "نام و نام خانوادگی", locked: true },
    ],
  },
};

const rawState = {
  ranges: [],
  names: [],
  namesCount: 1,
  font: "'BNazanin', sans-serif",
  fontSize: "16px",
  modal: { isOpen: false, rangeId: null, itemId: null, tempItem: null },
  print: { ...initialPrintSetting },
  selectedClassId: null,
};

const _autoSaveProxy = debounce(() => {
  if (!currentProjectId) return;

  const plain = JSON.parse(JSON.stringify(appState));

  updateProjectState(currentProjectId, plain).catch((err) =>
    console.warn("Auto-save error:", err),
  );
}, 1200);

const _totalScoreProxy = (pathStr) => {
  if (pathStr.startsWith("ranges")) updateRangesTotalScoreUI?.();
};

let appState = createDeepProxy(rawState, [
  _autoSaveProxy,
  _totalScoreProxy,
  _livePreviewProxy,
]);

let currentProjectId = null;

/* =========================
   State helpers (Ranges/Items)
========================= */
function findRangeById(id) {
  return appState.ranges.find((r) => r.id === id);
}

function updateRangeInState(rangeId, updates) {
  const index = appState.ranges.findIndex((r) => r.id === rangeId);
  if (index !== -1)
    appState.ranges[index] = { ...appState.ranges[index], ...updates };
}

function updateItemInState(rangeId, itemId, updates) {
  const range = findRangeById(rangeId);
  if (!range) return;
  const itemIndex = range.items.findIndex((it) => it.id === itemId);
  if (itemIndex !== -1)
    range.items[itemIndex] = { ...range.items[itemIndex], ...updates };
}

function removeItemFromState(rangeId, itemId) {
  const range = findRangeById(rangeId);
  if (!range) return;
  range.items = range.items.filter((it) => it.id !== itemId);
}

function reorderRangesInState(newOrderIds) {
  appState.ranges = newOrderIds.map((id) => findRangeById(id)).filter(Boolean);
}

function createTextItem(html = ITEM_DEFAULTS.text.html) {
  return {
    id: createRandomId("item"),
    text: { html },
    image: null,
    labelId: null,
  };
}

function createImageItem({
  src,
  imageId = createRandomId("img"),
  height = ITEM_DEFAULTS.image.height,
  align = ITEM_DEFAULTS.image.align,
}) {
  return {
    id: createRandomId("item"),
    text: null,
    image: { src, height, align, imageId },
    labelId: null,
  };
}

// ========== Animation Helpers ==========
function nextTwoFrames() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

async function animateEnterEl(el, enterClass, { removeAfterFrames = 2 } = {}) {
  if (!el) return;

  el.classList.add(enterClass);

  if (removeAfterFrames === 1) {
    await new Promise((r) => requestAnimationFrame(r));
  } else {
    await nextTwoFrames();
  }

  el.classList.remove(enterClass);
}

async function appendWithEnterAnimation(parent, el, enterClass, options = {}) {
  parent.appendChild(el);
  await animateEnterEl(el, enterClass, options);
  return el;
}

function animateAndRemove(el, opts = {}, callback) {
  const {
    mode = "fade", // "fade" | "collapse"
    exitClass = null,
    duration = 300,
    easing = "ease",
    removeOn = "transitionend",
    propertyName = mode === "collapse" ? "height" : "opacity",
    collapseTransform = "scale(0.8)",
    finalOpacity = "0",
  } = opts;

  if (!el) return;

  if (mode === "collapse") {
    const h = el.offsetHeight;
    if (exitClass) el.classList.add(exitClass);

    el.style.transition = `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}, height ${duration}ms ${easing}, margin ${duration}ms ${easing}, padding ${duration}ms ${easing}`;
    el.style.overflow = "hidden";
    el.style.height = h + "px";
    el.offsetHeight;

    el.style.opacity = finalOpacity;
    el.style.transform = collapseTransform;
    el.style.height = "0";
    el.style.margin = "0";
    el.style.padding = "0";

    const finish = () => {
      el.remove();
      callback?.();
    };
    const onEnd = (e) => {
      if (e.target === el && e.propertyName === propertyName) finish();
    };
    el.addEventListener("transitionend", onEnd);
    setTimeout(finish, duration + 80);
    return;
  }

  // fade
  if (exitClass) el.classList.add(exitClass);

  const finish = () => {
    el.remove();
    callback?.();
  };
  const onEnd = (e) => {
    if (e.target !== el) return;
    if (
      propertyName &&
      e.type === "transitionend" &&
      e.propertyName !== propertyName
    )
      return;
    finish();
  };

  if (removeOn === "transitionend") el.addEventListener("transitionend", onEnd);
  if (removeOn === "animationend") el.addEventListener("animationend", onEnd);
  setTimeout(finish, duration + 60);
}

function staggerRender(items, renderOne, { delay = 80 } = {}) {
  items.forEach((item, index) => {
    setTimeout(() => renderOne(item, index), index * delay);
  });
}

// ========== Item Rendering ==========
function getAlignmentClass(align) {
  const classes = { RIGHT: "ml-auto", LEFT: "mr-auto", CENTER: "mx-auto" };
  return classes[align] || "";
}

function renderItemContent(item, options = {}) {
  const { imageClass = "", textClass = "" } = options;
  let html = "";

  const { text } = item;
  let textContent = text?.html || "";
  const textPos = item.image?.float ? "position: absolute;" : "";
  textContent = String(textContent);
  if (textContent && textContent.trim() !== "") {
    html += `<div class="${textClass}" style="${textPos}">${textContent}</div>`;
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
    fragment.appendChild(itemContainer);
  });

  preview.appendChild(fragment);

  preview.querySelectorAll(".item-thumbnail").forEach((el) => {
    animateEnterEl(el, "item-thumbnail-enter", { removeAfterFrames: 1 });
    renderMathInContainer(el);
  });

  preview.classList.toggle("collapsed", !!range.itemsCollapsed);
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
    "item-thumbnail group relative w-full h-[140px] md:h-[160px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition " +
    "hover:shadow-md hover:border-slate-300 active:scale-[0.99] " +
    "flex flex-col";

  container.dataset.itemId = item.id;

  const range = findRangeById(rangeId);
  const rangeDesc = range ? range.desc : "";

  const labelName = range ? getItemLabelName(range, item) : null;
  const labelBtnText = labelName ? sanitizeText(labelName) : "افزودن برچسب";
  const labelBtnIcon = labelName ? "bi-tag" : "bi-plus-lg";

  const textHtml = String(item?.text?.html || "");
  const hasText = textHtml.trim() !== "";
  const hasImage = !!item?.image;

  let contentHtml = "";
  if (hasImage) {
    const img = item.image;
    const alignClass = getAlignmentClass(img.align);
    const safeH = Math.max(60, Math.min(Number(img.height) || 90, 140));
    contentHtml += `
      <div class="shrink-0">
        <img
          src="${img.src}"
          alt=""
          class="${alignClass} block rounded-lg border border-slate-100 bg-slate-50 object-contain"
          style="height:${safeH}px;width:auto;max-width:100%;"
        />
      </div>
    `;
  }

  if (hasText) {
    contentHtml += `
      <div class="min-w-0 text-[10px] leading-5 overflow-hidden">
        <div class="line-clamp-4 md:line-clamp-5">${textHtml}</div>
      </div>
    `;
  }

  container.innerHTML = `
    <!-- Header -->
    <div class="flex items-center justify-between gap-2 p-0">
      <button
        class="inline-flex max-w-[75%] items-center gap-1 rounded-full border .border-border-dark bg-surface px-2.5 py-1 text-[11px]
               hover:bg-slate-100 transition"
        data-action="open-item-label"
        data-range-id="${rangeId}"
        data-item-id="${item.id}"
        title="برچسب"
      >
        <i class="bi ${labelBtnIcon}"></i>
        <span class="truncate">${labelBtnText}</span>
        <i class="bi bi-chevron-down text-[10px] opacity-70"></i>
      </button>

      <div class="text-[10px] truncate">
        ${sanitizeText(rangeDesc || "")}
      </div>
    </div>

    <!-- Body -->
    <div class="flex-1 p-1 overflow-hidden">
      <div class="h-full p-2
                  flex gap-2 items-start overflow-hidden">
        ${contentHtml || `<div class="text-[10px]">بدون محتوا</div>`}
      </div>
    </div>

    <!-- Footer actions -->
    <div class="grid grid-cols-3 gap-px bg-slate-100">
      <button title="حذف"
        class="remove-item py-2 btn btn-danger text-[12px]" style="border-radius: 0;">
        <i class="bi bi-trash3"></i>
        <span class="hidden md:inline">حذف</span>
      </button>
      <button title="ویرایش"
        class="edit-item btn btn-primary  py-2  transition flex items-center justify-center gap-1 text-[12px]" style="border-radius: 0;">
        <i class="bi bi-pencil-square"></i>
        <span class="hidden md:inline">ویرایش</span>
      </button>
      <button title="کپی"
        class="copy-item  btn btn-secondary py-2  transition flex items-center justify-center gap-1 text-[12px]" style="border-radius: 0;">
        <i class="bi bi-copy"></i>
        <span class="hidden md:inline">کپی</span>
      </button>
    </div>
  `;

  const removeBtn = container.querySelector(".remove-item");
  const copyItemBtn = container.querySelector(".copy-item");
  const editItemBtn = container.querySelector(".edit-item");

  [removeBtn, copyItemBtn, editItemBtn].forEach((btn) => {
    if (!btn) return;
    btn.addEventListener("click", (e) => e.stopPropagation());
  });

  removeBtn.onclick = (e) => {
    e.stopPropagation();
    showConfirm({
      msg: "آیتم حذف شود؟",
      on_confirm: () => {
        animateAndRemove(
          container,
          {
            mode: "fade",
            exitClass: "item-thumbnail-exit",
            duration: 300,
            removeOn: "transitionend",
            propertyName: "opacity",
          },
          () => {
            removeItemFromState(rangeId, item.id);
            updateRangeBadges(rangeId, rangeDiv);
          },
        );
      },
    });
  };

  copyItemBtn.onclick = (e) => {
    e.stopPropagation();
    const payload = buildClipboardPayloadForItems(rangeId, [item]);
    copyToClipboard(JSON.stringify(payload));
  };

  editItemBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openItemModal(rangeId, item.id);
  });

  return container;
}

function updateRangeBadges(rangeId, rangeDiv = null) {
  const range = findRangeById(rangeId);
  const container = rangeDiv || document.getElementById(rangeId);
  function setBadge($, val) {
    const badge = container.querySelector($);
    if (badge) badge.textContent = toPersianDigits(val || 0);
  }
  setBadge(".count-badge", range.count);
  setBadge(".total-badge", range.items.length);
  setBadge(".range-total", range.items.length);
  setBadge(".score-badge", range.score);
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

    const addBtn = `
   <button class="btn btn-outline w-full text-right rounded-[12px] px-2.5 py-2.5 flex items-center gap-2"
           data-action="add-label">
     <i class="bi bi-plus-lg"></i>
     <span class="text-[13px] font-bold">افزودن برچسب</span>
   </button>
   `;

    const clearBtn = `
   <button class="btn btn-outline btn-dashed w-full text-right rounded-[12px] px-2.5 py-2.5 flex items-center gap-2"
           data-action="clear-label">
     <i class="bi bi-x-lg"></i>
     <span class="text-[13px] font-bold">بدون برچسب</span>
   </button>`;

    const hasLabel = !!range.labels.length;
    let rows;
    if (hasLabel) {
      rows = range.labels
        .map((l) => {
          const isActive = l.id === activeId;
          return `
        <div class="w-full rounded-[12px] px-2.5 py-2.5 flex items-center justify-between gap-2
                    hover:bg-surface-dark border border-transparent hover:border-border-light"
             data-row-label-id="${l.id}">
          <button class="flex-1 text-right inline-flex items-center gap-2 w-0"
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
    } else {
      rows = `
      <div class="flex flex-col gap-1 items-center justify-center text-muted">
      <i class="bi bi-inbox text-6xl"></i>
      <span class="text-sm"> برچسبی ثبت نشده! </span>
      </div>
      `;
    }

    return `
    <div class="flex items-center gap-1">
        ${addBtn}
        ${hasLabel ? clearBtn : ""}
    </div>
    ${rows}
    `;
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

// ========== Range Settings Modal ==========
const rangeSettingsModal = new Modal("#modal-range-settings", {
  title: "تنظیمات",
  closeOnOverlayClick: false,
});

let _rsRangeId = null;
let _rsTemp = null;

function fillCountSelectOptions(selectEl, maxCount) {
  if (!selectEl) return;
  const max = Math.max(0, parseInt(maxCount || 0, 10) || 0);

  if (max <= 0) {
    selectEl.innerHTML = `<option value="1">۱</option>`;
    selectEl.value = "1";
    selectEl.disabled = true;
    return;
  }

  selectEl.disabled = false;
  selectEl.innerHTML = Array.from({ length: max || 1 }, (_, i) => i + 1)
    .map((n) => `<option value="${n}">${toPersianDigits(n)}</option>`)
    .join("");
}

function renderRangeSettingsPreview(tempRange) {
  const wrap = document.getElementById("rangeSettingsPreview");
  if (!wrap) return;

  const itemsAll = Array.isArray(tempRange?.items) ? tempRange.items : [];

  const maxCount = getRangeMaxRenderableCount(tempRange);
  const safeCount =
    maxCount > 0
      ? Math.min(parseInt(tempRange.count || 0, 10) || 0, maxCount)
      : 0;

  const pickedItems =
    safeCount > 0 ? pickRandomItemsUniqueLabels(itemsAll, safeCount, true) : [];

  const previewRange = {
    ...tempRange,
    count: safeCount,
    items: pickedItems,
  };

  if (!pickedItems.length) {
    wrap.innerHTML = `
      <div class="text-sm text-muted text-center py-3">
        آیتمی برای پیش‌نمایش وجود ندارد.
      </div>
    `;
    return;
  }

  const sheet = appState.print?.sheet || {};
  const bordered = sheet.bordered !== false;
  const striped = !!sheet.striped;
  const compact = !!sheet.compact;

  const threeColScoreLeft = !!sheet.threeColScoreLeft;
  const showScore = sheet.showScore !== false;

  const tableBase = ["w-full border-collapse text-[0.95em] leading-6"];
  if (compact) tableBase.push("text-[0.9em]");
  const trStripedClass = striped ? "even:bg-slate-50" : "";
  const cellBorderClass = bordered ? "border border-slate-900/70" : "border-0";
  const cellPadClass = compact ? "px-2 py-0.5" : "px-2 py-1.5";

  const rowHtml = createQuestionRowHtmlMulti(1, previewRange, {
    trStripedClass,
    cellBorderClass,
    cellPadClass,
    threeColScoreLeft,
    showScore,
  });

  wrap.innerHTML = `<table class="${tableBase.join(" ")}"><tbody>${rowHtml}</tbody></table>`;
  renderMathInContainer(wrap);
}

function openRangeSettingsModal(rangeId) {
  const range = findRangeById(rangeId);
  if (!range) return;

  _rsRangeId = rangeId;
  normalizeRangePartSettings(range);

  // temp
  _rsTemp = {
    rangeName: range.rangeName || "",
    count: range.count || 1,
    score: range.score ?? 1,
    desc: range.desc || "",
    partSettings: range.partSettings
      ? JSON.parse(JSON.stringify(range.partSettings))
      : {
          labelMode: RANGE_PART_LABEL_MODES.PERSIAN,
          labelAlign: "RIGHT",
          columns: 1,
          dividerStyle: RANGE_PART_DIVIDER_STYLES.NONE,
        },
    items: range.items || [],
    labels: range.labels || [],
  };

  const root = document.querySelector("#modal-range-settings");
  if (!root) return;

  let countSel = root.querySelector(".rs-count");
  let scoreInp = root.querySelector(".rs-score");
  let descTa = root.querySelector(".rs-desc");

  let modeSel = root.querySelector(".rs-part-label-mode");
  let alignSel = root.querySelector(".rs-part-label-align");
  let colsSel = root.querySelector(".rs-part-columns");
  let partWrap = root.querySelector(".rs-part-settings");
  let dividerSel = root.querySelector(".rs-part-divider");

  let saveBtn = document.getElementById("rsSaveBtn");

  const rebinder = (el, binder) => {
    if (!el) return el;
    const clone = el.cloneNode(true);
    el.replaceWith(clone);
    binder(clone);
    return clone;
  };

  scoreInp = rebinder(scoreInp, (el) => {
    el.addEventListener("input", (e) => {
      _rsTemp.score = e.target.value;
      renderRangeSettingsPreview(_rsTemp);
    });
  });

  descTa = rebinder(descTa, (el) => {
    el.addEventListener("input", (e) => {
      _rsTemp.desc = e.target.value;
      renderRangeSettingsPreview(_rsTemp);
    });
  });

  modeSel = rebinder(modeSel, (el) => {
    el.addEventListener("change", (e) => {
      _rsTemp.partSettings.labelMode = e.target.value;
      syncPartUI();
      renderRangeSettingsPreview(_rsTemp);
    });
  });

  alignSel = rebinder(alignSel, (el) => {
    el.addEventListener("change", (e) => {
      if (_rsTemp.partSettings.labelMode === RANGE_PART_LABEL_MODES.NONE)
        return;
      _rsTemp.partSettings.labelAlign = e.target.value;
      syncPartUI();
      renderRangeSettingsPreview(_rsTemp);
    });
  });

  colsSel = rebinder(colsSel, (el) => {
    el.addEventListener("change", (e) => {
      _rsTemp.partSettings.columns = parseInt(e.target.value, 10) || 1;
      syncPartUI();
      renderRangeSettingsPreview(_rsTemp);
    });
  });

  dividerSel = rebinder(dividerSel, (el) => {
    el.addEventListener("change", (e) => {
      _rsTemp.partSettings.dividerStyle = e.target.value;
      syncPartUI();
      renderRangeSettingsPreview(_rsTemp);
    });
  });

  const syncPartUI = () => {
    normalizeRangePartSettings(_rsTemp);

    const noLabel =
      _rsTemp.partSettings.labelMode === RANGE_PART_LABEL_MODES.NONE;

    if (alignSel) alignSel.disabled = noLabel;

    if (partWrap)
      partWrap.classList.toggle("hidden", (+_rsTemp.count || 0) < 2);

    if (noLabel) {
      _rsTemp.partSettings.labelAlign = "RIGHT";
      if (alignSel) alignSel.value = "RIGHT";
    }
  };

  const syncCountUI = () => {
    const maxCount = getRangeMaxRenderableCount(range);

    _rsTemp.count = clampRangeCountToRenderable(range, _rsTemp.count);

    fillCountSelectOptions(countSel, maxCount);

    if (countSel) {
      countSel.value = String(_rsTemp.count || 1);
      countSel.disabled = false;
    }
  };

  countSel = rebinder(countSel, (el) => {
    el.addEventListener("change", (e) => {
      _rsTemp.count = parseInt(e.target.value, 10) || 1;
      _rsTemp.count = clampRangeCountToRenderable(range, _rsTemp.count);
      syncPartUI();
      renderRangeSettingsPreview(_rsTemp);
    });
  });

  saveBtn = rebinder(saveBtn, (el) => {
    el.addEventListener("click", () => {
      const r = findRangeById(_rsRangeId);
      if (!r || !_rsTemp) return;

      r.score = _rsTemp.score;
      r.desc = _rsTemp.desc || "";

      const newMax = getRangeMaxRenderableCount(r);
      r.count = newMax > 0 ? Math.min(_rsTemp.count || 1, newMax) : 1;

      r.partSettings = _rsTemp.partSettings
        ? JSON.parse(JSON.stringify(_rsTemp.partSettings))
        : r.partSettings;

      normalizeRangePartSettings(r);

      updateRangeBadges(rangeId);
      scheduleLivePreview();
      rangeSettingsModal.close();
      _rsRangeId = null;
      _rsTemp = null;
      showToast("تنظیمات با موفقیت ذخیره شد.");
    });
  });

  // ---- initial fill ----
  if (scoreInp) scoreInp.value = _rsTemp.score ?? "";
  if (descTa) descTa.value = _rsTemp.desc ?? "";

  if (modeSel)
    modeSel.value =
      _rsTemp.partSettings.labelMode || RANGE_PART_LABEL_MODES.PERSIAN;

  if (alignSel) alignSel.value = _rsTemp.partSettings.labelAlign || "RIGHT";
  if (colsSel) colsSel.value = String(_rsTemp.partSettings.columns || 1);

  if (dividerSel)
    dividerSel.value =
      _rsTemp.partSettings.dividerStyle || RANGE_PART_DIVIDER_STYLES.NONE;

  syncCountUI();
  syncPartUI();
  renderRangeSettingsPreview(_rsTemp);

  rangeSettingsModal.open();
}

// ========== Range DOM Building ==========
const RANGE_COUNT_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1);

function getRangeMaxRenderableCount(range) {
  const items = Array.isArray(range?.items) ? range.items : [];
  if (!items.length) return 0;

  const labeled = items.filter((it) => !!it.labelId);
  const unlabeled = items.filter((it) => !it.labelId);

  const uniqLabels = new Set(labeled.map((it) => it.labelId)).size;

  const maxPossible = uniqLabels + unlabeled.length;

  return Math.min(maxPossible, items.length);
}

function clampRangeCountToRenderable(range, desired) {
  const max = getRangeMaxRenderableCount(range);
  if (max <= 0) return 0;
  const d = parseInt(desired, 10) || 1;
  return Math.max(1, Math.min(d, max));
}

const rangesContainer = document.getElementById("ranges");
const totalScoreEl = document.getElementById("total-ranges-score");

let activeRangeId = null; // last clicked range (for paste)

function getRangeHTML(rangeData) {
  return isMobile()
    ? getMobileRangeHTML(rangeData)
    : getDesktopRangeHTML(rangeData);
}

function getMobileRangeHTML(rangeData) {
  return `
    <div class="relative range-card-mobile my-1 rounded-custom bg-surface border border-border-light/80 p-4 transition-all">

      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0 flex-1">
         <div class="flex items-center gap-1">
          <label class="text-xs text-muted">مبحث</label>
        <input type="text" class="range-name-input" value="${sanitizeText(rangeData.rangeName || "بدون عنوان")}"/>
         </div>
          <div class="mt-2 flex gap-2 text-xs">
            <span class="px-2 py-1 rounded-custom bg-surface-dark border border-border-light/60 text-secondary">
              تعداد برای هر نفر: <span class="count-badge font-semibold text-primary">${toPersianDigits(rangeData.count || 0)}</span>
            </span>
            <span class="px-2 py-1 rounded-custom bg-surface-dark border border-border-light/60 text-secondary">
              نمره: <span class="score-badge font-semibold text-primary">${toPersianDigits(rangeData.score || 0)}</span>
            </span>
          </div>
        </div>

        <div class="flex items-center gap-1">
          <button data-action="move-up" class="move-up action-circle flex-shrink-0 w-9 h-9 flex items-center justify-center">
            <i class="bi bi-arrow-up-short text-lg"></i>
          </button>
          <button data-action="move-down" class="move-down action-circle flex-shrink-0 w-9 h-9 flex items-center justify-center">
            <i class="bi bi-arrow-down-short text-lg"></i>
          </button>

          <div class="dropdown relative">
            <button class="dropdown-toggle action-circle border-0 w-9 h-9 flex items-center justify-center">
              <i class="bi bi-three-dots-vertical text-base text-secondary"></i>
            </button>
            <div class="dropdown-menu hidden min-w-[170px] absolute top-full left-0 bg-surface border border-border-light rounded-custom p-2 shadow-lg z-50 flex-col gap-1">
              <button data-action="copy-range" class="copy-range flex items-center gap-2 px-4 py-2.5 text-sm text-secondary hover:bg-surface-dark rounded-custom transition-all w-full text-right">
                <i class="bi bi-copy text-muted"></i> کپی
              </button>
              <button data-action="paste-range" class="paste-range flex items-center gap-2 px-4 py-2.5 text-sm text-secondary hover:bg-surface-dark rounded-custom w-full text-right">
                <i class="bi bi-clipboard-plus text-muted"></i> چسباندن
              </button>
              <button data-action="remove-range" class="remove-range flex items-center gap-2 px-4 py-2.5 text-sm text-secondary hover:bg-surface-dark rounded-custom transition-all w-full text-right">
                <i class="bi bi-trash3 text-muted"></i> حذف
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- دکمه‌ها: افزودن سوال + تنظیمات  -->
      <div class="flex gap-2 mt-3">
        <button data-action="add-text-item" class="add-text-item flex-1 flex items-center justify-center gap-2 bg-surface-dark hover:bg-surface-darker text-secondary rounded-custom py-2.5 text-sm font-medium transition-all active:scale-[0.98]">
          <i class="bi bi-plus-lg text-lg"></i> <span>افزودن سوال</span>
        </button>

        <button data-action="open-range-settings" class="add-text-item flex-1 flex items-center justify-center gap-2 bg-surface-dark hover:bg-surface-darker text-secondary rounded-custom py-2.5 text-sm font-medium transition-all active:scale-[0.98]">
        <i class="bi bi-gear text-base"></i>
        <span>تنظیمات</span>
        </button>
      </div>

      <div class="preview-section border-t border-border-light pt-3 mt-3">
        <button data-action="toggle-items" class="toggle-items-btn flex gap-2 items-center w-full bg-surface-dark hover:bg-surface-darker rounded-custom px-4 py-2.5 transition-all ${rangeData.itemsCollapsed ? "collapsed" : ""}">
          <span class="text-sm font-medium text-secondary flex items-center gap-2">
            <i class="bi bi-grid-3x3-gap-fill text-muted"></i>سوالات تعریف شده
          </span>
          <span class="range-total flex items-center justify-center min-w-[2rem] h-8 px-2 bg-surface-darker text-secondary rounded-circle text-sm font-semibold">
            ${toPersianDigits(rangeData.items.length)}
          </span>
          <i class="mr-auto transition-transform duration-300 bi-chevron-down text-muted toggle-arrow text-lg"></i>
        </button>

        <div class="items-preview grid grid-cols-2 gap-[5px] mt-3 ${rangeData.itemsCollapsed ? "collapsed" : ""}">
          <!-- آیتم‌ها -->
        </div>
      </div>
    </div>
  `;
}

function getDesktopRangeHTML(rangeData) {
  return `
  <div class="group relative overflow-visible rounded-2xl border border-border-dark p-4 shadow-[0_10px_30px_-18px_rgba(0,0,0,.65)]">

    <div class="relative">
      <div class="pointer-events-none absolute -inset-4 rounded-[22px] opacity-0 blur-2xl transition duration-300 group-hover:opacity-100"
           style="background: radial-gradient(650px 220px at 85% 0%, rgba(99,102,241,.18), transparent 55%),
                          radial-gradient(520px 200px at 0% 15%, rgba(16,185,129,.10), transparent 55%);">
      </div>

      <div class="relative flex items-start justify-between gap-4">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-3 min-w-0">
            <div class="shrink-0 grid place-items-center w-10 h-10 rounded-2xl border border-border-light/60 bg-surface-darker">
              <i class="bi bi-journal-text text-lg text-secondary"></i>
            </div>

            <div class="min-w-0 w-full">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-xs text-muted tracking-wide">مبحث</span>
                <input type="text" class="range-name-input" style="width: auto;" value="${sanitizeText(rangeData.rangeName || "بدون عنوان")}"/>
              </div>

              <div class="mt-2 flex flex-wrap items-center gap-2">
                <span class="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border border-border-light/60 bg-surface-darker text-xs text-secondary">
                  <i class="bi bi-hash text-muted"></i>
                  تعداد سوال هر نفر
                  <span class="count-badge font-semibold text-primary">${toPersianDigits(rangeData.count || 0)}</span>
                </span>

                <span class="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border border-border-light/60 bg-surface-darker text-xs text-secondary">
                  <i class="bi bi-award text-muted"></i>
                  نمره
                  <span class="score-badge font-semibold text-primary">${toPersianDigits(rangeData.score || 0)}</span>
                </span>

                <span class="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border border-border-light/60 bg-surface-darker text-xs text-secondary">
                  <i class="bi bi-grid-3x3-gap text-muted"></i>
                  سوالات
                  <span class="total-badge font-semibold text-primary">${toPersianDigits(rangeData.items.length || 0)}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="shrink-0 flex items-center gap-2">
          <!-- add-text-item + open-range-settings کنار هم -->
          <div class="flex items-center rounded-2xl border border-border-light/60 bg-surface-darker p-1">
            <button
              data-action="add-text-item"
              class="add-text-item inline-flex items-center justify-center w-10 h-10 rounded-xl text-muted hover:text-primary hover:bg-surface-dark transition"
              data-tooltip="تعریف سوال"
            >
              <i class="bi bi-plus-lg text-base"></i>
            </button>
          </div>
          <div class="flex items-center rounded-2xl border border-border-light/60 bg-surface-darker p-1">
            <button
              data-action="open-range-settings"
              class="inline-flex items-center justify-center w-10 h-10 rounded-xl text-muted hover:text-primary hover:bg-surface-dark transition"
              data-tooltip="تنظیمات"
            >
              <i class="bi bi-gear"></i>
            </button>
          </div>

          <div class="flex items-center rounded-2xl border border-border-light/60 bg-surface-darker p-1">
            <button data-action="copy-range" data-tooltip="کپی آیتم ها"
                    class="copy-range inline-flex items-center justify-center w-10 h-10 rounded-xl text-muted hover:text-primary hover:bg-surface-dark transition">
              <i class="bi bi-copy"></i>
            </button>

            <button data-action="paste-range" data-tooltip="چسباندن"
                    class="paste-range inline-flex items-center justify-center w-10 h-10 rounded-xl text-muted hover:text-primary hover:bg-surface-dark transition">
              <i class="bi bi-clipboard-plus"></i>
            </button>

            <button data-action="remove-range" data-tooltip="حذف مبحث"
                    class="remove-range inline-flex items-center justify-center w-10 h-10 rounded-xl text-muted hover:text-error hover:bg-surface-dark transition">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="preview-section border-t border-border-light mt-3 pt-2">
      <button data-action="toggle-items" class="toggle-items-btn flex gap-2 items-center w-full rounded-custom py-2 ${rangeData.itemsCollapsed ? "collapsed" : ""}">
        <span class="text-sm font-medium text-secondary flex items-center gap-2">
          <i class="bi bi-grid-3x3-gap-fill text-muted"></i>سوالات تعریف شده
        </span>
        <span class="range-total hidden flex items-center justify-center min-w-[2rem] h-8 px-2 bg-surface-darker text-secondary rounded-circle text-sm font-semibold">
          ${toPersianDigits(rangeData.items.length)}
        </span>
        <i class="mr-auto transition-transform duration-300 bi-chevron-down text-muted toggle-arrow text-lg"></i>
      </button>

      <div class="items-preview grid grid-cols-6 gap-[5px] mt-2 ${rangeData.itemsCollapsed ? "collapsed" : ""}">
        <!-- آیتم‌ها -->
      </div>
    </div>

  </div>`;
}

function calculateTotalScore() {
  return appState.ranges.reduce((acc, { count, score, items }) => {
    const isValidScore = score && count && items.length > 0;
    return isValidScore ? acc + +score : acc;
  }, 0);
}

function updateRangesTotalScoreUI() {
  const totalScore = calculateTotalScore();
  totalScoreEl.classList.toggle("hidden", !!!totalScore);
  totalScoreEl.innerHTML = `جمع بارم: ${toPersianDigits(totalScore || 0)} نمره`;
}

function setupRangeActionsDelegation(rangeElement, rangeId) {
  if (rangeElement.dataset.actionsBound === "1") return;
  rangeElement.dataset.actionsBound = "1";

  rangeElement.addEventListener("click", async (e) => {
    const actionEl = e.target.closest("[data-action]");
    if (!actionEl || !rangeElement.contains(actionEl)) return;

    const action = actionEl.dataset.action;
    if (!action) return;

    e.stopPropagation();

    switch (action) {
      case "open-item-label":
        const itemId = actionEl.dataset.itemId;

        const range = findRangeById(rangeId);
        const item = range?.items.find((it) => it.id === itemId);
        if (!range || !item) return;

        openLabelDropdown({
          rangeId,
          anchorEl: actionEl,
          getActiveLabelId: () => item.labelId,
          setActiveLabelId: (lid) => {
            item.labelId = lid;
          },
          onAfterChange: () => {
            updateThumbnailLabelUI(rangeId, itemId);
          },
        });
        return;

      case "remove-range": {
        showConfirm({
          msg: "آیا از حذف این مبحث اطمینان دارید؟",
          on_confirm: () => {
            animateAndRemove(
              rangeElement,
              { mode: "collapse", duration: 300 },
              () => {
                appState.ranges = appState.ranges.filter(
                  (r) => r.id !== rangeId,
                );
              },
            );
          },
        });
        return;
      }

      case "copy-range": {
        const items = findRangeById(rangeId)?.items || [];
        if (!items.length)
          return showToast("آیتمی برای کپی وجود ندارد.", "error");
        const payload = buildClipboardPayloadForItems(rangeId, items);
        copyToClipboard(JSON.stringify(payload));
        return;
      }

      case "paste-range": {
        await handlePasteInsideRange(rangeId);
        return;
      }

      case "move-up": {
        moveRange(rangeId, "up");
        return;
      }

      case "move-down": {
        moveRange(rangeId, "down");
        return;
      }

      case "add-text-item": {
        const newItem = createTextItem();
        openModalForNewItem(rangeId, newItem);
        return;
      }

      case "toggle-items": {
        const range = findRangeById(rangeId);
        if (!range) return;

        range.itemsCollapsed = !range.itemsCollapsed;

        const preview = rangeElement.querySelector(".items-preview");
        const toggleBtn = rangeElement.querySelector(".toggle-items-btn");
        const itemsCollapsed = range.itemsCollapsed;

        if (preview) preview.classList.toggle("collapsed", !!itemsCollapsed);
        if (toggleBtn) {
          toggleBtn.classList.toggle("collapsed", !!itemsCollapsed);
          toggleBtn.setAttribute("aria-expanded", String(!itemsCollapsed));
        }
        return;
      }

      case "open-range-settings": {
        openRangeSettingsModal(rangeId);
        return;
      }

      default:
        return;
    }
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

function setupRangeNameInput(rangeElement, rangeId) {
  rangeElement
    .querySelector(".range-name-input")
    .addEventListener("input", (e) => {
      const newVal = e.target.value;
      updateRangeInState(rangeId, { rangeName: newVal });
    });
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

  setupRangeNameInput(rangeElement, rangeId);
  setupDropdownMenu(rangeElement);
  setupRangeActionsDelegation(rangeElement, rangeId);
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

function getNextDefaultRangeName() {
  const n = (appState?.ranges?.length || 0) + 1;
  return `مبحث ${toPersianDigits(n)}`;
}

function createRangeElement(rangeData = null) {
  if (!rangeData) {
    const newRange = {
      id: createRandomId("range-item"),
      rangeName: getNextDefaultRangeName(),
      count: 1,
      score: 1,
      desc: "",
      items: [],
      itemsCollapsed: false,
      labels: [],
      ui: { metaOpen: false },
      partSettings: {
        labelMode: RANGE_PART_LABEL_MODES.PERSIAN,
        labelAlign: "RIGHT",
        columns: 1,
      },
    };
    appState.ranges.push(newRange);
    rangeData = newRange;
  } else {
    rangeData.ui = rangeData.ui || { metaOpen: false };
    normalizeRangePartSettings(rangeData);
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
    updateRangeBadges(rangeId, rangeDiv);
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

// ========== print settings Section ==========
let printSettingsUI = null;
let hasGeneratedTable = false;

function createPrintSettingsUI() {
  const container = document.createElement("section");
  container.className =
    "print-settings w-full bg-surface shadow-sm md:shadow-none";

  container.innerHTML = `
    <div class="p-2 md:p-2.5">
      <div class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-center">
        <div class="min-w-0 settings-area"></div>

        <div class="flex gap-2 md:justify-end actions-area mb-auto">
          <button class="print-btn max-md:w-full btn btn-secondary px-3 py-2 h-10 whitespace-nowrap">
            <i class="bi bi-printer"></i>
            چاپ
          </button>
        </div>
      </div>
    </div>
  `;

  const settingsArea = container.querySelector(".settings-area");

  // ---- normalize header blocks (همان منطق قبلی) ----
  let blocks = appState.print.header.blocks;

  if (appState.print.header.nameBlock) {
    const label = (
      appState.print.header.nameBlock.label || "نام و نام خانوادگی"
    ).trim();
    const hasName = blocks.some(
      (x) => String(x.id) === "name" || x.type === "name",
    );
    if (!hasName) {
      blocks.unshift({ id: "name", type: "name", title: label, locked: true });
    }
    delete appState.print.header.nameBlock;
  }

  if (blocks.length === 0) {
    blocks = [
      { id: "name", type: "name", title: "نام و نام خانوادگی", locked: true },
      {
        id: crypto.randomUUID?.() || String(Date.now()),
        type: "text",
        title: "برگه آزمون",
        locked: false,
      },
    ];
  }

  const nameIdx = blocks.findIndex(
    (x) => String(x.id) === "name" || x.type === "name",
  );
  if (nameIdx === -1) {
    blocks.unshift({
      id: "name",
      type: "name",
      title: "نام و نام خانوادگی",
      locked: true,
    });
  } else {
    blocks[nameIdx] = {
      ...blocks[nameIdx],
      id: "name",
      type: "name",
      locked: true,
      title: (blocks[nameIdx].title || "نام و نام خانوادگی").trim(),
    };
  }

  appState.print.header.blocks = blocks;

  /* ---------------- Panels ---------------- */

  const panelMain = document.createElement("div");
  panelMain.className = "tab-panel panel-main my-2";
  panelMain.innerHTML = `
  <div class="flex flex-col gap-2">

    <div class="flex flex-wrap items-center gap-3">
      <div class="flex items-center gap-2">
        <label class="text-secondary text-xs md:text-[12px] whitespace-nowrap">تعداد</label>
        <input
          type="text"
          class="names-count-input h-10 px-3 rounded-custom border border-border-light bg-surface text-primary text-sm
                 focus:outline-none focus:ring-2 focus:ring-primary/20"
          value=""
          data-number-input="true"
          style="width: fit-content;"
        />
      </div>

      <div class="flex items-center gap-2">
        <span class="text-xs md:text-[12px] text-secondary whitespace-nowrap">نمایش نام</span>
        <div
          class="student-name-switch"
          data-switch
          data-switch-size="md"
          data-switch-checked="false"
        ></div>
      </div>
    </div>

    <div class="names-area mt-1 hidden">
  <div class="flex items-center justify-between mb-2">
    <div class="text-[12px] md:text-[13px] text-muted leading-6">
      هر نام را در <b class="text-primary"> یک خط جدا</b> بنویسید.
    </div>

    <div class="flex items-center gap-2">
      <select class="class-selector h-9 px-3 rounded-custom border border-border-light bg-surface text-primary text-sm">
        <option value="">انتخاب کلاس...</option>
      </select>

      <button type="button" class="go-classes-btn btn btn-outline px-2 py-1 h-9" data-tooltip="مدیریت کلاس‌ها">
        <i class="bi bi-mortarboard"></i>
      </button>
    </div>
  </div>

  <textarea
    class="names-textarea w-full min-h-[110px] md:min-h-[120px]
           border border-border-light rounded-custom p-2 text-sm bg-surface text-primary
           focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder-muted"
    rows="6"
    placeholder="مثال:
علی رضایی
مریم محمدی"
  >${(appState.names || []).join("\n")}</textarea>
</div>

  </div>
`;

  // --- font panel (مثل قبل) ---
  const panelFont = document.createElement("div");
  panelFont.className = "tab-panel panel-font hidden";
  panelFont.innerHTML = `
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex items-center gap-2">
        <label class="text-secondary text-xs md:text-[12px] whitespace-nowrap">فونت</label>
        <select
          class="font-selector h-10 px-3 rounded-custom border border-border-light bg-surface text-primary text-sm
                focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="'Vazirmatn', sans-serif">وزیرمتن</option>
          <option value="'Shabnam', sans-serif">شبنم</option>
          <option value="'BNazanin', sans-serif">نازنین</option>
        </select>
      </div>

      <div class="flex items-center gap-2">
        <label class="text-secondary text-xs md:text-[12px] whitespace-nowrap">سایز</label>
        <select
          class="font-size-selector h-10 px-3 rounded-custom border border-border-light bg-surface text-primary text-sm
                focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="12px">۱۲</option>
          <option value="13px">۱۳</option>
          <option value="14px">۱۴</option>
          <option value="15px">۱۵</option>
          <option value="16px">۱۶</option>
          <option value="18px">۱۸</option>
          <option value="20px">۲۰</option>
        </select>
      </div>
    </div>
  `;

  // --- template panels ---
  const panelSheet = document.createElement("div");
  panelSheet.className = "tab-panel panel-sheet hidden my-2";
  panelSheet.innerHTML = `
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <div class="flex gap-2 items-center">
        <label class="text-secondary text-xs md:text-[12px] whitespace-nowrap">الگو</label>
        <select
          class="template-selector h-10 px-3 rounded-custom border border-border-light bg-surface text-primary text-sm
                 focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          ${Object.values(PRINT_TEMPLATES)
            .map((t) => `<option value="${t.id}">${t.title}</option>`)
            .join("")}
        </select>
      </div>
      <div class="text-[12px] text-muted leading-6">
        ظاهر سربرگ و جدول را تعیین می‌کند.
      </div>
    </div>

    <div class="flex max-md:flex-col max-md:w-full gap-2">
      <div class="inline-flex items-center justify-between gap-3 border border-border-light rounded-custom px-3 py-2 bg-surface">
        <span class="text-sm text-primary">کادر جدول</span>
        <div class="sheet-bordered-switch"
             data-switch data-switch-size="md"
             data-switch-checked="${appState.print?.sheet?.bordered !== false ? "true" : "false"}"></div>
      </div>

      <div class="inline-flex items-center justify-between gap-3 border border-border-light rounded-custom px-3 py-2 bg-surface">
        <span class="text-sm text-primary">راه‌راه (striped)</span>
        <div class="sheet-striped-switch"
             data-switch data-switch-size="md"
             data-switch-checked="${appState.print?.sheet?.striped ? "true" : "false"}"></div>
      </div>

      <div class="inline-flex items-center justify-between gap-3 border border-border-light rounded-custom px-3 py-2 bg-surface">
        <span class="text-sm text-primary">فشرده (کم‌فاصله)</span>
        <div class="sheet-compact-switch"
             data-switch data-switch-size="md"
             data-switch-checked="${appState.print?.sheet?.compact ? "true" : "false"}"></div>
      </div>
    </div>

    <div class="flex max-md:flex-col max-md:w-full gap-2">
      <div class="inline-flex items-center justify-between gap-3 border border-border-light rounded-custom px-3 py-2 bg-surface">
        <span class="text-sm text-primary">سه ستونه (نمره در ستون چپ)</span>
        <div class="sheet-threecol-switch"
             data-switch data-switch-size="md"
             data-switch-checked="${appState.print?.sheet?.threeColScoreLeft ? "true" : "false"}"></div>
      </div>

      <div class="inline-flex items-center justify-between gap-3 border border-border-light rounded-custom px-3 py-2 bg-surface">
        <span class="text-sm text-primary">نمایش نمره</span>
        <div class="sheet-showscore-switch"
             data-switch data-switch-size="md"
             data-switch-checked="${appState.print?.sheet?.showScore !== false ? "true" : "false"}"></div>
      </div>
    </div>

  </div>
`;

  // --- header panel ---
  const panelHeader = document.createElement("div");
  panelHeader.className = "tab-panel panel-header hidden my-2";
  panelHeader.innerHTML = `
    <div class="flex flex-col gap-3">

      <div class="border border-border-light rounded-custom p-2">
        <div class="flex items-center justify-between gap-2 mb-2">
          <div class="text-sm font-medium text-primary">آیتم‌های سربرگ</div>

          <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
          <label class="text-secondary text-xs md:text-[12px] whitespace-nowrap">تعداد ستون</label>
          <select
            class="header-columns h-10 px-3 rounded-custom border border-border-light bg-surface text-primary text-sm
                   focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="1">۱</option>
            <option value="2">۲</option>
            <option value="3">۳</option>
          </select>
        </div>
          <button class="btn btn-secondary header-add-item px-2.5 py-2 h-9 whitespace-nowrap" type="button">
            <i class="bi bi-plus-lg"></i>
          </button>
          </div>
        </div>

        <div class="header-items header-items-grid"></div>
      </div>

    </div>
  `;

  /* ---------------- Tabs ---------------- */
  const tabs = new Tabs({
    containerClass: "flex flex-col min-w-0",
    headerClass: "flex items-center gap-8 min-w-0",
    titleText: "تنظیمات چاپ : ",
    titleIconClass: "bi bi-gear text-secondary",
    titleClass:
      "flex items-center gap-2 text-sm font-medium text-primary min-w-0",
    buttonBaseClass:
      "settings-tab flex-1 md:flex-none text-center text-xs px-3 py-2 rounded-custom cursor-pointer transition-colors flex items-center justify-center gap-2 min-w-0",
    buttonActiveClass: "bg-primary text-white",
    buttonInactiveClass: "bg-transparent text-secondary",
    panelWrapClass: "min-w-0",
    backButtonClass:
      "px-2 py-2 rounded-custom text-secondary text-xs hover:bg-surface-2 transition hidden",
    backButtonText: "",
    backIconClass: "bi bi-arrow-right",
    initial: null,
    tabs: [
      {
        id: "main",
        title: "تعداد / اسامی",
        iconClass: "bi bi-people",
        panelEl: panelMain,
      },
      {
        id: "template",
        title: "قالب چاپ",
        iconClass: "bi bi-layout-text-window",
        children: [
          {
            id: "sheet",
            title: "تنظیمات برگه",
            iconClass: "bi bi-table",
            panelEl: panelSheet,
          },
          {
            id: "header",
            title: "تنظیمات سربرگ",
            iconClass: "bi bi-ui-checks-grid",
            panelEl: panelHeader,
          },
        ],
      },
      {
        id: "font",
        title: "فونت",
        iconClass: "bi bi-fonts",
        panelEl: panelFont,
      },
    ],
  });

  settingsArea.appendChild(tabs.el);

  /* ---------------- انیمیشن پنل‌ها + تکست‌اریا ---------------- */
  const animateVisiblePanel = () => {
    const wrap = tabs.el || settingsArea;
    if (!wrap) return;
    const visible = wrap.querySelector(".tab-panel:not(.hidden)");
    if (visible) enterPane(visible);

    // اگر داخل پنل main، بخش اسامی باز است، برای آن هم انیمیشن بده
    const namesArea = container.querySelector(".names-area");
    if (namesArea && !namesArea.classList.contains("hidden"))
      enterPane(namesArea);
  };

  // هر کلیک روی تب‌ها/بازگشت‌ها => بعد از یک فریم پنل فعلی را انیمیت کن
  tabs.el?.addEventListener("click", (e) => {
    if (!e.target.closest(".settings-tab") && !e.target.closest("button"))
      return;
    requestAnimationFrame(() => animateVisiblePanel());
  });

  /* ---------------- Queries & initial values ---------------- */
  const countInput = container.querySelector(".names-count-input");
  const textarea = container.querySelector(".names-textarea");
  const namesArea = container.querySelector(".names-area");
  const classSelect = container.querySelector(".class-selector");
  const goClassesBtn = container.querySelector(".go-classes-btn");
  const nameSwitchContainer = container.querySelector(".student-name-switch");

  const namesTxtActions = container.querySelector(".names-txt-actions");
  const namesImportBtn = container.querySelector(".names-import-btn");
  const namesExportBtn = container.querySelector(".names-export-btn");
  const namesTxtInput = container.querySelector(".names-txt-input");

  const fontSelect = container.querySelector(".font-selector");
  const fontSizeSelect = container.querySelector(".font-size-selector");

  const templateSelect = container.querySelector(".template-selector");

  const sheetBorderedSwitch = container.querySelector(".sheet-bordered-switch");
  const sheetStripedSwitch = container.querySelector(".sheet-striped-switch");
  const sheetCompactSwitch = container.querySelector(".sheet-compact-switch");
  const sheetThreeColSwitch = container.querySelector(".sheet-threecol-switch");
  const sheetShowScoreSwitch = container.querySelector(
    ".sheet-showscore-switch",
  );

  const headerColumns = container.querySelector(".header-columns");
  const headerItemsWrap = container.querySelector(".header-items");
  const headerAddItemBtn = container.querySelector(".header-add-item");

  // initial sync
  fontSelect.value = appState.font;
  fontSizeSelect.value = appState.fontSize || "16px";

  const hasRealNames = () =>
    (appState.names || []).some((x) => String(x).trim());

  if (!hasRealNames()) {
    appState.print.header.showStudentName = false;
  }

  if (nameSwitchContainer) Switch.ensure(nameSwitchContainer);
  if (sheetBorderedSwitch) Switch.ensure(sheetBorderedSwitch);
  if (sheetStripedSwitch) Switch.ensure(sheetStripedSwitch);
  if (sheetCompactSwitch) Switch.ensure(sheetCompactSwitch);
  if (sheetThreeColSwitch) Switch.ensure(sheetThreeColSwitch);
  if (sheetShowScoreSwitch) Switch.ensure(sheetShowScoreSwitch);

  const setNamesModeUI = (enabled, { silent = false } = {}) => {
    const namesExist = hasRealNames();

    appState.print.header.showStudentName = !!enabled;

    if (nameSwitchContainer && nameSwitchContainer.setChecked) {
      nameSwitchContainer.setChecked(!!enabled, { silent: true });
    }

    if (countInput) countInput.disabled = !!enabled && namesExist;

    const wasHidden = namesArea?.classList.contains("hidden");
    if (namesArea) namesArea.classList.toggle("hidden", !enabled);

    if (namesTxtActions) namesTxtActions.classList.toggle("hidden", !enabled);

    if (enabled && wasHidden && namesArea) enterPane(namesArea);

    if (enabled && !namesExist) {
      const c = parseInt(appState.namesCount || 0, 10) || 0;
      appState.namesCount = Math.max(1, c);
      syncCountInputValue();
    }

    scheduleLivePreview();
  };

  const syncCountInputValue = () => {
    if (!countInput) return;
    countInput.value = appState.namesCount || 0;
  };

  function normalizeNamesFromText(txt) {
    const lines = String(txt || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    // حذف تکراری‌ها با حفظ ترتیب
    const seen = new Set();
    const unique = [];
    for (const n of lines) {
      const key = n.toLocaleLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(n);
    }
    return unique;
  }

  function downloadTextFile(filename, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importNamesFromTxtFile(file) {
    if (!file) return;

    const isTxt = file.type === "text/plain" || /\.txt$/i.test(file.name || "");

    if (!isTxt) {
      showToast("فقط فایل txt قابل ورود است.", "error");
      return;
    }

    const text = await file.text();
    const names = normalizeNamesFromText(text);

    if (!names.length) {
      showToast("فایل خالی است یا نام معتبری پیدا نشد.", "error");
      return;
    }

    const hasExisting = (appState.names || []).some((x) => String(x).trim());
    const apply = () => {
      appState.names = names;

      if (textarea) textarea.value = names.join("\n");

      if (appState.print.header.showStudentName) {
        appState.namesCount = names.length;
        syncCountInputValue();
        if (countInput) countInput.disabled = true;
      }

      scheduleLivePreview();
      showToast("اسامی با موفقیت وارد شدند.");
    };

    if (hasExisting) {
      showConfirm({
        msg: "اسامی فعلی جایگزین شوند؟",
        on_confirm: apply,
      });
    } else {
      apply();
    }
  }

  function setClassSelectLoading(loading) {
    if (!classSelect) return;
    classSelect.disabled = !!loading;
    if (loading) {
      classSelect.innerHTML = `<option value="">در حال بارگذاری...</option>`;
    }
  }

  function fillClassSelectOptions(classes) {
    if (!classSelect) return;

    const selectedId = appState.selectedClassId || "";
    classSelect.innerHTML =
      `<option value="">انتخاب کلاس...</option>` +
      (classes || [])
        .map((c) => {
          const sel = String(c.id) === String(selectedId) ? "selected" : "";
          return `<option value="${escapeHtml(c.id)}" ${sel}>${escapeHtml(c.name || "بدون نام")}</option>`;
        })
        .join("");
  }

  function refreshClassesSelect() {
    if (!classSelect) return;

    setClassSelectLoading(true);
    listClasses()
      .then((classes) => fillClassSelectOptions(classes))
      .catch((err) => {
        console.error(err);
        classSelect.innerHTML = `<option value="">خطا در بارگذاری کلاس‌ها</option>`;
      })
      .finally(() => setClassSelectLoading(false));
  }

  function applySelectedClassToTextarea(classId) {
    if (!classId) return;

    getClassById(classId)
      .then((c) => {
        if (!c) return showToast("کلاس پیدا نشد.", "error");

        // انتخاب کلاس
        appState.selectedClassId = c.id;

        // اسامی را در textarea بریز (ولی کاربر می‌تواند بعداً ویرایش کند)
        appState.names = Array.isArray(c.names) ? c.names : [];
        if (textarea) textarea.value = (appState.names || []).join("\n");

        // اگر نمایش نام فعال است، تعداد را از روی textarea ست کن
        if (appState.print.header.showStudentName) {
          appState.namesCount = (appState.names || []).length || 0;
          const countInput = container.querySelector(".names-count-input");
          if (countInput) {
            countInput.value = appState.namesCount || 0;
            countInput.disabled = true;
          }
        }

        scheduleLivePreview();
      })
      .catch((err) => {
        console.error(err);
        showToast("خطا در خواندن اطلاعات کلاس.", "error");
      });
  }

  // template UI sync
  templateSelect.value = appState.print.templateId;

  // header UI sync
  headerColumns.value = String(appState.print.header.columns || 2);

  // ------- header items renderer (مثل قبل) -------
  const ensureBlockId = (b) => {
    if (!b.id)
      b.id = crypto.randomUUID?.() || String(Date.now() + Math.random());
    return b;
  };

  const normalizeHeaderBlocks = () => {
    appState.print.header.blocks = (appState.print.header.blocks || []).map(
      ensureBlockId,
    );

    const idx = appState.print.header.blocks.findIndex(
      (x) => String(x.id) === "name" || x.type === "name",
    );
    if (idx === -1) {
      appState.print.header.blocks.unshift({
        id: "name",
        type: "name",
        title: "نام و نام خانوادگی",
        locked: true,
      });
    } else {
      const b = appState.print.header.blocks[idx];
      appState.print.header.blocks[idx] = {
        ...b,
        id: "name",
        type: "name",
        locked: true,
        title: (b.title || "نام و نام خانوادگی").trim(),
      };
    }

    appState.print.header.blocks = appState.print.header.blocks.map((b) => {
      const nb = { ...(b || {}) };
      delete nb.subtitle;
      nb.type = nb.type || "text";
      nb.locked = !!nb.locked;
      return nb;
    });
  };

  const renderHeaderItems = () => {
    normalizeHeaderBlocks();

    const cols = Math.max(
      1,
      Math.min(6, parseInt(appState.print.header.columns || 2, 10)),
    );
    headerItemsWrap.style.setProperty("--hcols", cols);

    const blocks = appState.print.header.blocks || [];

    headerItemsWrap.innerHTML = blocks
      .map((b) => {
        const isNameBlock = b?.type === "name" || String(b?.id) === "name";
        const lockedRemove = isNameBlock || !!b.locked;
        const titleDisabled = false;
        return `
        <div class="hitem ${lockedRemove ? "is-locked" : ""}" data-id="${escapeHtml(b.id)}">
          <div class="hitem-inner">
            <input
              type="text"
              class="hitem-title w-full border border-border-light rounded-custom p-2 bg-surface text-primary"
              placeholder="عنوان"
              value="${escapeHtml(b.title || "")}"
              data-id="${escapeHtml(b.id)}"
              ${titleDisabled ? "disabled" : ""}
            />

            <button
              type="button"
              class="btn btn-outline hitem-remove px-2.5 py-2"
              data-id="${escapeHtml(b.id)}"
              title="${lockedRemove ? "این آیتم قابل حذف نیست" : "حذف"}"
              ${lockedRemove ? "disabled" : ""}
            >
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      `;
      })
      .join("");

    headerItemsWrap.querySelectorAll(".hitem-title").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const id = e.target.getAttribute("data-id");
        const block = appState.print.header.blocks.find(
          (x) => String(x.id) === String(id),
        );
        if (!block) return;

        const newTitle = String(e.target.value || "").trim();

        const isNameBlock =
          block.type === "name" || String(block.id) === "name";
        if (isNameBlock) {
          block.title = newTitle || "نام و نام خانوادگی";
        } else {
          block.title = e.target.value;
        }
      });
    });

    headerItemsWrap.querySelectorAll(".hitem-remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        const block = appState.print.header.blocks.find(
          (x) => String(x.id) === String(id),
        );
        if (!block) return;

        const isNameBlock =
          block.type === "name" || String(block.id) === "name";
        if (isNameBlock || block.locked) return;

        const el = headerItemsWrap.querySelector(
          `.hitem[data-id="${CSS.escape(id)}"]`,
        );

        if (el) {
          animateAndRemove(
            el,
            { mode: "collapse", duration: 220, propertyName: "height" },
            () => {
              appState.print.header.blocks = (
                appState.print.header.blocks || []
              ).filter((x) => String(x.id) !== String(id));
              renderHeaderItems();
            },
          );
        } else {
          appState.print.header.blocks = (
            appState.print.header.blocks || []
          ).filter((x) => String(x.id) !== String(id));
          renderHeaderItems();
        }
      });
    });

    headerItemsWrap.querySelectorAll(".hitem").forEach((el) => {
      if (!el.dataset.entered) {
        el.dataset.entered = "1";
        animateEnterEl(el, "is-enter", { removeAfterFrames: 1 });
      }
    });
  };

  renderHeaderItems();

  // ---------- events ----------
  if (countInput) {
    countInput.addEventListener("input", (e) => {
      appState.namesCount = parseInt(e.target.value || "1", 10);
      scheduleLivePreview();
    });
  }

  if (textarea) {
    textarea.addEventListener("input", (e) => {
      appState.names = e.target.value
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);

      if (appState.print.header.showStudentName) {
        if (hasRealNames()) {
          appState.namesCount = (appState.names || []).length || 0;
          syncCountInputValue();
          if (countInput) countInput.disabled = true;
        } else {
          appState.namesCount = Math.max(
            1,
            parseInt(appState.namesCount || 0, 10) || 0,
          );
          syncCountInputValue();
          if (countInput) countInput.disabled = false;
        }
      }

      syncCountInputValue();
      scheduleLivePreview();
    });
  }

  nameSwitchContainer?.addEventListener("switch:change", (e) => {
    const { checked } = e.detail || {};

    setNamesModeUI(!!checked);

    if (checked && hasRealNames()) {
      appState.namesCount = (appState.names || []).length || 0;
      syncCountInputValue();
    }
  });

  namesImportBtn?.addEventListener("click", () => {
    if (!appState.print.header.showStudentName) {
      showToast("ابتدا «نمایش نام» را فعال کنید.", "error");
      return;
    }
    namesTxtInput?.click();
  });

  namesTxtInput?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    try {
      await importNamesFromTxtFile(file);
    } finally {
      e.target.value = "";
    }
  });

  classSelect?.addEventListener("change", (e) => {
    const id = e.target.value || "";
    if (!id) {
      appState.selectedClassId = null;
      return;
    }
    applySelectedClassToTextarea(id);
  });

  goClassesBtn?.addEventListener("click", async () => {
    showClassesScreen();
    await renderClassesListUI();
  });

  namesExportBtn?.addEventListener("click", () => {
    if (!appState.print.header.showStudentName) {
      showToast("ابتدا «نمایش نام» را فعال کنید.", "error");
      return;
    }

    const names = (appState.names || [])
      .map((x) => String(x).trim())
      .filter(Boolean);
    if (!names.length) {
      showToast("اسامی خالی است و خروجی گرفته نمی‌شود.", "error");
      return;
    }

    showConfirm({
      msg: "نام فایل را وارد کنید:",
      on_confirm: (fileName) => {
        if (!fileName || fileName.trim() === "") {
          showToast("یک نام معتبر وارد کنید.", "error");
          return;
        }
        downloadTextFile(`${fileName}.txt`, names.join("\n"));
        showToast("فایل اسامی ذخیره شد !.");
      },
      input: { placeholder: "مثال: کلاس دانش", required: true },
      confirmText: "ذخیره",
      cancelText: "انصراف",
    });
  });

  fontSelect.addEventListener("change", (e) => {
    appState.font = e.target.value;
    const area = getPrintArea();
    if (area) area.style.fontFamily = appState.font;

    document.querySelectorAll(".font-selector").forEach((other) => {
      if (other !== e.target) other.value = appState.font;
    });
  });

  fontSizeSelect.addEventListener("change", (e) => {
    appState.fontSize = e.target.value;
    const area = getPrintArea();
    if (area) area.style.fontSize = appState.fontSize;

    document.querySelectorAll(".font-size-selector").forEach((other) => {
      if (other !== e.target) other.value = appState.fontSize;
    });
  });

  templateSelect.addEventListener("change", (e) => {
    appState.print.templateId = e.target.value;
    scheduleLivePreview();
  });

  // سوئیچ‌های تنظیمات برگه
  const syncSheetSwitches = () => {
    // defaults-safe
    appState.print.sheet = appState.print.sheet || {};
    if (typeof appState.print.sheet.threeColScoreLeft !== "boolean")
      appState.print.sheet.threeColScoreLeft = false;
    if (typeof appState.print.sheet.showScore !== "boolean")
      appState.print.sheet.showScore = true;

    if (sheetBorderedSwitch?.setChecked)
      sheetBorderedSwitch.setChecked(!!appState.print.sheet.bordered);
    if (sheetStripedSwitch?.setChecked)
      sheetStripedSwitch.setChecked(!!appState.print.sheet.striped);
    if (sheetCompactSwitch?.setChecked)
      sheetCompactSwitch.setChecked(!!appState.print.sheet.compact);

    if (sheetThreeColSwitch?.setChecked)
      sheetThreeColSwitch.setChecked(!!appState.print.sheet.threeColScoreLeft);
    if (sheetShowScoreSwitch?.setChecked)
      sheetShowScoreSwitch.setChecked(!!appState.print.sheet.showScore);
  };

  syncSheetSwitches();

  sheetBorderedSwitch?.addEventListener("switch:change", (e) => {
    const { checked } = e.detail || {};
    appState.print.sheet.bordered = !!checked;
    scheduleLivePreview();
  });

  sheetStripedSwitch?.addEventListener("switch:change", (e) => {
    const { checked } = e.detail || {};
    appState.print.sheet.striped = !!checked;
    scheduleLivePreview();
  });

  sheetCompactSwitch?.addEventListener("switch:change", (e) => {
    const { checked } = e.detail || {};
    appState.print.sheet.compact = !!checked;
    scheduleLivePreview();
  });

  sheetThreeColSwitch?.addEventListener("switch:change", (e) => {
    const { checked } = e.detail || {};
    appState.print.sheet.threeColScoreLeft = !!checked;
    scheduleLivePreview();
  });

  sheetShowScoreSwitch?.addEventListener("switch:change", (e) => {
    const { checked } = e.detail || {};
    appState.print.sheet.showScore = !!checked;
    scheduleLivePreview();
  });

  headerColumns.addEventListener("change", (e) => {
    appState.print.header.columns = parseInt(e.target.value || "2", 10);
    renderHeaderItems();
    scheduleLivePreview();
  });

  headerAddItemBtn.addEventListener("click", () => {
    appState.print.header.blocks = appState.print.header.blocks || [];
    appState.print.header.blocks.push({
      id: crypto.randomUUID?.() || String(Date.now() + Math.random()),
      type: "text",
      title: "",
      locked: false,
    });
    renderHeaderItems();
    scheduleLivePreview();
  });

  container.querySelector(".print-btn").addEventListener("click", async () => {
    await renderAllSheetsAndPrint();
  });

  // ---------- initial apply ----------
  syncCountInputValue();

  setNamesModeUI(!!appState.print.header.showStudentName, { silent: true });

  const area = getPrintArea();
  if (area) {
    area.style.fontFamily = appState.font;
    area.style.fontSize = appState.fontSize;
  }

  requestAnimationFrame(() => animateVisiblePanel());

  refreshClassesSelect();
  scheduleLivePreview();

  return container;
}

function placePrintSettingsUI() {
  if (!printSettingsUI) return;

  const mobile = isMobile();
  const desktopContainer = document.getElementById("sticky");
  let mobileContainer = document.getElementById("mobile-bottom-bar");

  if (mobile) {
    if (!mobileContainer) {
      mobileContainer = document.createElement("div");
      mobileContainer.id = "mobile-bottom-bar";
      document.body.appendChild(mobileContainer);
    }
    if (!mobileContainer.contains(printSettingsUI)) {
      mobileContainer.appendChild(printSettingsUI);
    }
    if (desktopContainer.contains(printSettingsUI)) {
      desktopContainer.removeChild(printSettingsUI);
    }
    document.body.style.paddingBottom = mobileContainer.offsetHeight + "px";
    updateToTopPosition();
  } else {
    if (!desktopContainer.contains(printSettingsUI)) {
      desktopContainer.appendChild(printSettingsUI);
    }
    if (mobileContainer && mobileContainer.contains(printSettingsUI)) {
      mobileContainer.removeChild(printSettingsUI);
    }
    document.body.style.paddingBottom = "";
  }
}

function rebuildPrintSettingsUI() {
  try {
    if (printSettingsUI) {
      printSettingsUI.remove();
    }
  } catch (e) {}

  printSettingsUI = createPrintSettingsUI();
  placePrintSettingsUI();

  adjustMobilePadding();
  updateToTopPosition();
}

function renderNamesSection() {
  document.querySelectorAll(".names-textarea").forEach((textarea) => {
    textarea.value = (appState.names || []).join("\n");
  });

  document.querySelectorAll(".names-count-input").forEach((input) => {
    input.value = appState.namesCount || 0;
    input.disabled = !!appState.print?.header?.showStudentName;
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
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
  await pasteFromClipboard({
    onImage: (src) => handleModalImageChange(src),
    onNone: () => {
      if (showError) showToast("تصویری کپی نشده است!", "error");
    },
  });
}

async function handlePasteInsideRange(rangeId) {
  await pasteFromClipboard({
    onImage: (src) => addItemToRange(rangeId, createImageItem({ src })),
    onText: (txt) => addItemsFromJSONToRange(rangeId, txt),
  });
}

document.addEventListener("paste", async () => {
  if (aiWizardModal.isOpen) return;
  else if (editModal.isOpen) await handlePasteImageInModal(false);
  else if (activeRangeId) await handlePasteInsideRange(activeRangeId);
});

// ========== Print Templates ==========
const PRINT_TEMPLATES = {
  classic: {
    id: "classic",
    title: "کلاسیک (جدولی)",
    renderSheet: ({ headerHtml, rowsHtml, tableClasses }) => `
      <table class="${tableClasses}">
        <tbody>
          <tr style="background:#f6f7fb;">
            <td class="p-2 border border-slate-900/70" colspan="3">
              <div class="w-full">${headerHtml}</div>
            </td>
          </tr>
          ${rowsHtml}
        </tbody>
      </table>
    `,
    headerRenderer: ({ name, header }) =>
      renderHeaderCommon({ name, header, variant: "classic" }),
  },

  modern: {
    id: "modern",
    title: "کارت",
    renderSheet: ({ headerHtml, rowsHtml, tableClasses }) => `
      <div class="border border-slate-900/70 p-2" style="border-radius:12px;">
        <div class="mb-2">${headerHtml}</div>
        <div>
          <table class="${tableClasses}">
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `,
    headerRenderer: ({ name, header }) =>
      renderHeaderCommon({ name, header, variant: "modern" }),
  },

  boxed: {
    id: "boxed",
    title: "کادر",
    renderSheet: ({ headerHtml, rowsHtml, tableClasses }) => `
      <div class="border border-slate-900 p-3" style="border-radius:10px;">
        <div class="border-b border-slate-900 pb-2 mb-2">
          ${headerHtml}
        </div>
        <table class="${tableClasses}">
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `,
    headerRenderer: ({ name, header }) =>
      renderHeaderCommon({ name, header, variant: "boxed" }),
  },

  ribbon: {
    id: "ribbon",
    title: "نوار بالایی",
    renderSheet: ({ headerHtml, rowsHtml, tableClasses }) => `
      <div class="border border-slate-900/70 overflow-hidden" style="border-radius:14px;">
        <div style="background:linear-gradient(90deg, rgba(99,102,241,.18), rgba(16,185,129,.14));" class="p-2">
          ${headerHtml}
        </div>
        <div class="p-2">
          <table class="${tableClasses}">
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `,
    headerRenderer: ({ name, header }) =>
      renderHeaderCommon({ name, header, variant: "modern" }),
  },

  cleanCard: {
    id: "cleanCard",
    title: "ساده",
    renderSheet: ({ headerHtml, rowsHtml, tableClasses }) => `
      <div style="padding:10px; border-radius:16px; border:1px solid rgba(15,23,42,.25);">
        <div class="mb-2" style="padding-bottom:8px; border-bottom:1px dashed rgba(15,23,42,.35);">
          ${headerHtml}
        </div>
        <table class="${tableClasses}">
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `,
    headerRenderer: ({ name, header }) =>
      renderHeaderCommon({ name, header, variant: "minimal" }),
  },
};

function getActivePrintTemplate() {
  const id = appState.print?.templateId || "classic";
  return PRINT_TEMPLATES[id] || PRINT_TEMPLATES.classic;
}

function renderHeaderCommon({ name, header, variant }) {
  const blocks = Array.isArray(header.blocks) ? header.blocks : [];
  const cols = Math.max(1, Math.min(6, parseInt(header.columns || 2, 10)));

  const blocksHtml = blocks
    .map((b) => {
      const type = b?.type || "text";
      const title = (b?.title || "").trim();
      const locked = !!b?.locked;

      if (type === "name" || String(b?.id) === "name") {
        const showValue = !!header.showStudentName;
        const value = showValue ? escapeHtml(String(name ?? "")) : "";
        return `
          <div class="print-hcell print-hcell-name ${locked ? "is-locked" : ""}">
            <div class="print-htitle">${escapeHtml(title || "نام و نام خانوادگی")}:${value}</div>
          </div>
        `;
      }

      if (!title) return "";

      return `
        <div class="print-hcell">
          <div class="print-htitle">${escapeHtml(title)}</div>
        </div>
      `;
    })
    .filter(Boolean)
    .join("");

  const rootClass = ["print-header-root", `print-header-${variant}`].join(" ");

  let centeredTop = "";
  let restBlocksHtml = blocksHtml;

  if (variant === "centered") {
    const firstTextBlock = blocks.find(
      (b) => (b?.type || "text") === "text" && (b?.title || "").trim(),
    );
    if (firstTextBlock) {
      centeredTop = `
        <div class="print-centered-top">
          <div class="print-centered-title">${escapeHtml((firstTextBlock.title || "").trim())}</div>
        </div>
      `;

      const filtered = blocks.filter((b) => b !== firstTextBlock);
      restBlocksHtml = filtered
        .map((b) => {
          const type = b?.type || "text";
          const title = (b?.title || "").trim();

          if (type === "name" || String(b?.id) === "name") {
            const value = header.showStudentName
              ? escapeHtml(String(name ?? ""))
              : "";
            return `
              <div class="print-hcell print-hcell-name">
                <div class="print-htitle">${escapeHtml(title || "نام و نام خانوادگی")}:${value}</div>
              </div>
            `;
          }

          if (!title) return "";
          return `
            <div class="print-hcell">
              <div class="print-htitle">${escapeHtml(title)}</div>
            </div>
          `;
        })
        .filter(Boolean)
        .join("");
    }
  }

  return `
    <div class="${rootClass}">
      ${centeredTop}
      <div class="print-hgrid" style="--print-hcols:${cols}">
        ${restBlocksHtml}
      </div>
    </div>
  `;
}

function createStudentTableHtml(studentQuiz, name) {
  const tpl = getActivePrintTemplate();

  const sheet = appState.print?.sheet || {};
  const bordered = sheet.bordered !== false;
  const striped = !!sheet.striped;
  const compact = !!sheet.compact;

  const threeColScoreLeft = !!sheet.threeColScoreLeft;
  const showScore = sheet.showScore !== false;

  const tableBase = [
    "w-full border-collapse text-[0.95em] leading-6",
    "print:w-full",
  ];

  if (compact) tableBase.push("text-[0.9em]");

  const trStripedClass = striped ? "even:bg-slate-50" : "";

  const cellBorderClass = bordered ? "border border-slate-900/70" : "border-0";
  const cellPadClass = compact ? "px-2 py-0.5" : "px-2 py-1.5";

  const headerHtml = tpl.headerRenderer
    ? tpl.headerRenderer({ name, header: appState.print?.header || {} })
    : "";

  let qNum = 1;

  const rowsHtml = (studentQuiz || [])
    .map((range) =>
      createQuestionRowHtmlMulti(qNum++, range, {
        trStripedClass,
        cellBorderClass,
        cellPadClass,
        threeColScoreLeft,
        showScore,
      }),
    )
    .join("");

  return tpl.renderSheet({
    headerHtml,
    rowsHtml,
    tableClasses: tableBase.join(" "),
  });
}

// ========== Quiz Generation ==========

function getPrintArea() {
  return document.getElementById("printable");
}

const printArea = getPrintArea();

function cssDividerFromStyle(dividerStyle) {
  const styles = {
    [RANGE_PART_DIVIDER_STYLES.SOLID]: "solid",
    [RANGE_PART_DIVIDER_STYLES.DOTTED]: "dotted",
    [RANGE_PART_DIVIDER_STYLES.DASHED]: "dashed",
  };
  return styles[dividerStyle] || null;
}

function renderRangeAsMultiPart(range) {
  normalizeRangePartSettings(range);

  const items = Array.isArray(range?.items) ? range.items : [];
  const ps = range.partSettings || {};
  const cols = ps.columns || 1;

  const labelMode = ps.labelMode || RANGE_PART_LABEL_MODES.PERSIAN;
  const labelAlign = ps.labelAlign || "RIGHT";
  const dividerCss = cssDividerFromStyle(
    ps.dividerStyle || RANGE_PART_DIVIDER_STYLES.NONE,
  );

  if (items.length <= 1) {
    const one = items[0];
    return one ? `<div>${renderItemForQuiz(one, null)}</div>` : "";
  }

  const showLabel = labelMode !== RANGE_PART_LABEL_MODES.NONE;

  const gridDir = labelAlign === "RIGHT" ? "ltr" : "rtl";

  const gridStyle =
    [
      `display:grid`,
      `grid-template-columns:repeat(${cols},minmax(0,1fr))`,
      `gap:.25rem .75rem`,
      `direction:${gridDir}`,
    ].join(";") + ";";

  const cellStyle = `direction:rtl;`;

  const rowClass =
    labelAlign === "LEFT"
      ? "flex gap-1 flex-row"
      : "flex gap-1 flex-row-reverse";

  const labelClass = "font-bold whitespace-nowrap";
  const contentClass = "min-w-0 flex-1";

  const partsHtml = items
    .map((item, idx) => {
      const rawLabel = showLabel ? getPartLabelByMode(idx, labelMode) : "";
      const lab = showLabel ? formatPartLabel(rawLabel, labelAlign) : "";

      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const isLastInRow = col === cols - 1;
      const isRightmostCol = labelAlign === "RIGHT" && col === cols - 1;
      const isLeftmostCol = labelAlign === "LEFT" && col === 0;
      const totalRows = Math.ceil(items.length / cols);
      const isLastRow = row === totalRows - 1;

      let verticalDivider = "";
      if (dividerCss && !isLastInRow && col < cols - 1) {
        const dividerAlign = labelAlign === "RIGHT" ? "right" : "left";
        verticalDivider = `border-${dividerAlign}:1px ${dividerCss} rgba(0,0,0,.55); padding-${dividerAlign}:.25rem; margin-${dividerAlign}:.25rem;`;
      }

      let horizontalDivider = "";
      // if (dividerCss && !isLastRow) {
      //   horizontalDivider = `border-bottom:1px ${dividerCss} rgba(0,0,0,.55); padding-bottom:.25rem; margin-bottom:.25rem;`;
      // }

      const combinedDivider = `${verticalDivider} ${horizontalDivider}`;

      return `
      <div style="${cellStyle} ${combinedDivider}">
        <div class="${rowClass}">
          ${showLabel ? `<div class="${labelClass}">${lab}</div>` : ""}
          <div class="${contentClass}">${renderItemForQuiz(item, null)}</div>
        </div>
      </div>
    `;
    })
    .join("");

  return `<div style="${gridStyle}">${partsHtml}</div>`;
}

function createQuestionRowHtmlMulti(qNum, range, opts = {}) {
  const {
    trStripedClass = "",
    cellBorderClass = "border-0",
    cellPadClass = "px-2 py-1.5",
    threeColScoreLeft = false,
    showScore = true,
  } = opts;

  const scoreVal = toPersianDigits(+range.score || 0);

  if (threeColScoreLeft) {
    return `
      <tr class="${trStripedClass}">
        <td class="w-12 text-center font-bold align-top ${cellBorderClass} ${cellPadClass}">
          ${toPersianDigits(qNum)}
        </td>

        <td class="${cellBorderClass} ${cellPadClass}">
          <p class="mb-1">${range.desc || ""}</p>
          ${renderRangeAsMultiPart(range)}
        </td>

        ${
          showScore
            ? `<td class="w-12 text-center font-bold align-top ${cellBorderClass} ${cellPadClass}">
                 ${scoreVal}
               </td>`
            : `<td class="w-14 ${cellBorderClass} ${cellPadClass}"></td>`
        }
      </tr>
    `;
  }

  return `
    <tr class="${trStripedClass}">
      <td class="w-10 text-center font-bold align-top ${cellBorderClass} ${cellPadClass}">
        ${toPersianDigits(qNum)}
        ${
          showScore && +range.score > 0
            ? `<span class="font-normal text-xs">(${toPersianDigits(range.score)}نمره)</span>`
            : ``
        }
      </td>

      <td class="${cellBorderClass} ${cellPadClass}">
        <p class="mb-1">${range.desc || ""}</p>
        ${renderRangeAsMultiPart(range)}
      </td>
    </tr>
  `;
}

async function buildQuizData(studentList, ranges) {
  const finalData = Object.fromEntries(studentList.map((s) => [s.key, []]));

  const YIELD_EVERY = 10;
  let ops = 0;

  for (const r of ranges) {
    const items = Array.isArray(r.items) ? r.items : [];

    for (const s of studentList) {
      const maxCount = getRangeMaxRenderableCount(r);
      const safeCount = maxCount > 0 ? Math.min(+r.count || 0, maxCount) : 0;

      const picked =
        safeCount > 0 ? pickRandomItemsUniqueLabels(items, safeCount) : [];

      finalData[s.key].push({
        rangeName: r.rangeName,
        items: picked || [],
        score: r.score,
        desc: r.desc,
        partSettings: r.partSettings
          ? JSON.parse(JSON.stringify(r.partSettings))
          : null,
      });

      ops++;
      if (ops % YIELD_EVERY === 0) await nextFrame();
    }
  }

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

function getStudentList() {
  const useNames = !!appState.print?.header?.showStudentName;

  const validNames = (appState.names || [])
    .map((x) => String(x).trim())
    .filter(Boolean);

  if (useNames && validNames.length) {
    return validNames.map((n) => ({ key: n, displayName: n }));
  }

  const count = Math.max(0, parseInt(appState.namesCount || 0, 10) || 0);
  return Array.from({ length: count }, (_, i) => ({
    key: `anon-${i + 1}`,
    displayName: ``,
  }));
}

function validateQuizInputs() {
  const list = getStudentList();
  if (!list.length) {
    showToast("لطفا تعداد را وارد کنید", "error");
    return false;
  }

  const validRanges = appState.ranges.filter(
    (r) => r.items.length && r.count > 0,
  );
  if (!validRanges.length) return false;

  return validRanges;
}

async function buildQuizHtml(validRanges) {
  const studentList = getStudentList();

  let quizData;
  try {
    quizData = await buildQuizData(studentList, validRanges);
  } catch (err) {
    showToast(err.message, "error");
    return null;
  }

  return studentList
    .map(
      (s) => `
        <tr>
          <td class="questions">
            ${createStudentTableHtml(quizData[s.key], s.displayName)}
          </td>
        </tr>
      `,
    )
    .join("");
}

function hideQuizHtml() {
  hasGeneratedTable = false;
  printArea.innerHTML = `
  <div class="flex items-center justify-center">
    <img src="images/no_data.jpg" alt="no_data" style="max-height: 380px;">
  </div>
  `;
}

// ========== generate ==========

let _livePreviewTimer = null;

function _livePreviewProxy(pathStr) {
  if (
    pathStr.startsWith("print") ||
    pathStr.startsWith("ranges") ||
    pathStr.startsWith("names") ||
    pathStr.startsWith("namesCount") ||
    pathStr.startsWith("font") ||
    pathStr.startsWith("fontSize")
  ) {
    scheduleLivePreview();
  }
}

function scheduleLivePreview() {
  clearTimeout(_livePreviewTimer);
  _livePreviewTimer = setTimeout(() => {
    renderLivePreviewSingleSheet();
  }, 120);
}

async function renderLivePreviewSingleSheet() {
  const validRanges = validateQuizInputs();
  if (!validRanges) {
    hideQuizHtml();
    return;
  }

  const studentList = getStudentList();
  const first = studentList?.[0];
  if (!first) {
    hideQuizHtml();
    return;
  }

  let quizData;
  try {
    quizData = await buildQuizData([first], validRanges);
  } catch (err) {
    showToast(err.message, "error");
    return;
  }

  const html = `
    <table class="w-full"><tbody>
      <tr><td class="questions">
        ${createStudentTableHtml(quizData[first.key], first.displayName)}
      </td></tr>
    </tbody></table>
  `;

  printArea.innerHTML = html;
  renderMathInContainer(printArea);
  hasGeneratedTable = true;
}

async function renderAllSheetsAndPrint() {
  const validRanges = validateQuizInputs();
  if (!validRanges) return;

  showLoadingOverlay("در حال ساخت برگه‌ها...");
  await nextFrame();

  try {
    const html = await buildQuizHtml(validRanges);
    if (!html) return;

    printArea.innerHTML = `<table class="w-full"><tbody>${html}</tbody></table>`;
    renderMathInContainer(printArea);

    hasGeneratedTable = true;

    await nextFrame();
    window.print();
  } finally {
    hideLoadingOverlay();
  }
}

const loadingOverlayEl = document.getElementById("overlay");

function showLoadingOverlay() {
  if (!loadingOverlayEl) return;
  loadingOverlayEl.querySelector(".overlay-content").innerHTML = `
    <div class="flex flex-col gap-4 text-center">
      <div class="spinner"></div>
      <div class="text-center text-gray-700">در حال ساخت برگه ها...</div>
    </div>
  `;
  loadingOverlayEl.classList.remove("hidden");
}

function hideLoadingOverlay() {
  if (!loadingOverlayEl) return;
  loadingOverlayEl.classList.add("hidden");
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

// ========== Edit modal ==========
const editModal = new Modal("#modal-edit", {
  title: "ویرایشگر سوال",
  initialFocusSelector: "#save-modal-btn",
  closeOnOverlayClick: false,
});

// ---- DOM refs  ----
const modalEdit = document.querySelector("#modal-edit");
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

// ---------- Label ----------
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

// ---------- Text editor sync ----------
function updateTempItemFromTextEditor() {
  const temp = appState.modal.tempItem;
  if (!temp) return;

  temp.text = {
    html: editModalEditor.getContent(),
  };
  updateModalPreviewFromTemp();
}

// ---------- Open modal for new/edit ----------
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

function openModalWithTempItem(rangeId) {
  const range = findRangeById(rangeId);
  const temp = appState.modal.tempItem;
  if (!temp) return;

  updateModalLabelBtnUI();
  editModalEditor.setContent(temp.text.html || "");
  updateModalPreviewFromTemp();
  updateModalImageUI();
  editModal.open();
}

// ----------- text editor ------
const modalPlaceholder = document.getElementById(
  "modal-rich-editor-placeholder",
);

const editModalEditor = createRichTextEditor(modalPlaceholder, {
  features: [
    "bold",
    "italic",
    "underline",
    "align-left",
    "align-center",
    "align-right",
    "align-justify",
    // "undo",
    // "redo",
    "latex",
  ],
  placeholder: "متن سوال را بنویسید...",
  contentId: "modal-text-editor",
  toolbarId: "modal-toolbar",
  onContentChange: updateTempItemFromTextEditor,
});

// ---------- Image UI ----------

previewImgFloat.addEventListener("switch:change", (e) => {
  const { checked } = e.detail;
  appState.modal.tempItem.image.float = checked;
  setTextFloat();
});

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
  const brightnessMatch = filter.match(/brightness$$(\d+)%$$/);
  const contrastMatch = filter.match(/contrast$$(\d+)%$$/);
  previewImgBrightness.value = brightnessMatch
    ? parseInt(brightnessMatch[1])
    : 100;
  previewImgContrast.value = contrastMatch ? parseInt(contrastMatch[1]) : 100;

  setTextFloat();
  previewImgFloat.setChecked(!!tempItemImg.float);
}

// ---------- Preview ----------
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

// ---------- Save / Close ----------
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
  editModal.close();
  destroyEditModal();
}

saveModalBtn.addEventListener("click", () => {
  saveModalChanges();
  showToast("تغییرات با موفقیت ذخیره شد!");
});

// ---------- Image change ----------
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
  step: 1,
  selectedRangeIds: new Set(),
  countPerRange: 5,
  promptRanges: [],
  generatedByRange: [],
  step3Mode: "edit", // "edit" | "preview"
};

let aiWizardModal = null;

/* -----------------------------
   Helpers (UI)
------------------------------ */
function getStepEl(stepNo) {
  return document.querySelector(`#modal-ai .step[data-step="${stepNo}"]`);
}

function enterPane(el) {
  if (!el) return;
  el.classList.remove("hidden");
  el.classList.add("ai-enter");
  requestAnimationFrame(() => {
    el.classList.add("ai-enter-active");
    el.classList.remove("ai-enter");
    setTimeout(() => el.classList.remove("ai-enter-active"), 360);
  });
}

function switchStepAnimated(fromStep, toStep) {
  const fromEl = getStepEl(fromStep);
  const toEl = getStepEl(toStep);

  if (fromEl && !fromEl.classList.contains("hidden")) {
    fromEl.classList.add("ai-exit");
    setTimeout(() => {
      fromEl.classList.add("hidden");
      fromEl.classList.remove("ai-exit");
    }, 240);
  }

  if (toEl) enterPane(toEl);
}

function setStep3Mode(mode) {
  wizardState.step3Mode = mode;

  const editor = document.getElementById("step3Editor");
  const preview = document.getElementById("step3Preview");
  const editBtn = document.getElementById("editResponseBtn");
  const pasteBtn = document.getElementById("pasteGenerateBtn");

  const title = document.getElementById("step3Title");
  const sub = document.getElementById("step3Subtitle");

  if (mode === "preview") {
    if (editor) editor.classList.add("hidden");
    if (preview) enterPane(preview);

    if (editBtn) editBtn.classList.remove("hidden");
    if (pasteBtn) pasteBtn.classList.add("hidden");

    if (title) title.textContent = `پیش نمایش`;
    if (sub)
      sub.textContent = `جمع آیتم‌ها: ${toPersianDigits(calculateMetaTotal())}`;

    // در حالت preview، دکمه Next را پنهان/بی‌اثر کن
    document.getElementById("wizardNextBtn")?.classList.add("hidden");
    // دکمه افزودن (در فوتر) نمایش داده شود
    document.getElementById("addGeneratedBtn")?.classList.remove("hidden");
    return;
  }

  // mode === "edit"
  if (preview) preview.classList.add("hidden");
  if (editor) enterPane(editor);

  if (editBtn) editBtn.classList.add("hidden");
  if (pasteBtn) pasteBtn.classList.remove("hidden");

  if (title) title.textContent = "پاسخ هوش مصنوعی";
  if (sub) sub.textContent = "پاسخ را وارد کنید و پیش‌نمایش بگیرید.";

  document.getElementById("wizardNextBtn")?.classList.remove("hidden");
  document.getElementById("addGeneratedBtn")?.classList.add("hidden");
}

/* -----------------------------
   Data helpers
------------------------------ */
function getTextOnlyItems(range) {
  const items = Array.isArray(range?.items) ? range.items : [];
  return items.filter((it) => !!it?.text?.html && !it?.image);
}

function isRangeEligible(range) {
  return getTextOnlyItems(range).length > 0;
}

/* -----------------------------
   Step 1 UI
------------------------------ */
function renderWizardRangesList() {
  const listEl = document.getElementById("aiRangesList");
  if (!listEl) return;

  const ranges = Array.isArray(appState?.ranges) ? appState.ranges : [];
  listEl.innerHTML = "";

  ranges.forEach((r) => {
    const textOnlyCount = getTextOnlyItems(r).length;
    const eligible = textOnlyCount > 0;

    const id = r.id;
    const checked = wizardState.selectedRangeIds.has(id);

    const card = document.createElement("label");
    card.className = [
      "flex items-start gap-3 p-3 rounded-custom border transition-all",
      eligible
        ? "bg-surface border-border-light cursor-pointer hover:bg-surface-darker"
        : "bg-surface/60 border-border-light/50 opacity-60 cursor-not-allowed",
    ].join(" ");

    card.innerHTML = `
      <input type="checkbox"
             class="mt-1"
             data-role="range-checkbox"
             data-range-id="${id}"
             ${eligible ? "" : "disabled"}
             ${checked ? "checked" : ""} />

      <div class="min-w-0 flex-1">
        <div class="flex items-center justify-between gap-2">
          <div class="font-semibold text-primary truncate">${sanitizeText(
            r.rangeName || "بدون عنوان",
          )}</div>
          <span class="text-xs text-muted whitespace-nowrap">
            آیتم متنی: ${toPersianDigits(textOnlyCount)}
          </span>
        </div>
        ${
          r.desc
            ? `<div class="text-xs text-secondary mt-1 line-clamp-2">${sanitizeText(
                r.desc,
              )}</div>`
            : ""
        }
      </div>
    `;

    listEl.appendChild(card);
  });

  listEl.querySelectorAll('[data-role="range-checkbox"]').forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const rangeId = e.target.dataset.rangeId;
      if (!rangeId) return;
      if (e.target.checked) wizardState.selectedRangeIds.add(rangeId);
      else wizardState.selectedRangeIds.delete(rangeId);
    });
  });
}

function selectAllEligibleRanges() {
  wizardState.selectedRangeIds.clear();
  (appState?.ranges || []).forEach((r) => {
    if (isRangeEligible(r)) wizardState.selectedRangeIds.add(r.id);
  });
  renderWizardRangesList();
}

function clearAllRangesSelection() {
  wizardState.selectedRangeIds.clear();
  renderWizardRangesList();
}

function validateStep1_andBuildPromptRanges() {
  const countInput = document.getElementById("aiSimilarCountPerRange");
  wizardState.countPerRange = countInput
    ? parseInt(countInput.value, 10) || 5
    : 5;

  const selected = [...wizardState.selectedRangeIds];
  if (!selected.length) {
    showToast("حداقل یک مبحث را انتخاب کنید.", "error");
    return false;
  }

  const promptRanges = [];
  for (const rangeId of selected) {
    const range = findRangeById(rangeId);
    if (!range) continue;

    const samples = getTextOnlyItems(range).map((it) => it.text.html);
    if (!samples.length) continue;

    promptRanges.push({ ...range, rangeId });
  }

  if (!promptRanges.length) {
    showToast("هیچ مبحثِ قابل استفاده‌ای انتخاب نشده است.", "error");
    return false;
  }

  wizardState.promptRanges = promptRanges;
  return true;
}

/* -----------------------------
   Step 2
------------------------------ */
function updateGeneratePromptStep2() {
  const el = document.getElementById("generatePromptDisplay");
  if (!el) return;

  const prompt = getAIPrompt({
    ranges: wizardState.promptRanges,
    countPerRange: wizardState.countPerRange,
  });

  el.textContent = prompt;
}

/* -----------------------------
   Step 3
------------------------------ */
function calculateMetaTotal() {
  const groups = wizardState.generatedByRange || [];
  const total = groups.reduce((acc, g) => acc + (g.items?.length || 0), 0);
  return total;
}

function updatePreviewMeta() {
  const meta = document.getElementById("step3Subtitle");
  if (!meta) return;
  meta.textContent = `جمع آیتم‌ها: ${toPersianDigits(calculateMetaTotal())}`;
}

function setAddButtonEnabled() {
  const btn = document.getElementById("addGeneratedBtn");
  if (!btn) return;

  const canAdd = (wizardState.generatedByRange || []).some(
    (g) => g.rangeId && (g.items?.length || 0) > 0,
  );
  btn.disabled = !canAdd;
}

function renderGeneratedPreviewByRanges() {
  const wrap = document.getElementById("generateRangesPreview");
  const empty = document.getElementById("generateEmptyPreview");
  if (!wrap || !empty) return;

  wrap.innerHTML = "";

  const generatedByRange = wizardState.generatedByRange || [];
  const anyItem = generatedByRange.some((g) => g.items?.length);

  if (!anyItem) {
    empty.classList.remove("hidden");
    updatePreviewMeta();
    setAddButtonEnabled();
    return;
  }

  empty.classList.add("hidden");

  generatedByRange.forEach((g) => {
    const card = document.createElement("div");
    card.className =
      "bg-surface border border-border-light rounded-custom p-3 shadow-default";

    const header = document.createElement("div");
    header.className =
      "flex items-center justify-between gap-2 mb-2 pb-2 border-b border-border-light";
    header.innerHTML = `
      <div class="font-semibold text-primary truncate">
        ${sanitizeText(g.rangeName || "بدون عنوان")}
      </div>
    `;
    card.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "grid grid-cols-1 gap-2";

    (g.items || []).forEach((item) => {
      const row = document.createElement("div");
      row.className =
        "relative bg-surface-dark border border-border-light rounded-custom p-2 pl-10 text-sm";
      row.dataset.itemId = item.id;

      const del = document.createElement("button");
      del.type = "button";
      del.className =
        "absolute z-10 top-2 left-2 w-7 h-7 bg-error-light text-error rounded-full flex items-center justify-center text-sm opacity-80 hover:opacity-100 border-0 cursor-pointer";
      del.innerHTML = `<i class="bi bi-trash3"></i>`;

      del.onclick = () => {
        animateAndRemove(
          row,
          { mode: "collapse", duration: 220, propertyName: "height" },
          () => {
            g.items = (g.items || []).filter((x) => x.id !== item.id);
            updatePreviewMeta();
            setAddButtonEnabled();
          },
        );
      };

      row.appendChild(del);

      const content = document.createElement("div");
      content.className = "text-secondary";
      content.innerHTML = item.text?.html || "";
      row.appendChild(content);

      grid.appendChild(row);

      // انیمیشن ورود هر آیتم
      row.classList.add("ai-enter");
      requestAnimationFrame(() => {
        row.classList.add("ai-enter-active");
        row.classList.remove("ai-enter");
        setTimeout(() => row.classList.remove("ai-enter-active"), 360);
      });
    });

    card.appendChild(grid);
    wrap.appendChild(card);

    // انیمیشن ورود هر گروه
    card.classList.add("ai-enter");
    requestAnimationFrame(() => {
      card.classList.add("ai-enter-active");
      card.classList.remove("ai-enter");
      setTimeout(() => card.classList.remove("ai-enter-active"), 360);
    });
  });

  renderMathInContainer(wrap);
  updatePreviewMeta();
  setAddButtonEnabled();
}

function previewGeneratedItemsStep3() {
  const raw =
    document.getElementById("generateResponseInput")?.value?.trim() || "";
  if (!raw) {
    showToast("لطفاً پاسخ را وارد کنید", "error");
    return;
  }

  let parsed;
  try {
    parsed = extractJSON(raw);
  } catch (err) {
    showToast(err.message, "error");
    return;
  }

  const generatedByRange = [];
  (parsed?.ranges || []).forEach((r) => {
    const rangeName = String(r.rangeName || "").trim();
    const rangeId = r.rangeId || null;

    const items = (r.items || []).map((it) => ({
      id: createRandomId("item"),
      text: { html: it?.text?.html ?? it?.text ?? "" },
      image: null,
      labelId: it.labelId || null,
    }));

    generatedByRange.push({ rangeId, rangeName, items });
  });

  wizardState.generatedByRange = generatedByRange;

  renderGeneratedPreviewByRanges();

  setStep3Mode("preview");

  const anyAddable = (wizardState.generatedByRange || []).some(
    (g) => g.rangeId && (g.items?.length || 0) > 0,
  );

  if (!anyAddable) {
    showToast(
      "آیتم‌ها پیش‌نمایش شدند، اما نام مبحث‌ها با انتخاب‌ها تطابق ندارد و قابل افزودن نیست.",
      "error",
    );
  }
}

function addGeneratedItemsToRanges() {
  const groups = wizardState.generatedByRange || [];
  const addable = groups.filter(
    (g) => !!g.rangeId && (g.items?.length || 0) > 0,
  );

  if (!addable.length) {
    showToast(
      "آیتم قابل افزودن وجود ندارد (نام مبحث‌ها با انتخاب‌ها تطابق ندارد).",
      "error",
    );
    return;
  }

  addable.forEach((g) => {
    g.items.forEach((it) => addItemToRange(g.rangeId, it));
  });

  const total = addable.reduce((acc, g) => acc + (g.items?.length || 0), 0);
  showToast(`${toPersianDigits(total)} آیتم به مبحث‌ها اضافه شد`);
  closeWizard();
}

/* -----------------------------
   Indicators + step content
------------------------------ */
function updateStepIndicators() {
  document
    .querySelectorAll("#modal-ai [data-step-indicator]")
    .forEach((item) => {
      const stepNum = Number(item.getAttribute("data-step-indicator"));
      const circle = item.querySelector(".step-circle");
      if (!circle) return;

      if (stepNum === wizardState.step) {
        circle.classList.add("bg-primary", "text-inverse");
        circle.classList.remove("bg-surface", "text-secondary", "bg-success");
      } else if (stepNum < wizardState.step) {
        circle.classList.add("bg-success", "text-inverse");
        circle.classList.remove("bg-surface", "text-secondary", "bg-primary");
      } else {
        circle.classList.add("bg-surface", "text-secondary");
        circle.classList.remove("bg-primary", "bg-success", "text-inverse");
      }
    });
}

function updateStepContent(prevStep = null) {
  if (prevStep && prevStep !== wizardState.step) {
    switchStepAnimated(prevStep, wizardState.step);
  } else {
    [1, 2, 3].forEach((n) => {
      const el = getStepEl(n);
      if (!el) return;
      if (n === wizardState.step) el.classList.remove("hidden");
      else el.classList.add("hidden");
    });
  }

  if (wizardState.step === 1) renderWizardRangesList();
  if (wizardState.step === 2) updateGeneratePromptStep2();

  if (wizardState.step === 3) {
    wizardState.generatedByRange = [];
    setStep3Mode("edit");
    setAddButtonEnabled();
  }
}

/* -----------------------------
   Open/Close + Modal init
------------------------------ */
function openWizard() {
  wizardState.isOpen = true;
  wizardState.step = 1;
  wizardState.selectedRangeIds = new Set();
  wizardState.promptRanges = [];
  wizardState.generatedByRange = [];
  wizardState.countPerRange = 5;
  wizardState.step3Mode = "edit";

  aiWizardModal.open();
  aiWizardModal.goToStep(1, { silent: true });

  updateStepIndicators();
  updateStepContent();
}

function resetWizardUI() {
  wizardState.step = 1;
  wizardState.step3Mode = "edit";
  wizardState.generatedByRange = [];
  wizardState.promptRanges = [];
  wizardState.isOpen = false;
  wizardState.selectedRangeIds = new Set();
  wizardState.countPerRange = 5;

  setStep3Mode("edit");

  document
    .querySelectorAll("#modal-ai .step")
    .forEach((s) => s.classList.add("hidden"));
  enterPane(getStepEl(1));

  document.getElementById("wizardNextBtn")?.classList.remove("hidden");
  document.getElementById("addGeneratedBtn")?.classList.add("hidden");
  const addBtn = document.getElementById("addGeneratedBtn");
  if (addBtn) addBtn.disabled = true;
  const gen = document.getElementById("generateResponseInput");
  if (gen) gen.value = "";
}

function closeWizard() {
  aiWizardModal.close();
  resetWizardUI();
}

function initAiWizardModal() {
  aiWizardModal = new Modal("#modal-ai", {
    title: "دستیار هوش مصنوعی (ساخت سوال مشابه)",
    closeOnEscape: false,
    closeOnOverlayClick: false,
    wizard: {
      enabled: true,
      startStep: 1,
      loop: false,
      labels: { next: "بعدی", prev: "قبلی", finish: "پایان" },
      onStepChange: (stepNo) => {
        const prev = wizardState.step;
        wizardState.step = stepNo;
        updateStepIndicators();
        updateStepContent(prev);
      },
    },
    onClose: () => {
      if (wizardState.isOpen) closeWizard();
    },
  });

  aiWizardModal.nextStep = function () {
    const step = wizardState.step;

    if (step === 1) {
      if (!validateStep1_andBuildPromptRanges()) return;
      this.goToStep(2);
      return;
    }

    if (step === 2) {
      this.goToStep(3);
      return;
    }

    // در استپ ۳ عملاً «Next» را پنهان کرده‌ایم
    if (step === 3) {
      closeWizard();
      return;
    }

    this.goToStep(step + 1);
  };

  aiWizardModal.prevStep = function () {
    const step = wizardState.step;
    const prev = step - 1;
    if (prev < 1) return;

    // اگر در استپ ۳ و در حالت preview هستیم، اول برگرد به edit (UX بهتر)
    if (step === 3 && wizardState.step3Mode === "preview") {
      setStep3Mode("edit");
      return;
    }

    this.goToStep(prev);
  };
}

/* -----------------------------
   Events
------------------------------ */
function initWizardEvents() {
  document
    .getElementById("globalAiWizardBtn")
    ?.addEventListener("click", openWizard);
  document
    .getElementById("globalAiWizardBtnMobile")
    ?.addEventListener("click", openWizard);

  document
    .getElementById("aiSelectAllRangesBtn")
    ?.addEventListener("click", selectAllEligibleRanges);
  document
    .getElementById("aiClearAllRangesBtn")
    ?.addEventListener("click", clearAllRangesSelection);

  document
    .getElementById("copyGeneratePromptBtn")
    ?.addEventListener("click", () => {
      copyToClipboard(
        document.getElementById("generatePromptDisplay")?.textContent || "",
      );
    });

  document
    .getElementById("pasteGenerateBtn")
    ?.addEventListener("click", async () => {
      await pasteFromClipboard({
        onText: (txt) => {
          const el = document.getElementById("generateResponseInput");
          if (el) el.value = txt;
        },
      });
    });

  document
    .getElementById("previewGenerateBtn")
    ?.addEventListener("click", previewGeneratedItemsStep3);

  document
    .getElementById("editResponseBtn")
    ?.addEventListener("click", () => setStep3Mode("edit"));

  document.getElementById("clearResponseBtn")?.addEventListener("click", () => {
    const el = document.getElementById("generateResponseInput");
    if (el) el.value = "";
  });

  document
    .getElementById("addGeneratedBtn")
    ?.addEventListener("click", addGeneratedItemsToRanges);
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
const DB_VERSION = 3;

const STORE_PROJECTS = "projects";
const STORE_META = "meta";
const STORE_CLASSES = "classes";

// migration helper
function _promisifyTx(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
    tx.onabort = (e) => reject(e.target.error);
  });
}

async function updateProjectState(projectId, newState) {
  const p = await getProjectById(projectId);
  if (!p) return;
  p.state = newState;
  await saveProject(p);
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(APP_DB_NAME, DB_VERSION);

    request.onupgradeneeded = async (e) => {
      const db = e.target.result;
      const oldVersion = e.oldVersion;

      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          db.createObjectStore(STORE_PROJECTS, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: "id" });
        }

        if (db.objectStoreNames.contains("appState")) {
          const tx = e.target.transaction;

          try {
            const oldStore = tx.objectStore("appState");
            const getReq = oldStore.get("currentState");

            getReq.onsuccess = () => {
              const old = getReq.result?.data;
              if (!old) return;

              const pStore = tx.objectStore(STORE_PROJECTS);
              const mStore = tx.objectStore(STORE_META);

              const projectId =
                (crypto?.randomUUID?.() && `prj-${crypto.randomUUID()}`) ||
                `prj-${Date.now()}-${Math.random().toString(36).slice(2)}`;

              pStore.put({
                id: projectId,
                name: "پروژه ۱",
                createdAt: Date.now(),
                updatedAt: Date.now(),
                state: old,
              });

              mStore.put({
                id: "settings",
                data: { lastOpenedProjectId: projectId },
              });
            };
          } catch (_) {}
        }
      }

      // v3: classes
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains(STORE_CLASSES)) {
          db.createObjectStore(STORE_CLASSES, { keyPath: "id" });
        }
      }
    };

    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

function createEmptyProjectState() {
  return {
    ranges: [],
    names: [],
    namesCount: 1,
    font: "'BNazanin', sans-serif",
    fontSize: "16px",
    modal: { isOpen: false, rangeId: null, itemId: null, tempItem: null },
    print: JSON.parse(JSON.stringify(initialPrintSetting)),
    selectedClassId: null,
  };
}

function createProjectRecord(name = "پروژه جدید") {
  const id = createRandomId("prj");
  return {
    id,
    name: String(name || "").trim() || "پروژه جدید",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    state: createEmptyProjectState(),
  };
}

async function getMetaSettings() {
  const db = await openDB();
  const tx = db.transaction(STORE_META, "readonly");
  const store = tx.objectStore(STORE_META);
  const req = store.get("settings");
  const data = await new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result?.data || {});
    req.onerror = (e) => reject(e.target.error);
  });
  return data || {};
}

async function setMetaSettings(patch = {}) {
  const current = await getMetaSettings();
  const next = { ...current, ...patch };

  const db = await openDB();
  const tx = db.transaction(STORE_META, "readwrite");
  tx.objectStore(STORE_META).put({ id: "settings", data: next });
  await _promisifyTx(tx);
  return next;
}

async function listProjects() {
  const db = await openDB();
  const tx = db.transaction(STORE_PROJECTS, "readonly");
  const store = tx.objectStore(STORE_PROJECTS);

  const req = store.getAll();
  const items = await new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });

  return items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

async function getProjectById(projectId) {
  const db = await openDB();
  const tx = db.transaction(STORE_PROJECTS, "readonly");
  const req = tx.objectStore(STORE_PROJECTS).get(projectId);
  return await new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function saveProject(projectRecord) {
  const db = await openDB();
  const tx = db.transaction(STORE_PROJECTS, "readwrite");
  tx.objectStore(STORE_PROJECTS).put({
    ...projectRecord,
    updatedAt: Date.now(),
  });
  await _promisifyTx(tx);
}

async function deleteProject(projectId) {
  const db = await openDB();
  const tx = db.transaction(STORE_PROJECTS, "readwrite");
  tx.objectStore(STORE_PROJECTS).delete(projectId);
  await _promisifyTx(tx);
}

function normalizeNamesFromText(txt) {
  const lines = String(txt || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  const seen = new Set();
  const unique = [];
  for (const n of lines) {
    const key = n.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(n);
  }
  return unique;
}

function createClassRecord({ name, namesText }) {
  const id = createRandomId("cls");
  const names = normalizeNamesFromText(namesText || "");
  return {
    id,
    name: String(name || "").trim() || "کلاس جدید",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    names, // array of student names
  };
}

async function listClasses() {
  const db = await openDB();
  const tx = db.transaction(STORE_CLASSES, "readonly");
  const store = tx.objectStore(STORE_CLASSES);
  const req = store.getAll();

  const items = await new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });

  return items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

async function getClassById(classId) {
  const db = await openDB();
  const tx = db.transaction(STORE_CLASSES, "readonly");
  const req = tx.objectStore(STORE_CLASSES).get(classId);
  return await new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function saveClass(classRecord) {
  const db = await openDB();
  const tx = db.transaction(STORE_CLASSES, "readwrite");
  tx.objectStore(STORE_CLASSES).put({
    ...classRecord,
    updatedAt: Date.now(),
  });
  await _promisifyTx(tx);
}

async function deleteClass(classId) {
  const db = await openDB();
  const tx = db.transaction(STORE_CLASSES, "readwrite");
  tx.objectStore(STORE_CLASSES).delete(classId);
  await _promisifyTx(tx);
}

async function exportAllClasses() {
  const classes = await listClasses();
  const payload = { type: "quizapp-classes-v1", classes };
  showConfirm({
    msg: "یک نام برای خروجی انتخاب کنید:",
    input: { placeholder: "مثال: کلاس‌های مدرسه" },
    confirmText: "تایید",
    cancelText: "انصراف",
    on_confirm: (name) => exportDataObject(payload, name || "classes"),
  });
}

async function importAllClassesFromJsonText(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    showToast("فایل JSON نامعتبر است!", "error");
    return;
  }

  // single
  if (parsed?.type === "quizapp-class-v1" && parsed.class?.id) {
    await saveClass(parsed.class);
    await renderClassesListUI({ animateInClassId: parsed.class.id });
    showToast("کلاس وارد شد.");
    return;
  }

  // bulk
  if (parsed?.type === "quizapp-classes-v1" && Array.isArray(parsed.classes)) {
    for (const c of parsed.classes) {
      if (c?.id) await saveClass(c);
    }
    await renderClassesListUI();
    showToast("کلاس‌ها وارد شدند.");
    return;
  }

  showToast("فرمت فایل پشتیبانی نمی‌شود.", "error");
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

function importAppStateFromData(data) {
  appState.ranges = [];
  appState.names = Array.isArray(data?.names) ? data.names : [];
  appState.namesCount = Number(data?.namesCount || 1);
  if (data?.font) appState.font = data.font;
  if (data?.fontSize) appState.fontSize = data.fontSize;
  if (data?.print && typeof data.print === "object") {
    appState.print = data.print;
  }

  appState.selectedClassId = data?.selectedClassId || null;

  (data?.ranges || []).forEach((r) => {
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
      ui: { metaOpen: false },
      partSettings: r.partSettings
        ? JSON.parse(JSON.stringify(r.partSettings))
        : null,
    };

    normalizeRangePartSettings(rangeWithId);
    ensureRangeLabels(rangeWithId);
    items.forEach((it) => normalizeItemLabelForRange(rangeWithId, it));
    appState.ranges.push(rangeWithId);
  });
}

function applyImportedData(data) {
  importAppStateFromData(data);

  rebuildPrintSettingsUI();

  rangesContainer.innerHTML = "";
  staggerRender(
    appState.ranges,
    async (r) => {
      const el = createRangeElement(r);
      await appendWithEnterAnimation(rangesContainer, el, "range-item-enter");
    },
    { delay: 100 },
  );

  renderNamesSection();

  const area = getPrintArea();
  if (area) {
    area.style.fontFamily = appState.font;
    area.style.fontSize = appState.fontSize;
  }

  scheduleLivePreview();
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
  showConfirm({
    msg: "نام فایل را وارد کنید:",
    on_confirm: (fileName) => {
      if (!fileName || fileName.trim() === "") {
        showToast("یک نام معتبر وارد کنید.", "error");
        return;
      }

      const data = {
        font: appState.font,
        fontSize: appState.fontSize,
        print: appState.print,
        names: appState.names,
        namesCount: appState.namesCount,
        selectedClassId: appState.selectedClassId,
        ranges: appState.ranges.map((r) => ({
          rangeName: r.rangeName,
          count: r.count,
          score: r.score,
          desc: r.desc,
          labels: Array.isArray(r.labels) ? r.labels : [],
          partSettings: r.partSettings
            ? JSON.parse(JSON.stringify(r.partSettings))
            : null,
          items: r.items.map((item) => ({
            ...item,
            labelId: item.labelId || null,
          })),
        })),
      };

      exportDataObject(data, fileName);
    },
    input: { placeholder: "مثال: آزمون ریاضی", required: true },
    saveLastInput: true,
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
// ========== crop modal ==========
const cropModal = new Modal("#cropModal", {
  title: "برش تصویر",
  closeOnOverlayClick: false,
  mobile: {
    swipeToClose: false,
  },
  onClose: () => {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
  },
});

function setupCropModalEvents() {
  const applyBtn = document.getElementById("applyCrop");
  const cancelBtn = document.getElementById("cancelCrop");

  applyBtn.addEventListener("click", () => {
    if (!cropper || !selectedPreviewImage) return;

    const canvas = cropper.getCroppedCanvas();
    if (canvas) {
      const dataUrl = canvas.toDataURL("image/png");
      selectedPreviewImage.src = dataUrl;
      selectedPreviewImage.style.filter = "none";
      if (previewImgBrightness) previewImgBrightness.value = 100;
      if (previewImgContrast) previewImgContrast.value = 100;
      if (appState.modal?.tempItem?.image) {
        appState.modal.tempItem.image.src = dataUrl;
      }
    }

    cropModal.close();
  });

  // Cancel crop
  cancelBtn.addEventListener("click", () => cropModal.close());
}

function setupCropButton() {
  previewCropBtn.addEventListener("click", () => {
    const img = modalEditPreviewCell.querySelector("img");
    if (!img) return;
    selectedPreviewImage = img;
    document.getElementById("cropImage").src = img.src;
    cropModal.open();
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

// ========== Header menu ==========
async function saveStateToIndexedDB() {
  if (!currentProjectId) {
    showToast("ابتدا یک پروژه را باز کنید.", "error");
    return;
  }

  try {
    const plain = JSON.parse(JSON.stringify(appState));
    await updateProjectState(currentProjectId, plain);

    const p = await getProjectById(currentProjectId);
    if (p) await saveProject(p);

    showToast("پروژه ذخیره شد.");
  } catch (err) {
    console.error(err);
    showToast("ذخیره ناموفق بود.", "error");
  }
}

function initializeHeaderButtons() {
  const saveBtn = document.getElementById("saveToIndexedDBBtn");
  const backBtn = document.getElementById("backToProjectsBtn");

  saveBtn.addEventListener("click", saveStateToIndexedDB);
  backBtn.addEventListener("click", closeCurrentProjectAndGoProjects);
}

function initProjectsUIEvents() {
  document
    .getElementById("createProjectBtn")
    ?.addEventListener("click", createNewProjectFlow);

  document
    .getElementById("exportAllProjectsBtn")
    ?.addEventListener("click", exportAllProjects);

  const importInput = document.getElementById("importAllProjectsInput");
  if (importInput) {
    importInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const txt = await file.text();
        await importAllProjectsFromJsonText(txt);
      } finally {
        e.target.value = "";
      }
    });
  }

  // --- Search (Header) ---
  const searchInp = document.getElementById("projectsSearchInput");
  if (searchInp) {
    searchInp.addEventListener(
      "input",
      debounce(() => {
        projectsUI.query = searchInp.value || "";
        renderProjectsListUI();
      }, 120),
    );
  }
}

// ========== Mobile UX ==========
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

// ========== Projects ==========

const projectsUI = {
  query: "",
};

function _norm(str) {
  return String(str || "")
    .trim()
    .toLocaleLowerCase();
}

function showProjectsScreen() {
  document.getElementById("projectsScreen")?.classList.remove("hidden");
  document.getElementById("appScreen")?.classList.add("hidden");
  document.getElementById("classesScreen")?.classList.add("hidden");
  setHeaderMode("projects");
}

async function closeCurrentProjectAndGoProjects() {
  if (currentProjectId) {
    try {
      const plain = JSON.parse(JSON.stringify(appState));
      await updateProjectState(currentProjectId, plain);

      const p = await getProjectById(currentProjectId);
      if (p) await saveProject(p);

      showToast("پروژه به صورت خودکار ذخیره شد.");
    } catch (err) {
      console.error(err);
      showToast("ذخیره خودکار ناموفق بود.", "error");
    }
  }

  currentProjectId = null;
  showProjectsScreen();
  await renderProjectsListUI();
}

function showAppScreen() {
  document.getElementById("projectsScreen")?.classList.add("hidden");
  document.getElementById("classesScreen")?.classList.add("hidden");
  document.getElementById("appScreen")?.classList.remove("hidden");

  setHeaderMode("app");
}

function setHeaderMode(mode) {
  // mode: "projects" | "app" | "classes"
  const aiBtn = document.getElementById("globalAiWizardBtn");
  const saveBtn = document.getElementById("saveToIndexedDBBtn");
  const backBtn = document.getElementById("backToProjectsBtn");

  const searchWrap = document.getElementById("projectsHeaderSearchWrap");
  const backFromClassesBtn = document.getElementById(
    "backToProjectsFromClassesBtn",
  );
  const goToClassesBtn = document.getElementById("goToClassesBtn");

  [
    aiBtn,
    saveBtn,
    backBtn,
    searchWrap,
    backFromClassesBtn,
    goToClassesBtn,
  ].forEach((el) => el?.classList.add("hidden"));

  if (mode === "projects") {
    searchWrap?.classList.remove("hidden");
    goToClassesBtn?.classList.remove("hidden");
    return;
  }

  if (mode === "app") {
    aiBtn?.classList.remove("hidden");
    saveBtn?.classList.remove("hidden");
    backBtn?.classList.remove("hidden");
    return;
  }

  if (mode === "classes") {
    backFromClassesBtn?.classList.remove("hidden");
    return;
  }
}

function formatDate(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString("fa-IR");
  } catch {
    return "";
  }
}

async function renderProjectsListUI({ animateInProjectId = null } = {}) {
  const wrap = document.getElementById("projectsList");
  const emptyState = document.getElementById("projectsEmptyState");
  const searchInp = document.getElementById("projectsSearchInput");
  if (!wrap) return;

  if (searchInp && searchInp.value !== projectsUI.query) {
    searchInp.value = projectsUI.query;
  }

  let projects = await listProjects();

  // filter by name
  const q = _norm(projectsUI.query);
  if (q) {
    projects = projects.filter((p) => _norm(p.name).includes(q));
  }

  // empty state
  if (!projects.length) {
    wrap.innerHTML = "";
    emptyState?.classList.remove("hidden");
    return;
  } else {
    emptyState?.classList.add("hidden");
  }

  wrap.innerHTML = projects
    .map((p) => {
      const title = escapeHtml(p.name || "بدون نام");
      const updated = escapeHtml(formatDate(p.updatedAt));
      const pid = escapeHtml(p.id);

      return `
        <div
          class="project-card group relative overflow-hidden rounded-2xl border border-border-light bg-surface p-4 md:p-5
                 shadow-sm hover:shadow-md transition cursor-pointer select-none"
          data-project-card="1"
          data-project-id="${pid}"
        >
          <div class="pointer-events-none absolute -inset-6 opacity-0 blur-2xl transition duration-300 group-hover:opacity-100"
               style="background:
                 radial-gradient(650px 220px at 85% 0%, rgba(99,102,241,.18), transparent 55%),
                 radial-gradient(520px 200px at 0% 15%, rgba(16,185,129,.10), transparent 55%);">
          </div>

          <div class="relative flex  items-center justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-3 min-w-0">
                <div class="shrink-0 grid place-items-center w-10 h-10 rounded-2xl border border-border-light/60 bg-surface-darker max-md:hidden">
                  <i class="bi bi-folder2-open text-lg text-secondary"></i>
                </div>

                <div class="min-w-0 w-full">
                  <div class="text-xs text-muted">پروژه</div>
                  <div class="text-[15px] md:text-[16px] font-bold text-primary truncate">
                    ${title}
                  </div>

                  <div class="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-xl
                              border border-border-light/60 bg-surface-darker text-xs text-secondary">
                    <i class="bi bi-clock text-muted"></i>
                    آخرین تغییر:
                    <span class="text-primary font-semibold">${updated}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Small icon-only actions -->
            <div class="relative flex items-center gap-2 max-md:flex-col max-md:gap-1">
              <button class="btn btn-outline w-10 h-10 px-0 py-0 inline-flex items-center justify-center rounded-xl"
                      data-prj-action="export" data-id="${pid}" data-tooltip="خروجی پروژه">
                <i class="bi bi-file-earmark-arrow-up"></i>
              </button>

              <button class="btn btn-outline w-10 h-10 px-0 py-0 inline-flex items-center justify-center rounded-xl"
                      data-prj-action="rename" data-id="${pid}" data-tooltip="تغییر نام">
                <i class="bi bi-pen"></i>
              </button>

              <button class="btn btn-outline w-10 h-10 px-0 py-0 inline-flex items-center justify-center rounded-xl"
                      data-prj-action="delete" data-id="${pid}" data-tooltip="حذف پروژه">
                <i class="bi bi-trash3"></i>
              </button>
            </div>

          </div>
        </div>
      `;
    })
    .join("");

  if (animateInProjectId) {
    const el = wrap.querySelector(
      `[data-project-id="${CSS.escape(String(animateInProjectId))}"]`,
    );
    if (el) animateEnterEl(el, "range-item-enter", { removeAfterFrames: 1 });
  }

  wrap.onclick = async (e) => {
    const actionBtn = e.target.closest("[data-prj-action]");
    if (actionBtn) {
      e.stopPropagation();

      const action = actionBtn.dataset.prjAction;
      const id = actionBtn.dataset.id;
      if (!id) return;

      if (action === "export") {
        const p = await getProjectById(id);
        if (!p) return;
        exportDataObject(
          { type: "quizapp-project-v1", project: p },
          p.name || "project",
        );
        return;
      }

      if (action === "rename") {
        const p = await getProjectById(id);
        if (!p) return;
        showConfirm({
          msg: "نام جدید پروژه:",
          input: { placeholder: "مثال: آزمون فصل ۳", required: true },
          confirmText: "ذخیره",
          cancelText: "انصراف",
          on_confirm: async (name) => {
            p.name = String(toPersianDigits(name) || "").trim() || p.name;
            await saveProject(p);
            await renderProjectsListUI();
            showToast("نام پروژه ذخیره شد.");
          },
        });
        return;
      }

      if (action === "delete") {
        const card = actionBtn.closest("[data-project-card]");
        showConfirm({
          msg: "پروژه حذف شود؟",
          on_confirm: async () => {
            if (card) {
              animateAndRemove(
                card,
                { mode: "collapse", duration: 260, propertyName: "height" },
                async () => {
                  await deleteProject(id);
                  const meta = await getMetaSettings();
                  if (meta.lastOpenedProjectId === id) {
                    await setMetaSettings({ lastOpenedProjectId: null });
                  }
                  await renderProjectsListUI();
                },
              );
            } else {
              await deleteProject(id);
              await renderProjectsListUI();
            }
          },
        });
        return;
      }

      return;
    }

    // click on card => open project
    const card = e.target.closest("[data-project-card]");
    if (!card) return;
    const projectId = card.dataset.projectId;
    if (!projectId) return;

    await openProject(projectId);
  };
}

async function openProject(projectId) {
  const p = await getProjectById(projectId);
  if (!p) {
    showToast("پروژه پیدا نشد.", "error");
    return;
  }

  currentProjectId = p.id;
  await setMetaSettings({ lastOpenedProjectId: p.id });

  applyImportedData(p.state);

  showAppScreen();
  showToast(`پروژه «${p.name || "بدون نام"}» باز شد.`);
}

async function createNewProjectFlow() {
  showConfirm({
    msg: "نام پروژه جدید:",
    input: { placeholder: "مثال: آزمون ریاضی", required: true },
    confirmText: "ساخت",
    cancelText: "انصراف",
    on_confirm: async (name) => {
      const prj = createProjectRecord(toPersianDigits(name));
      await saveProject(prj);

      await renderProjectsListUI({ animateInProjectId: prj.id });
    },
  });
}

async function exportAllProjects() {
  const projects = await listProjects();
  const payload = { type: "quizapp-projects-v1", projects };
  showConfirm({
    msg: "یک نام برای خروجی انتخاب کنید:",
    input: { placeholder: "مثال: آزمون های آبان ماه" },
    confirmText: "تایید",
    cancelText: "انصراف",
    on_confirm: async (name) =>
      exportDataObject(payload, name || "همه ی پروژه ها"),
  });
}

async function importAllProjectsFromJsonText(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    showToast("فایل JSON نامعتبر است!", "error");
    return;
  }

  if (parsed?.type === "quizapp-project-v1" && parsed.project?.id) {
    await saveProject(parsed.project);
    await renderProjectsListUI({ animateInProjectId: parsed.project.id });
    showToast("پروژه وارد شد.");
    return;
  }

  if (
    parsed?.type === "quizapp-projects-v1" &&
    Array.isArray(parsed.projects)
  ) {
    for (const p of parsed.projects) {
      if (p?.id) await saveProject(p);
    }
    await renderProjectsListUI();
    showToast("پروژه‌ها وارد شدند.");
    return;
  }

  if (parsed?.ranges) {
    const prj = createProjectRecord("پروژه وارد شده");
    prj.state = parsed;
    await saveProject(prj);
    await renderProjectsListUI();
    showToast("به‌عنوان یک پروژه جدید وارد شد.");
    return;
  }

  showToast("فرمت فایل پشتیبانی نمی‌شود.", "error");
}

// ========== Classes UI ==========
let classModal = null;
let _editingClassId = null;

function showClassesScreen() {
  document.getElementById("projectsScreen")?.classList.add("hidden");
  document.getElementById("appScreen")?.classList.add("hidden");
  document.getElementById("classesScreen")?.classList.remove("hidden");

  setHeaderMode("classes");
}

async function renderClassesListUI({ animateInClassId = null } = {}) {
  const wrap = document.getElementById("classesList");
  const emptyState = document.getElementById("classesEmptyState");
  if (!wrap) return;

  const classes = await listClasses();

  if (!classes.length) {
    wrap.innerHTML = "";
    emptyState?.classList.remove("hidden");
    return;
  } else {
    emptyState?.classList.add("hidden");
  }

  wrap.innerHTML = classes
    .map((c) => {
      const title = escapeHtml(c.name || "بدون نام");
      const cid = escapeHtml(c.id);
      const count = toPersianDigits((c.names || []).length);

      return `
      <div class="class-card group relative overflow-hidden rounded-2xl border border-border-light bg-surface p-4 md:p-5
                  shadow-sm hover:shadow-md transition select-none"
           data-class-card="1"
           data-class-id="${cid}">
        <div class="pointer-events-none absolute -inset-6 opacity-0 blur-2xl transition duration-300 group-hover:opacity-100"
             style="background:
               radial-gradient(650px 220px at 85% 0%, rgba(99,102,241,.18), transparent 55%),
               radial-gradient(520px 200px at 0% 15%, rgba(16,185,129,.10), transparent 55%);">
        </div>

        <div class="relative flex items-center justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-3 min-w-0">
              <div class="shrink-0 grid place-items-center w-10 h-10 rounded-2xl border border-border-light/60 bg-surface-darker max-md:hidden">
                <i class="bi bi-mortarboard text-lg text-secondary"></i>
              </div>

              <div class="min-w-0 w-full">
                <div class="text-xs text-muted">کلاس</div>
                <div class="text-[15px] md:text-[16px] font-bold text-primary truncate">${title}</div>

                <div class="mt-2 flex flex-wrap items-center gap-2">
                  <span class="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border border-border-light/60 bg-surface-darker text-xs text-secondary">
                    <i class="bi bi-people text-muted"></i>
                    تعداد: <span class="text-primary font-semibold">${count} نفر</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="relative flex items-center gap-2 max-md:flex-col max-md:gap-1">
            <button class="btn btn-outline w-10 h-10 px-0 py-0 inline-flex items-center justify-center rounded-xl"
                    data-cls-action="export" data-id="${cid}" data-tooltip="خروجی کلاس">
              <i class="bi bi-file-earmark-arrow-up"></i>
            </button>

            <button class="btn btn-outline w-10 h-10 px-0 py-0 inline-flex items-center justify-center rounded-xl"
                    data-cls-action="edit" data-id="${cid}" data-tooltip="ویرایش">
              <i class="bi bi-pen"></i>
            </button>

            <button class="btn btn-outline w-10 h-10 px-0 py-0 inline-flex items-center justify-center rounded-xl"
                    data-cls-action="delete" data-id="${cid}" data-tooltip="حذف کلاس">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  if (animateInClassId) {
    const el = wrap.querySelector(
      `[data-class-id="${CSS.escape(String(animateInClassId))}"]`,
    );
    if (el) animateEnterEl(el, "range-item-enter", { removeAfterFrames: 1 });
  }

  wrap.onclick = async (e) => {
    const actionBtn = e.target.closest("[data-cls-action]");
    if (!actionBtn) return;

    e.stopPropagation();

    const action = actionBtn.dataset.clsAction;
    const id = actionBtn.dataset.id;
    if (!id) return;

    if (action === "export") {
      const c = await getClassById(id);
      if (!c) return;
      exportDataObject(
        { type: "quizapp-class-v1", class: c },
        c.name || "class",
      );
      return;
    }

    if (action === "edit") {
      await openClassModalForEdit(id);
      return;
    }

    if (action === "delete") {
      const card = actionBtn.closest("[data-class-card]");
      showConfirm({
        msg: "کلاس حذف شود؟",
        on_confirm: async () => {
          if (card) {
            animateAndRemove(
              card,
              { mode: "collapse", duration: 260, propertyName: "height" },
              async () => {
                await deleteClass(id);

                // اگر کلاس انتخاب‌شده همین بود، پاکش کن
                if (appState.selectedClassId === id)
                  appState.selectedClassId = null;

                await renderClassesListUI();
                // سلکتِ کلاس در print settings را هم آپدیت کن
                rebuildPrintSettingsUI();
              },
            );
          } else {
            await deleteClass(id);
            if (appState.selectedClassId === id)
              appState.selectedClassId = null;
            await renderClassesListUI();
            rebuildPrintSettingsUI();
          }
        },
      });
      return;
    }
  };
}

function initClassModal() {
  classModal = new Modal("#modal-class", {
    title: "تعریف کلاس",
    closeOnOverlayClick: false,
  });

  const nameInp = document.getElementById("classNameInput");
  const namesTa = document.getElementById("classNamesTextarea");
  const saveBtn = document.getElementById("saveClassBtn");

  saveBtn?.addEventListener("click", async () => {
    const name = (nameInp?.value || "").trim();
    const namesText = namesTa?.value || "";

    const names = normalizeNamesFromText(namesText);
    if (!name) return showToast("نام کلاس را وارد کنید.", "error");
    if (!names.length) return showToast("حداقل یک نام وارد کنید.", "error");

    if (_editingClassId) {
      const current = await getClassById(_editingClassId);
      if (!current) return;

      current.name = name;
      current.names = names;

      await saveClass(current);
      showToast("کلاس ذخیره شد.");
    } else {
      const rec = createClassRecord({ name, namesText });
      await saveClass(rec);
      showToast("کلاس ایجاد شد.");
    }

    classModal.close();
    _editingClassId = null;
    await renderClassesListUI();
    rebuildPrintSettingsUI();
  });
}

async function openClassModalForCreate() {
  _editingClassId = null;

  document.getElementById("classNameInput").value = "";
  document.getElementById("classNamesTextarea").value = "";

  classModal.setTitle?.("تعریف کلاس");
  classModal.open();
}

async function openClassModalForEdit(classId) {
  const c = await getClassById(classId);
  if (!c) return showToast("کلاس پیدا نشد.", "error");

  _editingClassId = classId;

  document.getElementById("classNameInput").value = c.name || "";
  document.getElementById("classNamesTextarea").value = (c.names || []).join(
    "\n",
  );

  classModal.setTitle?.("ویرایش کلاس");
  classModal.open();
}

function initClassesUIEvents() {
  document
    .getElementById("goToClassesBtn")
    ?.addEventListener("click", async () => {
      showClassesScreen();
      await renderClassesListUI();
    });

  document
    .getElementById("backToProjectsFromClassesBtn")
    ?.addEventListener("click", async () => {
      showProjectsScreen();
      await renderProjectsListUI();
    });

  document
    .getElementById("createClassBtn")
    ?.addEventListener("click", openClassModalForCreate);

  document
    .getElementById("exportAllClassesBtn")
    ?.addEventListener("click", exportAllClasses);

  const importInput = document.getElementById("importAllClassesInput");
  importInput?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const txt = await file.text();
      await importAllClassesFromJsonText(txt);
      rebuildPrintSettingsUI();
    } finally {
      e.target.value = "";
    }
  });
}

// ========== Initialization ==========

(async () => {
  if (currentProjectId) rebuildPrintSettingsUI();
  initAiWizardModal();
  initWizardEvents();
  initProjectsUIEvents();
  initClassModal();
  initClassesUIEvents();

  showProjectsScreen();
  await renderProjectsListUI();
})();

initializeHeaderButtons();
initPreviewImageToolbar();

setupInputScrollOnFocus();
setupCropModalEvents();

window.addEventListener("resize", () => {
  const isNowMobile = isMobile();
  document.querySelectorAll(".range-item").forEach((el) => {
    el.draggable = !isNowMobile;
  });
  placePrintSettingsUI();
  adjustMobilePadding();
  updateToTopPosition();
});

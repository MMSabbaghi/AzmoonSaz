// ---------- State Management ----------
const appState = {
  ranges: [], // { id, rangeName, count, score, desc, items: [] }
  names: [],
  namesCount: 1,
  font: "'Vazirmatn', sans-serif",
  modal: {
    isOpen: false,
    rangeId: null,
    itemId: null,
    tempItem: null,
  },
};

const TEXT_DEFAULTS = {
  html: "<p>متن جدید</p>",
  align: "RIGHT",
};

const IMAGE_DEFAULTS = {
  height: 75,
  align: "RIGHT",
  showText: true,
};

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

// ---------- Utility Functions ----------
function toPersianDigits(str) {
  return (str + "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

function handleSwitchElement({ container, onChange }) {
  const sw = container.querySelector("#switch");
  const knob = container.querySelector("#knob");
  let on = false;
  sw.addEventListener("click", () => {
    on = !on;
    const func = on ? "add" : "remove";
    sw.classList[func]("bg-[#333]");
    knob.classList[func]("translate-x-4", "scale-105");
    onChange(on);
  });
}

function setElementState({ target, stateClasses, isActive }) {
  target.classList.remove(...stateClasses.on, ...stateClasses.off);
  target.classList.add(...stateClasses[isActive ? "on" : "off"]);
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

// ---------- Item Creation ----------
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

// ---------- DOM Elements ----------
const rangesContainer = document.getElementById("ranges");
const modal = document.getElementById("modal");
const modalOverlay = document.getElementById("modal-overlay");
const modalTextEditor = document.getElementById("modal-text-editor");
const imageSettingsDiv = document.getElementById("image-settings");
const modalImgHeight = document.getElementById("modal-imgHeight");
const modalShowText = document.getElementById("modal-show-text");
const editCropBtn = document.getElementById("editCropBtn");
const saveCroppedImageBtn = document.getElementById("saveCroppedImageBtn");
const cancelCropBtn = document.getElementById("cancelCropBtn");
const alignButtons = document.querySelectorAll(".align-btn");
const moveToTopBtn = document.getElementById("toTop");
const sticky = document.getElementById("sticky");
const sentinel = document.getElementById("sentinel");
const namesCountEl = document.getElementById("names-count");
const namesTextareaContainer = document.getElementById("names-textarea");
const namesTextarea = namesTextareaContainer.querySelector("textarea");
const fontSelector = document.getElementById("fontSelector");
const modalQscore = document.getElementById("modal-Qscore");
const modalPreviewCell = document.getElementById("modal-preview-cell");
const saveModalBtn = document.getElementById("save-modal-btn");
const addImageInModalBtn = document.getElementById("add-image-in-modal");
const modalImageUpload = document.getElementById("modal-image-upload");

// ---------- State-bound UI Variables ----------
let activeRangeId = null; // range ای که آخرین بار کلیک شده (برای چسباندن)
let cropper = null;
let isTouchDevice = false;
let draggedElement = null;
const dragPlaceholder = document.createElement("div");
dragPlaceholder.className = "placeholder";

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
function renderRangeItems(rangeElement, rangeId) {
  const range = appState.ranges.find((r) => r.id === rangeId);
  if (!range) return;
  const preview = rangeElement.querySelector(".items-preview");
  preview.innerHTML = "";
  range.items.forEach((item, index) => {
    const itemContainer = createItemThumbnailElement(
      item,
      rangeElement,
      rangeId,
    );
    itemContainer.classList.add("item-thumbnail-enter");
    preview.appendChild(itemContainer);
    setTimeout(() => {
      itemContainer.classList.remove("item-thumbnail-enter");
    }, index * 50);
  });
}

function createItemThumbnailElement(item, rangeDiv, rangeId) {
  const container = document.createElement("div");
  container.className = "item-thumbnail";
  container.dataset.itemId = item.id;

  let contentHtml = "";
  if (item.text) {
    contentHtml += `<div class="text-preview" style="text-align: ${item.text.align.toLowerCase()};">${item.text.html}</div>`;
  }
  if (item.image) {
    const imgAlign = item.image.align.toLowerCase();
    const marginClass =
      imgAlign === "right"
        ? "ml-auto"
        : imgAlign === "left"
          ? "mr-auto"
          : "mx-auto";
    contentHtml += `<img src="${item.image.src}" style="max-height: ${item.image.height}px; display: block;" class="${marginClass}">`;
  }

  container.innerHTML =
    contentHtml + `<button class="remove-item">&times;</button>`;

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

  container.addEventListener("click", () => {
    openItemModal(rangeId, item.id);
  });

  return container;
}

function updateRangeItemCountBadge(rangeDiv) {
  const itemsCount = rangeDiv.querySelector(".items-preview").children.length;
  rangeDiv.querySelector(".range-total").textContent =
    toPersianDigits(itemsCount);
}

// ========== Range DOM Building ==========
function getRangeHTML(rangeData) {
  const fileID = createRandomId("file");
  return `
    <div class="range-header my-1">
      <div class="flex items-center gap-2">
        <div>
          <label class="font-normal text-[#777]"> مبحث: </label>
          <input value="${rangeData.rangeName}" type="text" class="border rounded p-2 range-name" placeholder="عنوان مبحث">
        </div>
        <div>
          <label class="font-normal text-[#777]"> تعداد: </label>
          <input value="${rangeData.count}" data-number-input="true" data-float="false" class="w-20 border rounded p-2 range-count" placeholder="تعداد">
        </div>
        <div>
          <label class="font-normal text-[#777]" > نمره: </label>
          <input value="${rangeData.score}" data-number-input="true" class="w-20 border rounded p-2 range-score" placeholder="نمره">
        </div>
        <div class="relative inline-block">
          <div class="file-input">
            <input type="file" id="${fileID}" accept="image/*" multiple class="file range-images">
            <label for="${fileID}" class="btn px-4 py-2 rounded"><i class="bi bi-image"></i></label>
            <span class="range-total absolute top-0 left-0 -mt-2 -ml-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              ${toPersianDigits(rangeData.items.length)}
            </span>
          </div>
        </div>
        <button class="add-text-item btn px-3 py-2 rounded"><i class="bi bi-type"></i></button>
        <label class="font-normal text-[#777]" > متن سوال: </label>
        <div id="switch" class="relative w-[42px] h-[24px] bg-[#ccc] rounded-[var(--radius)] cursor-pointer transition-all duration-300 ease-out shadow-inner">
          <div id="knob" class="absolute top-[2px] left-[3px] w-[20px] h-[20px] bg-white rounded-[var(--radius)] transition-all duration-500 shadow-md"></div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button class="p-1 text-[#ccc] hover:text-red-500 rounded remove-range transition-all duration-500 ease-out"><i class="bi bi-trash3"></i></button>
        <button class="p-1 text-[#ccc] hover:text-[var(--primary)] rounded copy-range transition-all duration-500 ease-out"><i class="bi bi-copy"></i></button>
      </div>
    </div>
    <div id="textareaBox" class="overflow-hidden max-h-0 opacity-0 blur-sm -translate-y-3 transition-all duration-500 ease-out">
      <textarea class="range-desc w-full h-15 border rounded-[var(--radius)] p-3 text-sm focus:outline-none" placeholder="متن سوال را اینجا بنویسید.">${rangeData.desc || ""}</textarea>
    </div>
    <div class="items-preview"></div>
  `;
}

function setupRangeInputs(rangeElement, rangeId) {
  rangeElement.querySelector(".range-name").addEventListener("input", (e) => {
    updateRangeInState(rangeId, { rangeName: e.target.value });
  });
  rangeElement.querySelector(".range-count").addEventListener("input", (e) => {
    updateRangeInState(rangeId, { count: parseInt(e.target.value) || 0 });
  });
  rangeElement.querySelector(".range-score").addEventListener("input", (e) => {
    updateRangeInState(rangeId, { score: e.target.value });
  });
  rangeElement.querySelector(".range-desc").addEventListener("input", (e) => {
    updateRangeInState(rangeId, { desc: e.target.value });
  });
}

function setupRangeButtons(rangeElement, rangeId) {
  rangeElement.querySelector(".remove-range").onclick = () => {
    showConfirm({
      msg: "آیا از حذف این مبحث اطمینان دارید؟",
      on_confirm: () => {
        animateRemoveRange(rangeElement, () => {
          appState.ranges = appState.ranges.filter((r) => r.id !== rangeId);
        });
      },
    });
  };

  rangeElement.querySelector(".copy-range").addEventListener("click", () => {
    const items = appState.ranges.find((r) => r.id === rangeId)?.items || [];
    if (items.length) {
      copyToClipboard(JSON.stringify(items));
    } else {
      showToast("آیتمی برای کپی وجود ندارد.", "error");
    }
  });

  rangeElement.querySelector(".add-text-item").addEventListener("click", () => {
    const newItem = createTextItem();
    openModalForNewItem(rangeId, newItem);
  });
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

function attachRangeEvents(rangeElement, rangeId) {
  rangeElement.addEventListener("click", (e) => {
    if (!e.target.closest("button")) {
      activeRangeId = rangeId;
    }
  });

  setupSwitchOnRange(rangeElement);
  setupFileUploadOnRange(rangeElement, rangeId);
  setupRangeButtons(rangeElement, rangeId);
  setupRangeInputs(rangeElement, rangeId);
  renderRangeItems(rangeElement, rangeId);
}

function buildRangeDOM(rangeData) {
  const div = document.createElement("div");
  div.id = rangeData.id;
  div.draggable = true;
  div.className = "range-item transition-transform duration-200 ease-out";
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

// ========== Names Section ==========
function renderNamesSection() {
  namesTextarea.value = appState.names.join("\n");
  if (appState.names.length > 0) {
    namesCountEl.value = appState.names.length;
    namesCountEl.disabled = true;
  } else {
    namesCountEl.value = appState.namesCount;
    namesCountEl.disabled = false;
  }
}

function syncNamesFromTextarea() {
  const names = namesTextarea.value
    .trim()
    .split("\n")
    .filter((n) => n);
  appState.names = names;
  renderNamesSection();
}

// ========== Paste Handler (اصلاح شده برای پشتیبانی از مودال) ==========
document.addEventListener("paste", async (e) => {
  // اگر مودال باز است، تصویر را به آیتم موقت اضافه کن
  if (appState.modal.tempItem) {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          e.preventDefault();
          const blob = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = (ev) => {
            const src = ev.target.result;
            const temp = appState.modal.tempItem;
            if (!temp.image) {
              // اضافه کردن تصویر جدید
              temp.image = {
                src,
                height: IMAGE_DEFAULTS.height,
                align: IMAGE_DEFAULTS.align,
                showText: modalShowText.checked,
                imageId: createRandomId("img"),
              };
              imageSettingsDiv.classList.remove("hidden");
            } else {
              // جایگزینی تصویر
              showConfirm({
                msg: "آیا تصویر فعلی جایگزین شود؟",
                on_confirm: () => {
                  temp.image.src = src;
                  temp.image.imageId = createRandomId("img");
                },
              });
            }
            updateModalPreviewFromTemp();
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    }
    // اگر JSON نیست، فقط تصویر پشتیبانی می‌شود
    return;
  }

  // اگر مودال باز نیست، مثل قبل عمل کن
  if (!activeRangeId) return;

  const items = e.clipboardData?.items;
  if (items) {
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
    console.error("خطا در پردازش چسباندن (JSON نامعتبر):", err);
  }
});

// ========== Quiz Generation ==========
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

function getAlignmentClass(align) {
  const classes = { RIGHT: "ml-auto", LEFT: "mr-auto", CENTER: "mx-auto" };
  return classes[align];
}

function renderItemForQuiz(item, rangeDesc) {
  let html = "";
  if (item.text) {
    html += `<div style="text-align: ${item.text.align.toLowerCase()};">${item.text.html}</div>`;
  }
  if (item.image) {
    const img = item.image;
    if (img.showText) {
      const text = item.text ? item.text.html : rangeDesc || "";
      if (text) {
        html += `<div>${text}</div>`;
      }
    }
    html += `<img class="max-h-[${img.height}px] ${getAlignmentClass(img.align)}" src="${img.src}" alt="">`;
  }
  return html;
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
  return {
    names: appState.names.length
      ? appState.names
      : generateAnonymousStudentNames(appState.namesCount),
    showNames: appState.names.length > 0,
  };
}

function generateQuizHtml() {
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

  const { names, showNames } = getStudentNames();
  const quizData = buildQuizData(names, validRanges);

  const html = names
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

  document.getElementById("printable").innerHTML = `
    <table class="w-full">
      <tbody>${html}</tbody>
    </table>`;
  return true;
}

// ========== Modal Functions ==========
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

  if (temp.text) {
    modalTextEditor.innerHTML = temp.text.html;
    modalTextEditor.style.textAlign = temp.text.align.toLowerCase();
  } else {
    modalTextEditor.innerHTML = "";
    modalTextEditor.style.textAlign = "right";
  }

  modalShowText.checked = temp.image ? temp.image.showText : false;

  if (temp.image) {
    imageSettingsDiv.classList.remove("hidden");
    modalImgHeight.value = temp.image.height;
  } else {
    imageSettingsDiv.classList.add("hidden");
  }

  updateModalPreviewFromTemp();

  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("modal--visible"), 10);
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

  let content = "";
  if (temp.image && temp.image.showText) {
    const text = temp.text ? temp.text.html : range.desc || "";
    if (text) {
      content += `<div style="text-align: ${temp.text ? temp.text.align.toLowerCase() : "right"};">${text}</div>`;
    }
  } else if (temp.text && !temp.image) {
    content += `<div style="text-align: ${temp.text.align.toLowerCase()};">${temp.text.html}</div>`;
  }
  if (temp.image) {
    const img = temp.image;
    content += `<img class="max-h-[${img.height}px] ${getAlignmentClass(img.align)}" src="${img.src}" alt="">`;
  }
  modalPreviewCell.innerHTML = content;
}

function saveModalChanges() {
  const { rangeId, itemId, tempItem } = appState.modal;
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

  closeModal();
}

function closeModal() {
  destroyCropper();
  appState.modal.rangeId = null;
  appState.modal.itemId = null;
  appState.modal.tempItem = null;
  modal.classList.remove("modal--visible");
  setTimeout(() => {
    modal.style.display = "none";
    modalTextEditor.innerHTML = "";
  }, 300);
}

// ابزارک ویرایشگر متن
document.querySelectorAll("[data-command]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const command = btn.dataset.command;
    document.execCommand(command, false, null);
    if (appState.modal.tempItem) {
      const html = modalTextEditor.innerHTML;
      const align = modalTextEditor.style.textAlign || "right";
      if (!appState.modal.tempItem.text) {
        appState.modal.tempItem.text = { html, align: align.toUpperCase() };
      } else {
        appState.modal.tempItem.text.html = html;
        appState.modal.tempItem.text.align = align.toUpperCase();
      }
      updateModalPreviewFromTemp();
    }
  });
});

modalTextEditor.addEventListener("input", () => {
  if (appState.modal.tempItem) {
    const html = modalTextEditor.innerHTML;
    const align = modalTextEditor.style.textAlign || "right";
    if (!appState.modal.tempItem.text) {
      appState.modal.tempItem.text = { html, align: align.toUpperCase() };
    } else {
      appState.modal.tempItem.text.html = html;
      appState.modal.tempItem.text.align = align.toUpperCase();
    }
    updateModalPreviewFromTemp();
  }
});

modalImgHeight.addEventListener("input", (e) => {
  if (appState.modal.tempItem?.image) {
    appState.modal.tempItem.image.height =
      parseInt(e.target.value) || IMAGE_DEFAULTS.height;
    updateModalPreviewFromTemp();
  }
});

modalShowText.addEventListener("change", (e) => {
  if (appState.modal.tempItem?.image) {
    appState.modal.tempItem.image.showText = e.target.checked;
    updateModalPreviewFromTemp();
  }
});

alignButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const align = btn.dataset.align;
    if (!align) return;
    if (appState.modal.tempItem?.image) {
      appState.modal.tempItem.image.align = align;
      updateModalPreviewFromTemp();
    } else if (appState.modal.tempItem?.text) {
      document.execCommand(`justify${align.toLowerCase()}`, false, null);
    }
  });
});

// دکمه تصویر در مودال
addImageInModalBtn.addEventListener("click", () => {
  modalImageUpload.click();
});

handleFileUpload({
  target: modalImageUpload,
  onChange: (src) => {
    const temp = appState.modal.tempItem;
    if (!temp) return;

    if (!temp.image) {
      temp.image = {
        src,
        height: IMAGE_DEFAULTS.height,
        align: IMAGE_DEFAULTS.align,
        showText: modalShowText.checked,
        imageId: createRandomId("img"),
      };
      imageSettingsDiv.classList.remove("hidden");
    } else {
      showConfirm({
        msg: "آیا تصویر فعلی جایگزین شود؟",
        on_confirm: () => {
          temp.image.src = src;
          temp.image.imageId = createRandomId("img");
        },
      });
    }
    updateModalPreviewFromTemp();
  },
  readAs: "DataURL",
});

// برش تصویر
editCropBtn.addEventListener("click", () => {
  const imgElement = modalPreviewCell.querySelector("img");
  if (!imgElement) return;
  if (cropper) cropper.destroy();
  cropper = new Cropper(imgElement, {
    aspectRatio: NaN,
    viewMode: 1,
    movable: true,
    zoomable: true,
    scalable: true,
    responsive: true,
    autoCropArea: 1,
  });
  toggleCropButtons(true);
});

saveCroppedImageBtn.addEventListener("click", () => {
  if (!cropper) return;
  const croppedCanvas = cropper.getCroppedCanvas();
  const croppedImage = new Image();
  croppedImage.onload = () => {
    const newSrc = croppedImage.src;
    if (appState.modal.tempItem?.image) {
      appState.modal.tempItem.image.src = newSrc;
    }
    updateModalPreviewFromTemp();
    destroyCropper();
  };
  croppedImage.src = croppedCanvas.toDataURL();
});

cancelCropBtn.addEventListener("click", destroyCropper);

function destroyCropper() {
  cropper?.destroy();
  cropper = null;
  toggleCropButtons(false);
}

function toggleCropButtons(isActive) {
  editCropBtn.classList[isActive ? "add" : "remove"]("hidden");
  const func = isActive ? "remove" : "add";
  saveCroppedImageBtn.classList[func]("hidden");
  cancelCropBtn.classList[func]("hidden");
  [
    modalTextEditor,
    ...alignButtons,
    modalImgHeight,
    modalShowText,
    addImageInModalBtn,
    saveModalBtn,
  ].forEach((el) => el && (el.disabled = isActive));
}

// دکمه ذخیره با تأیید
saveModalBtn.addEventListener("click", () => {
  showConfirm({
    msg: "آیا از ذخیره تغییرات اطمینان دارید؟",
    on_confirm: saveModalChanges,
  });
});

// بستن مودال با کلیک روی overlay (بدون ذخیره)
modalOverlay.addEventListener("click", closeModal);

// ========== Drag & Drop Helpers ==========
function handleDragStart(e) {
  if (!e.target.classList.contains("range-item")) return;
  draggedElement = e.target;
  draggedElement.classList.add("opacity-50");
  setTimeout(() => draggedElement.classList.add("hidden"), 0);
}

function handleDragOver(e) {
  if (isTouchDevice || !draggedElement) return;
  e.preventDefault();
  handleDragMove(e.clientY);
}

function handleDrop(e) {
  e.preventDefault();

  const items = [...rangesContainer.querySelectorAll(".range-item")];
  const oldRects = items.map((el) => ({
    el,
    rect: el.getBoundingClientRect(),
  }));

  if (dragPlaceholder.parentNode) {
    rangesContainer.insertBefore(draggedElement, dragPlaceholder);
    dragPlaceholder.remove();

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
  dragCleanup();
}

function handleTouchStart(e) {
  const target = e.target.closest(".range-item");
  if (!target) return;
  isTouchDevice = true;
  draggedElement = target;
  draggedElement.classList.add("opacity-50");
}

function handleTouchMove(e) {
  if (!draggedElement) return;
  handleDragMove(e.touches[0].clientY);
}

function handleTouchEnd() {
  const items = [...rangesContainer.querySelectorAll(".range-item")];
  const oldRects = items.map((el) => ({
    el,
    rect: el.getBoundingClientRect(),
  }));

  if (dragPlaceholder.parentNode) {
    rangesContainer.insertBefore(draggedElement, dragPlaceholder);
    dragPlaceholder.remove();

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

// ========== Event Listeners ==========
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

handleSwitchElement({
  container: document.getElementById("names-switch"),
  onChange: (isActive) => {
    setElementState({
      target: namesTextareaContainer,
      stateClasses: {
        on: ["max-h-60", "opacity-100", "blur-0", "translate-y-0"],
        off: ["max-h-0", "opacity-0", "blur-sm", "-translate-y-3"],
      },
      isActive,
    });
    syncNamesFromTextarea();
  },
});

namesTextarea.addEventListener("input", () => {
  syncNamesFromTextarea();
  appState.namesCount = namesCountEl.value;
});

namesCountEl.addEventListener("input", (e) => {
  appState.namesCount = parseInt(e.target.value) || 1;
});

document.getElementById("generate").onclick = (e) => {
  const isGenerated = generateQuizHtml();
  if (isGenerated) e.target.scrollIntoView({ behavior: "smooth" });
};

// Import / Export
document.getElementById("exportJson").onclick = () => {
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
};

handleFileUpload({
  target: document.getElementById("importJson"),
  onChange: (file) => {
    try {
      const data = JSON.parse(file);
      appState.ranges = [];
      appState.names = data.names || [];
      appState.namesCount = data.namesCount || 1;

      (data.ranges || []).forEach((r) => {
        let items = [];
        if (r.items) {
          items = r.items.map((it) => ({
            id: it.id || createRandomId("item"),
            text: it.text ? { ...it.text } : null,
            image: it.image
              ? {
                  ...it.image,
                  imageId: it.image.imageId || createRandomId("img"),
                }
              : null,
          }));
        } else if (r.images) {
          items = r.images.map((img) => ({
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
        const rangeWithId = {
          id: createRandomId("range-item"),
          rangeName: r.rangeName || "",
          count: r.count || 1,
          score: r.score || 1,
          desc: r.desc || "",
          items,
        };
        appState.ranges.push(rangeWithId);
      });

      rangesContainer.innerHTML = "";
      appState.ranges.forEach((r, index) => {
        const el = createRangeElement(r);
        rangesContainer.appendChild(el);
        el.classList.add("range-item-enter");
        setTimeout(() => {
          el.classList.remove("range-item-enter");
        }, index * 100);
      });

      renderNamesSection();
    } catch (err) {
      console.error("خطا در پردازش فایل JSON:", err);
      showToast("فایل JSON نامعتبر است!", "error");
    }
  },
  readAs: "Text",
});

// Drag & Drop
rangesContainer.addEventListener("dragstart", handleDragStart);
rangesContainer.addEventListener("dragend", dragCleanup);
rangesContainer.addEventListener("dragover", handleDragOver);
rangesContainer.addEventListener("drop", handleDrop);
rangesContainer.addEventListener("touchstart", handleTouchStart, {
  passive: true,
});
rangesContainer.addEventListener("touchmove", handleTouchMove, {
  passive: true,
});
rangesContainer.addEventListener("touchend", handleTouchEnd);

// Font selector
fontSelector.addEventListener("change", function (e) {
  appState.font = e.target.value;
  document.body.style.fontFamily = appState.font;
});

// Sticky & Scroll
const observer = new IntersectionObserver(
  ([entry]) => {
    const isActive = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    sticky.classList[isActive ? "add" : "remove"]("is-sticky");
  },
  { root: null, threshold: 0 },
);
observer.observe(sentinel);

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

// Initialize font
document.body.style.fontFamily = appState.font;

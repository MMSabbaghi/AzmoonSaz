// ---------- State Management ----------
const appState = {
  ranges: [], // هر range شامل { id, rangeName, count, score, desc, items, itemsCollapsed }
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
  html: "<p>متن جدید</p>",
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

// ---------- Utility Functions ----------
function toPersianDigits(str) {
  return (str + "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

function isMobile() {
  return window.innerWidth <= 768;
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

// ========== تابع کمکی برای تراز تصویر ==========
function getAlignmentClass(align) {
  const classes = { RIGHT: "ml-auto", LEFT: "mr-auto", CENTER: "mx-auto" };
  return classes[align] || "";
}

// ========== تابع یکپارچه برای تولید HTML آیتم ==========
function renderItemContent(item, options = {}) {
  const { rangeDesc = "", imageClass = "", textClass = "" } = options;
  let html = "";

  // بخش متن
  if (item.image && item.image.showText) {
    const text = item.text ? item.text.html : rangeDesc;
    if (text) {
      const align = item.text ? item.text.align.toLowerCase() : "right";
      html += `<div class="${textClass}" style="text-align: ${align};">${text}</div>`;
    }
  } else if (item.text && !item.image) {
    html += `<div class="${textClass}" style="text-align: ${item.text.align.toLowerCase()};">${item.text.html}</div>`;
  }

  // بخش تصویر
  if (item.image) {
    const img = item.image;
    const alignClass = getAlignmentClass(img.align);
    const classNames = [alignClass, imageClass].filter(Boolean).join(" ");
    html += `<img src="${img.src}" style="height: ${img.height}px; width: auto; display: block;" class="${classNames}" alt="">`;
  }

  return html;
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
const saveModalBtn = document.getElementById("save-modal-btn");
const moveToTopBtn = document.getElementById("toTop");
const sticky = document.getElementById("sticky");
const sentinel = document.getElementById("sentinel");
const namesCountEl = document.getElementById("names-count");
const namesTextareaContainer = document.getElementById("names-textarea");
const namesTextarea = namesTextareaContainer.querySelector("textarea");
const fontSelector = document.getElementById("fontSelector");
const modalQscore = document.getElementById("modal-Qscore");
const modalPreviewCell = document.getElementById("modal-preview-cell");
const modalShowText = document.getElementById("modal-show-text");
const modalTextEditor = document.getElementById("modal-text-editor");
const previewImageToolbar = document.getElementById("previewImageToolbar");
const previewImgHeight = document.getElementById("previewImgHeight");
const previewImgHeightValue = document.getElementById("previewImgHeightValue");
const previewImgBrightness = document.getElementById("previewImgBrightness");
const previewImgContrast = document.getElementById("previewImgContrast");
const previewCropBtn = document.getElementById("previewCropBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalImageUpload = document.getElementById("modalImageUpload");
const modalImageUploadContainer = document.getElementById(
  "modalImageUploadContainer",
);
const removeImageBtn = document.getElementById("removeImageBtn");
const aiModalOverlay = document.getElementById("aiModalOverlay");
const aiModalContent = document.getElementById("aiModalContent");
const closeAiModalBtn = document.getElementById("closeAiModalBtn");
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

// ---------- State-bound UI Variables ----------
let selectedPreviewImage = null;
let cropper = null;
let activeRangeId = null; // last clicked range (for paste)
let isTouchDevice = false;
let draggedElement = null;
const dragPlaceholder = document.createElement("div");
dragPlaceholder.className = "placeholder";

// ========== Swipe to Delete (بهبود یافته) ==========
let touchStartX = null;
let touchStartY = null;
let touchCurrentX = null;
let isSwiping = false;
const minSwipeDistance = 80;
const maxVerticalDeviation = 20;
let justSwiped = false;

function handleTouchStart(e) {
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchCurrentX = touchStartX;
  isSwiping = false;
  this.dataset.swiping = "false";
  this.style.transition = "none";
  this.dataset.touchStartTime = Date.now();

  const swipeDistance = Math.min(80, this.offsetWidth * 0.3);
  this.dataset.swipeDistance = swipeDistance;
}

function handleTouchMove(e) {
  if (touchStartX === null) return;
  const touch = e.touches[0];
  const diffX = touch.clientX - touchStartX;
  const diffY = Math.abs(touch.clientY - touchStartY);

  if (diffY > maxVerticalDeviation) {
    isSwiping = false;
    return;
  }

  if (Math.abs(diffX) > 15) {
    e.preventDefault();
    isSwiping = true;
    this.dataset.swiping = "true";
  }

  if (isSwiping) {
    const swipeDistance = parseFloat(this.dataset.swipeDistance) || 80;
    let translateX = diffX;
    if (diffX < 0) {
      translateX = Math.max(diffX, -swipeDistance);
    } else {
      if (this.dataset.swiped === "true") {
        translateX = Math.min(diffX, 0);
      } else {
        translateX = 0;
      }
    }
    this.style.transform = `translateX(${translateX}px)`;
    touchCurrentX = touch.clientX;
  }
}

function handleTouchEnd(e) {
  if (touchStartX === null) return;
  const timeDiff = Date.now() - this.dataset.touchStartTime;
  const diffX = touchCurrentX - touchStartX;
  const swipeDistance =
    parseFloat(this.dataset.swipeDistance) || minSwipeDistance;
  const wasSwiping = isSwiping || Math.abs(diffX) > swipeDistance;

  if (wasSwiping) {
    e.preventDefault();
    justSwiped = true;
    setTimeout(() => {
      justSwiped = false;
    }, 300);

    if (diffX < -swipeDistance) {
      this.style.transform = `translateX(-${swipeDistance}px)`;
      this.style.transition = "transform 0.3s ease";
      this.dataset.swiped = "true";

      if (!this.querySelector(".swipe-delete-btn")) {
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "swipe-delete-btn";
        deleteBtn.innerHTML = '<i class="bi bi-trash3"></i>';
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          if (this.classList.contains("item-thumbnail")) {
            const removeBtn = this.querySelector(".remove-item");
            if (removeBtn) removeBtn.click();
          } else if (this.classList.contains("range-item")) {
            const removeRangeBtn = this.querySelector(".remove-range");
            if (removeRangeBtn) removeRangeBtn.click();
          }
          resetSwipe(this);
        };
        this.appendChild(deleteBtn);
      }
    } else {
      resetSwipe(this);
    }
  } else {
    resetSwipe(this);
  }

  touchStartX = null;
  isSwiping = false;
  delete this.dataset.swiping;
}

function handleTouchCancel(e) {
  resetSwipe(this);
  touchStartX = null;
  isSwiping = false;
}

function resetSwipe(el) {
  el.style.transform = "translateX(0)";
  el.style.transition = "transform 0.3s ease";
  delete el.dataset.swiped;
  const btn = el.querySelector(".swipe-delete-btn");
  if (btn) btn.remove();
}

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
  container.className = "item-thumbnail";
  container.dataset.itemId = item.id;
  container.innerHTML =
    renderItemContent(item) + `<button class="remove-item">&times;</button>`;

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

  container.addEventListener("click", (e) => {
    if (
      justSwiped ||
      container.dataset.swiped === "true" ||
      container.dataset.swiping === "true"
    ) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
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
  if (isMobile()) {
    return `
      <div class="range-header-mobile my-1">
        <div class="range-header-row">
          <div class="range-title">
            <input value="${rangeData.rangeName}" type="text" class="border rounded p-2 range-name" placeholder="عنوان مبحث">
            <span class="range-total">${toPersianDigits(rangeData.items.length)}</span>
          </div>
          <div class="range-actions">
          <button class="toggle-items-btn ${rangeData.itemsCollapsed ? "collapsed" : ""}">
            <i class="bi bi-eye"></i>
          </button>
          <button class="move-up"><i class="bi bi-arrow-up"></i></button>
          <button class="move-down"><i class="bi bi-arrow-down"></i></button>
          </button>
          <button class="copy-range"><i class="bi bi-copy"></i></button>
          <button class="paste-range"><i class="bi bi-clipboard-plus"></i></button>
          <button class="remove-range"><i class="bi bi-trash3"></i></button>
          </div>
        </div>
        <div class="range-details ${rangeData.itemsCollapsed ? "hidden" : ""}">
          <div class="details-row">
            <label>تعداد:</label> <input value="${rangeData.count}" data-number-input="true" data-float="false" class="range-count border rounded p-2 w-10">
            <label>نمره:</label> <input value="${rangeData.score}" data-number-input="true" class="range-score border rounded p-2 w-10">
            <div class="file-input hidden">
              <input type="file" class="range-images" accept="image/*" multiple><label class="btn px-3 py-2"><i class="bi bi-image"></i></label>
            </div>
            <div class="hidden">
            <label class="font-normal text-[#777]" > متن : </label>
            <div id="switch" class="relative w-[42px] h-[24px] bg-[#ccc] rounded-[var(--radius)] cursor-pointer transition-all duration-300 ease-out shadow-inner">
            <div id="knob" class="absolute top-[2px] left-[3px] w-[20px] h-[20px] bg-white rounded-[var(--radius)] transition-all duration-500 shadow-md"></div>
            </div>
            </div>
          <button class="ai-range btn px-3 py-2"><i class="bi bi-openai"></i></button>

            <button class="add-text-item btn px-3 py-2"><i class="bi bi-plus-lg"></i></button>
          </div>
        </div>
        <div id="textareaBox" class="overflow-hidden max-h-0 opacity-0 blur-sm -translate-y-3 transition-all duration-500 ease-out">
          <textarea class="range-desc w-full h-15 border rounded-[var(--radius)] p-3 text-sm focus:outline-none" placeholder="متن سوال را اینجا بنویسید.">${rangeData.desc || ""}</textarea>
        </div>
      </div>
      <div class="items-preview ${rangeData.itemsCollapsed ? "collapsed" : ""}"></div>
    `;
  } else {
    const fileID = createRandomId("file");
    return `
      <div class="range-header my-1">
        <div class="flex items-center gap-2">
          <div class="relative">
            <label class="font-normal text-[#777]"> مبحث: </label>
            <input value="${rangeData.rangeName}" type="text" class="border rounded p-2 range-name" placeholder="عنوان مبحث">
            <span class="range-total absolute -top-2 -left-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              ${toPersianDigits(rangeData.items.length)}
            </span>
          </div>
          <div>
            <label class="font-normal text-[#777]"> تعداد: </label>
            <input value="${rangeData.count}" data-number-input="true" data-float="false" class="w-20 border rounded p-2 range-count" placeholder="تعداد">
          </div>
          <div>
            <label class="font-normal text-[#777]" > نمره: </label>
            <input value="${rangeData.score}" data-number-input="true" class="w-20 border rounded p-2 range-score" placeholder="نمره">
          </div>
          <div class="inline-block">
            <div class="file-input">
              <input type="file" id="${fileID}" accept="image/*" multiple class="file range-images">
              <label for="${fileID}" class="btn px-4 py-2 rounded"><i class="bi bi-image"></i></label>
            </div>
          </div>
          <button class="add-text-item btn px-3 py-2 rounded"><i class="bi bi-type"></i></button>
          <button class="ai-range btn px-3 py-2 rounded"><i class="bi bi-openai"></i></button>
          <label class="font-normal text-[#777]" > متن سوال: </label>
          <div id="switch" class="relative w-[42px] h-[24px] bg-[#ccc] rounded-[var(--radius)] cursor-pointer transition-all duration-300 ease-out shadow-inner">
            <div id="knob" class="absolute top-[2px] left-[3px] w-[20px] h-[20px] bg-white rounded-[var(--radius)] transition-all duration-500 shadow-md"></div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button class="p-1 text-[#ccc] hover:text-red-500 rounded remove-range transition-all duration-500 ease-out"><i class="bi bi-trash3"></i></button>
          <button class="p-1 text-[#ccc] hover:text-[var(--primary)] rounded copy-range transition-all duration-500 ease-out"><i class="bi bi-copy"></i></button>
          <button class="p-1 text-[#ccc] hover:text-[var(--primary)] rounded paste-range transition-all duration-500 ease-out"><i class="bi bi-clipboard-plus"></i></button>
        </div>
      </div>
      <div id="textareaBox" class="overflow-hidden max-h-0 opacity-0 blur-sm -translate-y-3 transition-all duration-500 ease-out">
        <textarea class="range-desc w-full h-15 border rounded-[var(--radius)] p-3 text-sm focus:outline-none" placeholder="متن سوال را اینجا بنویسید.">${rangeData.desc || ""}</textarea>
      </div>
      <div class="items-preview ${rangeData.itemsCollapsed ? "collapsed" : ""}"></div>
    `;
  }
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

  rangeElement.querySelectorAll(".ai-range").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const rangeId = rangeElement.id;
      const range = appState.ranges.find((r) => r.id === rangeId);
      if (range) {
        openAIModal(rangeId, range.rangeName || "موضوع");
      }
    });
  });

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

  rangeElement.querySelectorAll(".paste-range").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      pasteItemsToRange(rangeId);
    });
  });

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

  rangeElement.querySelectorAll(".add-text-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const newItem = createTextItem();
      openModalForNewItem(rangeId, newItem);
    });
  });

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

// ========== Names Section - Unified State ==========
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

function renderNamesSection() {
  namesTextarea.value = appState.names.join("\n");
  if (appState.names.length > 0) {
    namesCountEl.value = appState.names.length;
    namesCountEl.disabled = true;
  } else {
    namesCountEl.value = appState.namesCount;
    namesCountEl.disabled = false;
  }

  const mobileTextarea = document.querySelector(
    "#names-textarea-mobile textarea",
  );
  if (mobileTextarea) mobileTextarea.value = appState.names.join("\n");

  const mobileCount = document.getElementById("names-count-mobile");
  if (mobileCount) {
    if (appState.names.length > 0) {
      mobileCount.value = appState.names.length;
      mobileCount.disabled = true;
    } else {
      mobileCount.value = appState.namesCount;
      mobileCount.disabled = false;
    }
  }

  const mobileFont = document.getElementById("fontSelector-mobile");
  if (mobileFont) mobileFont.value = appState.font;
}

function syncNamesFromTextarea(sourceElement) {
  updateNamesFromElement(sourceElement || namesTextarea);
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

function setupMobileNamesBar() {
  if (!isMobile()) return;

  const bottomBar = document.getElementById("mobile-bottom-bar");
  if (bottomBar.querySelector(".mobile-names-section-custom")) return;

  bottomBar.innerHTML = `
    <div class="names-controls mobile-names-section-custom">
      <div class="flex items-center gap-2 flex-wrap">
        <div>
          <label>تعداد:</label>
          <input value="${appState.namesCount}" data-number-input="true" type="text" id="names-count-mobile" class="border rounded p-2 w-16" placeholder="تعداد">
        </div>
        <div>
          <label>فونت:</label>
          <select id="fontSelector-mobile" class="border rounded p-2 text-sm bg-white text-gray-800">
            <option value="'Vazirmatn', sans-serif">وزیرمتن</option>
            <option value="'Shabnam', sans-serif">شبنم</option>
            <option value="'BNazanin', sans-serif">نازنین</option>
          </select>
        </div>
        <div id="names-switch-mobile" class="flex gap-1">
          <label>نمایش اسامی:</label>
          <div id="switch-mobile" class="relative w-[42px] h-[24px] bg-[#ccc] rounded-[var(--radius)] cursor-pointer transition-all duration-300 ease-out shadow-inner">
            <div id="knob-mobile" class="absolute top-[2px] left-[3px] w-[20px] h-[20px] bg-white rounded-[var(--radius)] transition-all duration-500 shadow-md"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="mobile-actions">
      <button class="btn mobile-generate"><i class="bi bi-clipboard2-check"></i> تولید آزمون</button>
      <button class="btn mobile-print"><i class="bi bi-printer"></i> چاپ</button>
    </div>
    <div id="names-textarea-mobile" class="overflow-hidden max-h-0 opacity-0 blur-sm -translate-y-3 transition-all duration-500 ease-out">
      <textarea rows="5" class="w-full h-15 border rounded-[var(--radius)] p-3 text-sm focus:outline-none" placeholder="نام دانش‌آموزان هر کدام در یک خط"></textarea>
    </div>
  `;

  // مقداردهی اولیه
  const mobileCount = document.getElementById("names-count-mobile");
  const mobileFont = document.getElementById("fontSelector-mobile");
  const mobileTextarea = document.querySelector(
    "#names-textarea-mobile textarea",
  );
  const mobileSwitch = document.getElementById("switch-mobile");
  const mobileKnob = document.getElementById("knob-mobile");

  // همگام‌سازی با state
  mobileCount.value = appState.names.length
    ? appState.names.length
    : appState.namesCount;
  mobileCount.disabled = appState.names.length > 0;
  mobileFont.value = appState.font;

  // رویدادها
  mobileCount.addEventListener("input", (e) => {
    const val = parseInt(e.target.value) || 1;
    appState.namesCount = val;
    if (!appState.names.length) {
      namesCountEl.value = val;
    }
  });

  mobileFont.addEventListener("change", (e) => {
    appState.font = e.target.value;
    document.body.style.fontFamily = appState.font;
  });

  mobileTextarea.addEventListener("input", () =>
    updateNamesFromElement(mobileTextarea),
  );

  // سوئیچ نمایش اسامی
  let switchOn = false;
  mobileSwitch.addEventListener("click", () => {
    switchOn = !switchOn;
    const func = switchOn ? "add" : "remove";
    mobileSwitch.classList[func]("bg-[#333]");
    mobileKnob.classList[func]("translate-x-4", "scale-105");
    setElementState({
      target: document.getElementById("names-textarea-mobile"),
      stateClasses: {
        on: ["max-h-60", "opacity-100", "blur-0", "translate-y-0"],
        off: ["max-h-0", "opacity-0", "blur-sm", "-translate-y-3"],
      },
      isActive: switchOn,
    });
    updateNamesFromElement(mobileTextarea);
    adjustMobilePadding();
  });

  // دکمه‌های تولید و چاپ
  bottomBar
    .querySelector(".mobile-generate")
    .addEventListener("click", handleGenerateClick);
  bottomBar
    .querySelector(".mobile-print")
    .addEventListener("click", () => window.print());

  adjustMobilePadding();
}

// ========== Paste Handler ==========
async function handlePasteInModal(items) {
  if (cropper) destroyCropper();

  let imageProcessed = false;
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
          // به‌روزرسانی پیش‌نمایش
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
      imageProcessed = true;
      break;
    }
  }

  if (!imageProcessed) {
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

// ========== توابع مودال ==========
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

  // مقداردهی ویرایشگر متن
  if (temp.text) {
    modalTextEditor.innerHTML = temp.text.html;
    modalTextEditor.style.textAlign = temp.text.align.toLowerCase();
  } else {
    modalTextEditor.innerHTML = "";
    modalTextEditor.style.textAlign = "right";
  }

  updateModalPreviewFromTemp();
  updateModalImageUI();

  // مقداردهی چک‌باکس نمایش متن
  modalShowText.checked = temp.image ? temp.image.showText : false;

  document.body.classList.add("modal-open");
  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("modal--visible"), 10);
}

function updateModalImageUI() {
  const hasImage = appState.modal.tempItem && appState.modal.tempItem.image;
  modalImageUploadContainer.classList.toggle("hidden", hasImage);
  previewImageToolbar.classList.toggle("hidden", !hasImage);

  if (hasImage) {
    // همگام‌سازی اسلایدرها با مقادیر فعلی تصویر
    const img = modalPreviewCell.querySelector("img");
    if (img) {
      const height =
        parseInt(img.style.height) ||
        appState.modal.tempItem.image.height ||
        300;
      previewImgHeight.value = height;
      previewImgHeightValue.textContent = height + "px";

      const filter = img.style.filter || "";
      const brightnessMatch = filter.match(/brightness\((\d+)%\)/);
      const contrastMatch = filter.match(/contrast\((\d+)%\)/);
      previewImgBrightness.value = brightnessMatch
        ? parseInt(brightnessMatch[1])
        : 100;
      previewImgContrast.value = contrastMatch
        ? parseInt(contrastMatch[1])
        : 100;
    }
  }
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

  // استفاده از تابع یکپارچه renderItemContent
  modalPreviewCell.innerHTML = renderItemContent(temp, {
    rangeDesc: range.desc,
  });

  renderMathInContainer(modalPreviewCell);
}

function saveModalChanges() {
  const { rangeId, itemId } = appState.modal;

  updateTempItemFromTextEditor();
  // تصویر قبلاً در tempItem.image ذخیره شده است

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

  closeModal();
}

function closeModal() {
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }

  appState.modal.rangeId = null;
  appState.modal.itemId = null;
  appState.modal.tempItem = null;
  modal.classList.remove("modal--visible");
  document.body.classList.remove("modal-open");
  if (window.__viewportHandler) {
    window.visualViewport?.removeEventListener(
      "resize",
      window.__viewportHandler,
    );
  }
  setTimeout(() => {
    modal.style.display = "none";
    modalTextEditor.innerHTML = "";
  }, 300);
}

// ========== Math Rendering Helper ==========
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
  } catch (e) {
    console.error("Math rendering error:", e);
  }
}

// ========== AI Prompt Modal Functions ==========
function openAIModal(rangeId, topic) {
  appState.aiModal.rangeId = rangeId;
  appState.aiModal.topic = topic;
  appState.aiModal.isOpen = true;

  // پر کردن فیلدها
  const range = appState.ranges.find((r) => r.id === rangeId);
  document.getElementById("aiTopicInput").value = topic;
  document.getElementById("aiCountInput").value = range ? range.count : 3;

  // به‌روزرسانی پرامپت
  updatePromptDisplay();

  // پاک کردن ورودی‌های قبلی
  document.getElementById("aiJsonInput").value = "";
  document.getElementById("aiItemsContainer").innerHTML = "";
  document.getElementById("aiEmptyPreviewMsg").classList.add("hidden");

  // نمایش مودال با انیمیشن
  aiModalOverlay.classList.remove("hidden"); // hidden دیگر وجود ندارد اما برای امنیت
  void aiModalOverlay.offsetHeight; // force reflow
  aiModalOverlay.classList.add("ai-modal--visible");
  document.body.classList.add("modal-open");
}

function closeAIModal() {
  appState.aiModal.rangeId = null;
  appState.aiModal.topic = "";
  appState.aiModal.isOpen = false;

  aiModalOverlay.classList.remove("ai-modal--visible");
  setTimeout(() => {
    aiModalOverlay.classList.add("hidden"); // بازگشت به حالت پنهان
    document.body.classList.remove("modal-open");
  }, 300); // هماهنگ با مدت انیمیشن
}

// تابع تولید پرامپت با استفاده از مقادیر ورودی
function generatePrompt() {
  const topic = document.getElementById("aiTopicInput").value.trim() || "موضوع";
  const count = document.getElementById("aiCountInput").value || 3;
  return getAIPrompt(topic, count);
}

// به‌روزرسانی نمایش پرامپت
function updatePromptDisplay() {
  document.getElementById("aiPromptDisplay").textContent = generatePrompt();
}

// افزودن شنونده برای تغییرات فیلدها
document
  .getElementById("aiTopicInput")
  .addEventListener("input", updatePromptDisplay);
document
  .getElementById("aiCountInput")
  .addEventListener("input", updatePromptDisplay);

// کپی پرامپت
copyAiPromptBtn.addEventListener("click", () => {
  copyToClipboard(aiPromptDisplay.textContent, "پرامپت کپی شد");
});

// چسباندن JSON
pasteAiJsonBtn.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    aiJsonInput.value = text;
    const raw = text.trim();
    if (!raw) {
      showToast("لطفاً JSON را وارد کنید", "error");
      return;
    }

    try {
      // استخراج JSON از متن (اگر اضافی داشته باشد)
      const jsonStr = extractJSON(raw);
      const data = JSON.parse(jsonStr);

      if (!Array.isArray(data.items)) {
        showToast("کلید items باید آرایه باشد", "error");
        return;
      }

      aiItemsContainer.innerHTML = "";
      if (data.items.length === 0) {
        aiEmptyPreviewMsg.classList.remove("hidden");
        return;
      } else {
        aiEmptyPreviewMsg.classList.add("hidden");
        aiPreviewContainer.classList.remove("hidden");
      }

      data.items.forEach((item, idx) => {
        if (!item.text || typeof item.text !== "string") return;

        const card = document.createElement("div");
        card.className =
          "border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow transition";

        const header = document.createElement("div");
        header.className =
          "text-xs text-gray-400 mb-2 border-b pb-1 flex items-center gap-1";
        header.innerHTML = `<i class="bi bi-card-text"></i> آیتم ${idx + 1}`;
        card.appendChild(header);

        const textDiv = document.createElement("div");
        textDiv.className = "card-text text-gray-800";
        textDiv.textContent = normalizeMathSpaces(item.text);
        card.appendChild(textDiv);

        aiItemsContainer.appendChild(card);
      });

      // رندر فرمول‌ها
      renderMathInElement(aiItemsContainer, {
        delimiters: MATH_RENDER_DELIMITERS,
        throwOnError: false,
      });
    } catch (error) {
      showToast("داده نامعتبر است.", "error");
    }
  } catch (err) {
    showToast("خطا در چسباندن", "error");
  }
});

// افزودن آیتم‌ها به مبحث
addAiItemsToRangeBtn.addEventListener("click", () => {
  const rangeId = appState.aiModal.rangeId;
  if (!rangeId) {
    showToast("مشکلی پیش آمده، لطفاً دوباره تلاش کنید", "error");
    return;
  }

  // دریافت آیتم‌های موجود در کانتینر پیش‌نمایش (برای اطمینان از اعتبار)
  const cards = aiItemsContainer.querySelectorAll(".card-text");
  if (cards.length === 0) {
    showToast("ابتدا پیش‌نمایش را بررسی کنید", "error");
    return;
  }

  // ساخت آیتم از روی متن هر کارت (با فرض اینکه متن داخل card.textContent است)
  // اما card.textContent حاوی متن بدون HTML است. بهتر است از داده اصلی JSON استفاده کنیم.
  // ما می‌توانیم JSON را دوباره parse کنیم و از آیتم‌های اصلی استفاده کنیم.
  try {
    const jsonStr = extractJSON(aiJsonInput.value.trim());
    const data = JSON.parse(jsonStr);
    if (!Array.isArray(data.items)) throw new Error("items آرایه نیست");

    data.items.forEach((item) => {
      if (item.text) {
        // ایجاد آیتم متنی با استفاده از تابع createTextItem
        const newItem = createTextItem(item.text, "RIGHT"); // راست‌چین پیش‌فرض
        addItemToRange(rangeId, newItem);
      }
      // در صورت نیاز می‌توان تصویر هم پشتیبانی کرد،但目前 فقط متن
    });

    showToast(`${data.items.length} آیتم به مبحث اضافه شد`);
    closeAIModal();
  } catch (err) {
    showToast("خطا در افزودن آیتم‌ها: " + err.message, "error");
  }
});

// کمکی: استخراج JSON از متن
function extractJSON(str) {
  str = str.trim();
  const first = str.indexOf("{");
  const last = str.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error("JSON یافت نشد");
  return str.substring(first, last + 1);
}

// کمکی: نرمال‌سازی فاصله‌های اطراف فرمول
function normalizeMathSpaces(text) {
  return text
    .replace(/\$[ \t]+/g, "$")
    .replace(/[ \t]+\$/g, "$")
    .replace(/\$\$[ \t]+/g, "$$")
    .replace(/[ \t]+\$\$/g, "$$");
}

// بستن مودال با کلیک روی overlay یا دکمه بستن
closeAiModalBtn.addEventListener("click", closeAIModal);
aiModalOverlay.addEventListener("click", (e) => {
  if (e.target === aiModalOverlay) closeAIModal();
});

// بستن با Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && appState.aiModal.isOpen) {
    closeAIModal();
  }
});

// ========== Drag & Drop Helpers ==========
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

function handleTouchStartDrag(e) {
  if (isMobile()) {
    return;
  }
  const target = e.target.closest(".range-item");
  if (!target) return;
  isTouchDevice = true;
  draggedElement = target;
  draggedElement.classList.add("opacity-50");
}

function handleTouchMoveDrag(e) {
  if (isMobile()) {
    return;
  }
  if (!draggedElement) return;
  handleDragMove(e.touches[0].clientY);
}

function handleTouchEndDrag() {
  if (isMobile()) {
    return;
  }
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

// ========== Import/Export Helpers ==========
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

// ========== Event Listeners ==========
function handleAddRange() {
  const newRangeDiv = createRangeElement();
  newRangeDiv.classList.add("range-item-enter");
  rangesContainer.appendChild(newRangeDiv);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      newRangeDiv.classList.remove("range-item-enter");
    });
  });
}

function handleGenerateClick(e) {
  const isGenerated = generateQuizHtml();
  if (isGenerated) {
    e.target.scrollIntoView({ behavior: "smooth" });
    renderMathInContainer(document.getElementById("printable"));
  }
}

document.getElementById("addRange").onclick = handleAddRange;

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
  syncNamesFromTextarea(namesTextarea);
});

namesCountEl.addEventListener("input", (e) => {
  updateNamesFromElement(e.target);
});

document.getElementById("generate").onclick = handleGenerateClick;
document.getElementById("exportJson").onclick = handleExportJson;

handleFileUpload({
  target: document.getElementById("importJson"),
  onChange: processImportedFile,
  readAs: "Text",
});

// Drag & Drop
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

// Initialize
document.body.style.fontFamily = appState.font;
setupMobileNamesBar();
window.addEventListener("resize", () => {
  const isNowMobile = window.innerWidth <= 768;
  document.querySelectorAll(".range-item").forEach((el) => {
    el.draggable = !isNowMobile;
  });
  if (isNowMobile) {
    setupMobileNamesBar();
  }
  adjustMobilePadding();
  updateToTopPosition();
});

// حرکت رنج‌ها
function moveRange(rangeId, direction) {
  const index = appState.ranges.findIndex((r) => r.id === rangeId);
  if (direction === "up" && index > 0) {
    [appState.ranges[index - 1], appState.ranges[index]] = [
      appState.ranges[index],
      appState.ranges[index - 1],
    ];
  } else if (direction === "down" && index < appState.ranges.length - 1) {
    [appState.ranges[index + 1], appState.ranges[index]] = [
      appState.ranges[index],
      appState.ranges[index + 1],
    ];
  } else {
    return;
  }
  rangesContainer.innerHTML = "";
  appState.ranges.forEach((r) => {
    const el = createRangeElement(r);
    rangesContainer.appendChild(el);
  });
}

// ========== راه‌اندازی ویرایشگر متن جدید (Rich Text) ==========
function initRichTextEditor() {
  const mobileToolbar = document.getElementById("mobile-toolbar-modal");
  const desktopToolbar = document.getElementById("desktop-toolbar-modal");
  const colorInput = document.getElementById("modal-text-color");
  const desktopColorInput = document.getElementById("desktop-modal-text-color");
  const fontSizeSelect = document.getElementById("modal-font-size");
  const desktopFontSizeSelect = document.getElementById(
    "desktop-modal-font-size",
  );

  // ابتدا تابع به‌روزرسانی را تعریف می‌کنیم
  window.updateTempItemFromTextEditor = function () {
    if (appState.modal.tempItem) {
      const html = modalTextEditor.innerHTML;
      let align = "RIGHT";
      if (modalTextEditor.style.textAlign) {
        align = modalTextEditor.style.textAlign.toUpperCase();
      }
      if (!appState.modal.tempItem.text) {
        appState.modal.tempItem.text = { html, align };
      } else {
        appState.modal.tempItem.text.html = html;
        appState.modal.tempItem.text.align = align;
      }
      updateModalPreviewFromTemp();
    }
  };

  // تابع کمکی برای اجرای دستور و به‌روزرسانی
  function execEditorCommand(cmd, value = null) {
    document.execCommand(cmd, false, value);
    modalTextEditor.focus();
    updateTempItemFromTextEditor(); // فراخوانی به‌روزرسانی پس از هر دستور
  }

  // اتصال رویدادها به دکمه‌ها
  [
    ...mobileToolbar.querySelectorAll("[data-command]"),
    ...desktopToolbar.querySelectorAll("[data-command]"),
  ].forEach((btn) => {
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      execEditorCommand(btn.dataset.command);
    });
  });

  // رنگ
  [colorInput, desktopColorInput].forEach((input) => {
    input.addEventListener("input", (e) =>
      execEditorCommand("foreColor", e.target.value),
    );
  });

  // اندازه فونت (با روش span)
  [fontSizeSelect, desktopFontSizeSelect].forEach((select) => {
    select.addEventListener("change", (e) => {
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
        console.warn(err);
      }
      modalTextEditor.focus();
      updateTempItemFromTextEditor();
    });
  });

  // undo/redo
  [
    ...mobileToolbar.querySelectorAll('[data-action="undo"]'),
    ...desktopToolbar.querySelectorAll('[data-action="undo"]'),
  ].forEach((btn) => {
    btn.addEventListener("click", () => {
      document.execCommand("undo");
      updateTempItemFromTextEditor();
    });
  });
  [
    ...mobileToolbar.querySelectorAll('[data-action="redo"]'),
    ...desktopToolbar.querySelectorAll('[data-action="redo"]'),
  ].forEach((btn) => {
    btn.addEventListener("click", () => {
      document.execCommand("redo");
      updateTempItemFromTextEditor();
    });
  });

  // به‌روزرسانی وضعیت دکمه‌ها (active)
  function updateToolbarState() {
    const update = (toolbar) => {
      toolbar.querySelectorAll("[data-command]").forEach((btn) => {
        try {
          btn.classList.toggle(
            "active",
            document.queryCommandState(btn.dataset.command),
          );
        } catch (err) {}
      });
    };
    update(mobileToolbar);
    update(desktopToolbar);
  }
  modalTextEditor.addEventListener("mouseup", updateToolbarState);
  modalTextEditor.addEventListener("keyup", updateToolbarState);

  // آپلود تصویر
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
    e.target.value = ""; // ریست اینپوت برای آپلود مجدد
  });

  // حذف تصویر
  removeImageBtn.addEventListener("click", () => {
    if (appState.modal.tempItem) {
      appState.modal.tempItem.image = null;
      updateModalPreviewFromTemp();
      updateModalImageUI();
    }
  });

  // دکمه بستن مودال
  closeModalBtn.addEventListener("click", closeModal);

  // اضافه کردن شنونده رویداد input برای تایپ مستقیم
  modalTextEditor.addEventListener("input", updateTempItemFromTextEditor);

  // همچنین هنگام از دست دادن فوکوس هم به‌روزرسانی کنیم (اختیاری)
  modalTextEditor.addEventListener("blur", updateTempItemFromTextEditor);
}

// ========== راه‌اندازی نوار ابزار تصویر پیش‌نمایش ==========
function initPreviewImageToolbar() {
  previewImgHeight.addEventListener("input", (e) => {
    const img = modalPreviewCell.querySelector("img");
    if (!img) return;
    const val = e.target.value;
    img.style.height = val + "px";
    img.style.maxHeight = val + "px"; // ← اضافه شد
    img.style.width = "auto";
    previewImgHeightValue.textContent = val + "px";
    if (appState.modal.tempItem?.image) {
      appState.modal.tempItem.image.height = parseInt(val);
    }
  });

  // تغییر روشنایی و کنتراست
  previewImgBrightness.addEventListener("input", applyPreviewImageFilters);
  previewImgContrast.addEventListener("input", applyPreviewImageFilters);

  function applyPreviewImageFilters() {
    const img = modalPreviewCell.querySelector("img");
    if (!img) return;
    const b = previewImgBrightness.value;
    const c = previewImgContrast.value;
    img.style.filter = `brightness(${b}%) contrast(${c}%)`;
    // در صورت نیاز می‌توان فیلترها را در tempItem ذخیره کرد
  }

  // دکمه‌های تراز
  document.querySelectorAll("[data-align]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const img = modalPreviewCell.querySelector("img");
      if (!img) return;
      const align = e.currentTarget.dataset.align; // اصلاح: استفاده از currentTarget
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

  // دکمه برش
  previewCropBtn.addEventListener("click", () => {
    const img = modalPreviewCell.querySelector("img");
    if (!img) return;
    selectedPreviewImage = img; // ذخیره تصویر انتخابی برای برش
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

// ========== رویدادهای مودال ==========
// فعال‌سازی خودکار نمایش متن هنگام فوکوس روی ویرایشگر
modalTextEditor.addEventListener("focus", function () {
  // فقط در صورتی که آیتم تصویر داشته باشد
  if (appState.modal.tempItem && appState.modal.tempItem.image) {
    // اگر چک‌باکس فعال نیست، آن را فعال کن
    if (!modalShowText.checked) {
      modalShowText.checked = true;
      appState.modal.tempItem.image.showText = true;
      updateModalPreviewFromTemp(); // به‌روزرسانی پیش‌نمایش
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

modalOverlay.addEventListener("click", closeModal);

// ========== راه‌اندازی نهایی ==========
document.addEventListener("DOMContentLoaded", function () {
  initRichTextEditor();
  initPreviewImageToolbar();

  // دکمه‌های برش
  document.getElementById("applyCrop").addEventListener("click", function () {
    if (!cropper || !selectedPreviewImage) return;
    const canvas = cropper.getCroppedCanvas();
    if (canvas) {
      selectedPreviewImage.src = canvas.toDataURL("image/png");
      selectedPreviewImage.style.filter = "none";
      previewImgBrightness.value = 100;
      previewImgContrast.value = 100;
      // به‌روزرسانی tempItem
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
});

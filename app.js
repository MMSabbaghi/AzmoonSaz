// ---------- State Management ----------
const appState = {
  ranges: [], // { id, rangeName, count, score, desc, images: [{ src, height, align, showCaption, customCaption, imageId }] }
  names: [],
  namesCount: 1,
  font: "'Vazirmatn', sans-serif",
  modal: {
    selectedRangeId: null,
    selectedImageSrc: null,
    imageId: null,
    height: 75,
    align: "RIGHT",
    showCaption: true,
    customCaption: "",
  },
};

const IMAGE_DEFAULTS = {
  height: 75,
  align: "RIGHT",
  showCaption: true,
  customCaption: "",
};

// ---------- State update helpers ----------
function updateRangeInState(rangeId, updates) {
  const index = appState.ranges.findIndex((r) => r.id === rangeId);
  if (index !== -1) {
    appState.ranges[index] = { ...appState.ranges[index], ...updates };
  }
}

function removeImageFromState(rangeId, imageSrc, imageId) {
  const range = appState.ranges.find((r) => r.id === rangeId);
  if (range) {
    range.images = imageId
      ? range.images.filter((img) => img.imageId !== imageId)
      : range.images.filter((img) => img.src !== imageSrc);
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

// ---------- Image & Style Helpers ----------
const alignStyles = {
  RIGHT: { marginRight: 0, marginLeft: "auto" },
  LEFT: { marginRight: "auto", marginLeft: 0 },
  CENTER: { marginRight: "auto", marginLeft: "auto" },
};

// ---------- DOM Elements ----------
const rangesContainer = document.getElementById("ranges");
const modal = document.getElementById("modal");
const modalImg = document.getElementById("modal-img");
const modalOverlay = document.getElementById("modal-overlay");
const editCropBtn = document.getElementById("editCropBtn");
const saveCroppedImageBtn = document.getElementById("saveCroppedImageBtn");
const cancelCropBtn = document.getElementById("cancelCropBtn");
const moveToTopBtn = document.getElementById("toTop");
const sticky = document.getElementById("sticky");
const sentinel = document.getElementById("sentinel");
const namesCountEl = document.getElementById("names-count");
const namesTextareaContainer = document.getElementById("names-textarea");
const namesTextarea = namesTextareaContainer.querySelector("textarea");
const heightInput = document.querySelector("#modal-imgHeight");
const saveModalSettingsBtn = document.querySelector("#saveModalSettingsBtn");
const alignButtons = document.querySelectorAll(".align-btn");
const fontSelector = document.getElementById("fontSelector");
const modalShowCaption = document.getElementById("modal-show-caption");
const modalCustomCaption = document.getElementById("modal-custom-caption");
const modalQdesc = document.getElementById("modal-Qdesc");

// ---------- State-bound UI Variables ----------
let activeRangeId = null;
let activeImageSrc = null;
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
  // Force reflow
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

function animateRemoveImage(element, callback) {
  element.classList.add("image-thumbnail-exit");
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

// ========== Image Thumbnail Helpers ==========
function openImageModal(rangeId, imageId) {
  const range = appState.ranges.find((r) => r.id === rangeId);
  const currentImg = range?.images.find((img) => img.imageId === imageId);
  if (!currentImg) {
    showToast("خطا: تصویر یافت نشد!", "error");
    return;
  }

  activeImageSrc = currentImg.src;
  appState.modal.selectedRangeId = rangeId;
  appState.modal.selectedImageSrc = currentImg.src;
  appState.modal.imageId = imageId;
  appState.modal.height = currentImg.height || IMAGE_DEFAULTS.height;
  appState.modal.align = currentImg.align || IMAGE_DEFAULTS.align;
  appState.modal.showCaption =
    currentImg.showCaption !== undefined
      ? currentImg.showCaption
      : IMAGE_DEFAULTS.showCaption;
  appState.modal.customCaption =
    currentImg.customCaption !== undefined
      ? currentImg.customCaption
      : IMAGE_DEFAULTS.customCaption;

  modalImg.src = currentImg.src;
  applyModalImageStyle({
    height: appState.modal.height,
    align: alignStyles[appState.modal.align],
  });
  updateModalDescriptionAndScore(rangeId);

  modalShowCaption.checked = appState.modal.showCaption;
  modalCustomCaption.value = appState.modal.customCaption;
  modalCustomCaption.disabled = !appState.modal.showCaption;

  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("modal--visible"), 10);
}

function createImageThumbnailElement(img, targetDiv, rangeId) {
  const { imageId, src } = img;
  const imgContainer = document.createElement("div");
  imgContainer.className = "image-thumbnail";
  imgContainer.innerHTML = `<img data-image-id="${imageId}" src="${src}"><button class="text-white bg-red-500 opacity-50 hover:opacity-100 rounded remove-range transition-all duration-500 ease-out" >&times;</button>`;

  const removeBtn = imgContainer.querySelector("button");
  const imgElement = imgContainer.querySelector("img");

  removeBtn.onclick = () => {
    animateRemoveImage(imgContainer, () => {
      removeImageFromState(rangeId, src, imageId);
      updateRangeImageCountBadge(targetDiv);
    });
  };
  imgElement.onclick = () => openImageModal(rangeId, imageId);

  return imgContainer;
}

function updateRangeImageCountBadge(target) {
  const imagesCount = target.querySelector(".preview").children.length;
  target.querySelector(".range-total").textContent =
    `${toPersianDigits(imagesCount)}`;
}

// ========== Range DOM Building Helpers ==========
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
              ${toPersianDigits(rangeData.images.length)}
            </span>
          </div>
        </div>
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
    <div class="preview"></div>
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
    const images = appState.ranges.find((r) => r.id === rangeId)?.images || [];
    if (images.length) {
      copyToClipboard(JSON.stringify(images));
    } else {
      showToast("تصویری برای کپی وجود ندارد.", "error");
    }
  });
}

function setupFileUploadOnRange(rangeElement, rangeId) {
  handleFileUpload({
    target: rangeElement.querySelector(".range-images"),
    onChange: (src) => {
      const imageData = {
        src,
        height: IMAGE_DEFAULTS.height,
        align: IMAGE_DEFAULTS.align,
        showCaption: IMAGE_DEFAULTS.showCaption,
        customCaption: IMAGE_DEFAULTS.customCaption,
      };
      addImagesToRange(rangeId, [imageData]);
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
  rangeElement.addEventListener("click", () => {
    activeRangeId = rangeId;
  });

  setupSwitchOnRange(rangeElement);
  setupFileUploadOnRange(rangeElement, rangeId);
  setupRangeButtons(rangeElement, rangeId);
  setupRangeInputs(rangeElement, rangeId);

  const rangeData = appState.ranges.find((r) => r.id === rangeId);
  if (rangeData) {
    rangeData.images.forEach((img) => {
      const imgContainer = createImageThumbnailElement(
        img,
        rangeElement,
        rangeId,
      );
      rangeElement.querySelector(".preview").appendChild(imgContainer);
    });
  }
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
      images: [],
    };
    appState.ranges.push(newRange);
    rangeData = newRange;
  }
  const el = buildRangeDOM(rangeData);
  attachRangeEvents(el, rangeData.id);
  return el;
}

// ========== Names Section ==========
function renderNamesSection() {
  namesTextarea.value = appState.names.join("\n");
  namesCountEl.value = appState.namesCount;
  namesCountEl.disabled = appState.names.length > 0;
}

function syncNamesFromTextarea() {
  const names = namesTextarea.value
    .trim()
    .split("\n")
    .filter((n) => n);
  appState.names = names;
  renderNamesSection();
}

// ========== Add Images to Range ==========
function addImageToState(rangeId, imageData) {
  const range = appState.ranges.find((r) => r.id === rangeId);
  if (range) {
    const fullImageData = {
      ...IMAGE_DEFAULTS,
      imageId: createRandomId("img"),
      ...imageData,
    };
    range.images.push(fullImageData);
    return fullImageData;
  }
  return null;
}

function addImagesToRange(rangeId, imagesArray) {
  const rangeDiv = document.getElementById(rangeId);
  if (!rangeDiv) return;

  imagesArray.forEach((imageData, index) => {
    const fullImageData = addImageToState(rangeId, imageData);
    if (fullImageData) {
      const imgContainer = createImageThumbnailElement(
        fullImageData,
        rangeDiv,
        rangeId,
      );
      imgContainer.classList.add("image-thumbnail-enter");
      rangeDiv.querySelector(".preview").appendChild(imgContainer);
      setTimeout(() => {
        imgContainer.classList.remove("image-thumbnail-enter");
      }, index * 50); // Stagger effect
    }
  });
  updateRangeImageCountBadge(rangeDiv);
}

// ========== Paste Handler ==========
document.addEventListener("paste", async (e) => {
  if (!activeRangeId) return;

  const items = e.clipboardData?.items;
  if (items) {
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = (ev) => {
          const imageData = {
            src: ev.target.result,
            ...IMAGE_DEFAULTS,
          };
          addImagesToRange(activeRangeId, [imageData]);
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
      const imagesData = pastedArray.map((img) => ({
        ...img,
        height: img.height || IMAGE_DEFAULTS.height,
        align: img.align || IMAGE_DEFAULTS.align,
        showCaption:
          img.showCaption !== undefined
            ? img.showCaption
            : IMAGE_DEFAULTS.showCaption,
        customCaption: img.customCaption || IMAGE_DEFAULTS.customCaption,
      }));
      addImagesToRange(activeRangeId, imagesData);
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
    const images = Array.isArray(r.images) ? r.images : [];
    names.forEach((student) => {
      finalData[student].push({
        rangeName: r.rangeName,
        images: pickRandomItems(images, r.count),
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

function getCaptionText(rangeDesc, img) {
  if (img.showCaption === false) return null;
  if (img.customCaption && img.customCaption.trim() !== "")
    return img.customCaption;
  return rangeDesc;
}

function createQuestionRowHtml(qNum, img, range) {
  const captionText = getCaptionText(range.desc, img);
  return `
    <tr>
      <td class="w-10 text-center font-bold">
        ${toPersianDigits(qNum)}
        <span class="font-normal text-xs">
          ${+range.score > 0 ? `(${toPersianDigits(range.score)}نمره)` : ``}
        </span>
      </td>
      <td class="p-0">
        <div>
          ${captionText !== null ? `<p>${captionText}</p>` : ""}
          <img
            class="max-h-[${img.height}px] ${getAlignmentClass(img.align)}"
            src="${img.src}"
            alt="${range.rangeName}"
          >
        </div>
      </td>
    </tr>`;
}

function createStudentTableHtml(studentQuiz, name) {
  let qNum = 1;
  const rows = studentQuiz
    .flatMap((range) =>
      range.images.map((img) => createQuestionRowHtml(qNum++, img, range)),
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
    (r) => r.images.length && r.count > 0,
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

// ========== Modal Helpers ==========
function applyModalImageStyle({ height, align }) {
  if (height) {
    modalImg.style.maxHeight = height + "px";
    heightInput.value = height;
  }
  if (align) {
    modalImg.style.marginRight = align.marginRight;
    modalImg.style.marginLeft = align.marginLeft;
  }
}

function updateModalDescriptionAndScore(rangeId) {
  const range = appState.ranges.find((r) => r.id === rangeId);
  if (!range) return;
  const showCaption = appState.modal.showCaption;
  const customCaption = appState.modal.customCaption;
  let finalText = "";
  if (showCaption) {
    finalText =
      customCaption && customCaption.trim() !== "" ? customCaption : range.desc;
  }
  modalQdesc.innerText = finalText;
  document.getElementById("modal-Qscore").innerHTML = `
    ${toPersianDigits(1)}
    <span class="font-normal text-xs">
      ${+range.score > 0 ? `(${toPersianDigits(range.score)}نمره)` : ``}
    </span>
  `;
}

function onModalCaptionChange() {
  appState.modal.showCaption = modalShowCaption.checked;
  appState.modal.customCaption = modalCustomCaption.value;
  modalCustomCaption.disabled = !appState.modal.showCaption;
  const range = appState.ranges.find(
    (r) => r.id === appState.modal.selectedRangeId,
  );
  if (range) {
    let finalText = "";
    if (appState.modal.showCaption) {
      finalText =
        appState.modal.customCaption &&
        appState.modal.customCaption.trim() !== ""
          ? appState.modal.customCaption
          : range.desc;
    }
    modalQdesc.innerText = finalText;
  }
}

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
    ...alignButtons,
    heightInput,
    saveModalSettingsBtn,
    modalShowCaption,
    modalCustomCaption,
  ].forEach((el) => el && (el.disabled = isActive));
}

function updateModalImageAlign(align) {
  appState.modal.align = align;
  applyModalImageStyle({ align: alignStyles[align] });
}

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

  // Capture old positions for FLIP
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
  // Capture old positions for FLIP
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
  // Reset any transforms from FLIP
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
      images: r.images,
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

      data.ranges.forEach((r) => {
        const images = (r.images || []).map((img) => ({
          ...IMAGE_DEFAULTS,
          imageId: img.imageId || createRandomId("img"),
          ...img,
        }));
        const rangeWithId = {
          ...r,
          id: createRandomId("range-item"),
          images,
        };
        appState.ranges.push(rangeWithId);
      });

      rangesContainer.innerHTML = "";
      appState.ranges.forEach((r) => {
        rangesContainer.appendChild(createRangeElement(r));
      });

      renderNamesSection();
    } catch (err) {
      console.error("خطا در پردازش فایل JSON:", err);
      showToast("فایل JSON نامعتبر است!", "error");
    }
  },
  readAs: "Text",
});

alignButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const align = btn.dataset.align;
    if (align) updateModalImageAlign(align);
  });
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

// Modal events
modalOverlay.addEventListener("click", () => {
  destroyCropper();
  activeImageSrc = null;
  modal.classList.remove("modal--visible");
  setTimeout(() => {
    modal.style.display = "none";
    modalImg.src = "";
  }, 300);
});

editCropBtn.addEventListener("click", () => {
  if (cropper) cropper.destroy();
  cropper = new Cropper(modalImg, {
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
    modalImg.src = croppedImage.src;
    destroyCropper();
  };
  croppedImage.src = croppedCanvas.toDataURL();
});

cancelCropBtn.addEventListener("click", destroyCropper);

heightInput.addEventListener("input", (e) => {
  appState.modal.height = parseInt(e.target.value) || IMAGE_DEFAULTS.height;
  applyModalImageStyle({
    height: appState.modal.height,
    align: alignStyles[appState.modal.align],
  });
});

saveModalSettingsBtn.addEventListener("click", () => {
  showConfirm({
    msg: "آیا از ذخیره تغییرات اطمینان دارید؟",
    on_confirm: () => {
      const {
        selectedRangeId,
        imageId,
        height,
        align,
        showCaption,
        customCaption,
      } = appState.modal;

      const range = appState.ranges.find((r) => r.id === selectedRangeId);
      const imgObj = range?.images.find((img) => img.imageId === imageId);
      if (!imgObj) {
        showToast("خطا: تصویر مورد نظر یافت نشد!", "error");
        return;
      }

      const newSrc = modalImg.src;
      Object.assign(imgObj, {
        src: newSrc,
        height,
        align,
        showCaption,
        customCaption,
      });

      const thumbnailImg = document.querySelector(
        `img[data-image-id="${imageId}"]`,
      );
      if (thumbnailImg) thumbnailImg.src = newSrc;

      if (activeImageSrc === imgObj.src) activeImageSrc = newSrc;
      appState.modal.selectedImageSrc = newSrc;

      showToast("با موفقیت ذخیره شد.");
    },
  });
});

modalShowCaption.addEventListener("change", onModalCaptionChange);
modalCustomCaption.addEventListener("input", onModalCaptionChange);

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

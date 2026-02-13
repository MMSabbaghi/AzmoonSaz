// ---------- State Management ----------
const appState = {
  ranges: [], // { id, rangeName, count, score, desc, showDesc, images: [{ src, height, align }] }
  names: [], // array of student names from textarea
  namesCount: 1,
  font: "'Vazirmatn', sans-serif",
  modal: {
    selectedRangeId: null,
    selectedImageSrc: null,
    height: 75,
    align: "RIGHT",
  },
};

// State update helpers
function updateRangeInState(rangeId, updates) {
  const index = appState.ranges.findIndex((r) => r.id === rangeId);
  if (index !== -1) {
    appState.ranges[index] = { ...appState.ranges[index], ...updates };
  }
}

function addImageToState(rangeId, imageData) {
  const range = appState.ranges.find((r) => r.id === rangeId);
  if (range) {
    range.images.push(imageData);
  }
}

function removeImageFromState(rangeId, imageSrc) {
  const range = appState.ranges.find((r) => r.id === rangeId);
  if (range) {
    range.images = range.images.filter((img) => img.src !== imageSrc);
  }
}

function reorderRangesInState(newOrderIds) {
  appState.ranges = newOrderIds
    .map((id) => appState.ranges.find((r) => r.id === id))
    .filter(Boolean);
}

// ---------- Utility Functions (preserved) ----------
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
  return prefix + "-" + crypto.randomUUID();
}

// ---------- Image & Style Helpers ----------
const IMAGE_DEFAULTS = {
  height: 75,
  align: "RIGHT",
};

const alignStyles = {
  RIGHT: { marginRight: 0, marginLeft: "auto" },
  LEFT: { marginRight: "auto", marginLeft: 0 },
  CENTER: { marginRight: "auto", marginLeft: "auto" },
};

function getImageStyleFromElement({ dataset }) {
  const { maxheight, align } = dataset;
  return {
    height: maxheight,
    align: alignStyles[align],
  };
}

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

// ---------- State-bound UI Variables ----------
let activeRangeId = null;
let activeImageSrc = null;
let cropper = null;
let draggedElement = null;
let isTouchDevice = false;
const dragPlaceholder = document.createElement("div");
dragPlaceholder.className = "placeholder";

// ---------- Image Thumbnail Creation (preserved) ----------
function createImageThumbnailElement(img, targetDiv, rangeId) {
  const { src, height, align } = img;
  const imgContainer = document.createElement("div");
  imgContainer.innerHTML = `<img data-maxHeight="${height || IMAGE_DEFAULTS.height}" data-align="${align || IMAGE_DEFAULTS.align}" src="${src}"><button class="text-white bg-red-500 opacity-50 hover:opacity-100 rounded remove-range transition-all duration-500 ease-out" >&times;</button>`;

  // Remove image
  imgContainer.querySelector("button").onclick = () => {
    removeImageFromState(rangeId, src);
    imgContainer.remove();
    updateRangeImageCountBadge(targetDiv);
  };

  // Open modal
  imgContainer.querySelector("img").onclick = (e) => {
    activeImageSrc = src;
    appState.modal.selectedRangeId = rangeId;
    appState.modal.selectedImageSrc = src;
    appState.modal.height = height || IMAGE_DEFAULTS.height;
    appState.modal.align = align || IMAGE_DEFAULTS.align;

    modalImg.src = src;
    applyModalImageStyle({
      height: appState.modal.height,
      align: alignStyles[appState.modal.align],
    });
    updateModalDescriptionAndScore(rangeId);
    modal.style.display = "flex";
  };

  return imgContainer;
}

function updateRangeImageCountBadge(target) {
  const imagesCount = target.querySelector(".preview").children.length;
  target.querySelector(".range-total").textContent =
    `${toPersianDigits(imagesCount)}`;
}

// ---------- Range DOM Building and Event Attachment ----------
function buildRangeDOM(rangeData) {
  const div = document.createElement("div");
  div.id = rangeData.id;
  div.draggable = true;
  div.className = "range-item transition-transform duration-200 ease-out";

  const fileID = createRandomId("file");

  div.innerHTML = `
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
      <label for="${fileID}" class="btn px-4 py-2 rounded">
      <i class="bi bi-image"></i>
      </label>
      <span class="range-total absolute top-0 left-0 -mt-2 -ml-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
        ${toPersianDigits(rangeData.images.length)}
      </span>
    </div>
      </div>
      <!-- Switch -->
      <label class="font-normal text-[#777]" > متن سوال: </label>
      <div id="switch" class="relative w-[42px] h-[24px] bg-[#ccc] rounded-[var(--radius)] cursor-pointer
      transition-all duration-300 ease-out shadow-inner">
        <div id="knob" class="absolute top-[2px] left-[3px] w-[20px] h-[20px] bg-white rounded-[var(--radius)]
           transition-all duration-500 shadow-md">
      </div>
    </div>
    </div>
    <div class="flex items-center gap-2">
    <button class="p-1 text-[#ccc] hover:text-red-500 rounded remove-range transition-all duration-500 ease-out">
    <i class="bi bi-trash3"></i>
    </button>
    <button class="p-1 text-[#ccc] hover:text-[var(--primary)] rounded copy-range transition-all duration-500 ease-out">
    <i class="bi bi-copy"></i>
    </button>
      </div>
    </div>

    <div id="textareaBox" class="overflow-hidden
         max-h-0 opacity-0 blur-sm -translate-y-3
         transition-all duration-500 ease-out">
        <textarea class="range-desc w-full h-15 border rounded-[var(--radius)] p-3 text-sm focus:outline-none" placeholder="متن سوال را اینجا بنویسید.">${rangeData.desc || ""}</textarea>
    </div>
    <div class="preview"></div>
  `;

  // Set initial switch state if showDesc is true
  if (rangeData.showDesc) {
    const sw = div.querySelector("#switch");
    const knob = div.querySelector("#knob");
    sw.classList.add("bg-[#333]");
    knob.classList.add("translate-x-4", "scale-105");
    setElementState({
      target: div.querySelector("#textareaBox"),
      stateClasses: {
        on: ["max-h-60", "opacity-100", "blur-0", "translate-y-0"],
        off: ["max-h-0", "opacity-0", "blur-sm", "-translate-y-3"],
      },
      isActive: true,
    });
  }

  return div;
}

function attachRangeEvents(rangeElement, rangeId) {
  const rangeData = appState.ranges.find((r) => r.id === rangeId);
  if (!rangeData) return;

  // Set active range on click
  rangeElement.addEventListener("click", () => {
    activeRangeId = rangeId;
  });

  // Switch for description
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
      updateRangeInState(rangeId, { showDesc: isActive });
    },
  });

  // File upload
  handleFileUpload({
    target: rangeElement.querySelector(".range-images"),
    onChange: (src) => {
      const imageData = {
        src,
        height: IMAGE_DEFAULTS.height,
        align: IMAGE_DEFAULTS.align,
      };
      // استفاده از تابع واحد اضافه‌کردن تصاویر به جای کد تکراری
      addImagesToRange(rangeId, [imageData]);
    },
    readAs: "DataURL",
  });

  // Remove range
  rangeElement.querySelector(".remove-range").onclick = () => {
    showConfirm({
      msg: "آیا از حذف این مبحث اطمینان دارید؟",
      on_confirm: () => {
        appState.ranges = appState.ranges.filter((r) => r.id !== rangeId);
        rangeElement.remove();
      },
    });
  };

  // Copy images
  rangeElement.querySelector(".copy-range").addEventListener("click", () => {
    const images = appState.ranges.find((r) => r.id === rangeId)?.images || [];
    if (images.length) {
      copyToClipboard(JSON.stringify(images));
    } else {
      showToast("تصویری برای کپی وجود ندارد.", "error");
    }
  });

  // Input fields update state
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

  // Populate existing images
  rangeData.images.forEach((img) => {
    const imgContainer = createImageThumbnailElement(
      img,
      rangeElement,
      rangeId,
    );
    rangeElement.querySelector(".preview").appendChild(imgContainer);
  });
}

function createRangeElement(rangeData = null) {
  if (!rangeData) {
    const newRange = {
      id: createRandomId("range-item"),
      rangeName: "",
      count: 1,
      score: 1,
      desc: "",
      showDesc: false,
      images: [],
    };
    appState.ranges.push(newRange);
    rangeData = newRange;
  }
  const el = buildRangeDOM(rangeData);
  attachRangeEvents(el, rangeData.id);
  return el;
}

// ---------- Names Section Rendering ----------
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

// ---------- Unified function to add images to a range ----------
function addImagesToRange(rangeId, imagesArray) {
  const rangeDiv = document.getElementById(rangeId);
  if (!rangeDiv) return;

  imagesArray.forEach((imageData) => {
    addImageToState(rangeId, imageData);
    const imgContainer = createImageThumbnailElement(
      imageData,
      rangeDiv,
      rangeId,
    );
    rangeDiv.querySelector(".preview").appendChild(imgContainer);
  });
  updateRangeImageCountBadge(rangeDiv);
}

// ---------- Unified Paste Handler ----------
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
            height: IMAGE_DEFAULTS.height,
            align: IMAGE_DEFAULTS.align,
          };
          addImagesToRange(activeRangeId, [imageData]);
        };
        reader.readAsDataURL(blob);
        return; // Only handle first image (as original)
      }
    }
  }

  // If no image, try JSON array
  try {
    const text = await navigator.clipboard.readText();
    const pastedArray = JSON.parse(text);
    if (Array.isArray(pastedArray)) {
      const imagesData = pastedArray.map((img) => ({
        ...img,
        height: img.height || IMAGE_DEFAULTS.height,
        align: img.align || IMAGE_DEFAULTS.align,
      }));
      addImagesToRange(activeRangeId, imagesData);
    }
  } catch (err) {
    // مدیریت خطا: حداقل در کنسول ثبت شود (بدون تغییر در تجربه کاربری)
    console.error("خطا در پردازش چسباندن (JSON نامعتبر):", err);
  }
});

// ---------- Generate Quiz (unchanged) ----------
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

function createQuestionRowHtml(qNum, img, range) {
  return `
 <tr>
  <td class="w-10 text-center font-bold">
    ${toPersianDigits(qNum)}
    <span class="font-normal text-xs">
      ${+range.score > 0 ? `(${toPersianDigits(range.score)}نمره)` : ``}
    </span>
  </td>
  <td class="p-0">
    <div class="relative">
      ${range.desc ? `<p class="absolute">${range.desc}</p>` : ``}
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
  let namesArray = appState.names;
  const namesCount = appState.namesCount;
  return {
    names: namesArray.length
      ? namesArray
      : generateAnonymousStudentNames(namesCount),
    showNames: namesArray.length ? true : false,
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
</tr>`,
    )
    .join("");

  document.getElementById("printable").innerHTML = `
<table class="w-full">
  <tbody>
    ${html}
  </tbody>
</table>`;
  return true;
}

// ---------- Modal Helpers ----------
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
  document.getElementById("modal-Qdesc").innerText = range.desc;
  document.getElementById("modal-Qscore").innerHTML = `
    ${toPersianDigits(1)}
    <span class="font-normal text-xs">
       ${+range.score > 0 ? `(${toPersianDigits(range.score)}نمره)` : ``}
    </span>
  `;
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
  [...alignButtons, heightInput, saveModalSettingsBtn].forEach(
    (el) => (el.disabled = isActive),
  );
}

function updateModalImageAlign(align) {
  appState.modal.align = align;
  applyModalImageStyle({ align: alignStyles[align] });
}

// ---------- Event Listeners ----------
document.getElementById("addRange").onclick = () => {
  const newRangeDiv = createRangeElement();
  rangesContainer.appendChild(newRangeDiv);
};

// Names switch
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
        const rangeWithId = {
          ...r,
          id: createRandomId("range-item"),
          showDesc: false,
          images: r.images || [],
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

// Drag & Drop (unchanged)
rangesContainer.addEventListener("dragstart", (e) => {
  if (!e.target.classList.contains("range-item")) return;
  draggedElement = e.target;
  draggedElement.classList.add("opacity-50");
  setTimeout(() => draggedElement.classList.add("hidden"), 0);
});

rangesContainer.addEventListener("dragend", dragCleanup);

rangesContainer.addEventListener("dragover", (e) => {
  if (isTouchDevice || !draggedElement) return;
  e.preventDefault();
  handleDragMove(e.clientY);
});

rangesContainer.addEventListener("drop", (e) => {
  e.preventDefault();
  if (dragPlaceholder.parentNode) {
    rangesContainer.insertBefore(draggedElement, dragPlaceholder);
    const newOrder = [...rangesContainer.querySelectorAll(".range-item")].map(
      (el) => el.id,
    );
    reorderRangesInState(newOrder);
  }
});

rangesContainer.addEventListener(
  "touchstart",
  (e) => {
    const target = e.target.closest(".range-item");
    if (!target) return;
    isTouchDevice = true;
    draggedElement = target;
    draggedElement.classList.add("opacity-50");
  },
  { passive: true },
);

rangesContainer.addEventListener(
  "touchmove",
  (e) => {
    if (!draggedElement) return;
    handleDragMove(e.touches[0].clientY);
  },
  { passive: true },
);

rangesContainer.addEventListener("touchend", () => {
  if (dragPlaceholder.parentNode) {
    rangesContainer.insertBefore(draggedElement, dragPlaceholder);
    const newOrder = [...rangesContainer.querySelectorAll(".range-item")].map(
      (el) => el.id,
    );
    reorderRangesInState(newOrder);
  }
  dragCleanup();
});

function handleDragMove(pointerY) {
  animateReordering();
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

function animateReordering() {
  const items = [...rangesContainer.querySelectorAll(".range-item")];
  const first = new Map();
  items.forEach((el) => {
    first.set(el, el.getBoundingClientRect());
  });
  requestAnimationFrame(() => {
    items.forEach((el) => {
      const last = el.getBoundingClientRect();
      const prev = first.get(el);
      const dx = prev.left - last.left;
      const dy = prev.top - last.top;
      if (dx || dy) {
        el.style.transform = `translate(${dx}px, ${dy}px)`;
        el.style.transition = "none";
        requestAnimationFrame(() => {
          el.style.transform = "";
          el.style.transition = "";
        });
      }
    });
  });
}

function dragCleanup() {
  if (!draggedElement) return;
  draggedElement.classList.remove("opacity-50", "hidden");
  dragPlaceholder.remove();
  draggedElement = null;
  isTouchDevice = false;
}

// Modal events
modalOverlay.addEventListener("click", () => {
  destroyCropper();
  activeImageSrc = null;
  modal.style.display = "none";
  modalImg.src = "";
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
      if (appState.modal.selectedRangeId && appState.modal.selectedImageSrc) {
        const range = appState.ranges.find(
          (r) => r.id === appState.modal.selectedRangeId,
        );
        if (range) {
          const imgObj = range.images.find(
            (img) => img.src === appState.modal.selectedImageSrc,
          );
          if (imgObj) {
            imgObj.src = modalImg.src;
            imgObj.height = appState.modal.height;
            imgObj.align = appState.modal.align;
          }
        }
      }
      if (activeImageSrc) {
        const imgEl = document.querySelector(`img[src="${activeImageSrc}"]`);
        if (imgEl) {
          imgEl.src = modalImg.src;
          imgEl.dataset.maxheight = appState.modal.height;
          imgEl.dataset.align = appState.modal.align;
        }
      }
      showToast("با موفقیت ذخیره شد.");
    },
  });
});

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

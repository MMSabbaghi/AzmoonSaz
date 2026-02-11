//elements
const rangesContainer = document.getElementById("ranges");
const modal = document.getElementById("modal");
const modalImg = document.getElementById("modal-img");
const modalOverlay = document.getElementById("modal-overlay");
const editCropBtn = document.getElementById("editCropBtn");
const saveCroppedImageBtn = document.getElementById("saveCroppedImageBtn");
const ranges_list = document.getElementById("ranges");
const moveToTopBtn = document.getElementById("toTop");
const sticky = document.getElementById("sticky");
const sentinel = document.getElementById("sentinel");
const namesCountEl = document.getElementById("names-count");
const namesTextareaContainer = document.getElementById("names-textarea");
const namesTextarea = namesTextareaContainer.querySelector("textarea");

//state
let selectedRange;
let selectedImg;
let cropperInstance;
let draggedItem;
let isTouch = false;

//public functions
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

function shuffleArray(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

///// App codes
function getRangeImages(target) {
  return Array.from(target.querySelectorAll(".preview img")).map((i) => i.src);
}

function getRangeData(target) {
  const rangeName = target.querySelector(".range-name").value.trim();
  const count = parseInt(target.querySelector(".range-count").value);
  const score = target.querySelector(".range-score").value;
  const desc = target.querySelector(".range-desc").value;
  const imgs = getRangeImages(target);
  return { rangeName, count, images: imgs, score, desc };
}

function updateRangeTotal(target) {
  const imagesCount = target.querySelector(".preview").children.length;
  target.querySelector(".range-total").textContent =
    `${toPersianDigits(imagesCount)}`;
}

function createImageElement(imgSrc, target) {
  const imgContainer = document.createElement("div");
  imgContainer.innerHTML = `<img src="${imgSrc}" alt=""><button class="text-white bg-red-500 opacity-50 hover:opacity-100 rounded remove-range transition-all duration-500 ease-out" >&times;</button>`;
  imgContainer.querySelector("button").onclick = () => {
    imgContainer.remove();
    updateRangeTotal(target);
  };
  imgContainer.querySelector("img").onclick = (e) => {
    selectedImg = e.target;
    modalImg.src = e.target.src;
    modal.style.display = "flex";
  };
  return imgContainer;
}

function addImage(imgSrc, target) {
  const imgContainer = createImageElement(imgSrc, target);
  target.querySelector(".preview").appendChild(imgContainer);
  updateRangeTotal(target);
}

function handlePasteImage(items) {
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf("image") !== -1) {
      const blob = items[i].getAsFile();
      const reader = new FileReader();
      reader.onload = (ev) => addImage(ev.target.result, selectedRange);
      reader.readAsDataURL(blob);
    }
  }
}

async function handlePasteRange() {
  try {
    const text = await navigator.clipboard.readText();
    const pastedArray = JSON.parse(text);
    [...pastedArray].forEach((img) => addImage(img, selectedRange));
  } catch (err) {
    console.error("خطا در پیست کردن: ", err);
  }
}

document.addEventListener("paste", ({ clipboardData }) =>
  handlePasteImage(clipboardData.items),
);

document.addEventListener("paste", handlePasteRange);

function createRangeItem(rangeData = null) {
  const setFieldValue = (fieldName, defaultValue = "") =>
    `value="${rangeData ? rangeData[fieldName] : defaultValue}"`;

  const div = document.createElement("div");
  const fileID = crypto.randomUUID();
  div.draggable = true;
  div.className = "range-item transition-transform duration-200 ease-out";
  div.innerHTML = `
  <div class="range-header my-1">
    <div class="flex items-center gap-2">
      <div>
      <label class="font-normal text-[#777]"> مبحث: </label>
      <input ${setFieldValue(`rangeName`)} type="text" class="border rounded p-2 range-name" placeholder="عنوان مبحث">
      </div>
      <div>
      <label class="font-normal text-[#777]"> تعداد: </label>
      <input ${setFieldValue(`count`, 1)} data-number-input="true" data-float="false" class="w-20 border rounded p-2 range-count" placeholder="تعداد">
      </div>
      <div>
      <label class="font-normal text-[#777]" > نمره: </label>
      <input ${setFieldValue(`score`, 1)} data-number-input="true" class="w-20 border rounded p-2 range-score" placeholder="نمره">
      </div>
      <div class="relative inline-block">
      <div class="file-input">
      <input type="file" id="file-${fileID}" accept="image/*" multiple class="file range-images">
      <label for="file-${fileID}" class="btn px-4 py-2 rounded">
      <i class="bi bi-image"></i>
      </label>
      <span class="range-total absolute top-0 left-0 -mt-2 -ml-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
        ${toPersianDigits(0)}
      </span>
    </div>
      </div>
      <!-- Switch -->
      <label class="font-normal text-[#777]" > متن سوال: </label>
      <div id="switch" class="relative w-[42px] h-[24px] bg-[#ccc] rounded-[var(--radius)] cursor-pointer
      transition-all duration-300 ease-out
         shadow-inner">

        <div id="knob" class="absolute top-[2px] left-[3px] w-[20px] h-[20px] bg-white rounded-[var(--radius)]
           transition-all duration-500
           shadow-md">
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
        <textarea class="range-desc w-full h-15 border rounded-[var(--radius)] p-3 text-sm focus:outline-none" placeholder="متن سوال را اینجا بنویسید.">${rangeData?.desc || ``}</textarea>
    </div>
    <div class="preview"></div>
  `;

  if (rangeData) rangeData.images.forEach((imgSrc) => addImage(imgSrc, div));
  div.addEventListener("click", (e) => (selectedRange = div));

  handleSwitchElement({
    container: div,
    onChange: (isActive) =>
      setElementState({
        target: div.querySelector("#textareaBox"),
        stateClasses: {
          on: ["max-h-60", "opacity-100", "blur-0", "translate-y-0"],
          off: ["max-h-0", "opacity-0", "blur-sm", "-translate-y-3"],
        },
        isActive,
      }),
  });

  handleFileUpload({
    target: div.querySelector(".range-images"),
    onChange: (img) => addImage(img, div),
    readAs: "DataURL",
  });

  div.querySelector(".remove-range").onclick = () => {
    showConfirm({
      msg: "آیا از حذف این مبحث اطمینان دارید؟",
      on_confirm: () => div.remove(),
    });
  };

  div.querySelector(".copy-range").addEventListener("click", (e) => {
    const images = getRangeImages(div);
    if (images.length) {
      copyToClipboard(JSON.stringify(images));
    } else {
      showToast("تصویری برای کپی وجود ندارد.", "error");
    }
  });

  return div;
}

document.getElementById("addRange").onclick = () => {
  rangesContainer.appendChild(createRangeItem());
};

document.getElementById("generate").onclick = (e) => {
  const isGenerated = generateTable();
  if (isGenerated) e.target.scrollIntoView({ behavior: "smooth" });
};

/// Names Inputs
function getNamesFromTextarea() {
  const names = namesTextarea.value;
  return (
    names
      ?.trim()
      .split("\n")
      .filter((n) => n) || []
  );
}

function updateNamesCount() {
  const { length } = getNamesFromTextarea();
  namesCountEl.disabled = length ? true : false;
  namesCountEl.value = length;
}

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
    updateNamesCount();
  },
});

namesTextarea.addEventListener("input", updateNamesCount);

// Random Quiz data generator
function shuffleUniform(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickUniqueRandom(source, count) {
  if (!Array.isArray(source) || source.length === 0 || count <= 0) {
    return [];
  }

  const shuffled = shuffleUniform(source);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function generateQuizData(names, ranges) {
  const finalData = Object.fromEntries(names.map((n) => [n, []]));

  ranges.forEach((r) => {
    const images = Array.isArray(r.images) ? r.images : [];

    names.forEach((student) => {
      finalData[student].push({
        rangeName: r.rangeName,
        images: pickUniqueRandom(images, r.count),
        score: r.score,
        desc: r.desc,
      });
    });
  });

  return finalData;
}

/* Generate Table */

function generateNamesByCount(count) {
  return Array.from({ length: count }, (_, i) => i + 1);
}

function getNames() {
  let namesArray = getNamesFromTextarea();
  const namesCount = namesCountEl.value;
  return {
    names: namesArray.length ? namesArray : generateNamesByCount(namesCount),
    showNames: namesArray.length ? true : false,
  };
}

function collectValidRanges(rangeDivs) {
  return Array.from(rangeDivs)
    .map(getRangeData)
    .filter((r) => r.images.length && r.count);
}

function renderQuestionRow(qNum, img, range) {
  return `
 <tr>
  <td class="w-10 text-center font-bold">
    ${toPersianDigits(qNum)}
    <span class="font-normal text-xs">
      ${+range.score > 0 ? `(${toPersianDigits(range.score)}نمره)` : ``}
    </span>
  </td>

  <td class="p-0">
    <div class="h-[75px] overflow-hidden relative">
      ${range.desc ? `<p class="absolute">${range.desc}</p>` : ``}
      <img
        class="max-h-[75px] w-full object-contain"
        src="${img}"
        alt="${range.rangeName}"
      >
    </div>
  </td>
</tr>`;
}

function renderStudentTable(studentQuiz, name) {
  let qNum = 1;

  const rows = studentQuiz
    .flatMap((range) =>
      range.images.map((img) => renderQuestionRow(qNum++, img, range)),
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

function generateTable() {
  const namesNumber = +namesCountEl.value;
  if (!namesNumber) {
    showToast("لطفا تعداد را وارد کنید", "error");
    return false;
  }

  const ranges = collectValidRanges(document.querySelectorAll(".range-item"));

  if (!ranges.length) {
    showToast("حداقل یک مبحث معتبر تعریف کنید.", "error");
    return false;
  }

  const { names, showNames } = getNames();
  const quizData = generateQuizData(names, ranges);

  const html = names
    .map(
      (student) => `
<tr>
  <td class="questions">
    ${renderStudentTable(quizData[student], showNames ? student : ``)}
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

/// Image Modal
modalOverlay.addEventListener("click", () => {
  cropperInstance?.destroy();
  cropperInstance = null;
  selectedImg = null;
  modal.style.display = "none";
  modalImg.src = "";
  toggleCropBtns();
});

// Export JSON
document.getElementById("exportJson").onclick = () => {
  const { names } = getNames();
  const namesCount = names.length || namesCountEl.value || 0;
  const ranges = Array.from(document.querySelectorAll(".range-item")).map(
    (div) => {
      return {
        rangeName: div.querySelector(".range-name").value,
        count: parseInt(div.querySelector(".range-count").value),
        score: div.querySelector(".range-score").value,
        desc: div.querySelector(".range-desc").value,
        images: getRangeImages(div),
      };
    },
  );

  const data = { names, namesCount, ranges };
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "data.json";
  a.click();
};

// Import JSON
handleFileUpload({
  target: document.getElementById("importJson"),
  onChange: (file) => {
    const data = JSON.parse(file);
    namesCountEl.value = +data.namesCount;
    rangesContainer.innerHTML = "";
    data.ranges.forEach((r) => rangesContainer.appendChild(createRangeItem(r)));

    namesTextarea.value = data.names.join("\n");
    updateNamesCount();
  },
  readAs: "Text",
});

//sticky box
const observer = new IntersectionObserver(
  ([entry]) => {
    const isActive = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    sticky.classList[isActive ? "add" : "remove"]("is-sticky");
  },
  {
    root: null,
    threshold: 0,
  },
);

observer.observe(sentinel);

// move to top
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
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

//Drag and Drop Range Items
const placeholder = document.createElement("div");
placeholder.className = "placeholder";

/* ---------- DESKTOP ---------- */
ranges_list.addEventListener("dragstart", (e) => {
  if (!e.target.classList.contains("range-item")) return;

  draggedItem = e.target;
  draggedItem.classList.add("opacity-50");
  setTimeout(() => draggedItem.classList.add("hidden"), 0);
});

ranges_list.addEventListener("dragend", cleanup);

ranges_list.addEventListener("dragover", (e) => {
  if (isTouch || !draggedItem) return;
  e.preventDefault();
  handleMove(e.clientY);
});

ranges_list.addEventListener("drop", (e) => {
  e.preventDefault();
  if (placeholder.parentNode) {
    ranges_list.insertBefore(draggedItem, placeholder);
  }
});

/* ---------- MOBILE ---------- */
ranges_list.addEventListener(
  "touchstart",
  (e) => {
    const target = e.target.closest(".range-item");
    if (!target) return;

    isTouch = true;
    draggedItem = target;
    draggedItem.classList.add("opacity-50");
  },
  { passive: true },
);

ranges_list.addEventListener(
  "touchmove",
  (e) => {
    if (!draggedItem) return;
    handleMove(e.touches[0].clientY);
  },
  { passive: true },
);

ranges_list.addEventListener("touchend", () => {
  if (placeholder.parentNode) {
    ranges_list.insertBefore(draggedItem, placeholder);
  }
  cleanup();
});

/* ---------- SHARED ---------- */
function animateReorder() {
  const items = [...ranges_list.querySelectorAll(".range-item")];

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

function handleMove(pointerY) {
  animateReorder();

  const items = [
    ...ranges_list.querySelectorAll(".range-item:not(.opacity-50)"),
  ];

  for (const item of items) {
    const rect = item.getBoundingClientRect();
    if (pointerY < rect.top + rect.height / 2) {
      item.before(placeholder);
      return;
    }
  }
  ranges_list.appendChild(placeholder);
}

function cleanup() {
  if (!draggedItem) return;
  draggedItem.classList.remove("opacity-50", "hidden");
  placeholder.remove();
  draggedItem = null;
  isTouch = false;
}

/// Crop Image suppurt
function toggleCropBtns() {
  editCropBtn.classList.toggle("hidden");
  saveCroppedImageBtn.classList.toggle("hidden");
}

// فعال کردن حالت ویرایش و کراپ
editCropBtn.addEventListener("click", () => {
  if (cropperInstance) cropperInstance.destroy();

  cropperInstance = new Cropper(modalImg, {
    aspectRatio: NaN,
    viewMode: 1,
    movable: true,
    zoomable: true,
    scalable: true,
    responsive: true,
    autoCropArea: 1,
  });

  toggleCropBtns();
});

// ذخیره تصویر کراپ شده با تایید
saveCroppedImageBtn.addEventListener("click", () => {
  if (!cropperInstance) return;

  showConfirm({
    msg: "آیا از ذخیره تصویر اطمینان دارید؟",
    on_confirm: () => {
      const croppedCanvas = cropperInstance.getCroppedCanvas();
      const croppedImage = new Image();
      croppedImage.onload = () => {
        modalImg.src = croppedImage.src;
        selectedImg.src = croppedImage.src;
        cropperInstance.destroy();
        cropperInstance = null;
        toggleCropBtns();
      };
      croppedImage.src = croppedCanvas.toDataURL();
    },
  });
});

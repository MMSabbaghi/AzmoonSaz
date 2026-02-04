const rangesContainer = document.getElementById("ranges");
const modal = document.getElementById("modal");
const modalImg = document.getElementById("modal-img");

// تبدیل اعداد انگلیسی به فارسی
function toPersianDigits(str) {
  return (str + "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

function getImgesLength(target) {
  return target.querySelector(".preview").children.length;
}

function addImage(imgSrc, target) {
  const imgContainer = document.createElement("div");
  imgContainer.innerHTML = `<img src="${imgSrc}" alt=""><button>&times;</button>`;
  imgContainer.querySelector("button").onclick = () => {
    imgContainer.remove();
    target.querySelector(".range-total").textContent =
      `${toPersianDigits(getImgesLength(target))} سوال`;
  };
  imgContainer.querySelector("img").onclick = () => {
    modalImg.src = imgSrc;
    modal.style.display = "flex";
  };
  target.querySelector(".preview").appendChild(imgContainer);
  target.querySelector(".range-total").textContent =
    `${toPersianDigits(getImgesLength(target))} سوال`;
}

let selectedRange = null;
document.addEventListener("paste", (e) => {
  const items = e.clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf("image") !== -1) {
      const blob = items[i].getAsFile();
      const reader = new FileReader();
      reader.onload = (ev) => addImage(ev.target.result, selectedRange);
      reader.readAsDataURL(blob);
    }
  }
});

function createRangeItem(rangeData = null) {
  const div = document.createElement("div");
  const fileID = crypto.randomUUID();
  div.draggable = true;
  div.className = "range-item transition-transform duration-200 ease-out";
  div.innerHTML = `
  <div class="range-header my-1">
    <div class="flex items-center gap-2">
      <div>
      <label class="font-normal text-[#777]"> مبحث: </label>
      <input type="text" class="border rounded p-2 range-name" placeholder="عنوان مبحث">
      </div>
      <div>
      <label class="font-normal text-[#777]"> تعداد: </label>
      <input value="1" data-number-input="true" data-float="false" class="w-20 border rounded p-2 range-count" placeholder="تعداد">
      </div>
      <div>
      <label class="font-normal text-[#777]" > نمره: </label>
      <input value="1" data-number-input="true" class="w-20 border rounded p-2 range-score" placeholder="نمره">
      </div>
      <div class="file-input">
      <input type="file" id="file-${fileID}" accept="image/*" multiple class="file range-images">
      <label for="file-${fileID}" class="btn px-4 py-2 rounded">
      <i class="bi bi-image"></i>
      </label>
      </div>
        <!-- Switch -->
      <label class="font-normal text-[#777]" > متن سوال: </label>
      <div id="switch" class="relative w-[60px] h-[34px] bg-[#ccc] rounded-[var(--radius)] cursor-pointer
         transition-all duration-300 ease-out
         shadow-inner">

        <div id="knob" class="absolute top-1 left-1 w-[28px] h-[26px] bg-white rounded-[var(--radius)]
           transition-all duration-500
           shadow-md">
      </div>
    </div>
    </div>
    <div class="flex items-center gap-2">
    <span class="range-total"></span>
    <button class="btn px-2 py-1 bg-red-500 text-white rounded remove-range">
    <i class="bi bi-trash3"></i>
    </button>
      </div>
    </div>

    <div id="textareaBox" class="overflow-hidden
         max-h-0 opacity-0 blur-sm -translate-y-3
         transition-all duration-500 ease-out">
        <textarea class="range-desc w-full h-15 border rounded-[var(--radius)] p-3 text-sm focus:outline-none" placeholder="متن سوال را اینجا بنویسید."></textarea>
    </div>
    <div class="preview"></div>
  `;

  const sw = div.querySelector("#switch");
  const knob = div.querySelector("#knob");
  const textareaBox = div.querySelector("#textareaBox");

  div.addEventListener("click", (e) => (selectedRange = div));

  let on = false;
  sw.addEventListener("click", () => {
    on = !on;

    const stateClasses = {
      on: ["max-h-60", "opacity-100", "blur-0", "translate-y-0"],
      off: ["max-h-0", "opacity-0", "blur-sm", "-translate-y-3"],
    };

    function setState(state) {
      textareaBox.classList.remove(...stateClasses.on, ...stateClasses.off);
      textareaBox.classList.add(...stateClasses[state]);
    }

    if (on) {
      sw.classList.add("bg-[#333]");
      knob.classList.add("translate-x-6", "scale-105");
      setState("on");
    } else {
      sw.classList.remove("bg-[#333]");
      knob.classList.remove("translate-x-6", "scale-105");
      setState("off");
    }
  });

  if (rangeData) {
    div.querySelector(".range-name").value = rangeData.rangeName;
    div.querySelector(".range-count").value = rangeData.count;
    div.querySelector(".range-score").value = rangeData.score;
    div.querySelector(".range-desc").value = rangeData.desc;
    rangeData.images.forEach((imgSrc) => addImage(imgSrc, div));
  }

  div.querySelector(".range-images").addEventListener("change", (e) => {
    Array.from(e.target.files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => addImage(ev.target.result, div);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  });

  div.querySelector(".remove-range").onclick = () => {
    showConfirm({
      msg: "آیا از حذف این مبحث اطمینان دارید؟",
      on_confirm: () => div.remove(),
    });
  };
  return div;
}

document.getElementById("addRange").onclick = () => {
  rangesContainer.appendChild(createRangeItem());
};

modal.addEventListener("click", () => {
  modal.style.display = "none";
  modalImg.src = "";
});

function validateRanges() {}

document.getElementById("generate").onclick = (e) => {
  const isGenerated = generateTable();
  if (isGenerated) e.target.scrollIntoView({ behavior: "smooth" });
};

function generateTable() {
  const namesNumber = document.getElementById("names").value;
  const rangeDivs = document.querySelectorAll(".range-item");
  if (!rangeDivs.length) {
    showToast("لطفا یک مبحث معتبر تعریف کنید", "error");
    return false;
  } else if (!namesNumber) {
    showToast("لطفا تعداد را وارد کنید", "error");
    return false;
  }
  const names = Array.from({ length: +namesNumber }, (_, i) => i + 1);

  const ranges = [];

  rangeDivs.forEach((div) => {
    const rangeName = div.querySelector(".range-name").value.trim();
    const count = parseInt(div.querySelector(".range-count").value);
    const score = div.querySelector(".range-score").value;
    const desc = div.querySelector(".range-desc").value;
    const imgs = Array.from(div.querySelectorAll(".preview img")).map(
      (i) => i.src,
    );
    if (imgs.length === 0 || !count) return;
    ranges.push({ rangeName, count, images: imgs, score, desc });
  });

  if (!ranges.length) {
    showToast("حداقل یک فیلد معتبر تعریف کنید.", "error");
    return false;
  }

  let finalData = {};
  names.forEach((n) => (finalData[n] = []));

  ranges.forEach((r) => {
    const shuffled = [...r.images].sort(() => Math.random() - 0.5);
    const numQuestions = r.count;

    if (numQuestions >= shuffled.length) {
      names.forEach((student) => {
        const selection = [];
        const pool = [...shuffled];
        for (let i = 0; i < r.count; i++) {
          if (pool.length === 0) break;
          const idx = Math.floor(Math.random() * pool.length);
          selection.push(pool[idx]);
          pool.splice(idx, 1);
        }
        finalData[student].push({
          rangeName: r.rangeName,
          images: selection,
          score: r.score,
          desc: r.desc,
        });
      });
    } else {
      const pool = [...shuffled];
      names.forEach((student) => {
        const selection = [];
        for (let i = 0; i < r.count; i++) {
          if (pool.length === 0) pool.push(...shuffled);
          const idx = Math.floor(Math.random() * pool.length);
          selection.push(pool[idx]);
          pool.splice(idx, 1);
        }
        finalData[student].push({
          rangeName: r.rangeName,
          images: selection,
          score: r.score,
          desc: r.desc,
        });
      });
    }
  });

  let html = ``;
  names.forEach((student) => {
    let questionHtml = "<table>";
    questionHtml += `<tr style="background-color:#e5e7eb"><td style="width:40px;"></td><td style="padding: 1px;"> نام و نام خانوادگی: </td></tr>`;
    let qNum = 1;
    finalData[student].forEach((r) => {
      r.images.forEach((img) => {
        questionHtml += `<tr>
        <td style="width:40px;text-align:center;font-weight:bold;">${toPersianDigits(
          qNum,
        )}
        <span style="font-weight: normal;font-size: small;">
         ${+r.score > 0 ? `(${toPersianDigits(r.score)}نمره)` : ``}
        </span> 
        </td>
        <td style="padding:0px ; padding-top:3px;">
        <div style="height: 75px; overflow: hidden; " >   
        <p style="position: absolute"> ${r.desc.length > 0 ? r.desc : ``} </p>
        <img style="max-height: 75px; width: 100%; object-fit: contain;" 
        src="${img}" alt="${r.rangeName}">
        </div>
        </td>
        </tr>`;
        qNum++;
      });
    });
    questionHtml += "</table>";
    html += `<tr><td class="questions">${questionHtml}</td></tr>`;
  });
  html += "</tbody></table>";
  document.getElementById("printable").innerHTML = html;
  return true;
}

// Export JSON
document.getElementById("exportJson").onclick = () => {
  const namesNumber = document.getElementById("names").value || 0;
  const ranges = Array.from(document.querySelectorAll(".range-item")).map(
    (div) => {
      return {
        rangeName: div.querySelector(".range-name").value,
        count: parseInt(div.querySelector(".range-count").value),
        score: div.querySelector(".range-score").value,
        desc: div.querySelector(".range-desc").value,
        images: Array.from(div.querySelectorAll(".preview img")).map(
          (i) => i.src,
        ),
      };
    },
  );

  const data = { names: namesNumber, ranges };
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "data.json";
  a.click();
};

// Import JSON
document.getElementById("importJsonBtn").onclick = () =>
  document.getElementById("importJson").click();
document.getElementById("importJson").addEventListener("change", (e) => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = (ev) => {
    const data = JSON.parse(ev.target.result);
    document.getElementById("names").value = +data.names;
    rangesContainer.innerHTML = "";
    data.ranges.forEach((r) => rangesContainer.appendChild(createRangeItem(r)));
  };
  reader.readAsText(file);
  e.target.value = "";
});

//sticky box
const sticky = document.getElementById("sticky");
const sentinel = document.getElementById("sentinel");

const observer = new IntersectionObserver(
  ([entry]) => {
    if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
      sticky.classList.add("is-sticky");
    } else {
      sticky.classList.remove("is-sticky");
    }
  },
  {
    root: null,
    threshold: 0,
  },
);

observer.observe(sentinel);

// move to top
const btn = document.getElementById("toTop");

window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    btn.classList.remove("opacity-0", "invisible", "translate-y-6");
    btn.classList.add("opacity-100", "visible", "translate-y-0");
  } else {
    btn.classList.add("opacity-0", "invisible", "translate-y-6");
    btn.classList.remove("opacity-100", "visible", "translate-y-0");
  }
});

btn.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

//Drag and Drop Range Items
const ranges_list = document.getElementById("ranges");
const placeholder = document.createElement("div");
placeholder.className = "placeholder";

let draggedItem = null;
let isTouch = false;

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

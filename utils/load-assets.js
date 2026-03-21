// ========== helpers ==========
const overlay = document.getElementById("overlay");
const progressBar = overlay.querySelector("#progressBar");
const loadingText = overlay.querySelector("#loadingText");

function toPersianDigits(str) {
  return str.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

function showOverlay() {
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function loadFile(type, src) {
  return new Promise((resolve, reject) => {
    let element;
    if (type === "css") {
      element = document.createElement("link");
      element.rel = "stylesheet";
      element.href = src;
    } else if (type === "js") {
      element = document.createElement("script");
      element.src = src;
    }
    element.onload = resolve;
    element.onerror = reject;
    document.body.appendChild(element);
  });
}

function calculateProgressPercent(loadedFiles, totalFiles) {
  return Math.round((loadedFiles / totalFiles) * 100);
}

function updateProgress(percent) {
  progressBar.style.width = percent + "%";
  loadingText.textContent = `در حال بارگذاری... ${toPersianDigits(String(percent))}%`;
}

// ========== main ==========
function LoadAssets(files) {
  document.addEventListener("DOMContentLoaded", function () {
    showOverlay();

    const loadPromises = files.map(({ src, type }, index) => {
      return loadFile(type, src)
        .then(() => {
          const percent = calculateProgressPercent(index + 1, files.length);
          updateProgress(percent);
        })
        .catch((error) => {
          console.error(`Failed to load ${src}`, error);
        });
    });

    Promise.all(loadPromises).then(() => setTimeout(hideOverlay, 500));
  });
}

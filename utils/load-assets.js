// ========== helpers ==========
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

// ========== main ==========
function LoadAssets({
  files = [],
  onStart = () => {},
  onEnd = () => {},
  onProgress = () => {},
}) {
  document.addEventListener("DOMContentLoaded", function () {
    onStart();

    const loadPromises = files.map(({ src, type }, index) => {
      return loadFile(type, src)
        .then(() => {
          const percent = calculateProgressPercent(index + 1, files.length);
          onProgress(percent);
        })
        .catch((error) => {
          console.error(`Failed to load ${src}`, error);
        });
    });

    Promise.all(loadPromises).then(() => setTimeout(onEnd, 500));
  });
}

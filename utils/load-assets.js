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
  document.addEventListener("DOMContentLoaded", async () => {
    onStart();

    for (let i = 0; i < files.length; i++) {
      const { src, type } = files[i];
      try {
        await loadFile(type, src);
        const percent = calculateProgressPercent(i + 1, files.length);
        onProgress(percent);
      } catch (error) {
        console.error(`Failed to load ${src}`, error);
      }
    }

    onEnd();
  });
}

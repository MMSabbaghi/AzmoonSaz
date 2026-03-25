(function (global) {
  function Rainfall(container, options) {
    options = options || {};

    this.container = container;

    this.chars =
      typeof options.characters === "string"
        ? options.characters.split("")
        : Array.isArray(options.characters)
          ? options.characters
          : ["؟"];
    this.maxItems = options.maxItems || 40;
    this.minFontSize = options.minFontSize || 20;
    this.maxFontSize = options.maxFontSize || 50;
    this.fontFamily = options.fontFamily || "serif";
    this.minOpacity =
      typeof options.minOpacity === "number" ? options.minOpacity : 0.1;
    this.maxOpacity =
      typeof options.maxOpacity === "number" ? options.maxOpacity : 0.3;
    this.minSpeed = options.minSpeed || 20;
    this.maxSpeed = options.maxSpeed || 70;

    this.charColor = options.charColor || "white";
    this.backgroundColor =
      "backgroundColor" in options ? options.backgroundColor : null;

    this.dpr = window.devicePixelRatio || 1;

    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.pointerEvents = "none";
    this.canvas.style.zIndex =
      typeof options.zIndex !== "undefined" ? options.zIndex : "9999";

    if (
      !this.container.style.position ||
      this.container.style.position === "static"
    ) {
      this.container.style.position = "relative";
    }
    this.container.appendChild(this.canvas);

    this.charCache = new Map();

    this.charsArray = [];

    this.lastTs = performance.now();
    this.accumTime = 0;

    this.targetFPS = 30;
    this.frameDuration = 1000 / this.targetFPS;

    this.isVisible = true;
    var self = this;
    document.addEventListener("visibilitychange", function () {
      self.isVisible = !document.hidden;
      if (self.isVisible) {
        self.lastTs = performance.now();
        self.loop();
      }
    });

    this._resizeHandler = this.resize.bind(this);
    window.addEventListener("resize", this._resizeHandler);

    this.initChars();
    this.resize();
    this.loop();
  }

  Rainfall.prototype.randomBetween = function (min, max) {
    return Math.random() * (max - min) + min;
  };

  Rainfall.prototype.getCharCanvas = function (char, fontSize) {
    const key = char + fontSize + this.charColor;
    if (this.charCache.has(key)) return this.charCache.get(key);

    const offCanvas = document.createElement("canvas");
    const offCtx = offCanvas.getContext("2d");
    offCanvas.width = fontSize * 1.4;
    offCanvas.height = fontSize * 1.4;

    offCtx.font = fontSize + "px serif";
    offCtx.textBaseline = "top";
    offCtx.fillStyle = this.charColor;
    offCtx.font = fontSize + "px " + this.fontFamily;
    offCtx.fillText(char, fontSize * 0.1, 0);

    this.charCache.set(key, offCanvas);
    return offCanvas;
  };

  Rainfall.prototype.initChars = function () {
    const arr = new Array(this.maxItems);
    for (let i = 0; i < this.maxItems; i++) {
      arr[i] = this.createFallingChar(i);
    }
    this.charsArray = arr;
  };

  ((Rainfall.prototype.createFallingChar = function (index) {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const fontSize = this.randomBetween(this.minFontSize, this.maxFontSize) | 0;
    const char =
      this.chars[Math.floor(this.randomBetween(0, this.chars.length))];
    const canvasCache = this.getCharCanvas(char, fontSize);
    const width = canvasCache.width;
    const height = canvasCache.height;

    const segmentWidth = w / this.maxItems;
    const x = segmentWidth * index + segmentWidth / 2 - width / 2;

    return {
      x: x,
      y: this.randomBetween(-h, 0),
      fontSize: fontSize,
      opacity: this.randomBetween(this.minOpacity, this.maxOpacity),
      speedY: this.randomBetween(this.minSpeed, this.maxSpeed),
      speedX: 1,
      char: char,
      canvasCache: canvasCache,
      width: width,
      height: height,
    };
  }),
    (Rainfall.prototype.update = function (delta) {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;

      this.charsArray.forEach(function (ch) {
        ch.x += ch.speedX * delta;
        ch.y += ch.speedY * delta;

        if (ch.y > h + ch.height) {
          ch.y = -ch.height;
          ch.x = Math.random() * w;
        }
        if (ch.x > w + ch.width) ch.x = -ch.width;
        else if (ch.x < -ch.width) ch.x = w + ch.width;
      });
    }));

  Rainfall.prototype.draw = function () {
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    this.ctx.clearRect(0, 0, w, h);

    if (this.backgroundColor) {
      this.ctx.fillStyle = this.backgroundColor;
      this.ctx.fillRect(0, 0, w, h);
    }

    this.charsArray.forEach(function (ch) {
      this.ctx.globalAlpha = ch.opacity;
      this.ctx.drawImage(ch.canvasCache, ch.x, ch.y, ch.width, ch.height);
      this.ctx.globalAlpha = 1;
    }, this);
  };

  Rainfall.prototype.resize = function () {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.canvas.style.width = rect.width + "px";
    this.canvas.style.height = rect.height + "px";

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);
  };

  Rainfall.prototype.loop = function (ts) {
    var self = this;
    if (!this.isVisible) return;
    ts = ts || performance.now();

    this.accumTime += ts - this.lastTs;
    this.lastTs = ts;

    if (this.accumTime >= this.frameDuration) {
      var delta = this.accumTime / 1000;
      this.update(delta);
      this.draw();
      this.accumTime = 0;
    }
    requestAnimationFrame(function (t) {
      self.loop(t);
    });
  };

  Rainfall.prototype.destroy = function () {
    window.removeEventListener("resize", this._resizeHandler);
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  };

  Rainfall.init = function (container, options) {
    options = options || {};
    if (!container) return;
    return new Rainfall(container, options);
  };

  global.Rainfall = Rainfall;
})(window);

//screenshot-prevention
const SCREENSHOT_PREVENTION = `(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.ScreenshotPrevention = factory());
})(this, (function () { 'use strict';

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise, SuppressedError, Symbol, Iterator */


    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
        var e = new Error(message);
        return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
    };

    /**
     * @package enhanced-screenshot-prevention
     * @version 1.0.0
     * @description Advanced screenshot, screen recording, and screen sharing prevention library
     * @license MIT
     */
    class EnhancedScreenshotPrevention {
        constructor(options = {}) {
            this.defaultStyles = {
                overlayBackground: 'rgba(255, 255, 255, 0.5)',
                warningBackground: '#ff4444',
                warningColor: '#ffffff',
                warningFontFamily: 'system-ui, -apple-system, sans-serif',
                warningBorderRadius: '8px',
                warningBoxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            };
            this.state = {
                attemptCount: 0,
                isBlurred: false,
                recoveryTimer: null,
                lastVisibilityChange: 0,
                mousePosition: { x: 0, y: 0 }
            };
            this.options = {
                blurIntensity: '20px',
                warningMessage: 'Screenshot and screen recording are not allowed.',
                preventCopy: true,
                preventInspect: true,
                recoveryDelay: 2000,
                debug: false,
                onAttempt: this.defaultAttemptHandler.bind(this),
                customStyles: {}
            };
            this.elements = {
                overlay: document.createElement('div'),
                warning: document.createElement('div'),
                style: document.createElement('style')
            };
            if (EnhancedScreenshotPrevention.instance) {
                return EnhancedScreenshotPrevention.instance;
            }
            this.validateEnvironment();
            this.initializeOptions(options);
            this.initializeElements();
            EnhancedScreenshotPrevention.instance = this;
            this.initialize();
            return this;
        }
        validateEnvironment() {
            if (typeof window === 'undefined') {
                throw new Error('EnhancedScreenshotPrevention requires a browser environment');
            }
        }
        initializeOptions(options) {
            Object.assign(this.options, options);
            if (options.customStyles) {
                Object.assign(this.defaultStyles, options.customStyles);
            }
        }
        initializeElements() {
            this.elements.overlay = this.createOverlay();
            this.elements.warning = this.createWarning();
            this.elements.style = this.createProtectiveStyles();
        }
        initialize() {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            }
            else {
                this.setup();
            }
        }
        setup() {
            const fragment = document.createDocumentFragment();
            fragment.appendChild(this.elements.overlay);
            fragment.appendChild(this.elements.warning);
            requestAnimationFrame(() => {
                document.body.appendChild(fragment);
                document.head.appendChild(this.elements.style);
                this.setupEventListeners();
                this.setupMediaProtection();
                if (this.options.preventInspect) {
                    this.setupDevToolsDetection();
                }
            });
        }
        createOverlay() {
            const overlay = document.createElement('div');
            overlay.setAttribute('data-screenshot-prevention', 'overlay');
            overlay.style.cssText = \`
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            backdrop-filter: blur(\${this.options.blurIntensity});
            -webkit-backdrop-filter: blur(\${this.options.blurIntensity});
            background: \${this.defaultStyles.overlayBackground};
            z-index: 2147483647;
            display: none;
            transition: opacity 0.3s ease;
            pointer-events: none;
        \`;
            return overlay;
        }
        createWarning() {
            const warning = document.createElement('div');
            warning.setAttribute('data-screenshot-prevention', 'warning');
            warning.style.cssText = \`
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: \${this.defaultStyles.warningBackground};
            color: \${this.defaultStyles.warningColor};
            padding: 20px;
            border-radius: \${this.defaultStyles.warningBorderRadius};
            box-shadow: \${this.defaultStyles.warningBoxShadow};
            z-index: 2147483648;
            text-align: center;
            display: none;
            pointer-events: none;
        \`;
            warning.textContent = this.options.warningMessage;
            return warning;
        }
        createProtectiveStyles() {
            const style = document.createElement('style');
            style.textContent = \`
            .screenshot-prevention-active * {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
                -webkit-touch-callout: none !important;
            }
            
            @media print {
                body { display: none !important; }
            }
        \`;
            return style;
        }
        setupEventListeners() {
            const eventOptions = { passive: true };
            document.addEventListener('keydown', this.handleKeyboardEvent.bind(this), eventOptions);
            document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this), eventOptions);
            document.addEventListener('mousemove', this.handleMouseMove.bind(this), eventOptions);
            if ('visualViewport' in window && window.visualViewport) {
                window.visualViewport.addEventListener('resize', this.debounce(this.handleViewportResize.bind(this), 100), eventOptions);
            }
        }
        setupMediaProtection() {
            if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices.getDisplayMedia;
                navigator.mediaDevices.getDisplayMedia = (...args) => __awaiter(this, void 0, void 0, function* () {
                    this.handleDetection('screenCapture', 'Screen capture attempted');
                    throw new Error('Screen capture is not allowed');
                });
            }
            if ('mediaSession' in navigator && navigator.mediaSession) {
                navigator.mediaSession.setActionHandler('play', () => {
                    this.handleDetection('mediaRecording', 'Media recording detected');
                });
            }
        }
        setupDevToolsDetection() {
            const threshold = 160;
            let devToolsTimeout;
            const checkDevTools = () => {
                const windowWidth = window.outerWidth - window.innerWidth > threshold;
                const windowHeight = window.outerHeight - window.innerHeight > threshold;
                if (windowWidth || windowHeight) {
                    this.handleDetection('devTools', 'Developer tools detected');
                }
            };
            window.addEventListener('resize', () => {
                window.clearTimeout(devToolsTimeout);
                devToolsTimeout = window.setTimeout(checkDevTools, 100);
            });
        }
        handleKeyboardEvent(e) {
            const isWindowsKeyPressed = e.getModifierState('Meta') || e.getModifierState('OS');
            const isScreenshotCombo = e.key === 'PrintScreen' ||
                ((e.metaKey || e.ctrlKey) && e.shiftKey && ['3', '4', '5'].includes(e.key)) ||
                ((e.metaKey || isWindowsKeyPressed) && e.shiftKey && e.key === 'S');
            if (isScreenshotCombo) {
                e.preventDefault();
                this.handleDetection('keyboard', 'Screenshot shortcut detected');
            }
        }
        handleVisibilityChange() {
            const now = Date.now();
            const timeDiff = now - this.state.lastVisibilityChange;
            if (!document.hidden && timeDiff < 1000) {
                this.handleDetection('visibilityChange', 'Rapid visibility change detected');
            }
            this.state.lastVisibilityChange = now;
        }
        handleMouseMove(e) {
            this.state.mousePosition = { x: e.clientX, y: e.clientY };
        }
        handleViewportResize() {
            if (!window.visualViewport)
                return;
            const viewportWidth = window.visualViewport.width;
            const windowWidth = window.outerWidth;
            if (Math.abs(viewportWidth - windowWidth) > 50) {
                this.handleDetection('mobile', 'Mobile screenshot detected');
            }
        }
        handleDetection(method, details) {
            this.state.attemptCount++;
            if (this.state.recoveryTimer !== null) {
                window.clearTimeout(this.state.recoveryTimer);
            }
            requestAnimationFrame(() => {
                this.elements.overlay.style.display = 'block';
                this.elements.warning.style.display = 'block';
                document.body.classList.add('screenshot-prevention-active');
            });
            this.options.onAttempt({
                count: this.state.attemptCount,
                method,
                timestamp: Date.now(),
                details
            });
            this.state.recoveryTimer = window.setTimeout(() => {
                requestAnimationFrame(() => {
                    this.elements.overlay.style.display = 'none';
                    this.elements.warning.style.display = 'none';
                    document.body.classList.remove('screenshot-prevention-active');
                });
            }, this.options.recoveryDelay);
        }
        defaultAttemptHandler(details) {
            if (this.options.debug) {
                console.log('[EnhancedScreenshotPrevention]', details);
            }
        }
        debounce(fn, delay) {
            let timeoutId;
            return (...args) => {
                window.clearTimeout(timeoutId);
                timeoutId = window.setTimeout(() => fn.apply(this, args), delay);
            };
        }
        // Public API
        getAttemptCount() {
            return this.state.attemptCount;
        }
        reset() {
            this.state.attemptCount = 0;
            if (this.state.recoveryTimer !== null) {
                window.clearTimeout(this.state.recoveryTimer);
                this.state.recoveryTimer = null;
            }
            requestAnimationFrame(() => {
                this.elements.overlay.style.display = 'none';
                this.elements.warning.style.display = 'none';
                document.body.classList.remove('screenshot-prevention-active');
            });
        }
        update(options) {
            Object.assign(this.options, options);
            if (options.warningMessage) {
                this.elements.warning.textContent = options.warningMessage;
            }
            if (options.blurIntensity) {
                const blurValue = \`blur(\${options.blurIntensity})\`;
                this.elements.overlay.style.setProperty('backdrop-filter', blurValue);
                this.elements.overlay.style.setProperty('-webkit-backdrop-filter', blurValue);
            }
            if (options.customStyles) {
                Object.assign(this.defaultStyles, options.customStyles);
                this.updateStyles();
            }
        }
        updateStyles() {
            const { overlay, warning } = this.elements;
            overlay.style.background = this.defaultStyles.overlayBackground;
            Object.assign(warning.style, {
                background: this.defaultStyles.warningBackground,
                color: this.defaultStyles.warningColor,
                borderRadius: this.defaultStyles.warningBorderRadius,
                boxShadow: this.defaultStyles.warningBoxShadow
            });
        }
        destroy() {
            if (this.state.recoveryTimer !== null) {
                window.clearTimeout(this.state.recoveryTimer);
            }
            this.elements.overlay.remove();
            this.elements.warning.remove();
            this.elements.style.remove();
            document.body.classList.remove('screenshot-prevention-active');
            EnhancedScreenshotPrevention.instance = null;
        }
    }
    EnhancedScreenshotPrevention.instance = null;
    // Export for different module systems
    if (typeof window !== 'undefined') {
        window.EnhancedScreenshotPrevention = EnhancedScreenshotPrevention;
    }

    return EnhancedScreenshotPrevention;

}));
//# sourceMappingURL=screenshot-prevention.js.map`;

function buildInteractiveExamPage({
  studentNames,
  studentSections,
  startTime,
  endTime,
  startTimeDisplay,
  examTitle,
  examDuration,
  katexCss,
  katexJs,
  autoRenderJs,
  randomize = false,
  preExamMessage = "",
  questionAlert = "",
  allowedExits = null,
}) {
  const finalPreMsg = preExamMessage.trim() || "";
  const finalAlert = questionAlert.trim() || "";
  const namesJson = JSON.stringify(studentNames);
  const sectionsJson = JSON.stringify(studentSections);
  const startTimeIso = startTime.toISOString();
  const endTimeIso = endTime.toISOString();

  let html = `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${sanitizeText(examTitle)}</title>
  <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet" type="text/css" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Vazirmatn', sans-serif;
      background: linear-gradient(135deg, #e0eaf5 0%, #f0f4f8 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 12px;
      direction: rtl;
    }
    .container {
      width: 100%;
      max-width: 500px;
      background: rgba(255,255,255,0.92);
      backdrop-filter: blur(16px);
      border-radius: 28px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-height: 90vh;
      transition: all 0.2s ease;
    }
    .screen { display: none; flex-direction: column; flex: 1; }
    .screen.active { display: flex; }
    
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #3b82f6 100%);
      color: white;
      padding: 24px 20px;
      text-align: center;
      font-weight: 700;
      font-size: 1.4em;
      letter-spacing: -0.5px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }

    .login-content {
      flex: 1;
      padding: 32px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .login-content .note {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 16px;
      padding: 14px;
      margin-bottom: 24px;
      text-align: right;
      line-height: 1.8;
      font-size: 0.9em;
      color: #92400e;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .login-content select {
      width: 100%;
      padding: 16px;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      font-family: inherit;
      font-size: 1.1em;
      margin-bottom: 18px;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23334155' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: left 1rem center;
    }
    .login-content select:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99,102,241,0.2);
    }
    .btn {
      padding: 16px 32px;
      border-radius: 16px;
      border: none;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white;
      font-family: inherit;
      font-weight: 600;
      font-size: 1em;
      cursor: pointer;
      width: 100%;
      transition: all 0.2s;
      box-shadow: 0 4px 6px -1px rgba(79,70,229,0.3);
    }
    .btn:disabled { background: #cbd5e1; box-shadow: none; cursor: not-allowed; }
    .btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #4338ca, #6d28d9);
      transform: translateY(-1px);
      box-shadow: 0 6px 10px -2px rgba(79,70,229,0.4);
    }
    .btn:active:not(:disabled) { transform: translateY(1px); }

    .waiting-content {
      flex: 1;
      padding: 32px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .countdown {
      font-size: 2.8em;
      font-weight: 700;
      margin: 24px 0;
      background: #f1f5f9;
      padding: 18px 30px;
      border-radius: 20px;
      color: #1e293b;
      letter-spacing: 2px;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
    }
    .exam-duration-info {
      margin-top: 12px;
      background: #ede9fe;
      padding: 10px 20px;
      border-radius: 20px;
      font-weight: 600;
      color: #5b21b6;
      display: inline-block;
    }

    .quiz-header {
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      padding: 14px 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .student-name {
      font-weight: 600;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 1em;
    }
    .timer {
      background: #fef3c7;
      padding: 6px 14px;
      border-radius: 20px;
      font-weight: 700;
      color: #92400e;
      font-size: 0.9em;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .progress-bar {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-top: 12px;
      flex-wrap: wrap;
    }
    .progress-dot {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #f1f5f9;
      color: #64748b;
      border: none;
      font-family: inherit;
      font-size: 0.85em;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .progress-dot.visited {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white;
      box-shadow: 0 2px 6px rgba(99,102,241,0.4);
    }
    .quiz-body {
      flex: 1;
      padding: 20px 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      background: #f8fafc;
    }
    #questionsContainer {
      position: relative;
      flex: 1;
      min-height: 200px;
    }
    .question-panel {
      opacity: 0;
      visibility: hidden;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      transform: translateX(20px);
      transition: opacity 0.3s ease, transform 0.3s ease, visibility 0.3s;
      background: #ffffff;
      border-radius: 20px;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      border: 1px solid #e2e8f0;
    }
    .question-panel.active {
      opacity: 1;
      visibility: visible;
      position: relative;
      transform: translateX(0);
    }
    .question-number {
      font-weight: 700;
      font-size: 1.2em;
      color: #4f46e5;
      margin-bottom: 10px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
    }
    .score-badge {
      background: #ede9fe;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 0.85em;
      color: #5b21b6;
      margin-right: 6px;
    }
    .range-desc {
      font-weight: 700;
      font-size: 1.1em;
      margin-bottom: 6px;
      color: #4338ca;
    }
    .questions-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin: 14px 0;
    }
    .part-question { line-height: 1.8; }
    .nav-buttons {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: 12px;
      padding: 0 4px;
    }
    .nav-btn {
      flex: 1;
      padding: 14px;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      background: #ffffff;
      font-family: inherit;
      font-weight: 600;
      cursor: pointer;
      color: #334155;
      transition: all 0.2s;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .nav-btn:disabled { opacity: 0.4; cursor: default; }
    .nav-btn:hover:not(:disabled) {
      background: #f8fafc;
      border-color: #cbd5e1;
    }
    .finish-btn {
      background: linear-gradient(135deg, #b91c1c, #dc2626);
      color: white;
      border: none;
      box-shadow: 0 4px 6px -1px rgba(185,28,28,0.3);
    }
    .finish-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #991b1b, #b91c1c);
      border-color: transparent;
    }
    .progress-text {
      text-align: center;
      font-size: 0.9em;
      margin: 8px 0 4px;
      color: #64748b;
    }

    .dismissible-alert {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 12px;
      padding: 12px 32px 12px 12px;
      margin-bottom: 14px;
      position: relative;
      font-size: 0.9em;
      color: #92400e;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .alert-close {
      position: absolute;
      top: 8px;
      left: 10px;
      background: none;
      border: none;
      font-size: 1.3em;
      cursor: pointer;
      color: #92400e;
      line-height: 1;
      opacity: 0.7;
      transition: opacity 0.2s;
    }
    .alert-close:hover { opacity: 1; }

    .finished-content {
      flex: 1;
      padding: 32px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .finished-content h3 {
      margin-bottom: 12px;
      color: #1e293b;
    }
    .finished-content .btn {
      margin-top: 24px;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      box-shadow: 0 4px 6px -1px rgba(79,70,229,0.3);
    }

    .waiting-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 28px 24px;
      text-align: right;
      margin-bottom: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .waiting-card-item {
      margin: 10px 0;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.95em;
      color: #334155;
    }
    .waiting-card-item i {
      width: 24px;
      color: #4f46e5;
    }

    .lock-overlay {
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483650;
    }
    .lock-message {
      background: white;
      border-radius: 20px;
      padding: 32px;
      max-width: 350px;
      text-align: center;
      font-family: 'Vazirmatn', sans-serif;
      box-shadow: 0 20px 30px rgba(0,0,0,0.3);
    }
    .lock-message h2 { color: #b91c1c; margin-bottom: 16px; }
    .lock-message p { margin-bottom: 24px; font-size: 0.95em; color: #1e293b; }

    .katex { direction: ltr; unicode-bidi: isolate; font-family: inherit !important; }
    .katex-display { text-align: center; }
  </style>
  <style>${katexCss}</style>
</head>
<body>
  <div class="container">
    <div id="loginScreen" class="screen">
      <div class="header">${sanitizeText(examTitle)}</div>
      <div class="login-content">
       ${finalPreMsg ? `<div class="note">${finalPreMsg}</div>` : ``}
        <select id="nameSelect">
          <option value="">-- انتخاب نام --</option>
          ${studentNames.map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("")}
        </select>
        <button id="startBtn" class="btn">شروع آزمون</button>
      </div>
    </div>

    <div id="waitingScreen" class="screen">
      <div class="header">${sanitizeText(examTitle)}</div>
      <div class="waiting-content">
        <div class="waiting-card">
          <div class="waiting-card-item">
            <span><strong>${sanitizeText(examTitle)}</strong></span>
          </div>
          <div class="waiting-card-item">
            <span>زمان شروع: <strong>${startTimeDisplay}</strong></span>
          </div>
          <div class="waiting-card-item">
            <span>مدت آزمون: <strong>${toPersianDigits(examDuration)} دقیقه</strong></span>
          </div>
        </div>
        <div id="countdownTimer" class="countdown">--</div>
      </div>
    </div>
    
    <div id="quizScreen" class="screen">
      <div class="quiz-header">
        <div class="header-top">
          <span class="student-name"><span id="studentNameDisplay"></span></span>
          <span class="timer">⏳ <span id="timeDisplay">--</span></span>
        </div>
        <div class="progress-bar" id="progressBar"></div>
      </div>
      <div class="quiz-body">
               ${
                 finalAlert
                   ? `
      <div class="dismissible-alert" id="globalAlert">
        <button class="alert-close" id="alertCloseBtn">&times;</button>
        ${finalAlert}
      </div>
                `
                   : ``
               }
        <div id="questionsContainer"></div>
        <div class="nav-buttons">
          <button id="prevBtn" class="nav-btn">قبلی</button>
          <button id="nextOrFinishBtn" class="nav-btn">بعدی </button>
        </div>
        <div class="progress-text" id="progressText"></div>
      </div>
    </div>

    <div id="finishedScreen" class="screen">
      <div class="header">${sanitizeText(examTitle)}</div>
      <div class="finished-content">
        <h3 id="finishedTitle">آزمون به پایان رسید</h3>
        <p id="finishedMessage"></p>
        <button id="backToExamBtn" class="btn" style="display:none;">برگشت به آزمون</button>
      </div>
    </div>
  </div>

  <script>${katexJs}</script>
  <script>${autoRenderJs}</script>
  <script>${SCREENSHOT_PREVENTION}</script>
  <script>
    const EXAM_DATA = {
      startTime: ${JSON.stringify(startTimeIso)},
      endTime: ${JSON.stringify(endTimeIso)},
      studentSections: ${sectionsJson},
      studentNames: ${namesJson},
      randomize: ${JSON.stringify(randomize)},
      allowedExits: ${allowedExits === null ? "null" : JSON.stringify(allowedExits)},
      examTitle: ${JSON.stringify(examTitle)}
    };

    let currentStudent = null;
    let timerInterval = null;
    let countdownInterval = null;
    let currentPanelIndex = 0;
    let totalPanels = 0;
    let visitedPanels = [];
    let examParticipated = false;
    let screenshotPreventionInstance = null;
    let exitCount = 0;
    let isLocked = false;
    let wakeLockSentinel = null;
    let wasHidden = false;

    const loginScreen    = document.getElementById('loginScreen');
    const waitingScreen  = document.getElementById('waitingScreen');
    const quizScreen     = document.getElementById('quizScreen');
    const finishedScreen = document.getElementById('finishedScreen');
    const nameSelect     = document.getElementById('nameSelect');
    const startBtn       = document.getElementById('startBtn');
    const timeDisplay    = document.getElementById('timeDisplay');
    const questionsContainer = document.getElementById('questionsContainer');
    const prevBtn        = document.getElementById('prevBtn');
    const nextOrFinishBtn = document.getElementById('nextOrFinishBtn');
    const progressText   = document.getElementById('progressText');
    const countdownTimer = document.getElementById('countdownTimer');
    const progressBar    = document.getElementById('progressBar');
    const backToExamBtn  = document.getElementById('backToExamBtn');
    const finishedTitle  = document.getElementById('finishedTitle');
    const finishedMessage = document.getElementById('finishedMessage');
    const globalAlert    = document.getElementById('globalAlert');
    const alertCloseBtn  = document.getElementById('alertCloseBtn');

    function getStorageKey(type) {
      if (!currentStudent) return null;
      return 'exam_' + EXAM_DATA.examTitle + '_' + currentStudent + '_' + type;
    }

    function toPersianDigits(str) {
      return (str + '').replace(/\\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
    }
    function convertDigitsToPersianInsideContainer(container) {
      if (!container) return;
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while ((node = walker.nextNode())) {
        if (/\\d/.test(node.nodeValue)) {
          node.nodeValue = toPersianDigits(node.nodeValue);
        }
      }
    }
    function renderMathWithPersianDigits(container) {
      if (typeof renderMathInElement === 'undefined') return;
      try {
        renderMathInElement(container, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\\\(', right: '\\\\)', display: false},
            {left: '\\\\[', right: '\\\\]', display: true}
          ],
          throwOnError: false
        });
        convertDigitsToPersianInsideContainer(container);
      } catch (e) { console.error(e); }
    }

    alertCloseBtn?.addEventListener('click', () => {
      globalAlert.style.display = 'none';
    });

    function renderProgress() {
      progressBar.innerHTML = '';
      for (let i = 0; i < totalPanels; i++) {
        const dot = document.createElement('button');
        dot.className = 'progress-dot' + (visitedPanels[i] ? ' visited' : '');
        dot.textContent = toPersianDigits(i + 1);
        dot.dataset.index = i;
        dot.addEventListener('click', () => showPanel(parseInt(dot.dataset.index)));
        progressBar.appendChild(dot);
      }
    }

    function showPanel(index) {
      const panels = questionsContainer.querySelectorAll('.question-panel');
      if (!panels.length) return;
      currentPanelIndex = Math.max(0, Math.min(index, panels.length - 1));
      
      visitedPanels[currentPanelIndex] = true;
      renderProgress();

      panels.forEach((p, i) => {
        p.classList.toggle('active', i === currentPanelIndex);
      });
      
      prevBtn.disabled = (currentPanelIndex === 0);
      const isLast = (currentPanelIndex === panels.length - 1);
      nextOrFinishBtn.textContent = isLast ? 'پایان آزمون' : 'بعدی';
      nextOrFinishBtn.className = 'nav-btn' + (isLast ? ' finish-btn' : '');
      nextOrFinishBtn.disabled = false;
      
      progressText.textContent = toPersianDigits('سوال ' + (currentPanelIndex+1) + ' از ' + panels.length);
    }

    function showScreen(screen) {
      [loginScreen, waitingScreen, quizScreen, finishedScreen].forEach(s => s.classList.remove('active'));
      screen.classList.add('active');
    }

    function releaseWakeLock() {
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
        wakeLockSentinel = null;
      }
    }

    function lockExam() {
      if (isLocked) return;
      isLocked = true;
      releaseWakeLock();
      clearInterval(timerInterval);
      clearInterval(countdownInterval);
      if (screenshotPreventionInstance && typeof screenshotPreventionInstance.destroy === 'function') {
        screenshotPreventionInstance.destroy();
      }
      const lockKey = getStorageKey('lock');
      if (lockKey) localStorage.setItem(lockKey, 'true');
      // نمایش لایه قفل
      const overlay = document.createElement('div');
      overlay.className = 'lock-overlay';
      overlay.innerHTML = '<div class="lock-message"><h2>آزمون قفل شد</h2><p>شما بیش از حد مجاز از صفحه خارج شده‌اید و دیگر امکان ادامه آزمون وجود ندارد.</p><button class="btn" onclick="this.closest(".lock-overlay").remove()">متوجه شدم</button></div>';
      document.body.appendChild(overlay);
    }

    function showExitWarning(count, limit) {
      if (isLocked) return;
      const msg = limit === null || limit === undefined
        ? 'شما ' + toPersianDigits(count) + ' بار از صفحه خارج شده‌اید. (بدون محدودیت)'
        : 'شما ' + toPersianDigits(count) + ' بار از صفحه خارج شده‌اید. تعداد مجاز: ' + toPersianDigits(limit);
      
      if (screenshotPreventionInstance && screenshotPreventionInstance.update) {
        screenshotPreventionInstance.update({ warningMessage: msg });
        screenshotPreventionInstance.handleDetection('exit', 'exit count warning');
      } else {
        // Fallback: یک هشدار ساده
        alert(msg);
      }
    }

    function checkAndApplyLock() {
      if (!currentStudent) return;
      const lockKey = getStorageKey('lock');
      if (lockKey && localStorage.getItem(lockKey) === 'true') {
        lockExam();
        return true;
      }
      return false;
    }

    function updateExitCount(newCount) {
      exitCount = newCount;
      const countKey = getStorageKey('exitCount');
      if (countKey) localStorage.setItem(countKey, exitCount);
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        wasHidden = true;
      } else {
        if (wasHidden) {
          wasHidden = false;
          if (isLocked) return;
          updateExitCount(exitCount + 1);
          const allowed = EXAM_DATA.allowedExits;
          showExitWarning(exitCount, allowed);
          if (allowed !== null && exitCount >= allowed) {
            lockExam();
          }
        }
      }
    }

    function lockQuiz() {
      clearInterval(timerInterval);
      clearInterval(countdownInterval);
      prevBtn.disabled = true;
      nextOrFinishBtn.disabled = true;
      if (screenshotPreventionInstance && typeof screenshotPreventionInstance.destroy === 'function') {
        screenshotPreventionInstance.destroy();
      }
    }

    function showFinishPrompt(timeUp) {
      lockQuiz();
      releaseWakeLock();
      if (timeUp) {
        finishedTitle.textContent = 'زمان آزمون به پایان رسید';
        if (examParticipated) {
          finishedMessage.textContent = 'پاسخ‌های خود را به معلم در ایتا ارسال کنید.';
        } else {
          finishedMessage.textContent = 'شما در آزمون شرکت نکردید.';
        }
        backToExamBtn.style.display = 'none';
      } else {
        finishedTitle.textContent = 'شما آزمون را زودتر به پایان رساندید';
        finishedMessage.textContent = 'تصویر سوالات و پاسخ‌های خود را به معلم در ایتا ارسال کنید.';
        backToExamBtn.style.display = 'block';
      }
      showScreen(finishedScreen);
    }

    function endExamDueToTime() {
      clearInterval(timerInterval);
      showFinishPrompt(true);
    }

    function finishExam() {
      if (timerInterval) clearInterval(timerInterval);
      showFinishPrompt(false);
    }

    nextOrFinishBtn.addEventListener('click', () => {
      const isLast = (currentPanelIndex === totalPanels - 1);
      if (isLast) {
        finishExam();
      } else {
        showPanel(currentPanelIndex + 1);
      }
    });

    prevBtn.addEventListener('click', () => {
      showPanel(currentPanelIndex - 1);
    });

    backToExamBtn.addEventListener('click', () => {
      if (checkAndApplyLock()) return;
      prevBtn.disabled = true;
      nextOrFinishBtn.disabled = false;
      showPanel(currentPanelIndex);
      showScreen(quizScreen);
      startTimer();
      activateScreenshotPrevention();
    });

    startBtn.addEventListener('click', () => {
      const name = nameSelect.value;
      if (!name) {
        alert('لطفاً نام خود را انتخاب کنید.');
        return;
      }
      if (!EXAM_DATA.studentSections[name]) {
        alert('نام انتخاب‌شده معتبر نیست.');
        return;
      }
      currentStudent = name;
      examParticipated = true;
      document.getElementById('studentNameDisplay').textContent = name;

      // بررسی قفل شدن از پیش
      if (checkAndApplyLock()) {
        return;
      }

      // بازیابی تعداد خروج قبلی
      const countKey = getStorageKey('exitCount');
      exitCount = countKey ? parseInt(localStorage.getItem(countKey) || '0') : 0;

      // هشدار اولیه
      const allowed = EXAM_DATA.allowedExits;
      const limitMsg = allowed === null ? 'نامحدود' : toPersianDigits(allowed);
      alert('شما حق خروج از صفحه را ندارید. تعداد دفعات مجاز: ' + limitMsg + '\\n(خروج از صفحه و بازگشت، یک تخلف محسوب می‌شود)');

      startExamNow();
    });

function startCountdown() {
  const start = new Date(EXAM_DATA.startTime).getTime();
  function update() {
    const diff = Math.max(0, start - Date.now());
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    function _format(t){
     return toPersianDigits(String(t).padStart(2, '0'))
     }

    const displayString = _format(hours) + ":"+ _format(minutes) + ":" + _format(seconds);

    countdownTimer.textContent = displayString;

    if (diff <= 0) {
      clearInterval(countdownInterval);
      showScreen(loginScreen);
    }
  }
  update();
  countdownInterval = setInterval(update, 1000);
}

    function activateScreenshotPrevention() {
      if (typeof EnhancedScreenshotPrevention === 'undefined') return;
      try {
        if (screenshotPreventionInstance && typeof screenshotPreventionInstance.destroy === 'function') {
          screenshotPreventionInstance.destroy();
        }
        screenshotPreventionInstance = new EnhancedScreenshotPrevention({
          blurIntensity: '12px',
          warningMessage: 'اسکرین‌شات و خروج از صفحه مجاز نیست.',
          preventCopy: true,
          preventInspect: true,
          recoveryDelay: 3000,
          debug: false,
        });
      } catch (e) {
        console.warn('خطا در فعال‌سازی محافظ اسکرین‌شات:', e);
      }
    }

    function requestWakeLock() {
      if ('wakeLock' in navigator) {
        navigator.wakeLock.request('screen').then(sentinel => {
          wakeLockSentinel = sentinel;
        }).catch(() => {});
      }
    }

    function startExamNow() {
      clearInterval(countdownInterval);
      showScreen(quizScreen);
      questionsContainer.innerHTML = EXAM_DATA.studentSections[currentStudent] || '<p>سوالی یافت نشد.</p>';
      renderMathWithPersianDigits(questionsContainer);

      totalPanels = questionsContainer.querySelectorAll('.question-panel').length;
      visitedPanels = new Array(totalPanels).fill(false);
      
      if (totalPanels > 0) {
        showPanel(0);
      } else {
        progressText.textContent = 'سوالی موجود نیست';
      }
      renderProgress();
      startTimer();
      activateScreenshotPrevention();
      requestWakeLock();
      // شروع گوش دادن به تغییر visibility برای خروج
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    function startTimer() {
      if (timerInterval) clearInterval(timerInterval);
      const end = new Date(EXAM_DATA.endTime).getTime();
      function tick() {
        const remaining = Math.max(0, end - Date.now());
        const secs = Math.floor(remaining / 1000);
        const min = Math.floor(secs / 60);
        const sec = secs % 60;
        timeDisplay.textContent = toPersianDigits(min) + ':' + toPersianDigits(String(sec).padStart(2,'0'));
        if (remaining <= 0) {
          endExamDueToTime();
        }
      }
      tick();
      timerInterval = setInterval(tick, 1000);
    }

    (function init() {
      const now = Date.now();
      const start = new Date(EXAM_DATA.startTime).getTime();
      const end = new Date(EXAM_DATA.endTime).getTime();

      if (now < start) {
        showScreen(waitingScreen);
        startCountdown();
      } else if (now >= start && now < end) {
        showScreen(loginScreen);
      } else {
        finishedTitle.textContent = 'زمان آزمون به پایان رسیده است';
        finishedMessage.textContent = 'دیگر نمی‌توانید در آزمون شرکت کنید.';
        backToExamBtn.style.display = 'none';
        showScreen(finishedScreen);
      }
    })();
  </script>
</body>
</html>`;

  return html;
}

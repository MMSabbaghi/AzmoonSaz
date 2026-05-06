//  Screenshot Prevention
const SCREENSHOT_PREVENTION = `(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.ScreenshotPrevention = factory());
})(this, (function () { 'use strict';

    typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
        var e = new Error(message);
        return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
    };

    class EnhancedScreenshotPrevention {
        constructor(options = {}) {
            this.options = {
                onAttempt: null,
                preventCopy: true,
                preventInspect: true
            };
            this.state = {
                attemptCount: 0,
                lastVisibilityChange: 0,
                mousePosition: { x: 0, y: 0 }
            };
            this._listeners = [];

            if (EnhancedScreenshotPrevention.instance) {
                return EnhancedScreenshotPrevention.instance;
            }
            this.validateEnvironment();
            this.initializeOptions(options);
            this.setup();
            EnhancedScreenshotPrevention.instance = this;
            return this;
        }

        validateEnvironment() {
            if (typeof window === 'undefined') {
                throw new Error('EnhancedScreenshotPrevention requires a browser environment');
            }
        }

        initializeOptions(options) {
            Object.assign(this.options, options);
        }

        setup() {
            this.setupEventListeners();
            this.setupMediaProtection();
            if (this.options.preventInspect) {
                this.setupDevToolsDetection();
            }
        }

        setupEventListeners() {
            const eventOptions = { passive: true };

            const keyHandler = this.handleKeyboardEvent.bind(this);
            document.addEventListener('keydown', keyHandler, eventOptions);
            this._listeners.push({ target: document, type: 'keydown', handler: keyHandler });

            const visHandler = this.handleVisibilityChange.bind(this);
            document.addEventListener('visibilitychange', visHandler, eventOptions);
            this._listeners.push({ target: document, type: 'visibilitychange', handler: visHandler });

            const mouseHandler = this.handleMouseMove.bind(this);
            document.addEventListener('mousemove', mouseHandler, eventOptions);
            this._listeners.push({ target: document, type: 'mousemove', handler: mouseHandler });

            if ('visualViewport' in window && window.visualViewport) {
                const vpHandler = this.debounce(this.handleViewportResize.bind(this), 100);
                window.visualViewport.addEventListener('resize', vpHandler, eventOptions);
                this._listeners.push({ target: window.visualViewport, type: 'resize', handler: vpHandler });
            }

            if (this.options.preventCopy) {
                const blockEvent = (e) => {
                    e.preventDefault();
                    this.handleDetection('copyAttempt', 'Copy/Cut/ContextMenu attempt');
                    return false;
                };
                ['copy', 'cut', 'contextmenu'].forEach(evt => {
                    document.addEventListener(evt, blockEvent, false);
                    this._listeners.push({ target: document, type: evt, handler: blockEvent });
                });
            }
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
            if (!window.visualViewport) return;
            const viewportWidth = window.visualViewport.width;
            const windowWidth = window.outerWidth;
            if (Math.abs(viewportWidth - windowWidth) > 50) {
                this.handleDetection('mobile', 'Mobile screenshot detected');
            }
        }

        handleDetection(method, details) {
            this.state.attemptCount++;
            if (this.options.onAttempt) {
                this.options.onAttempt({
                    count: this.state.attemptCount,
                    method,
                    timestamp: Date.now(),
                    details
                });
            }
        }

        setupMediaProtection() {
            if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices.getDisplayMedia = (...args) => {
                    this.handleDetection('screenCapture', 'Screen capture attempted');
                    return Promise.reject(new Error('Screen capture is not allowed'));
                };
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
            const resizeHandler = () => {
                window.clearTimeout(devToolsTimeout);
                devToolsTimeout = window.setTimeout(checkDevTools, 100);
            };
            window.addEventListener('resize', resizeHandler);
            this._listeners.push({ target: window, type: 'resize', handler: resizeHandler });
        }

        debounce(fn, delay) {
            let timeoutId;
            return (...args) => {
                window.clearTimeout(timeoutId);
                timeoutId = window.setTimeout(() => fn.apply(this, args), delay);
            };
        }

        destroy() {
            this._listeners.forEach(({ target, type, handler }) => {
                target.removeEventListener(type, handler);
            });
            this._listeners = [];
            EnhancedScreenshotPrevention.instance = null;
        }

        getAttemptCount() {
            return this.state.attemptCount;
        }

        reset() {
            this.state.attemptCount = 0;
        }
    }

    EnhancedScreenshotPrevention.instance = null;

    if (typeof window !== 'undefined') {
        window.EnhancedScreenshotPrevention = EnhancedScreenshotPrevention;
    }

    return EnhancedScreenshotPrevention;
}));
//# sourceMappingURL=screenshot-prevention.js.map`;

async function buildInteractiveExamPage({
  studentNames,
  studentSections,
  startTime,
  endTime,
  startTimeDisplay,
  examTitle,
  examDuration,
  randomize = false,
  questionAlert = "",
  maxExitDurationMinutes = null,
  digiFormId = null,
}) {
  const finalAlert = questionAlert.trim() || "";
  const namesJson = JSON.stringify(studentNames);
  const sectionsJson = JSON.stringify(studentSections);
  const startTimeIso = startTime.toISOString();
  const endTimeIso = endTime.toISOString();

  const [katexCss, katexJs, autoRenderJs] = await Promise.all([
    fetch("../utils/katex/katex.min.css").then((r) => r.text()),
    fetch("../utils/katex/katex.min.js").then((r) => r.text()),
    fetch("../utils/katex/auto-render.min.js").then((r) => r.text()),
  ]);

  let html = `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${sanitizeText(examTitle)}</title>
  <link href="https://lib.arvancloud.ir/vazir-font/33.003/Farsi-Digits-Non-Latin/fonts/ttf/Vazirmatn-FD-NL-Regular.ttf" rel="stylesheet" type="text/css" />
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
    .input-label {
      display: block;
      width: 100%;
      text-align: right;
      font-weight: 600;
      color: #334155;
      margin-bottom: 8px;
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
    .waiting-card {
      background: rgba(255,255,255,0.85);
      backdrop-filter: blur(12px);
      border-radius: 24px;
      padding: 32px 24px;
      width: 100%;
      box-shadow: 0 20px 30px rgba(0,0,0,0.08);
      border: 1px solid rgba(255,255,255,0.3);
      margin-bottom: 24px;
    }
    .waiting-card-item {
      margin: 12px 0;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1em;
      color: #1e293b;
      justify-content: center;
    }
    .waiting-card-item strong {
      color: #4f46e5;
      }
      
      .countdown-container{
        position: relative;
        width: 100%;
    }

    .countdown {
      font-size: 3em;
      font-weight: 800;
      letter-spacing: 2px;
      background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
      padding: 10px 36px;
      border-radius: 24px;
      color: #1e293b;
      box-shadow: inset 0 2px 6px rgba(0,0,0,0.05), 0 10px 20px rgba(0,0,0,0.05);
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
      min-width: 90px;
      text-align: center;
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

    .submit-answers-btn {
      margin-top: 16px;
      background: linear-gradient(135deg, #10b981, #059669) !important;
    }

    /* message overlay / box */
    .message-overlay {
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.75);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483650;
      animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .message-box {
      background: linear-gradient(135deg, #ffffff, #f8fafc);
      border-radius: 24px;
      padding: 32px 24px;
      max-width: 380px;
      width: 90%;
      text-align: center;
      box-shadow: 0 25px 40px rgba(0,0,0,0.3);
      font-family: 'Vazirmatn', sans-serif;
      animation: slideUp 0.3s ease;
    }
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .message-box p {
      font-size: 1em;
      color: #1e293b;
      line-height: 1.8;
      margin-bottom: 20px;
    }
    .message-box .btn {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white;
      border: none;
      padding: 14px 28px;
      border-radius: 14px;
      font-family: inherit;
      font-weight: 600;
      cursor: pointer;
      font-size: 1em;
      transition: all 0.2s;
      margin: 4px;
    }
    .message-box .btn:hover {
      background: linear-gradient(135deg, #4338ca, #6d28d9);
      transform: translateY(-1px);
    }

    .katex { direction: ltr; unicode-bidi: isolate; font-family: inherit !important; }
    .katex-display { text-align: center; }
    #dynamicFormContainer { width:100%; }
  </style>
  <style>${katexCss}</style>
</head>
<body>
  <div class="container">
    <div id="loginScreen" class="screen">
      <div class="header">${sanitizeText(examTitle)}</div>
      <div class="login-content">
        <label class="input-label" for="nameSelect">نام خود را انتخاب کنید</label>
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
        <div class="countdown-container">
        <p class="countdown-badge"> زمان باقی مانده تا شروع آزمون: </p>
        <div id="countdownTimer" class="countdown">--</div>
        </div>
      </div>
    </div>
    
    <div id="quizScreen" class="screen">
      <div class="quiz-header">
        <div class="header-top">
          <span class="student-name"><span id="studentNameDisplay"></span></span>
          <span class="timer"><span id="timeDisplay">--</span></span>
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
        <button id="submitAnswersBtn" class="btn submit-answers-btn" style="margin-top: 16px; background: linear-gradient(135deg, #10b981, #059669);"> ارسال پاسخ‌ها</button>
        <div class="progress-text" id="progressText"></div>
      </div>
    </div>

    <div id="finishedScreen" class="screen">
      <div class="header">${sanitizeText(examTitle)}</div>
      <div class="finished-content">
        <h3 id="finishedTitle"></h3>
        <p id="finishedMessage"></p>
      </div>
    </div>

    <div id="lockedScreen" class="screen">
      <div class="header">${sanitizeText(examTitle)}</div>
      <div class="finished-content">
        <h3 id="lockedTitle">آزمون قفل شده است</h3>
        <p id="lockedMessage">شما بیش از حد مجاز از صفحه خارج شده‌اید و دیگر قادر به ادامهٔ آزمون نیستید.</p>
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
      maxExitDurationMinutes: ${JSON.stringify(maxExitDurationMinutes)},
      examTitle: ${JSON.stringify(examTitle)},
      digiFormId: ${JSON.stringify(digiFormId)}
    };

  let currentStudent = null;
  let timerInterval = null;
  let countdownInterval = null;
  let currentPanelIndex = 0;
  let totalPanels = 0;
  let visitedPanels = [];
  let examParticipated = false;
  let screenshotPreventionInstance = null;
  let longAbsenceCount = 0;
  let isLocked = false;
  let wakeLockSentinel = null;
  let lastHiddenTime = null;
  let examInProgress = false;
  let submitModalOverlay = null;
  let graceTimerInterval = null;
  let graceSecondsRemaining = 300;
  let graceActive = false;
  let graceEndTime = null;

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
  const finishedTitle  = document.getElementById('finishedTitle');
  const finishedMessage = document.getElementById('finishedMessage');
  const globalAlert    = document.getElementById('globalAlert');
  const alertCloseBtn  = document.getElementById('alertCloseBtn');
  const lockedScreen   = document.getElementById('lockedScreen');

    function getStorageKey(type) {
      if (!currentStudent) return null;
      return 'exam_' + EXAM_DATA.examTitle + '_' + currentStudent + '_' + type;
    }

    function setParticipated() {
      examParticipated = true;
      const key = getStorageKey('participated');
      if (key) localStorage.setItem(key, 'true');
    }

    function checkParticipated() {
      const key = getStorageKey('participated');
      if (key && localStorage.getItem(key) === 'true') {
        examParticipated = true;
      }
    }

    function clearGraceStorage() {
      if (!currentStudent) return;
      localStorage.removeItem(getStorageKey('graceEndTime'));
      localStorage.removeItem(getStorageKey('graceActive'));
      graceActive = false;
      graceEndTime = null;
      if (graceTimerInterval) {
        clearInterval(graceTimerInterval);
        graceTimerInterval = null;
      }
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
      nextOrFinishBtn.textContent = 'بعدی';
      nextOrFinishBtn.className = 'nav-btn';
      nextOrFinishBtn.disabled = isLast;
      
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

    function showToastMessage(message, onDismiss = null) {
      const existing = document.querySelector('.message-overlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.className = 'message-overlay';
      const box = document.createElement('div');
      box.className = 'message-box';
      box.innerHTML = '<p>' + message + '</p><button class="btn message-btn">متوجه شدم</button>';
      
      const btn = box.querySelector('.message-btn');
      btn.addEventListener('click', () => {
        overlay.remove();
        if (onDismiss) onDismiss();
      });

      overlay.appendChild(box);
      document.body.appendChild(overlay);
    }

    function showConfirmMessage(message, onConfirm, onCancel) {
      const existing = document.querySelector('.message-overlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.className = 'message-overlay';
      const box = document.createElement('div');
      box.className = 'message-box';
      box.innerHTML = '<p>' + message + '</p>' +
        '<button class="btn confirm-yes">بله</button> ' +
        '<button class="btn confirm-no">خیر</button>';

      const yesBtn = box.querySelector('.confirm-yes');
      const noBtn = box.querySelector('.confirm-no');

      yesBtn.addEventListener('click', () => {
        overlay.remove();
        if (onConfirm) onConfirm();
      });
      noBtn.addEventListener('click', () => {
        overlay.remove();
        if (onCancel) onCancel();
      });

      overlay.appendChild(box);
      document.body.appendChild(overlay);
    }

    function lockExam() {
      if (isLocked) return;
      examInProgress = false;
      showLockedScreen();
    }

    
    function handleVisibilityChange() {
      if (submitModalOverlay && submitModalOverlay.style.display !== 'none') {
        lastHiddenTime = null;
        return;
        }
      
        if (EXAM_DATA.maxExitDurationMinutes && document.hidden) {
          lastHiddenTime = Date.now();
          } else {
          if (lastHiddenTime) {
          const hiddenDuration = Date.now() - lastHiddenTime;
          const MAX_ABSENCE_MS = (EXAM_DATA.maxExitDurationMinutes) * 60 * 1000;
          if (hiddenDuration > MAX_ABSENCE_MS) {
            longAbsenceCount++;
            const msg = 'شما بیش از ' + toPersianDigits(EXAM_DATA.maxExitDurationMinutes) +
                        ' دقیقه از صفحه خارج شدید.';
            if (longAbsenceCount >= 2) {
              showToastMessage(msg + ' آزمون قفل شد.', () => lockExam());
            } else {
              showToastMessage(msg + ' در صورت تکرار، آزمون قفل خواهد شد.');
            }
          }
          lastHiddenTime = null;
        }
      }
    }

    function showLockedScreen() {
      if (isLocked) return;
      isLocked = true;
      clearInterval(timerInterval);
      clearInterval(countdownInterval);
      releaseWakeLock();
      if (screenshotPreventionInstance) {
        screenshotPreventionInstance.destroy();
        screenshotPreventionInstance = null;
      }
      localStorage.setItem('exam_' + EXAM_DATA.examTitle + '_globalLock', 'true');
      showScreen(lockedScreen);
    }

    startBtn.addEventListener('click', () => {
      const name = nameSelect.value;
      if (!name) {
        showToastMessage('لطفاً نام خود را انتخاب کنید.');
        return;
      }
      if (!EXAM_DATA.studentSections[name]) {
        showToastMessage('نام انتخاب‌شده معتبر نیست.');
        return;
      }
      currentStudent = name;
      checkParticipated();

      const graceActiveKey = getStorageKey('graceActive');
      const graceEndKey = getStorageKey('graceEndTime');
      if (graceActiveKey && localStorage.getItem(graceActiveKey) === 'true') {
        const savedGraceEnd = parseInt(localStorage.getItem(graceEndKey));
        if (savedGraceEnd && Date.now() < savedGraceEnd) {
          showSubmitModal();
          startGraceTimerInModal(savedGraceEnd);
          return;
        } else {
          clearGraceStorage();
          showSimpleEndScreen('مهلت ارسال پاسخ به پایان رسید');
          return;
        }
      }

      document.getElementById('studentNameDisplay').textContent = name;

      const finishKey = getStorageKey('finished');
      if (finishKey && localStorage.getItem(finishKey) === 'true') {
        showToastMessage('شما پیشتر آزمون را به پایان رسانده‌اید و امکان ادامه وجود ندارد.');
        return;
      }

      if (checkAndApplyLock()) return;

      function proceedAfterPreMessage() {
        startExamNow();
      }

      examParticipated = true;
      setParticipated();

      proceedAfterPreMessage();
    });

    function startCountdown() {
      const start = new Date(EXAM_DATA.startTime).getTime();
      function update() {
        const diff = Math.max(0, start - Date.now());
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        function _format(t){ return toPersianDigits(String(t).padStart(2, '0')); }
        countdownTimer.textContent = _format(hours) + ":" + _format(minutes) + ":" + _format(seconds);
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
        if (screenshotPreventionInstance) {
          screenshotPreventionInstance.destroy();
        }
        screenshotPreventionInstance = new EnhancedScreenshotPrevention({
          preventCopy: true,
          preventInspect: true,
          onAttempt: function(details) {}
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
      if (graceTimerInterval) {
         clearInterval(graceTimerInterval);
         graceTimerInterval = null;
      }

      clearGraceStorage();
      if (submitModalOverlay) {
        submitModalOverlay.style.display = 'none';
        const timerEl = document.getElementById('graceCountdownEl');
        if (timerEl) timerEl.style.display = 'none';
      }

      examInProgress = true;
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

    function checkAndApplyLock() {
      if (!currentStudent) return false;
      const lockKey = getStorageKey('lock');
      if (lockKey && localStorage.getItem(lockKey) === 'true') {
        lockExam();
        return true;
      }
      return false;
    }

    function lockQuiz() {
      clearInterval(timerInterval);
      clearInterval(countdownInterval);
      prevBtn.disabled = true;
      nextOrFinishBtn.disabled = true;
      if (screenshotPreventionInstance) {
        screenshotPreventionInstance.destroy();
        screenshotPreventionInstance = null;
      }
    }

    function endExamDueToTime() {
      examInProgress = false;
      clearInterval(timerInterval);
      showFinishPrompt();
    }

    prevBtn.addEventListener('click', () => {
      showPanel(currentPanelIndex - 1);
    });

    nextOrFinishBtn.addEventListener('click', () => {
      if (currentPanelIndex < totalPanels - 1) {
        showPanel(currentPanelIndex + 1);
      }
    });

    const submitAnswersBtn = document.getElementById('submitAnswersBtn');
    if (submitAnswersBtn) {
      submitAnswersBtn.addEventListener('click', showSubmitModal);
    }

    function showSubmitModal() {
      if (submitModalOverlay) {
        submitModalOverlay.style.display = 'flex';
        if (graceActive) {
          const closeBtn = submitModalOverlay.querySelector('.close-submit-modal');
          if (closeBtn) closeBtn.style.display = 'none';
        }
        return;
      }

      const overlay = document.createElement('div');
      overlay.className = 'message-overlay';
      overlay.style.zIndex = '20';

      const box = document.createElement('div');
      box.className = 'message-box';
      box.style.maxWidth = '500px';
      box.style.width = '90%';
      box.style.overflowY= 'scroll';
      box.style.height= '95vh';

      let innerHtml = '';
      if (EXAM_DATA.digiFormId) {
        innerHtml = \`
          <button class="btn close-submit-modal" style="margin-top: 20px;">بازگشت به آزمون</button>
          <div id="dynamicFormContainer"></div>
        \`;
      } else {
        innerHtml = \`
          <p style="font-size:1.1rem;">📌 لطفاً پاسخ‌های خود را تا پیش از اتمام زمان آزمون برای معلم خود در <strong>ایتا</strong> ارسال کنید.</p>
          <button class="btn close-submit-modal" style="margin-top: 20px;">متوجه شدم</button>
        \`;
      }
      box.innerHTML = innerHtml;

      if (EXAM_DATA.digiFormId) {
const iframe = document.createElement('iframe');
iframe.setAttribute('id', \`IFRAME_\${EXAM_DATA.digiFormId}\`);
iframe.setAttribute('title', 'فرم آپلود پاسخ ها');
iframe.setAttribute('style', 'border: none;height:100%;width:100%');
iframe.setAttribute('width', '100%');
iframe.setAttribute('height', '1000');
iframe.setAttribute('src', \`https://iframe.digiform.ir/\${EXAM_DATA.digiFormId}?theme=white\`);
box.querySelector('#dynamicFormContainer').appendChild(iframe);
      }

      const closeBtn = box.querySelector('.close-submit-modal');
      closeBtn.addEventListener('click', () => {
          overlay.style.display = 'none';
      });

      if (graceActive) {
         closeBtn.style.display = 'none';
      }

      overlay.appendChild(box);
      document.body.appendChild(overlay);
      submitModalOverlay = overlay;
    }

    function startGraceTimerInModal(graceEnd) {
      if (!submitModalOverlay) return;
      const box = submitModalOverlay.querySelector('.message-box');
      if (!box) return;

      graceActive = true;
      graceEndTime = graceEnd;

      const closeBtn = box.querySelector('.close-submit-modal');
      if (closeBtn) closeBtn.style.display = 'none';

      let timerDiv = document.getElementById('graceCountdownEl');
      if (!timerDiv) {
        timerDiv = document.createElement('div');
        timerDiv.id = 'graceCountdownEl';
        timerDiv.style.cssText = 'font-size:1.5em; font-weight:700; margin:12px 0; color:#b91c1c;';
        box.insertBefore(timerDiv, box.firstChild);
      }
      timerDiv.style.display = 'block';

      function updateTimer() {
        const remaining = Math.max(0, graceEnd - Date.now());
        if (remaining <= 0) {
          clearInterval(graceTimerInterval);
          graceTimerInterval = null;
          clearGraceStorage();
          if (submitModalOverlay) submitModalOverlay.style.display = 'none';
          showSimpleEndScreen('مهلت ارسال پاسخ به پایان رسید');
        } else {
          const m = Math.floor(remaining / 60000);
          const s = Math.floor((remaining % 60000) / 1000);
          timerDiv.textContent = '⏳ مهلت ارسال فرم: ' +
            toPersianDigits(String(m).padStart(2,'0')) + ':' +
            toPersianDigits(String(s).padStart(2,'0'));
        }
      }

      updateTimer();
      if (graceTimerInterval) clearInterval(graceTimerInterval);
      graceTimerInterval = setInterval(updateTimer, 1000);
    }

    function showSimpleEndScreen(title) {
      finishedTitle.textContent = title;
      finishedMessage.textContent = '';
      const formafzarContainer = document.getElementById('formafzarContainer');
      if (formafzarContainer) formafzarContainer.style.setProperty('display', 'none', 'important');
      showScreen(finishedScreen);
    }

    function showFinishPrompt() {
      lockQuiz();
      releaseWakeLock();

      if (examParticipated) {
        const end = new Date(EXAM_DATA.endTime).getTime();
        const graceEnd = end + 5 * 60 * 1000;
        const now = Date.now();

        if (now < graceEnd) {
          if (currentStudent) {
            localStorage.setItem(getStorageKey('graceEndTime'), graceEnd);
            localStorage.setItem(getStorageKey('graceActive'), 'true');
          }
          showSubmitModal();
          startGraceTimerInModal(graceEnd);
          const box = submitModalOverlay?.querySelector('.message-box');
          if (box) {
            const msgDiv = document.createElement('div');
            msgDiv.style.cssText = 'font-size:1.1rem; margin-bottom:12px; color:#b91c1c;';
            msgDiv.textContent = 'زمان آزمون تمام شد. ۵ دقیقه برای ارسال آزمون زمان دارید.';
            if (!box.querySelector('.time-up-message')) {
              msgDiv.classList.add('time-up-message');
              box.insertBefore(msgDiv, box.firstChild);
            }
          }
        } else {
          clearGraceStorage();
          showSimpleEndScreen('مهلت ارسال پاسخ به پایان رسید');
        }
      } else {
        showSimpleEndScreen('آزمون به پایان رسید');
      }
    }

    function startApplication() {
      if (examInProgress && quizScreen.classList.contains('active')) {
        return;
      }

      if (localStorage.getItem('exam_' + EXAM_DATA.examTitle + '_globalLock') === 'true') {
        showLockedScreen();
        return;
      }

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
        showScreen(finishedScreen);
      }
    }

    startApplication();

    function handleBeforeUnload(e) {
  if (examInProgress) {
    e.preventDefault();
    e.returnValue = ''; 
    return '';
  }
}
  
window.addEventListener('beforeunload', handleBeforeUnload);

  </script>
</body>
</html>`;

  return html;
}

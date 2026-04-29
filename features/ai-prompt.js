// ========== AI Prompt Generator (robust) ==========
function getAIPrompt({ ranges, countPerRange }) {
  const safeCount = Math.max(1, Number.parseInt(countPerRange, 10) || 5);

  const payload = (ranges || []).map((r) => ({
    rangeId: r?.rangeId ?? undefined,
    rangeName: r?.rangeName || "بدون عنوان",
    labels: (r?.labels || []).map((l) => ({ id: String(l.id), name: l.name })),
    samples: (r?.items || []).map(({ text, labelId }) => {
      return { html: text.html, labelId: labelId ?? undefined };
    }),
  }));

  return [
    "تو یک دستیار حرفه‌ای تولید محتوای آموزشی هستی.",
    `برای هر رنج دقیقاً ${safeCount} آیتم جدید تولید کن که از نظر سبک/قالب/سطح/ساختار HTML شبیه نمونه‌های همان رنج باشد.`,
    "",
    "## محدودیت‌های محتوا (خیلی مهم)",
    "- فقط مقادیر/داده‌ها را تغییر بده (عدد، نام، تاریخ، متغیر، گزینه‌ها، ...).",
    "- ساختار HTML را مشابه نمونه‌ها نگه دار (کلاس‌ها/استایل‌ها/اسپن‌های math-inline و ...).",
    "- آیتم‌ها تکراری نمونه‌ها نباشند.",
    "",
    "## قانون labelId",
    "- اگر labels خالی نیست: برای هر آیتم دقیقاً یک labelId از همان labels[].id انتخاب کن (هیچ id جدید نساز).",
    "- اگر labels خالی است: labelId برای همه آیتم‌ها دقیقاً null باشد.",
    "",
    "## فرمت خروجی (حیاتی)",
    "- خروجی باید فقط JSON معتبر باشد (بدون هیچ متن اضافه، بدون Markdown، بدون ```).",
    "- مقدار text فقط HTML باشد.",
    "",
    "ساختار خروجی دقیقاً:",
    `{
  "ranges": [
    {
      "rangeId": "آی دی رنج بدون تغییر" ,
      "rangeName": "نام رنج بدون تغییر",
      "items": [
        {
          "text": { "html": "HTML"},
          "labelId": "آی دی لیبل آیتم بدوت تغییر در صورت وجود" ,
        }
      ]
    }
  ]
}`,
    "",
    "ورودی رنج‌ها:",
    JSON.stringify({ countPerRange: safeCount, ranges: payload }, null, 2),
    "",
    "فقط JSON معتبر خروجی بده.",
  ].join("\n");
}

// ========== Helpers==========
function stripCodeFences(s) {
  const m = String(s).match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return (m ? m[1] : s).trim();
}

function replaceSmartQuotes(s) {
  return s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
}

function removeTrailingCommas(s) {
  return s.replace(/,\s*([}$$])/g, "$1");
}

function extractFirstJsonValueString(input) {
  if (typeof input !== "string") return null;

  const text = stripCodeFences(input);

  const startObj = text.indexOf("{");
  const startArr = text.indexOf("[");
  let start = -1;

  if (startObj === -1 && startArr === -1) return null;
  if (startObj === -1) start = startArr;
  else if (startArr === -1) start = startObj;
  else start = Math.min(startObj, startArr);

  let inString = false;
  let escaped = false;
  let depthObj = 0;
  let depthArr = 0;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    } else {
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === "{") depthObj++;
      if (ch === "}") depthObj--;
      if (ch === "[") depthArr++;
      if (ch === "]") depthArr--;

      if (depthObj === 0 && depthArr === 0 && i > start) {
        return text.slice(start, i + 1).trim();
      }
    }
  }

  return null;
}

function escapeRawNewlinesInsideStrings(s) {
  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (!inString) {
      if (ch === '"') inString = true;
      out += ch;
      continue;
    }

    // inString
    if (escaped) {
      escaped = false;
      out += ch;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      out += ch;
      continue;
    }

    if (ch === '"') {
      inString = false;
      out += ch;
      continue;
    }

    // newline raw
    if (ch === "\n") {
      out += "\\n";
      continue;
    }
    if (ch === "\r") {
      out += "\\r";
      continue;
    }

    out += ch;
  }

  return out;
}

function tryParseJSONLenient(raw) {
  if (typeof raw !== "string") return null;

  const direct = raw.trim();
  try {
    return JSON.parse(direct);
  } catch {}

  const extracted = extractFirstJsonValueString(direct);
  if (!extracted) return null;

  const fixed = escapeRawNewlinesInsideStrings(
    removeTrailingCommas(replaceSmartQuotes(extracted)),
  );

  try {
    return JSON.parse(fixed);
  } catch (e) {
    return null;
  }
}

// ========== Normalization & Validation ==========
function normalizeAndValidate(parsed) {
  let rangesRaw = null;

  if (parsed && Array.isArray(parsed.ranges)) {
    rangesRaw = parsed.ranges;
  } else if (parsed && Array.isArray(parsed.items)) {
    rangesRaw = [
      {
        rangeId: parsed.rangeId,
        rangeName: parsed.rangeName || "بدون عنوان",
        items: parsed.items,
      },
    ];
  } else {
    return { ranges: [] };
  }

  const normalizedRanges = rangesRaw.map((r, idx) => {
    const rangeName = String(r?.rangeName || "");
    const rangeId = String(r?.rangeId || "");
    const itemsRaw = Array.isArray(r?.items) ? r.items : [];

    const items = [];
    for (const it of itemsRaw) {
      if (!it || typeof it !== "object") continue;

      const type =
        typeof it.type === "string" && it.type.trim()
          ? it.type.trim()
          : "descriptive";

      let html = "";

      if (
        it.text &&
        typeof it.text === "object" &&
        typeof it.text.html === "string"
      ) {
        html = it.text.html;
      }

      if (!String(html).trim()) continue;

      items.push({
        type,
        text: { html },
        labelId: it.labelId || null,
      });
    }

    return { rangeId, rangeName, items };
  });

  return { ranges: normalizedRanges };
}

// ========== Final extractJSON  ==========
function extractJSON(raw) {
  if (!raw || typeof raw !== "string") {
    throw new Error("ورودی خالی یا نامعتبر است");
  }

  const parsed = tryParseJSONLenient(raw);
  if (!parsed) {
    const candidate = extractFirstJsonValueString(raw);
    throw new Error(
      "JSON نامعتبر است یا پیدا نشد. " +
        (candidate
          ? "یک کاندید پیدا شد ولی پارس نشد (احتمالاً JSON استاندارد نیست)."
          : "هیچ بلاک JSON پیدا نشد."),
    );
  }

  const normalized = normalizeAndValidate(parsed);

  normalized.ranges = normalized.ranges
    .map((r) => ({ ...r, items: Array.isArray(r.items) ? r.items : [] }))
    .filter((r) => r.items.length > 0);

  const total = normalized.ranges.reduce((sum, r) => sum + r.items.length, 0);
  if (!total) {
    throw new Error(
      "هیچ آیتم معتبری پس از نرمال‌سازی باقی نماند (ساختار items/text احتمالاً غیرمنتظره است).",
    );
  }

  return normalized;
}

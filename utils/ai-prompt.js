// ========== AI Prompt Generator  ==========
function getAIPrompt({ ranges, countPerRange }) {
  const safeCount = Math.max(1, parseInt(countPerRange, 10) || 5);

  /**
   * ranges: Array<{
   *   rangeId?: string,
   *   rangeName: string,
   *   desc?: string,
   *   labels?: Array<{ id: string, name: string }>,
   *   samples?: Array<{
   *     html: string,        // sample HTML
   *     labelId?: string     // optional label id of sample (if exists)
   *   }>
   * }>
   */

  const payload = (ranges || []).map((r) => ({
    rangeName: r.rangeName || "بدون عنوان",
    desc: r.desc || "",
    labels: (r.labels || []).map((l) => ({ id: l.id, name: l.name })),
    // keep only meaningful samples
    samples: (r.samples || [])
      .filter(
        (s) =>
          s && (typeof s === "string" ? s.trim() : String(s.html || "").trim()),
      )
      .map((s) =>
        typeof s === "string"
          ? { html: s }
          : { html: s.html, labelId: s.labelId },
      ),
  }));

  return `تو یک دستیار حرفه‌ای تولید محتوای آموزشی هستی که باید برای چند «رنج/مبحث» به‌صورت هم‌زمان سوال/تمرین مشابه تولید کنی.

## هدف
برای هر رنج، دقیقاً ${safeCount} آیتم جدید تولید کن که از نظر «سبک، قالب، سطح دشواری، نوع درخواست، و ساختار HTML» شبیه نمونه‌های همان رنج باشد.

## محدودیت‌های محتوا (خیلی مهم)
- فقط مجاز هستی «مقادیر/داده‌ها» را تغییر دهی (مثل عدد، نام‌ها، تاریخ، مکان، متغیرها، گزینه‌ها، عبارات، داده‌های مسئله).
- سبک نوشتار، نوع سوال، و الگوی جمله‌بندی را مطابق نمونه‌ها نگه دار.
- desc (توضیح ثابت رنج) را تغییر نده؛ فقط آیتم‌ها را تولید کن.
- آیتم‌ها باید جدید باشند و تکراریِ نمونه‌ها نباشند.
- محتوای تولیدی باید مناسب همان درس/موضوع باشد (ممکن است ریاضی، علوم، فارسی، زبان، تاریخ، ... باشد).

## قانون لیبل‌ها (کلیدی)
برای هر رنج، یک لیست از labels داده شده است. تو باید برای «هر آیتم» دقیقاً یک labelId انتخاب کنی که:
1) حتماً یکی از ids موجود در labels همان رنج باشد (هیچ id جدیدی نساز).
2) از نظر معنایی با آیتم هم‌خوان باشد.
3) اگر نمونه‌ها labelId دارند، از همان الگو برای دسته‌بندی استفاده کن (یعنی تشخیص نوع سوال و انتساب به نزدیک‌ترین لیبل).

اگر در یک رنج چند لیبل داریم، تلاش کن توزیع معقولی داشته باشد (همه آیتم‌ها یک لیبل نشوند)، مگر اینکه نمونه‌ها واضحاً فقط یک لیبل را پوشش می‌دهند.

## قوانین فرمت و خروجی
- خروجی فقط و فقط JSON معتبر باشد. هیچ توضیح، متن اضافی، یا مارک‌داون ننویس.
- در text فقط HTML بده (مشابه نمونه‌ها). چیزی خارج از HTML اضافه نکن.
- اگر محتوا ریاضی بود، فرمول‌ها را با $...$ (inline) یا $$...$$ (block) بنویس.
- برای سایر درس‌ها هم HTML ساده و تمیز تولید کن (مثلاً <div class="editor-line">...</div>).

## ساختار دقیق خروجی
{
  "ranges": [
    {
      "rangeName": "نام رنج",
      "items": [
        {
          "type": "descriptive",
          "text": { "html": "HTML", "align": "RIGHT" },
          "image": null,
          "showText": true,
          "labelId": "یکی از labels[].id"
        }
      ]
    }
  ]
}

### قواعد ساختاری
- برای هر رنج، تعداد items دقیقاً ${safeCount} باشد.
- type را تا حد امکان دقیق تشخیص بده؛ اگر مطمئن نیستی "descriptive" بگذار.
- فیلد labelId اجباری است و باید معتبر باشد.
- فیلد align را مطابق نمونه‌ها (معمولاً "RIGHT") تنظیم کن.
- image را null بگذار مگر اینکه نمونه‌ها الگوی دیگری نشان دهند.
- showText را true بگذار مگر اینکه نمونه‌ها خلافش باشند.

## ورودی رنج‌ها (به همراه نمونه‌ها و لیبل‌ها)
${JSON.stringify({ countPerRange: safeCount, ranges: payload }, null, 2)}

فقط JSON معتبر خروجی بده.`;
}

// ========== JSON Extraction & Validation ==========
function safeParseJsonString(raw) {
  try {
    return JSON.parse('"' + raw + '"');
  } catch (e) {
    const fixed = raw.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
    try {
      return JSON.parse('"' + fixed + '"');
    } catch (e2) {
      return null;
    }
  }
}

function extractJSON(str) {
  if (!str || typeof str !== "string") {
    throw new Error("ورودی خالی یا نامعتبر است");
  }

  let cleaned = str.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) cleaned = codeBlockMatch[1].trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1)
    throw new Error("ساختار JSON پیدا نشد");

  const candidate = cleaned.substring(firstBrace, lastBrace + 1);
  let parsed;
  try {
    parsed = JSON.parse(candidate);
  } catch (e) {
    throw new Error("JSON نامعتبر است");
  }

  if (!parsed.items || !Array.isArray(parsed.items))
    throw new Error("ساختار items معتبر نیست");

  const validItems = parsed.items
    .filter((item) => item && item.text)
    .map((item) => {
      const type = item.type || "descriptive";
      let style =
        type === "descriptive"
          ? "white-space: pre-wrap;"
          : "white-space: normal; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;";
      return {
        type,
        text: {
          html: `<div style="${style}">${item.text}</div>`,
          align: "RIGHT",
        },
      };
    });

  if (!validItems.length) throw new Error("هیچ سوال معتبری استخراج نشد");
  return { items: validItems };
}

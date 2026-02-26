// ========== AI Prompt Generator (Strict Image-Based Replication Mode) ==========

function getAIPrompt(topic, count, type) {
  const subject =
    topic && typeof topic === "string" && topic.trim() ? topic.trim() : "";

  let lengthRule = "";
  if (type === "descriptive") {
    lengthRule = "متن می‌تواند چندخطی باشد و شامل پاراگراف باشد.";
  } else {
    lengthRule = "متن سوال باید حداکثر در دو خط نوشته شود، کوتاه و مستقیم.";
  }

  return `
شما یک طراح حرفه‌ای سوالات آموزشی هستید.

هدف:
تولید سوالاتی کاملاً مشابه سوال موجود در تصویر (در صورت وجود).

=================================
قوانین تحلیل تصویر
=================================

اگر تصویر ارسال شده است:

1) ابتدا نوع سوال را دقیقاً تشخیص بده:
- descriptive (تشریحی)
- multiple_choice (چهارگزینه‌ای)
- true_false (صحیح و غلط)
- short_answer (کوتاه پاسخ)
- fill_blank (جای خالی)
- multi_select(چند انتخابی که کاربر باید دور موارد درست خط بکشد.)
- یا هر فرم استاندارد موجود در تصویر

2) ساختار نگارشی، شماره‌گذاری، فاصله‌ها، جای خالی‌ها (........)،
نحوه نوشتن گزینه‌ها و ترتیب بخش‌ها را دقیقاً حفظ کن.

3) فقط اعداد، مقادیر عددی، اسامی یا حروف را تغییر بده.
4) سطح دشواری باید معادل تصویر باشد.
5) فرم سوال را تغییر نده.
6) نوع سوال جدید طراحی نکن.

=================================
قوانین طول سوال (بر اساس نوع "${type}")
=================================

${lengthRule}

=================================
قوانین فرمول
=================================

- فرمول‌ها باید داخل متن سوال نوشته شوند.
- از LaTeX استفاده کن.
- فرمول‌های داخل جمله با $...$
- فرمول مستقل در خط جدا با $$...$$
- آرایه جداگانه برای فرمول تولید نکن.

=================================
قوانین خروجی
=================================

1) فقط یک JSON معتبر تولید کن.
2) هیچ توضیح اضافه‌ای ننویس.
3) ساختار دقیق خروجی باید به شکل زیر باشد:

{
  "items": [
    {
      "type": "${type}",
      "text": "متن کامل سوال با رعایت قوانین بالا"
    }
  ]
}

4) تعداد آیتم‌ها دقیقاً ${count} باشد.
5) JSON کاملاً معتبر باشد.

=================================
اگر تصویر وجود نداشت:
=================================

بر اساس موضوع "${subject}" یک سوال استاندارد از نوع "${type}" طراحی کن
و قوانین طول و فرمت بالا را رعایت کن.

اکنون فقط JSON را تولید کن.
`;
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
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("ساختار JSON پیدا نشد");
  }

  const candidate = cleaned.substring(firstBrace, lastBrace + 1);

  let parsed;

  try {
    parsed = JSON.parse(candidate);
  } catch (e) {
    throw new Error("JSON نامعتبر است");
  }

  if (!parsed.items || !Array.isArray(parsed.items)) {
    throw new Error("ساختار items معتبر نیست");
  }

  const validItems = parsed.items
    .filter((item) => item && item.text)
    .map((item) => {
      const type = item.type || "descriptive";

      let style = "";

      if (type === "descriptive") {
        style = "white-space: pre-wrap;";
      } else {
        style = `
          white-space: normal;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        `;
      }

      return {
        type,
        text: {
          html: `<div style="${style}">${item.text}</div>`,
          align: "RIGHT",
        },
      };
    });

  if (!validItems.length) {
    throw new Error("هیچ سوال معتبری استخراج نشد");
  }

  return { items: validItems };
}

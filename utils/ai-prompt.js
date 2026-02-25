// ========== AI Prompt Generator ==========
function getAIPrompt(topic, count) {
  return `
لطفاً دقیقاً ${count} سوال ریاضی با موضوع "${topic}" تولید کن.

الزامات خروجی:
1. خروجی باید فقط یک شیء JSON معتبر باشد و هیچ متن دیگری قبل یا بعد از آن ننویس.
2. ساختار JSON باید به صورت زیر باشد:
{
  "items": [
    { "text": "متن سوال اول" },
    { "text": "متن سوال دوم" }
  ]
}
3. تعداد آیتم‌ها دقیقاً ${count} باشد.
4. درون رشته‌های JSON، هر کاراکتر خاص باید به درستی escape شود. مخصوصاً:
   - برای نوشتن فرمول‌های LaTeX، از **دو بک‌اسلش** استفاده کنید. مثلاً برای نوشتن \dots باید در رشته JSON "\\dots" بنویسید.
   - اگر در متن سوال از علامت نقل قول استفاده می‌کنید، آن را با \\" escape کنید.
   - از کاراکتر newline درون رشته استفاده نکنید (می‌توانید از \n استفاده کنید اما ترجیحاً از فاصله استفاده کنید).
5. فرمول‌ها می‌توانند با $...$ یا $$...$$ نوشته شوند.
6. اطمینان حاصل کنید که همه سوال‌ها واقعی و قابل حل باشند و فقط متن سوال را شامل شوند (بدون توضیح اضافه).

نمونه صحیح:
{
  "items": [
    { "text": "حاصل عبارت $(x+5)^2$ را با استفاده از اتحاد مربع دو جمله‌ای بسط دهید." },
    { "text": "عبارت $(2a-3b)^2$ را گسترش دهید و جواب را ساده کنید." },
    { "text": "جای خالی را کامل کنید: $$(m+n)^2 = m^2 + \\\\dots + n^2$$" }
  ]
}
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

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
      const validItems = parsed.items.filter(
        (item) =>
          item && typeof item.text === "string" && item.text.trim() !== "",
      );
      if (validItems.length > 0) {
        return { items: validItems };
      }
    }
  } catch (e) {
    console.log(e);
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = cleaned.substring(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
        const validItems = parsed.items.filter(
          (item) =>
            item && typeof item.text === "string" && item.text.trim() !== "",
        );
        if (validItems.length > 0) {
          return { items: validItems };
        }
      }
    } catch (e) {
      console.log(e);
    }
  }

  const textPattern = /"text"\s*:\s*"((?:\\.|[^"\\])*)"\s*(?:,|\})/g;
  const matches = [];
  let match;
  while ((match = textPattern.exec(cleaned)) !== null) {
    const rawText = match[1];
    const parsedText = safeParseJsonString(rawText);
    if (parsedText !== null && parsedText.trim() !== "") {
      matches.push({ text: parsedText });
    }
  }

  if (matches.length === 0) {
    throw new Error("هیچ آیتم معتبر پیدا نشد یا فرمت JSON نامعتبر است");
  }

  return { items: matches };
}

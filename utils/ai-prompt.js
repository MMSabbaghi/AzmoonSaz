function getAIPrompt(topic, count) {
  return `
لطفاً دقیقا ${count} سوال ریاضی با موضوع "${topic}" تولید کن.

الزامات خروجی:
1. هر آیتم باید یک سوال واقعی و قابل حل باشد. هیچ متن اضافه، تعریف درس یا توضیح تولید نشود.
2. خروجی باید فقط یک شیء JSON معتبر باشد.
3. ساختار JSON باید به شکل زیر باشد:
{
  "items": [
    { "text": "متن سوال" }
  ]
}
4. تعداد آیتم‌ها دقیقا ${count} باشد و هر آیتم فقط کلید "text" داشته باشد.
5. فرمول‌ها می‌توانند با $...$ یا $$...$$ نوشته شوند.
6. کاراکترهای خاص (^, _, {, }, (, )) نیازی به escape ندارند مگر در رشته JSON.
7. هیچ کاما یا کاراکتر اضافی در انتهای آرایه نباید باشد.
8. خروجی باید مستقیم با JSON.parse قابل استفاده و KaTeX-ready باشد.
9. مطمئن شوید همه سوال‌ها واقعی و قابل حل باشند.

نمونه خروجی صحیح:
{
  "items": [
    { "text": "حاصل عبارت $(x+5)^2$ را با استفاده از اتحاد مربع دو جمله‌ای بسط دهید." },
    { "text": "عبارت $(2a-3b)^2$ را گسترش دهید و جواب را ساده کنید." },
    { "text": "جای خالی را کامل کنید: $$(m+n)^2 = m^2 + \\\\dots + n^2$$" }
  ]
}
`;
}

function prepareJSONString(str) {
  if (typeof str !== "string") throw new Error("ورودی باید رشته باشد");

  str = str.trim();

  const first = str.indexOf("{");
  const last = str.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("JSON معتبر یافت نشد");
  }

  let jsonStr = str.substring(first, last + 1);

  // اصلاح بک‌اسلش‌ها روی خود رشته
  jsonStr = jsonStr.replace(/\\+/g, "\\\\");

  return jsonStr;
}

function extractJSON(str) {
  const jsonStr = prepareJSONString(str);

  if (!str || typeof str !== "string") {
    throw new Error("ورودی خالی یا نامعتبر است");
  }

  const textPattern = /"text"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  const validItems = [];
  let match;

  while ((match = textPattern.exec(str)) !== null) {
    const rawText = match[1];
    try {
      // اعتبارسنجی رشته با parse کوتاه
      const parsedText = JSON.parse('"' + rawText + '"');
      validItems.push({ text: parsedText });
    } catch (e) {
      console.warn("آیتم نامعتبر حذف شد:", rawText, e.message);
      continue;
    }
  }

  if (validItems.length === 0) {
    throw new Error("هیچ آیتم معتبر پیدا نشد یا فرمت JSON نامعتبر است");
  }

  return { items: validItems };
}

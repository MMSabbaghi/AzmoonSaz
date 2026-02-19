function getAIPrompt(topic, count) {
  let prompt = `لطفاً دقیقا ${count} سوال ریاضی با موضوع "${topic}" تولید کن.

الزامات خروجی:

1. هر آیتم باید یک سوال واقعی و قابل حل باشد. هیچ متن اضافه، تعریف درس یا توضیح تولید نشود.
2. خروجی فقط یک شیء JSON معتبر باشد.
3. ساختار JSON:
{
  "items": [
    { "text": "متن سوال" }
  ]
}
4. تعداد آیتم‌ها دقیقا ${count} باشد و هر آیتم فقط کلید "text" داشته باشد.
5. فرمول‌ها با $...$ یا $$...$$ باشند.
6. همه بک‌اسلش‌های LaTeX دوبل شوند (\\\\frac, \\\\dots, \\\\sqrt و غیره).
7. کاراکترهای خاص (^, _, {, }, (, )) نیازی به escape ندارند مگر در رشته JSON.
8. هیچ کاما یا کاراکتر اضافی در انتهای آرایه نباشد.
9. خروجی باید مستقیم با JSON.parse قابل استفاده و KaTeX-ready باشد.
10. مطمئن شو همه سوال‌ها واقعی و قابل حل باشند.

نمونه خروجی صحیح:
{
  "items": [
    { "text": "حاصل عبارت $(x+5)^2$ را با استفاده از اتحاد مربع دو جمله‌ای بسط دهید." },
    { "text": "عبارت $(2a-3b)^2$ را گسترش دهید و جواب را ساده کنید." },
    { "text": "جای خالی را کامل کنید: $$(m+n)^2 = m^2 + \\\\dots + n^2$$" }
  ]
}

نمونه خروجی نادرست:
{
  "items": [
    { "text": "حاصل عبارت $(x+5)^2$ را با استفاده از اتحاد مربع دو جمله‌ای بسط دهید." },
    { "text": "جای خالی را کامل کنید: $$(m+n)^2 = m^2 + \\dots + n^2$$" },
    { "text": "درستی تساوی زیر را بررسی کنید: $$(3x+4)^2 = 9x^2 + 24x + 16$$," }
  ]
}

توضیح:
- در نمونه نادرست، \\\\dots بک‌اسلشش دوبل نشده است.
- در یکی از موارد، یک کاما اضافی بعد از آخرین عنصر آرایه وجود دارد که JSON را نامعتبر می‌کند.
- این باعث می‌شود KaTeX نتواند فرمول‌ها را رندر کند.`;

  return prompt;
}

function extractJSON(str) {
  if (typeof str !== "string") throw new Error("ورودی باید رشته باشد");

  str = str.trim();

  const first = str.indexOf("{");
  const last = str.lastIndexOf("}");

  if (first === -1 || last === -1 || last <= first) {
    throw new Error("JSON معتبر یافت نشد");
  }

  let jsonStr = str.substring(first, last + 1);

  let obj;
  try {
    obj = JSON.parse(jsonStr);
    console.log(obj);
  } catch (e) {
    throw new Error("JSON نامعتبر: " + e.message);
  }

  // console.log(obj);

  // obj.items = obj.items.map((item) => {
  //   if (!item.text) return item;

  //   const regex = /(?<!\\)\\[a-zA-Z]+/g; // دستورات LaTeX با بک‌اسلش تنها
  //   if (regex.test(item.text)) {
  //     item.text = item.text.replace(/(?<!\\)\\/g, "\\\\"); // دوبل کردن بک‌اسلش
  //   }

  //   return item;
  // });
  console.log(obj);

  return obj;
}

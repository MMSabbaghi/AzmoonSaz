// ========== AI Prompt Generator ==========
function getAIPrompt(topic, count, hasImage = false) {
  if (hasImage) {
    return `
من یک تصویر از یک سوال ریاضی به شما می‌دهم. لطفاً با توجه به آن تصویر، دقیقاً ${count} سوال مشابه با اعداد متفاوت تولید کنید.

الزامات خروجی:
1. خروجی باید فقط یک شیء JSON معتبر باشد و هیچ متن دیگری قبل یا بعد از آن ننویس.
2. ساختار JSON باید به صورت زیر باشد:
{
  "items": [
    {
      "text": "متن سوال اصلی",
      "formulas": ["فرمول اول", "فرمول دوم", ...]
    }
  ]
}
3. تعداد آیتم‌ها دقیقاً ${count} باشد.
4. سوالات باید کاملاً مشابه نمونه تصویر باشند، فقط اعداد تغییر کنند.
5. اگر سوال چند فرمول دارد، همه را در آرایه formulas قرار بده.
6. فرمول‌ها باید با فرمت LaTeX نوشته شوند (بدون علامت $).
7. متن سوال می‌تواند خالی باشد اگر فقط فرمول‌ها مهم هستند.

نمونه ساختار خروجی:
{
  "items": [
    {
      "text": "اتحادهای زیر را گسترش دهید:",
      "formulas": ["(a+5)^2", "(b-3)^2", "x^2 - 9"]
    }
  ]
}
`;
  } else {
    return `
لطفاً دقیقاً ${count} سوال ریاضی با موضوع "${topic}" تولید کن.

الزامات خروجی:
1. خروجی باید فقط یک شیء JSON معتبر باشد و هیچ متن دیگری قبل یا بعد از آن ننویس.
2. ساختار JSON باید به صورت زیر باشد:
{
  "items": [
    {
      "text": "متن سوال اصلی",
      "formulas": ["فرمول اول", "فرمول دوم", ...]
    }
  ]
}
3. تعداد آیتم‌ها دقیقاً ${count} باشد.
4. اگر سوال چند فرمول دارد، همه را در آرایه formulas قرار بده.
5. فرمول‌ها باید با فرمت LaTeX نوشته شوند (بدون علامت $).
6. متن سوال می‌تواند خالی باشد اگر فقط فرمول‌ها مهم هستند.

نمونه صحیح:
{
  "items": [
    {
      "text": "اتحادهای زیر را گسترش دهید:",
      "formulas": ["(a+b)^2", "(a-b)^2", "a^2 - b^2"]
    },
    {
      "text": "حاصل عبارات زیر را بدست آورید:",
      "formulas": ["(x+2)^2", "(y-3)^2", "m^2 - n^2"]
    }
  ]
}
`;
  }
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
      // تبدیل به فرمت مورد نظر با فرمت‌بندی آماده
      const validItems = parsed.items
        .filter((item) => item && (item.text || item.formulas))
        .map((item) => {
          let finalHTML = "";

          // اگر فرمت جدید با formulas داریم
          if (
            item.formulas &&
            Array.isArray(item.formulas) &&
            item.formulas.length > 0
          ) {
            // اضافه کردن متن اصلی
            if (
              item.text &&
              typeof item.text === "string" &&
              item.text.trim() !== ""
            ) {
              finalHTML += `<div>${item.text}</div>`;
            }

            // اضافه کردن فرمول‌ها هر کدام در یک خط جدا با تراز چپ
            item.formulas.forEach((formula) => {
              finalHTML += `<div style="text-align: left; margin: 5px 0;">= $${formula}$</div>`;
            });
          }
          // اگر فرمت قدیمی بود (فقط text با فرمول داخلش)
          else if (item.text && typeof item.text === "string") {
            // استخراج فرمول‌ها از متن (هر چی بین $ هست)
            const formulaRegex = /\$([^$]+)\$/g;
            const formulas = [];
            let match;
            while ((match = formulaRegex.exec(item.text)) !== null) {
              formulas.push(match[1].trim());
            }

            // حذف فرمول‌ها از متن اصلی
            let cleanText = item.text.replace(/\$[^$]+\$/g, "").trim();

            // اضافه کردن متن اصلی
            if (cleanText !== "") {
              finalHTML += `<div>${cleanText}</div>`;
            } else if (formulas.length > 0) {
              finalHTML += `<div>عبارت زیر را حل کنید:</div>`;
            }

            // اضافه کردن فرمول‌ها
            formulas.forEach((formula) => {
              finalHTML += `<div style="text-align: left; margin: 5px 0;">= $${formula}$</div>`;
            });
          }

          // اگر هیچ فرمولی نداریم ولی متن داریم
          if (finalHTML === "" && item.text) {
            finalHTML = `<div>${item.text}</div>`;
          }

          return {
            text: {
              html: finalHTML,
              align: "RIGHT",
            },
          };
        })
        .filter((item) => item.text.html !== "");

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
        const validItems = parsed.items
          .filter((item) => item && (item.text || item.formulas))
          .map((item) => {
            let finalHTML = "";

            if (
              item.formulas &&
              Array.isArray(item.formulas) &&
              item.formulas.length > 0
            ) {
              if (
                item.text &&
                typeof item.text === "string" &&
                item.text.trim() !== ""
              ) {
                finalHTML += `<div>${item.text}</div>`;
              }

              item.formulas.forEach((formula) => {
                finalHTML += `<div style="text-align: left; margin: 5px 0;">= $${formula}$</div>`;
              });
            } else if (item.text && typeof item.text === "string") {
              const formulaRegex = /\$([^$]+)\$/g;
              const formulas = [];
              let match;
              while ((match = formulaRegex.exec(item.text)) !== null) {
                formulas.push(match[1].trim());
              }

              let cleanText = item.text.replace(/\$[^$]+\$/g, "").trim();

              if (cleanText !== "") {
                finalHTML += `<div>${cleanText}</div>`;
              } else if (formulas.length > 0) {
                finalHTML += `<div>عبارت زیر را حل کنید:</div>`;
              }

              formulas.forEach((formula) => {
                finalHTML += `<div style="text-align: left; margin: 5px 0;">= $${formula}$</div>`;
              });
            }

            if (finalHTML === "" && item.text) {
              finalHTML = `<div>${item.text}</div>`;
            }

            return {
              text: {
                html: finalHTML,
                align: "RIGHT",
              },
            };
          })
          .filter((item) => item.text.html !== "");

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
      // استخراج فرمول‌ها از متن
      const formulaRegex = /\$([^$]+)\$/g;
      const formulas = [];
      let formulaMatch;
      while ((formulaMatch = formulaRegex.exec(parsedText)) !== null) {
        formulas.push(formulaMatch[1].trim());
      }

      const cleanText = parsedText.replace(/\$[^$]+\$/g, "").trim();

      let finalHTML = "";
      if (cleanText !== "") {
        finalHTML += `<div>${cleanText}</div>`;
      } else if (formulas.length > 0) {
        finalHTML += `<div>عبارت زیر را حل کنید:</div>`;
      }

      formulas.forEach((formula) => {
        finalHTML += `<div style="text-align: left; margin: 5px 0;">= $${formula}$</div>`;
      });

      matches.push({
        text: {
          html: finalHTML,
          align: "RIGHT",
        },
      });
    }
  }

  if (matches.length === 0) {
    throw new Error("هیچ آیتم معتبر پیدا نشد یا فرمت JSON نامعتبر است");
  }

  return { items: matches };
}

// ========== AI Prompt Generator (Unified) ==========
function getAIPrompt(options) {
  const { task } = options;

  let prompt = "تو یک دستیار هوشمند برای تولید محتوای آموزشی هستی.\n\n";

  switch (task) {
    case "extract":
      prompt += `## وظیفه: استخراج تمام سوالات از تصویر یک آزمون

تصویر یک برگه آزمون به تو داده شده است. لطفاً تمام سوالات را به صورت مجزا استخراج کن و در قالب یک آرایه JSON برگردان.

قوانین:
1. هر سوال باید شامل متن کامل سوال باشد.
2. اگر سوال چندبخشی است (مثلاً با زیرسوال‌های الف، ب، ج)، آن را به عنوان یک سوال واحد در نظر بگیر و ساختار را حفظ کن.
3. فرمول‌های ریاضی را با $...$ (داخل خط) یا $$...$$ (جدا) مشخص کن.
4. نوع سوال (تشریحی، تستی، ...) را تا حد امکان تشخیص بده و در فیلد type قرار بده.
5. خروجی JSON با فرمت زیر:
{
  "items": [
    {
      "type": "نوع سوال",
      "text": "متن کامل سوال با فرمت HTML"
    }
  ]
}

فقط JSON معتبر برگردان و هیچ توضیح اضافه‌ای ننویس.`;
      break;

    case "generate-similar":
      prompt += `## وظیفه: تولید سوالات مشابه بر اساس نمونه داده شده

یک نمونه سوال در اختیار تو قرار گرفته است. لطفاً ${options.count || 5} سوال مشابه (با تغییر اعداد، متغیرها، یا متن) تولید کن که از نظر سبک و سطح با نمونه همخوانی داشته باشند.

نمونه سوال:
${options.sampleText || ""}

نوع سوال: ${options.type || "نامشخص"}

قوانین:
1. هر سوال باید ساختاری دقیقا مشابه نمونه داشته باشد و تو فقط حق داری فرمول ها را تغییر دهی..
2. فرمول‌های ریاضی را با $...$ (داخل خط) یا $$...$$ (جدا) مشخص کن.
3. نوع سوال را در هر آیتم مشخص کن.
4. خروجی JSON با فرمت زیر:
{
  "items": [
    {
      "type": "نوع سوال",
      "text": "متن کامل سوال با فرمت HTML"
    }
  ]
}

فقط JSON معتبر برگردان و هیچ توضیح اضافه‌ای ننویس.`;
      break;

    case "extract-from-text":
      prompt += `## وظیفه: استخراج تمام سوالات از متن یک آزمون

متن کامل آزمون در زیر آورده شده است. لطفاً تمام سوالات را به صورت مجزا استخراج کن و در قالب یک آرایه JSON برگردان.

قوانین:
1. هر سوال باید شامل متن کامل سوال باشد.
2. اگر سوال چندبخشی است، آن را به عنوان یک سوال واحد در نظر بگیر.
3. فرمول‌های ریاضی را با $...$ یا $$...$$ مشخص کن.
4. نوع سوال را در فیلد type مشخص کن.
5. خروجی JSON با فرمت استاندارد.

متن آزمون:
${options.text || ""}

فقط JSON معتبر برگردان.`;
      break;

    default:
      prompt += "وظیفه نامشخص است.";
  }

  return prompt;
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

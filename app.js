const loadBtn = document.getElementById("loadBtn");
const copyBtn = document.getElementById("copyBtn");
const source = document.getElementById("source");
const result = document.getElementById("result");
const status = document.getElementById("status");

function normalizeText(text) {
  return text.replace(/\r\n?/g, "\n");
}

function extractProductCode(text) {
  // 9자리 + 공백 + 3자리 형태를 먼저 붙여서 처리한다.
  const compact = text.replace(/([A-Z0-9]{9})\s+([A-Z0-9]{3})(?![A-Z0-9])/g, "$1$2");

  // MK... / M... / P... 의 12자리 코드.
  // M/P 계열의 실제 예외적인 짧은 접두어 오탐을 줄이기 위해
  // 전체 토큰 경계를 함께 확인한다.
  const matches = compact.match(/(?:MK|M|P)[A-Z0-9]{10,11}/g) || [];
  const codes = [];

  for (const raw of matches) {
    const code = raw.slice(0, 12);
    if (code.length === 12 && !codes.includes(code)) codes.push(code);
  }
  return codes;
}

function extractDates(lines) {
  const out = [];
  let skip = 0;

  for (let i = 0; i < lines.length; i++) {
    if (skip > 0) {
      skip--;
      continue;
    }

    const line = lines[i];

    // "판매 가능 유통/소비기한..."으로 시작하는 고정 예외 구간.
    // 해당 줄과 다음 줄(제조일자)을 건너뛴다.
    if (/판매\s*가능/.test(line)) {
      skip = 1;
      continue;
    }

    let m = line.match(/소비기한\s*[:：]?\s*(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      out.push(`소비 ${m[1].slice(2)}.${m[2]}.${m[3]} /`);
    }

    m = line.match(/제조일자\s*[:：]?\s*(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      out.push(`제조 ${m[1].slice(2)}.${m[2]}.${m[3]} /`);
    }
  }
  return out;
}

function extractLocations(text) {
  const matches = text.match(/\b11-[A-Z0-9]+(?:-[A-Z0-9]+){2,}\b/g) || [];
  const out = [];
  for (const raw of matches) {
    const loc = raw.slice(3);
    if (!out.includes(loc)) out.push(loc);
  }
  return out.map(x => `지번 ${x}`);
}

function processClipboard(text) {
  const normalized = normalizeText(text);
  const lines = normalized.split("\n");

  const products = extractProductCode(normalized);
  const dates = extractDates(lines);
  const locations = extractLocations(normalized);

  return [...products, ...dates, ...locations].join("\n");
}

loadBtn.addEventListener("click", async () => {
  status.textContent = "";
  try {
    const text = await navigator.clipboard.readText();
    source.value = text;
    result.value = processClipboard(text);
    copyBtn.disabled = !result.value;
    status.textContent = result.value ? "추출 완료" : "추출된 정보가 없습니다.";
  } catch (err) {
    status.textContent = "클립보드를 읽을 수 없습니다. Safari에서 클립보드 접근을 허용했는지 확인하세요.";
  }
});

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(result.value);
    status.textContent = "결과를 클립보드에 복사했습니다.";
  } catch (err) {
    // 일부 환경에서 clipboard API가 제한될 때를 위한 fallback
    result.focus();
    result.select();
    try {
      document.execCommand("copy");
      status.textContent = "결과를 클립보드에 복사했습니다.";
    } catch {
      status.textContent = "복사하지 못했습니다. 결과를 길게 눌러 복사하세요.";
    }
  }
});

// 앱이 https 또는 localhost에서 실행되는지 간단히 안내.
if (!window.isSecureContext) {
  status.textContent = "iPhone에서는 HTTPS 환경에서 사용하세요.";
}

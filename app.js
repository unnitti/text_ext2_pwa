const loadBtn = document.getElementById("loadBtn");
const copyBtn = document.getElementById("copyBtn");
const source = document.getElementById("source");
const result = document.getElementById("result");
const status = document.getElementById("status");

function normalizeText(text) {
  return text.replace(/\r\n?/g, "\n");
}

function extractProductCode(text) {
  // 첫 글자는 영문 대문자, 이후 영문 대문자/숫자 8자리 + 공백(줄바꿈 포함) + 3자리.
  // Live Text가 화면 폭 때문에 9자리와 마지막 3자리를 서로 다른 줄로 인식해도
  // \s+가 줄바꿈까지 포함하므로 하나의 상품코드로 결합한다.
  const codePattern = /(^|[^A-Z0-9])([A-Z][A-Z0-9]{8})\s+([A-Z0-9]{3})(?![A-Z0-9])/g;
  const codes = [];

  for (const match of text.matchAll(codePattern)) {
    const code = match[2] + match[3];
    if (!codes.includes(code)) codes.push(code);
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

function runExtraction(text) {
  source.value = text;
  result.value = processClipboard(text);
  copyBtn.disabled = !result.value;
  status.textContent = result.value ? "추출 완료" : "추출된 정보가 없습니다.";
}

// 직접 붙여넣기(길게 눌러서 붙여넣기 등): 시스템 권한 확인창 없이 즉시 처리됨
source.addEventListener("input", () => {
  runExtraction(source.value);
});

// 버튼은 대안 경로로 유지 (환경에 따라 붙여넣기가 안 될 때 사용)
loadBtn.addEventListener("click", async () => {
  status.textContent = "";
  try {
    const text = await navigator.clipboard.readText();
    runExtraction(text);
  } catch (err) {
    status.textContent = "클립보드를 읽을 수 없습니다. 위 입력창을 길게 눌러 직접 붙여넣어 보세요.";
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

// 단축어 등에서 #t=인코딩된텍스트 형태로 열었을 때, 붙여넣기 없이 바로 처리.
// 쿼리(?)가 아니라 프래그먼트(#)를 쓰는 이유: #뒤는 서버로 전송되지 않아서
// 서버/네트워크 쪽 URL 길이 제한과 무관해짐 (텍스트가 길어도 잘릴 위험이 훨씬 줄어듦).
// 단축어 등에서 #t=인코딩된텍스트 형태로 열었을 때, 붙여넣기 없이 바로 처리.
function autoLoadFromURL() {
  const hash = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;
  const params = new URLSearchParams(hash);
  const t = params.get("t");

  if (t) {
    runExtraction(t);
    // 주소창에 원문이 그대로 남지 않도록 정리
    history.replaceState(null, "", location.pathname);
  }
}

autoLoadFromURL();
window.addEventListener("hashchange", autoLoadFromURL);

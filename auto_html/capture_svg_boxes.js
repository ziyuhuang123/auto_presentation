#!/usr/bin/env node

const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      args[key.slice(2)] = true;
      continue;
    }
    args[key.slice(2)] = value;
    i += 1;
  }
  return args;
}

function ensureAbsoluteFile(filePath, label) {
  if (!filePath) throw new Error(`Missing required argument: ${label}`);
  const absolute = path.resolve(filePath);
  if (!fs.existsSync(absolute)) throw new Error(`${label} not found: ${absolute}`);
  return absolute;
}

function mkdirp(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function slugify(text, fallback) {
  const slug = String(text || "")
    .normalize("NFKD")
    .replace(/[^\w\s-]+/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return slug || fallback;
}

function findChrome(customPath) {
  const candidates = [];
  if (customPath) candidates.push(path.resolve(customPath));
  candidates.push(
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  );
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  throw new Error("No supported Chrome/Edge executable found. Pass --chrome explicitly.");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(endpoint, retries = 100, intervalMs = 200) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) return await res.json();
    } catch {}
    await sleep(intervalMs);
  }
  throw new Error(`Failed to fetch endpoint: ${endpoint}`);
}

async function connectChromeDevtools(port) {
  const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
  const page = targets.find((target) => target.type === "page");
  if (!page) throw new Error("No page target found in Chrome DevTools.");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let nextId = 0;
  const pending = new Map();

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const handler = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) handler.reject(new Error(message.error.message));
    else handler.resolve(message.result || {});
  };

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  return { ws, send };
}

async function waitForDocumentReady(send, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await send("Runtime.evaluate", {
      expression: "document.readyState",
      returnByValue: true,
    });
    if (result.result && result.result.value === "complete") return;
    await sleep(200);
  }
  throw new Error("Timed out waiting for document.readyState=complete");
}

async function captureScreenshot(send, outputPath, clip) {
  const shot = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: true,
    clip,
  });
  fs.writeFileSync(outputPath, Buffer.from(shot.data, "base64"));
}

const mobileStyle = `
  html, body {
    background: linear-gradient(180deg, #f6f4ef 0%, #f1efe8 100%) !important;
  }
  .page {
    width: min(980px, calc(100vw - 20px)) !important;
    margin: 12px auto 20px !important;
  }
  .hero, .card, .footer {
    padding: 24px !important;
    border-radius: 24px !important;
  }
  .hero, .grid4, .grid3, .grid2, .metric-grid {
    grid-template-columns: 1fr !important;
  }
  .section-head {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 10px !important;
  }
  h1 { font-size: 42px !important; line-height: 1.18 !important; }
  h2 { font-size: 30px !important; line-height: 1.28 !important; }
  h3 { font-size: 24px !important; line-height: 1.35 !important; }
  .eyebrow, .tag, .chip, .big, .value, .row .label { font-size: 14px !important; }
  .lede, p, li, .note { font-size: 18px !important; line-height: 1.85 !important; }
  .item, .box { padding: 20px !important; }
  .row { grid-template-columns: 120px 1fr 72px !important; }
`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputHtml = ensureAbsoluteFile(args.input, "--input");
  const outputDir = path.resolve(args["output-dir"] || path.dirname(inputHtml));
  const prefix = args.prefix || path.basename(inputHtml, path.extname(inputHtml));
  const width = Number(args.width || 1080);
  const scale = Number(args.scale || 2);
  const delayMs = Number(args["delay-ms"] || 1500);
  const port = Number(args.port || 9360);
  const chromePath = findChrome(args.chrome);
  const fileUrl = pathToFileURL(inputHtml).href;

  if (!Number.isFinite(scale) || scale <= 0) {
    throw new Error(`Invalid --scale value: ${args.scale}`);
  }

  mkdirp(outputDir);

  const profileDir = path.join(
    os.tmpdir(),
    `codex_capture_svg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );
  mkdirp(profileDir);

  const chromeProc = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      `--remote-debugging-port=${port}`,
      "--remote-debugging-address=127.0.0.1",
      `--user-data-dir=${profileDir}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );

  let stderrBuffer = "";
  chromeProc.stderr.on("data", (chunk) => {
    stderrBuffer += String(chunk);
  });

  try {
    const { ws, send } = await connectChromeDevtools(port);
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 1200,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send("Page.navigate", { url: fileUrl });
    await waitForDocumentReady(send, 20000);
    await send("Runtime.evaluate", {
      expression: `(() => {
        const id = 'codex-capture-svg-style';
        const old = document.getElementById(id);
        if (old) old.remove();
        const style = document.createElement('style');
        style.id = id;
        style.textContent = ${JSON.stringify(mobileStyle)};
        document.head.appendChild(style);
      })()`,
    });
    await sleep(delayMs);

    const metrics = await send("Page.getLayoutMetrics");
    const pageWidth = Math.ceil(metrics.contentSize.width);
    const pageHeight = Math.ceil(metrics.contentSize.height);
    await send("Emulation.setDeviceMetricsOverride", {
      width: pageWidth,
      height: pageHeight,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await sleep(300);

    const evalRes = await send("Runtime.evaluate", {
      expression: `(() => {
        const boxes = Array.from(document.querySelectorAll('div.box')).filter(box => box.querySelector('svg'));
        return boxes.map((box, index) => {
          const heading = (box.querySelector(':scope > h3') || {}).textContent || ('diagram-' + (index + 1));
          const boxRect = box.getBoundingClientRect();
          const svgRect = box.querySelector('svg').getBoundingClientRect();
          return {
            index,
            heading,
            x: boxRect.x + window.scrollX,
            y: boxRect.y + window.scrollY,
            width: boxRect.width,
            height: (svgRect.bottom - boxRect.top) + 18
          };
        });
      })()`,
      returnByValue: true,
    });

    const boxes = (evalRes.result && evalRes.result.value) || [];
    const manifest = [];

    for (let i = 0; i < boxes.length; i += 1) {
      const box = boxes[i];
      const left = Math.max(0, Math.floor(box.x - 10));
      const top = Math.max(0, Math.floor(box.y - 10));
      const boxWidth = Math.min(pageWidth - left, Math.ceil(box.width + 20));
      const boxHeight = Math.min(pageHeight - top, Math.ceil(box.height + 16));
      const fileName = `${prefix}_diagram_${String(i + 1).padStart(2, "0")}_${slugify(box.heading, `diagram-${i + 1}`)}.png`;
      const filePath = path.join(outputDir, fileName);

      await captureScreenshot(send, filePath, {
        x: left,
        y: top,
        width: boxWidth,
        height: boxHeight,
        scale,
      });

      manifest.push({
        file: fileName,
        heading: box.heading,
        width: boxWidth,
        height: boxHeight,
        exportWidth: Math.round(boxWidth * scale),
        exportHeight: Math.round(boxHeight * scale),
        scale,
      });
    }

    const manifestPath = path.join(outputDir, `${prefix}_diagram_manifest.json`);
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          inputHtml,
          outputDir,
          pageWidth,
          pageHeight,
          scale,
          diagrams: manifest,
        },
        null,
        2
      ),
      "utf8"
    );

    ws.close();
    chromeProc.kill();
    console.log(JSON.stringify({ outputDir, diagrams: manifest }, null, 2));
  } catch (error) {
    chromeProc.kill();
    const detail = stderrBuffer.trim();
    if (detail) console.error(detail);
    throw error;
  } finally {
    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});

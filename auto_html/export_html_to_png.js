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
    if (!key.startsWith("--")) {
      continue;
    }
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
  if (!filePath) {
    throw new Error(`Missing required argument: ${label}`);
  }
  const absolute = path.resolve(filePath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`${label} not found: ${absolute}`);
  }
  return absolute;
}

function mkdirp(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function toPosixPath(filePath) {
  return filePath.replace(/\\/g, "/");
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
  if (customPath) {
    candidates.push(path.resolve(customPath));
  }
  candidates.push(
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  );

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
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
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // keep retrying
    }
    await sleep(intervalMs);
  }
  throw new Error(`Failed to fetch endpoint: ${endpoint}`);
}

async function connectChromeDevtools(port) {
  const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
  const page = targets.find((target) => target.type === "page");
  if (!page) {
    throw new Error("No page target found in Chrome DevTools.");
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let nextId = 0;
  const pending = new Map();

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) {
      return;
    }

    const handler = pending.get(message.id);
    pending.delete(message.id);

    if (message.error) {
      handler.reject(new Error(message.error.message));
    } else {
      handler.resolve(message.result || {});
    }
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
    if (result.result && result.result.value === "complete") {
      return;
    }
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

function getPresetConfig(preset) {
  if (preset === "zhihu-mobile") {
    return {
      viewportWidth: 1080,
      style: `
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
        h1 {
          font-size: 42px !important;
          line-height: 1.18 !important;
        }
        h2 {
          font-size: 30px !important;
          line-height: 1.28 !important;
        }
        h3 {
          font-size: 24px !important;
          line-height: 1.35 !important;
        }
        .eyebrow, .tag, .chip, .big, .value, .row .label {
          font-size: 14px !important;
        }
        .lede, p, li, .note {
          font-size: 18px !important;
          line-height: 1.85 !important;
        }
        .item, .box {
          padding: 20px !important;
        }
        .row {
          grid-template-columns: 120px 1fr 72px !important;
        }
      `,
      blockExpression: `(() => {
        const blocks = [];
        const hero = document.querySelector('section.hero');
        if (hero) {
          const r = hero.getBoundingClientRect();
          blocks.push({
            heading: 'intro',
            x: r.x + window.scrollX,
            y: r.y + window.scrollY,
            width: r.width,
            height: r.height
          });
        }

        for (const section of document.querySelectorAll('section.card')) {
          const sectionTitle = (section.querySelector(':scope > .section-head h2') || {}).textContent || 'section';
          const directChildren = Array.from(section.children).filter(node => {
            return !node.classList.contains('section-head');
          });

          const head = section.querySelector(':scope > .section-head');
          if (head) {
            const r = head.getBoundingClientRect();
            blocks.push({
              heading: sectionTitle + '-head',
              x: r.x + window.scrollX,
              y: r.y + window.scrollY,
              width: r.width,
              height: r.height
            });
          }

          directChildren.forEach((node, idx) => {
            const r = node.getBoundingClientRect();
            if (r.width < 40 || r.height < 40) return;
            const innerHeading = (node.querySelector('h3') || {}).textContent || '';
            blocks.push({
              heading: innerHeading || (sectionTitle + '-part-' + (idx + 1)),
              x: r.x + window.scrollX,
              y: r.y + window.scrollY,
              width: r.width,
              height: r.height
            });
          });
        }

        const footer = document.querySelector('section.footer');
        if (footer) {
          const r = footer.getBoundingClientRect();
          blocks.push({
            heading: 'footer',
            x: r.x + window.scrollX,
            y: r.y + window.scrollY,
            width: r.width,
            height: r.height
          });
        }

        return blocks;
      })()`,
    };
  }

  return {
    viewportWidth: 1400,
    style: "",
    blockExpression: `(() => {
      const nodes = Array.from(document.querySelectorAll('section.hero, section.card'));
      return nodes.map((el, index) => {
        const rect = el.getBoundingClientRect();
        const heading = (el.querySelector('h1, h2, h3') || {}).textContent || '';
        const kind = el.classList.contains('hero') ? 'intro' : 'section';
        return {
          index,
          kind,
          heading,
          x: rect.x + window.scrollX,
          y: rect.y + window.scrollY,
          width: rect.width,
          height: rect.height
        };
      });
    })()`,
  };
}

function mergeSmallBlocks(blocks, options = {}) {
  const minHeight = options.minHeight || 220;
  const maxGap = options.maxGap || 90;
  const merged = [];

  for (let i = 0; i < blocks.length; i += 1) {
    const current = { ...blocks[i] };
    if (current.height >= minHeight) {
      merged.push(current);
      continue;
    }

    const next = blocks[i + 1];
    const prev = merged[merged.length - 1];
    const currentBottom = current.y + current.height;

    if (next) {
      const gapToNext = next.y - currentBottom;
      if (gapToNext >= 0 && gapToNext <= maxGap) {
        blocks[i + 1] = {
          ...next,
          y: current.y,
          x: Math.min(current.x, next.x),
          width: Math.max(current.width, next.width),
          height: next.y + next.height - current.y,
          heading: next.heading || current.heading,
        };
        continue;
      }
    }

    if (prev) {
      const prevBottom = prev.y + prev.height;
      const gapToPrev = current.y - prevBottom;
      if (gapToPrev >= 0 && gapToPrev <= maxGap) {
        prev.height = currentBottom - prev.y;
        if (!prev.heading && current.heading) {
          prev.heading = current.heading;
        }
        continue;
      }
    }

    merged.push(current);
  }

  return merged;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const inputHtml = ensureAbsoluteFile(args.input, "--input");
  const outputDir = path.resolve(args["output-dir"] || path.dirname(inputHtml));
  const prefix = args.prefix || path.basename(inputHtml, path.extname(inputHtml));
  const preset = args.preset || "default";
  const presetConfig = getPresetConfig(preset);
  const width = Number(args.width || presetConfig.viewportWidth);
  const delayMs = Number(args["delay-ms"] || 1500);
  const port = Number(args.port || 9340);
  const chromePath = findChrome(args.chrome);
  const fileUrl = pathToFileURL(inputHtml).href;

  mkdirp(outputDir);

  const profileDir = path.join(
    os.tmpdir(),
    `codex_html_to_png_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
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
    if (presetConfig.style) {
      await send("Runtime.evaluate", {
        expression: `(() => {
          const id = 'codex-export-style';
          const old = document.getElementById(id);
          if (old) old.remove();
          const style = document.createElement('style');
          style.id = id;
          style.textContent = ${JSON.stringify(presetConfig.style)};
          document.head.appendChild(style);
        })()`,
      });
    }
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

    const fullPagePath = path.join(outputDir, `${prefix}_00_fullpage.png`);
    await captureScreenshot(send, fullPagePath, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      scale: 1,
    });

    const evalRes = await send("Runtime.evaluate", {
      expression: presetConfig.blockExpression,
      returnByValue: true,
    });

    let sections = (evalRes.result && evalRes.result.value) || [];
    if (preset === "zhihu-mobile") {
      sections = mergeSmallBlocks(sections, { minHeight: 220, maxGap: 90 });
    }
    const manifest = [];

    for (let i = 0; i < sections.length; i += 1) {
      const section = sections[i];
      const left = Math.max(0, Math.floor(section.x - 10));
      const top = Math.max(0, Math.floor(section.y - 18));
      const blockWidth = Math.min(
        pageWidth - left,
        Math.ceil(section.width + 20)
      );
      const sectionHeight = Math.min(
        pageHeight - top,
        Math.ceil(section.height + 36)
      );
      const label = slugify(
        section.heading,
        section.kind === "intro" ? "intro" : `section-${i}`
      );
      const fileName = `${prefix}_${String(i + 1).padStart(2, "0")}_${label}.png`;
      const filePath = path.join(outputDir, fileName);

      await captureScreenshot(send, filePath, {
        x: left,
        y: top,
        width: blockWidth,
        height: sectionHeight,
        scale: 1,
      });

      manifest.push({
        file: fileName,
        heading: section.heading,
        width: blockWidth,
        height: sectionHeight,
      });
    }

    const manifestPath = path.join(outputDir, `${prefix}_manifest.json`);
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          inputHtml,
          outputDir,
          preset,
          pageWidth,
          pageHeight,
          files: [`${prefix}_00_fullpage.png`, ...manifest.map((item) => item.file)],
          sections: manifest,
        },
        null,
        2
      ),
      "utf8"
    );

    ws.close();
    chromeProc.kill();

    console.log(
      JSON.stringify(
        {
          inputHtml,
          outputDir,
          preset,
          pageWidth,
          pageHeight,
          files: [`${prefix}_00_fullpage.png`, ...manifest.map((item) => item.file)],
        },
        null,
        2
      )
    );
  } catch (error) {
    chromeProc.kill();
    const detail = stderrBuffer.trim();
    if (detail) {
      console.error(detail);
    }
    throw error;
  } finally {
    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup failures
    }
  }
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});

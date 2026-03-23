const iframe = document.getElementById("drawio-frame");
const diagramPathEl = document.getElementById("diagram-path");
const saveStatusEl = document.getElementById("save-status");
const pauseReloadEl = document.getElementById("pause-reload");
const reloadButton = document.getElementById("reload-button");

const embedBaseUrl =
  "https://embed.diagrams.net/?embed=1&proto=json&spin=1&configure=1&libraries=1&saveAndExit=0&noExitBtn=1&modified=0&drafts=0&nowarn=1";

let currentXml = "";
let currentVersion = 0;
let config = null;
let reloadToken = 0;
let pendingExternalReload = false;
let editorReady = false;

function setStatus(message) {
  saveStatusEl.textContent = message;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? `HTTP ${response.status}`);
  }

  return payload;
}

async function loadFromDisk() {
  const payload = await fetchJson("/api/diagram");
  currentXml = payload.xml;
  currentVersion = payload.mtimeMs;
  diagramPathEl.textContent = payload.path;
  return payload;
}

async function saveToDisk(xml) {
  setStatus("Saving");
  const payload = await fetchJson("/api/diagram", {
    method: "PUT",
    body: JSON.stringify({ xml }),
  });
  currentXml = xml;
  currentVersion = payload.mtimeMs;
  postToEditor({
    action: "status",
    message: "Autosaved",
    modified: false,
  });
  setStatus("Autosaved");
}

function postToEditor(message) {
  iframe.contentWindow?.postMessage(JSON.stringify(message), "*");
}

function mountEditor() {
  reloadToken += 1;
  editorReady = false;
  iframe.src = "about:blank";

  window.setTimeout(() => {
    iframe.src = `${embedBaseUrl}&bridgeReload=${reloadToken}`;
  }, 20);
}

async function fullReloadFromDisk(reason = "Reloading external file change") {
  pendingExternalReload = false;
  setStatus(reason);
  await loadFromDisk();
  mountEditor();
}

async function mergeFromDisk(reason = "External change merged") {
  pendingExternalReload = false;
  setStatus(reason);
  await loadFromDisk();

  if (!editorReady) {
    mountEditor();
    return;
  }

  postToEditor({
    action: "merge",
    xml: currentXml,
  });
  postToEditor({
    action: "status",
    message: reason,
    modified: false,
  });
  setStatus(reason);
}

window.addEventListener("message", async (event) => {
  if (typeof event.data !== "string") {
    return;
  }

  let data;

  try {
    data = JSON.parse(event.data);
  } catch {
    return;
  }

  if (data.event === "configure") {
    postToEditor({
      action: "configure",
      config: {
        defaultVertexStyle: {
          fontSize: "14",
        },
        defaultEdgeStyle: {
          rounded: "0",
          edgeStyle: "orthogonalEdgeStyle",
        },
        autosaveDelay: 1000,
      },
    });
    return;
  }

  if (data.event === "init") {
    editorReady = true;
    postToEditor({
      action: "load",
      xml: currentXml,
      autosave: 1,
      modified: 0,
      title: config.diagramPath,
    });
    setStatus("Editor connected");
    return;
  }

  if (data.event === "autosave" || data.event === "save") {
    try {
      await saveToDisk(data.xml);
    } catch (error) {
      setStatus(`Save failed: ${error.message}`);
    }
    return;
  }

  if (data.event === "exit") {
    editorReady = false;
    setStatus("Editor exited");
  }
});

reloadButton.addEventListener("click", () => {
  fullReloadFromDisk("Manual reload").catch((error) => {
    setStatus(`Reload failed: ${error.message}`);
  });
});

window.setInterval(async () => {
  if (pauseReloadEl.checked || pendingExternalReload) {
    return;
  }

  try {
    const payload = await fetchJson(`/api/meta?ts=${Date.now()}`);

    if (payload.mtimeMs !== currentVersion) {
      pendingExternalReload = true;
      await mergeFromDisk("External change detected");
    }
  } catch (error) {
    setStatus(`Watch failed: ${error.message}`);
  }
}, 1000);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && !pauseReloadEl.checked) {
    mergeFromDisk("Window refocused").catch((error) => {
      setStatus(`Reload failed: ${error.message}`);
    });
  }
});

async function start() {
  try {
    config = await fetchJson("/api/config");
    await loadFromDisk();
    mountEditor();
    setStatus("Ready");
  } catch (error) {
    setStatus(`Init failed: ${error.message}`);
  }
}

start();

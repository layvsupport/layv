/** Smoke test using the same session/webview policies as electron/main.js */
import { app, BrowserWindow, session, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  LAYV_CHROME_USER_AGENT,
  AI_WEBVIEW_PARTITION,
} = require('./main.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const OUT = path.join(__dirname, '_smoke-production.json');

const AI_EMBED_HOST_SUFFIXES = [
  'chatgpt.com',
  'openai.com',
  'gemini.google.com',
  'google.com',
  'claude.ai',
  'pi.ai',
];

function hostnameMatchesAiEmbed(hostname) {
  if (!hostname) return false;
  const host = hostname.toLowerCase();
  return AI_EMBED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  );
}

function configureAiEmbedSession(targetSession) {
  const ses = targetSession || session.defaultSession;
  if (!ses || ses.__layvAiEmbedConfigured) return;
  ses.__layvAiEmbedConfigured = true;
  ses.setUserAgent(LAYV_CHROME_USER_AGENT);
  ses.webRequest.onHeadersReceived({ urls: ['https://*/*', 'http://*/*'] }, (details, callback) => {
    let hostname = '';
    try {
      hostname = new URL(details.url).hostname;
    } catch {
      callback({ responseHeaders: details.responseHeaders });
      return;
    }
    if (!hostnameMatchesAiEmbed(hostname)) {
      callback({ responseHeaders: details.responseHeaders });
      return;
    }
    const responseHeaders = { ...details.responseHeaders };
    for (const key of Object.keys(responseHeaders)) {
      const lower = key.toLowerCase();
      if (lower === 'x-frame-options') delete responseHeaders[key];
      else if (lower === 'content-security-policy' || lower === 'content-security-policy-report-only') {
        const value = Array.isArray(responseHeaders[key])
          ? responseHeaders[key].join('; ')
          : String(responseHeaders[key] || '');
        const stripped = value
          .split(';')
          .map((part) => part.trim())
          .filter((part) => part && !/^frame-ancestors\b/i.test(part))
          .join('; ');
        if (stripped) responseHeaders[key] = [stripped];
        else delete responseHeaders[key];
      }
    }
    callback({ responseHeaders });
  });
}

function configureAllAiSessions() {
  configureAiEmbedSession(session.defaultSession);
  configureAiEmbedSession(session.fromPartition(AI_WEBVIEW_PARTITION));
}

function attachWebviewPolicies(contents) {
  contents.on('will-attach-webview', (_event, webPreferences, params) => {
    webPreferences.preload = undefined;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = false;
    webPreferences.javascript = true;
    if (params.partition) configureAiEmbedSession(session.fromPartition(params.partition));
  });
  contents.on('did-attach-webview', (_event, guest) => {
    guest.setUserAgent(LAYV_CHROME_USER_AGENT);
  });
}

app.whenReady().then(async () => {
  configureAllAiSessions();
  app.on('web-contents-created', (_event, contents) => {
    attachWebviewPolicies(contents);
    contents.setWindowOpenHandler(({ url }) => {
      if (/^https?:/i.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    });
  });

  const win = new BrowserWindow({
    show: false,
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,
      webviewTag: true,
    },
  });

  await win.loadFile(path.join(root, 'index.html'));
  const testUrl = process.argv[2] || 'https://chatgpt.com/';

  const probe = await win.webContents.executeJavaScript(`
    (async () => {
      const tpl = document.getElementById('window-template');
      const node = tpl.content.firstElementChild.cloneNode(true);
      const container = node.querySelector('[data-frame-container]');
      const w = document.createElement('webview');
      w.setAttribute('src', ${JSON.stringify(testUrl)});
      w.setAttribute('partition', ${JSON.stringify(AI_WEBVIEW_PARTITION)});
      w.setAttribute('useragent', ${JSON.stringify(LAYV_CHROME_USER_AGENT)});
      w.setAttribute('allowpopups', 'true');
      w.setAttribute('webpreferences', 'contextIsolation=yes,nodeIntegration=no,sandbox=no');
      w.style.width = '100%';
      w.style.height = '100%';
      container.appendChild(w);
      const canvas = document.getElementById('workspace-canvas');
      canvas.innerHTML = '';
      canvas.appendChild(node);
      canvas.classList.add('canvas-layout-1');
      document.getElementById('workspace-view').classList.add('view-visible');
      const rect = w.getBoundingClientRect();
      const out = { rect: { w: rect.width, h: rect.height }, events: [] };
      return await new Promise((resolve) => {
        let settled = false;
        const done = (payload) => { if (!settled) { settled = true; resolve(payload); } };
        w.addEventListener('did-fail-load', (e) => {
          if (e.errorCode !== -3) out.events.push({ type: 'fail', code: e.errorCode, desc: e.errorDescription });
        });
        w.addEventListener('did-finish-load', () => out.events.push({ type: 'finish' }));
        w.addEventListener('dom-ready', async () => {
          try {
            out.dom = await w.executeJavaScript("({href:location.href,title:document.title,bodyLen:document.body?.innerText?.length||0})");
            out.guestUa = await w.executeJavaScript('navigator.userAgent');
          } catch (e) { out.domErr = String(e); }
          setTimeout(() => done(out), 7000);
        });
        setTimeout(() => done(out), 16000);
      });
    })()
  `);

  fs.writeFileSync(OUT, JSON.stringify({ expectedUa: LAYV_CHROME_USER_AGENT, probe }, null, 2));
  app.quit();
});

setTimeout(() => app.quit(), 28000);

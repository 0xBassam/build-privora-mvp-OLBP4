/**
 * Serves the Jest HTML test report at http://localhost:4000
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = process.env.TEST_REPORT_PORT || 4000;
const REPORT_FILE = path.join(__dirname, 'test-report.html');

let testRunning = false;

const runTests = () => {
  if (testRunning) return;
  testRunning = true;
  console.log('\n[Test runner] Starting Jest...');
  const child = spawn(
    'npx',
    ['jest', '--runInBand', '--forceExit',
     '--reporters=default', '--reporters=jest-html-reporter'],
    { cwd: __dirname, stdio: 'inherit' }
  );
  child.on('exit', (code) => {
    testRunning = false;
    console.log(`\n[Test runner] Finished (exit ${code}). Reload http://localhost:${PORT} to see results.\n`);
  });
};

const server = http.createServer((req, res) => {

  // ── Root: serve the report wrapped in a toolbar ──────────────────────────
  if (req.url === '/' || req.url === '/index.html') {
    if (!fs.existsSync(REPORT_FILE)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(`<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>Privora Tests</title>
        <style>body{font-family:sans-serif;background:#0f172a;color:#f1f5f9;
          display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}</style>
        </head><body><div style="text-align:center">
          <h2>No report yet.</h2>
          <p style="color:#94a3b8">Click below to run the tests.</p>
          <a href="/run" style="background:#2563eb;color:#fff;padding:10px 24px;
            border-radius:8px;text-decoration:none;font-weight:600">Run Tests</a>
        </div></body></html>`);
    }

    const html = fs.readFileSync(REPORT_FILE, 'utf8');
    const stat = fs.statSync(REPORT_FILE);
    const generated = stat.mtime.toLocaleString();

    const page = html.replace(
      /<body[^>]*>/i,
      `$&
      <div id="toolbar" style="
        position:fixed;top:0;left:0;right:0;z-index:99999;
        background:#1e293b;color:#f1f5f9;
        display:flex;align-items:center;gap:14px;
        padding:10px 20px;font-family:'Inter',sans-serif;font-size:13px;
        box-shadow:0 2px 12px rgba(0,0,0,.5);
      ">
        <span style="font-weight:800;font-size:16px;color:#60a5fa;letter-spacing:-.3px">Privora</span>
        <span style="color:#475569;font-size:11px">|</span>
        <span style="color:#94a3b8">Test Report</span>
        <span style="margin-left:auto;color:#64748b;font-size:12px">Generated: ${generated}</span>
        <a id="rerun-btn" href="/run"
          style="background:#2563eb;color:#fff;padding:6px 16px;border-radius:6px;
                 text-decoration:none;font-weight:600;font-size:12px;cursor:pointer;
                 transition:background .15s">
          ▶ Re-run Tests
        </a>
      </div>
      <div style="height:50px"></div>
      <script>
        document.getElementById('rerun-btn').addEventListener('click', function(e) {
          e.preventDefault();
          this.textContent = '⟳ Running...';
          this.style.background = '#475569';
          fetch('/run-async').then(() => {
            const poll = setInterval(() => {
              fetch('/status').then(r=>r.json()).then(d => {
                if (!d.running) { clearInterval(poll); location.reload(); }
              });
            }, 2000);
          });
        });
      </script>`
    );

    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(page);
  }

  // ── /run: trigger tests then redirect ─────────────────────────────────────
  if (req.url === '/run') {
    runTests();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(`<!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>Running tests...</title>
      <style>
        body{font-family:sans-serif;background:#0f172a;color:#f1f5f9;
             display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
        .spin{width:44px;height:44px;border:4px solid #334155;border-top-color:#3b82f6;
              border-radius:50%;animation:s .8s linear infinite;margin:0 auto 20px}
        @keyframes s{to{transform:rotate(360deg)}}
      </style>
      </head><body>
      <div style="text-align:center">
        <div class="spin"></div>
        <h2 style="margin:0 0 8px">Running 67 tests...</h2>
        <p style="color:#64748b;margin:0">Redirecting when done</p>
      </div>
      <script>
        const check = setInterval(() => {
          fetch('/status').then(r=>r.json()).then(d => {
            if (!d.running) { clearInterval(check); window.location.href = '/'; }
          }).catch(()=>{});
        }, 2500);
      </script>
    </body></html>`);
  }

  // ── /run-async: trigger run, return immediately ────────────────────────────
  if (req.url === '/run-async') {
    runTests();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ started: true }));
  }

  // ── /status: polling endpoint ─────────────────────────────────────────────
  if (req.url === '/status') {
    const stat = fs.existsSync(REPORT_FILE) ? fs.statSync(REPORT_FILE) : null;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      running: testRunning,
      lastModified: stat ? stat.mtime : null,
    }));
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n══════════════════════════════════════════');
  console.log('  Privora Test Report Server');
  console.log(`  http://localhost:${PORT}`);
  console.log('══════════════════════════════════════════');
  console.log('  • View test results in your browser');
  console.log('  • Click "Re-run Tests" to refresh');
  console.log('  • Ctrl+C to stop\n');
});

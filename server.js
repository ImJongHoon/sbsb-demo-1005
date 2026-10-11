// SBSB 시연 앱: 방문할 때마다 Postgres에 기록하고 총 방문 수를 보여 준다.
// 재배포·롤백해도 숫자가 이어지면 "DB는 고정, 앱만 교체"가 동작하는 것이다.
// v2 브랜치는 아래 VERSION·COLOR만 바꾼다.
const http = require("node:http");
const os = require("node:os");
const { Pool } = require("pg");

const VERSION = "v2";
const COLOR = "#2f9e44";

// DATABASE_URL은 SBSB가 package.json의 pg 의존성을 보고 Postgres를 띄운 뒤 넣어 준다.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 테이블은 앱이 시작할 때 직접 만든다. SBSB는 DB가 준비된 뒤 앱을 띄우지만, 혹시 몰라 몇 번 다시 시도한다.
async function prepareDatabase() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL이 없습니다. SBSB가 Postgres를 감지했는지 확인하세요.");
  for (let attempt = 1; attempt <= 15; attempt += 1) {
    try {
      await pool.query("CREATE TABLE IF NOT EXISTS visits (id SERIAL PRIMARY KEY, version TEXT NOT NULL, at TIMESTAMPTZ NOT NULL DEFAULT now())");
      console.log("database ready");
      return;
    } catch (error) {
      console.log(`waiting for database (${attempt}/15): ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw new Error("database did not become ready");
}

// SBSB의 배포 점검(wget)이 "/"를 호출하므로, 그 요청은 방문으로 세지 않는다.
const isHealthCheck = (request) => /wget/i.test(request.headers["user-agent"] ?? "");

const page = (count) => `<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>SBSB demo ${VERSION}</title></head>
<body style="margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:${COLOR};color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:16px">
  <h1 style="font-size:120px;margin:0">${count}</h1>
  <p style="font-size:22px;opacity:.9;margin:0">총 방문 수 (Postgres)</p>
  <p style="font-size:16px;opacity:.75;margin:0">${VERSION} · ${os.hostname()}</p>
</body>
</html>`;

const server = http.createServer(async (request, response) => {
  try {
    if (request.url === "/favicon.ico") return response.writeHead(204).end();
    if (!isHealthCheck(request)) await pool.query("INSERT INTO visits (version) VALUES ($1)", [VERSION]);
    const { rows } = await pool.query("SELECT count(*)::int AS count FROM visits");
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "X-App-Version": VERSION, "Cache-Control": "no-store" });
    response.end(page(rows[0].count));
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(`database error: ${error.message}`);
  }
});

// SBSB 온프레미스 배포 화면의 기본 컨테이너 포트가 8000이다.
const port = Number(process.env.PORT) || 8000;
prepareDatabase()
  .then(() => server.listen(port, () => console.log(`sbsb demo ${VERSION} listening on ${port}`)))
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });

// docker stop(SIGTERM)을 받으면 처리 중인 요청을 마치고 DB 연결을 닫은 뒤 종료 (무중단 교체 시)
process.on("SIGTERM", () => server.close(() => pool.end().then(() => process.exit(0))));

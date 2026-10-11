// SBSB 시연 앱 v3: AWS EC2 배포용. DB를 쓰지 않는다.
// 방문 수 화면이 없어야 DB가 있는 v1·v2와 헷갈리지 않는다.
const http = require("node:http");
const os = require("node:os");

const VERSION = "AWS v1";
const COLOR = "#7048e8";

const page = () => `<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>SBSB demo ${VERSION}</title></head>
<body style="margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:${COLOR};color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:16px">
  <h1 style="font-size:120px;margin:0">${VERSION}</h1>
  <p style="font-size:16px;opacity:.75;margin:0">${os.hostname()}</p>
</body>
</html>`;

const server = http.createServer((request, response) => {
  if (request.url === "/favicon.ico") return response.writeHead(204).end();
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "X-App-Version": "aws-v1", "Cache-Control": "no-store" });
  response.end(page());
});

const port = Number(process.env.PORT) || 8000;
server.listen(port, () => console.log(`sbsb demo ${VERSION} listening on ${port}`));

// docker stop(SIGTERM)을 받으면 처리 중인 요청을 마치고 종료
process.on("SIGTERM", () => server.close(() => process.exit(0)));

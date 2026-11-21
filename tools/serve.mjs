// 개발용 정적 서버. 의존성 없이 프로젝트 폴더를 그대로 내보낸다.
//   node tools/serve.mjs [포트] [폴더]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

export function startServer({ port = 5173, root = resolve(fileURLToPath(import.meta.url), '../..') } = {}) {
  const base = resolve(root);
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let rel = normalize(decodeURIComponent(url.pathname));
      if (rel.endsWith(sep) || rel === '/') rel = join(rel, 'index.html');
      const file = resolve(join(base, rel));
      // 프로젝트 폴더 밖은 내보내지 않는다.
      if (file !== base && !file.startsWith(base + sep)) {
        res.writeHead(403).end('Forbidden');
        return;
      }
      const info = await stat(file);
      if (!info.isFile()) throw new Error('not a file');
      const body = await readFile(file);
      res.writeHead(200, {
        'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(body);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    }
  });
  return new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(port, '127.0.0.1', () => ok(server));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2]) || 5173;
  const root = process.argv[3] ? resolve(process.argv[3]) : undefined;
  startServer({ port, root }).then(() => {
    console.log(`쉿! UFO 개발 서버: http://localhost:${port}`);
  });
}

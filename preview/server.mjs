import { createHash } from "node:crypto";
import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 3000);

const PAGE = `<!doctype html><title>fixture preview</title><h1 id="hello">fixture preview ok</h1><p id="ws">websocket: connecting</p><script>
const url = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/hmr";
const socket = new WebSocket(url);
socket.onopen = () => socket.send("ping");
socket.onmessage = (event) => { document.getElementById("ws").textContent = "websocket: " + event.data; };
socket.onerror = () => { document.getElementById("ws").textContent = "websocket: failed"; };
</script>`;

const server = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200).end("ok");
    return;
  }
  if (request.url === "/redirect") {
    response.writeHead(302, { location: `http://localhost:${port}/` }).end();
    return;
  }
  response.writeHead(200, { "content-type": "text/html" }).end(PAGE);
});

server.on("upgrade", (request, socket) => {
  const key = request.headers["sec-websocket-key"];
  const accept = createHash("sha1")
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");
  socket.write(
    `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`
  );
  const reply = Buffer.from(`pong from ${request.headers.host}`);
  socket.write(Buffer.concat([Buffer.from([0x81, reply.length]), reply]));
  socket.on("data", () => {});
  socket.on("error", () => {});
});

server.listen(port, "0.0.0.0");

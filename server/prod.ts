import { createServer } from "http";
import next from "next";
import path from "path";

const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "5000", 10);

const app = next({ 
  dev: false, 
  hostname, 
  port, 
  dir: path.resolve(process.cwd()) 
});
const handle = app.getRequestHandler();

function log(message: string, source = "next") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  server.listen(port, hostname, () => {
    log(`Production server running at http://${hostname}:${port}`);
  });
}).catch((err) => {
  console.error("Error starting server:", err);
  process.exit(1);
});

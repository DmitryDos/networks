import net from "node:net";
import { firstLine, isHttp09 } from "./lib/framing";
import { Handler } from "./lib/message";
import { Http2Handler } from "./http2.0/message";
import { serveHttp09 } from "./http0.9/serve";
import { serveHttp11 } from "./http1.1/serve";
import { serveHttp2 } from "./http2.0/serve";

const HTTP2_PREFACE_LINE = "PRI * HTTP/2.0";

export function serveConnection(socket: net.Socket, handler: Handler, http2Handler?: Http2Handler): void {
    let buffer = Buffer.alloc(0);
    let decided = false;

    const onData = (chunk: Buffer): void => {
        buffer = Buffer.concat([buffer, chunk]);
        if (decided) {
            return;
        }
        const line = firstLine(buffer);
        if (line === null) {
            if (buffer.length > 8192) {
                socket.destroy();
            }
            return;
        }
        decided = true;
        socket.off("data", onData);
        if (http2Handler && line === HTTP2_PREFACE_LINE) {
            serveHttp2(socket, http2Handler, buffer);
        } else if (isHttp09(line)) {
            serveHttp09(socket, handler, buffer);
        } else {
            serveHttp11(socket, handler, buffer);
        }
    };

    socket.on("data", onData);
    socket.on("error", () => undefined);
}

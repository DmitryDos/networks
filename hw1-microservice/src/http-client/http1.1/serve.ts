import net from "node:net";
import { wantsKeepAlive } from "../lib/framing";
import { safeHandle, errorResponse } from "../lib/dispatch";
import { Handler, HttpResponse } from "../lib/message";
import { ParsedRequest, parseRequest } from "./parseRequest";
import { serializeResponse } from "./serializeResponse";

export function serveHttp11(socket: net.Socket, handler: Handler, initial: Buffer): void {
    let buffer = initial;
    let processing = false;
    let finished = false;

    const pump = async (): Promise<void> => {
        if (processing || finished) {
            return;
        }
        processing = true;
        try {
            while (!finished) {
                let parsed: ParsedRequest | null;
                try {
                    parsed = parseRequest(buffer);
                } catch {
                    socket.end(serializeResponse(errorResponse(400)));
                    finished = true;
                    return;
                }
                if (!parsed) {
                    return;
                }
                buffer = buffer.subarray(parsed.consumed);
                const keepAlive = wantsKeepAlive(parsed.request.version, parsed.request.headers);
                const response: HttpResponse = await safeHandle(handler, parsed.request);
                response.headers.set("Connection", keepAlive ? "keep-alive" : "close");
                response.headers.set("Date", new Date().toUTCString());
                socket.write(serializeResponse(response));
                if (!keepAlive) {
                    socket.end();
                    finished = true;
                    return;
                }
            }
        } finally {
            processing = false;
        }
    };

    socket.on("data", (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
        void pump();
    });
    socket.on("error", () => {
        finished = true;
    });
    socket.on("close", () => {
        finished = true;
    });

    void pump();
}

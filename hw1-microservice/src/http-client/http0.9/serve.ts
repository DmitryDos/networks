import net from "node:net";
import { HttpHeaders } from "../lib/headers";
import { firstLine, splitTarget } from "../lib/framing";
import { safeHandle } from "../lib/dispatch";
import { Handler, HttpRequest } from "../lib/message";

export function serveHttp09(socket: net.Socket, handler: Handler, initial: Buffer): void {
    const line = firstLine(initial) ?? "";
    socket.on("error", () => undefined);
    void (async () => {
        const parts = line.trim().split(/\s+/);
        const target = parts[1] ?? "/";
        const { path, query } = splitTarget(target);
        const request: HttpRequest = {
            method: parts[0] ?? "GET",
            target,
            path,
            query,
            version: "HTTP/0.9",
            headers: new HttpHeaders(),
            body: Buffer.alloc(0),
        };
        const response = await safeHandle(handler, request);
        socket.end(response.body);
    })();
}

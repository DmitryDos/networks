import net from "node:net";
import { serveConnection } from "./serveConnection";
import { Handler } from "./lib/message";
import { Http2Handler } from "./http2.0/message";

export class HttpClient {
    private server?: net.Server;

    listen(port: number, handler: Handler, http2Handler?: Http2Handler, onListening?: () => void): void {
        this.server = net.createServer((socket) => serveConnection(socket, handler, http2Handler));
        this.server.listen(port, onListening);
    }

    close(callback?: () => void): void {
        this.server?.close(callback);
        this.server = undefined;
    }
}

export function createHttpClient(): HttpClient {
    return new HttpClient();
}

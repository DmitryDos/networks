import dgram from "node:dgram";
import net from "node:net";
import { Resolver } from "./resolver";

export class DnsServer {
    private udp?: dgram.Socket;
    private tcp?: net.Server;

    constructor(private readonly resolver: Resolver) {}

    listen(port: number, onListening?: () => void): void {
        this.udp = dgram.createSocket("udp4");
        this.udp.on("message", (query, rinfo) => {
            void this.resolver.resolve(query).then((response) => {
                if (response) {
                    this.udp?.send(response, rinfo.port, rinfo.address);
                }
            });
        });
        this.udp.on("error", () => undefined);

        this.tcp = net.createServer((socket) => this.onTcp(socket));
        this.tcp.on("error", () => undefined);

        let pending = 2;
        const ready = (): void => {
            pending -= 1;
            if (pending === 0 && onListening) {
                onListening();
            }
        };
        this.udp.bind(port, ready);
        this.tcp.listen(port, ready);
    }

    close(): void {
        this.udp?.close();
        this.tcp?.close();
    }

    private onTcp(socket: net.Socket): void {
        let buffer = Buffer.alloc(0);
        let processing = false;

        const pump = async (): Promise<void> => {
            if (processing) {
                return;
            }
            processing = true;
            
            try {
                while (buffer.length >= 2) {
                    const length = buffer.readUInt16BE(0);
                    if (buffer.length < 2 + length) {
                        break;
                    }
                    const query = buffer.subarray(2, 2 + length);
                    buffer = buffer.subarray(2 + length);
                    const response = await this.resolver.resolve(query);
                    if (response) {
                        const framed = Buffer.alloc(2 + response.length);
                        framed.writeUInt16BE(response.length, 0);
                        response.copy(framed, 2);
                        socket.write(framed);
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
        socket.on("error", () => undefined);
    }
}

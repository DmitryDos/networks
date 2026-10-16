import dgram from "node:dgram";
import { Zone } from "./zone";
import { decodeMessage } from "./wire/decodeMessage";
import { encodeMessage } from "./wire/encodeMessage";
import { DnsMessage, DnsRecord } from "./wire/message";
import { Rcode } from "./wire/types";

export class Resolver {
    constructor(
        private readonly zone: Zone,
        private readonly forward?: string,
    ) {}

    async resolve(query: Buffer): Promise<Buffer | null> {
        let message: DnsMessage;

        try {
            message = decodeMessage(query);
        } catch {
            return null;
        }

        const question = message.questions[0];
        if (!question) {
            return this.respond(message, [], Rcode.NOERROR);
        }


        const answers = this.zone.lookup(question.name, question.type);
        if (answers.length > 0) {
            return this.respond(message, answers, Rcode.NOERROR, true);
        }
        if (this.zone.has(question.name)) {
            return this.respond(message, [], Rcode.NOERROR, true);
        }
        if (this.forward) {
            return this.forwardQuery(query);
        }

        return this.respond(message, [], Rcode.NXDOMAIN);
    }

    private respond(
        query: DnsMessage,
        answers: DnsRecord[],
        rcode: number,
        authoritative = false,
    ): Buffer {
        const response: DnsMessage = {
            header: {
                ...query.header,
                qr: true,
                aa: authoritative,
                ra: this.forward !== undefined,
                rcode,
                qdcount: query.questions.length,
                ancount: answers.length,
                nscount: 0,
                arcount: 0,
            },
            questions: query.questions,
            answers,
        };

        return encodeMessage(response);
    }

    private forwardQuery(query: Buffer): Promise<Buffer> {
        const upstream = this.forward as string;
        
        return new Promise((resolve) => {
            const socket = dgram.createSocket("udp4");
            const timer = setTimeout(() => {
                socket.close();
                resolve(this.servfail(query));
            }, 3000);
            socket.on("message", (response) => {
                clearTimeout(timer);
                socket.close();
                resolve(response);
            });
            socket.on("error", () => {
                clearTimeout(timer);
                socket.close();
                resolve(this.servfail(query));
            });
            socket.send(query, 53, upstream);
        });
    }

    private servfail(query: Buffer): Buffer {
        return this.respond(decodeMessage(query), [], Rcode.SERVFAIL);
    }
}

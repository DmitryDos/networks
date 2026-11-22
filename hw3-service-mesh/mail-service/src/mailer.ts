import net from "node:net";

export interface SmtpTarget {
    host: string;
    port: number;
    from: string;
    to: string;
}

export interface Mail {
    subject: string;
    body: string;
}

export async function sendMail(target: SmtpTarget, mail: Mail): Promise<void> {
    const socket = net.connect(target.port, target.host);
    socket.setEncoding("utf8");
    const nextLine = lineReader(socket);

    const awaitCode = async (code: string): Promise<void> => {
        const line = await nextLine();
        if (!line.startsWith(code)) {
            throw new Error(`SMTP ${code} expected, got: ${line}`);
        }
    };
    const send = (line: string): void => {
        socket.write(`${line}\r\n`);
    };

    try {
        await awaitCode("220");
        send("EHLO mail-service");
        await awaitCode("250");
        send(`MAIL FROM:<${target.from}>`);
        await awaitCode("250");
        send(`RCPT TO:<${target.to}>`);
        await awaitCode("250");
        send("DATA");
        await awaitCode("354");
        socket.write(`${buildMessage(target, mail)}\r\n.\r\n`);
        await awaitCode("250");
        send("QUIT");
    } finally {
        socket.end();
    }
}

function lineReader(socket: net.Socket): () => Promise<string> {
    let buffer = "";
    const ready: string[] = [];
    let waiting: { resolve: (line: string) => void; reject: (error: Error) => void } | null = null;
    let failed: Error | null = null;

    const deliver = (): void => {
        if (waiting && ready.length > 0) {
            const pending = waiting;
            waiting = null;
            pending.resolve(ready.shift() as string);
        }
    };

    const fail = (error: Error): void => {
        failed = error;
        if (waiting) {
            const pending = waiting;
            waiting = null;
            pending.reject(error);
        }
    };

    socket.on("data", (chunk: string) => {
        buffer += chunk;
        let index = buffer.indexOf("\r\n");
        while (index !== -1) {
            const line = buffer.slice(0, index);
            buffer = buffer.slice(index + 2);
            if (!(line.length >= 4 && line[3] === "-")) {
                ready.push(line);
            }
            index = buffer.indexOf("\r\n");
        }
        deliver();
    });
    socket.on("error", (error: Error) => fail(error));
    socket.on("close", () => fail(failed ?? new Error("connection closed")));

    return (): Promise<string> =>
        new Promise((resolve, reject) => {
            if (ready.length > 0) {
                resolve(ready.shift() as string);
            } else if (failed) {
                reject(failed);
            } else {
                waiting = { resolve, reject };
            }
        });
}

function buildMessage(target: SmtpTarget, mail: Mail): string {
    const headers = [
        `From: ${target.from}`,
        `To: ${target.to}`,
        `Subject: ${mail.subject}`,
        `Date: ${new Date().toUTCString()}`,
        "Content-Type: text/plain; charset=utf-8",
    ];
    const body = mail.body.replace(/\r?\n/g, "\r\n").replace(/\r\n\./g, "\r\n..");
    return `${headers.join("\r\n")}\r\n\r\n${body}`;
}

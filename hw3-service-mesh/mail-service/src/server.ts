import http from "node:http";
import { MailConfig } from "./config";
import { fetchNotes } from "./notes";
import { sendMail } from "./mailer";

export function createServer(config: MailConfig): http.Server {
    return http.createServer((request, response) => {
        if (request.method === "POST" && request.url === "/send") {
            void handleSend(config)
                .then((count) => {
                    response.writeHead(200, { "Content-Type": "application/json" });
                    response.end(JSON.stringify({ sent: true, notes: count, to: config.to }));
                })
                .catch((error) => {
                    response.writeHead(502, { "Content-Type": "application/json" });
                    response.end(JSON.stringify({ sent: false, error: String(error) }));
                });
            return;
        }
        response.writeHead(404);
        response.end();
    });
}

async function handleSend(config: MailConfig): Promise<number> {
    const notes = await fetchNotes(config.notesUrl);
    const body =
        notes.length === 0
            ? "No notes."
            : notes.map((note) => `- ${note.title}: ${note.content}`).join("\n");
    await sendMail(
        { host: config.smtpHost, port: config.smtpPort, from: config.from, to: config.to },
        { subject: "Your notes", body },
    );
    return notes.length;
}

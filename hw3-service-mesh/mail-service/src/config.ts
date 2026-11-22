export interface MailConfig {
    port: number;
    notesUrl: string;
    smtpHost: string;
    smtpPort: number;
    from: string;
    to: string;
}

export function loadConfig(): MailConfig {
    return {
        port: Number(process.env.PORT ?? 9000),
        notesUrl: process.env.NOTES_URL ?? "http://localhost:8080",
        smtpHost: process.env.SMTP_HOST ?? "localhost",
        smtpPort: Number(process.env.SMTP_PORT ?? 1025),
        from: process.env.MAIL_FROM ?? "notes@local",
        to: process.env.MAIL_TO ?? "user@example.com",
    };
}

import { createNoteService } from "./note-service/noteService";

const service = createNoteService({ port: Number(process.env.PORT ?? 8080) });
service.start();

const shutdown = (): void => {
    service.stop();
    process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

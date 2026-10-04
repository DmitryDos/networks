import { HeaderField } from "./message";

const hpack = require("hpack.js");

export class HpackCodec {
    private readonly compressor = hpack.compressor.create({ table: { size: 4096 } });
    private readonly decompressor = hpack.decompressor.create({ table: { size: 4096 } });

    decode(block: Buffer): HeaderField[] {
        this.decompressor.write(block);
        this.decompressor.execute();
        const headers: HeaderField[] = [];
        let entry = this.decompressor.read();
        while (entry !== null) {
            headers.push({ name: entry.name, value: entry.value });
            entry = this.decompressor.read();
        }
        return headers;
    }

    encode(headers: HeaderField[]): Buffer {
        this.compressor.write(headers);
        const chunks: Buffer[] = [];
        let chunk = this.compressor.read();
        while (chunk !== null) {
            chunks.push(chunk);
            chunk = this.compressor.read();
        }
        return Buffer.concat(chunks);
    }
}

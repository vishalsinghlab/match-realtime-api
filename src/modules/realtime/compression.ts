import {
    brotliCompressSync,
    brotliDecompressSync,
} from 'node:zlib';

export const compress = (data: Uint8Array): Buffer => {
    return brotliCompressSync(Buffer.from(data));
};

export const decompress = (data: Uint8Array): Buffer => {
    return brotliDecompressSync(Buffer.from(data));
};
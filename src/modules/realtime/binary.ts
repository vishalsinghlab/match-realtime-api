import { decode, encode } from '@msgpack/msgpack';

export const encodeMessage = (data: unknown): Uint8Array => {
    return encode(data);
};

export const decodeMessage = (data: Uint8Array): unknown => {
    return decode(data);
};
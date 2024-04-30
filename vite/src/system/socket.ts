import { io, Socket } from "socket.io-client";

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io('http://localhost:4000',
{
      path: '/socket.io',
      autoConnect: true
});

export interface ServerToClientEvents {
    noArg: () => void;
    basicEmit: (a: number, b: string, c: Buffer) => void;
    withAck: (d: string, callback: (e: number) => void) => void;
    tokenProgress: (identifier: string, tokens: [][]) => void;
}

export interface ClientToServerEvents {
    foo: () => void;
    set_tokens: (tokens: [][]) => void
    tokenize: (data: any) => void
    detokenize: (data: any) => void
    generate: (data: any) => void
}

export interface SocketData {
  name: string;
  age: number;
}

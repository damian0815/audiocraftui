import { createContext } from 'react';

class ServerInfo {
    baseUrl: string

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl
    }
}

function defaultServerInfo() {
    return new ServerInfo("http://localhost:4000")
}

export const ServerContext = createContext<ServerInfo>(defaultServerInfo());

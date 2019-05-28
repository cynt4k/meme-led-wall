
export interface IMongoConfig {
    server: string;
    username: string;
    password: string;
    database: string;
}

export interface IExpressConfig {
    server: string;
    port: number;
    version: string;
    token: string;
}

export interface IConfig {
    mongodb: IMongoConfig;
    express: IExpressConfig;
}

export interface ILdapConfig {
    host: string;
    bindDN: string;
    bindCredentials: string;
    searchBase?: string;
    searchFilter?: string;
    searchAttributes?: string[];
    uniqueAttribute: string;
}

export interface IExpressConfig {
    server: string;
    port: number;
    version: string;
    token: string;
}

export interface IConfig {
    ldap: ILdapConfig;
    express: IExpressConfig;
}
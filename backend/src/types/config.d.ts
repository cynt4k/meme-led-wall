
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
    tunnelDomain: string;
}

export interface ISlackConfig {
    clientSecret: string;
    clientId: string;
    clientSigningKey: string;
    botToken: string;
}

export interface ISettings {
    imageFolder: string;
    memeScriptPath: string;
    adminPassword: string;
}

export interface IConfig {
    ldap: ILdapConfig;
    express: IExpressConfig;
    settings: ISettings;
    slack: ISlackConfig;
}
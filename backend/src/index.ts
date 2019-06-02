import 'module-alias/register';
import config from 'config';
import { Logger } from '@home/core';
import { IExpressConfig, ILdapConfig, ISettings, ISlackConfig } from './types';
import { ExpressService, TunnelService, SlackService, MemeService } from './core/services';

Logger.init();

(async (): Promise<void> => {
    const expressConfig: IExpressConfig = config.get<IExpressConfig>('express');
    const ldapConfig: ILdapConfig = config.get<ILdapConfig>('ldap');
    const memeSettings: ISettings = config.get<ISettings>('settings');
    const slackConfig: ISlackConfig = config.get<ISlackConfig>('slack');
    let url = `http://${expressConfig.server}:${expressConfig.port}`;

    try {
        await ExpressService.init(expressConfig, ldapConfig, memeSettings);
        Logger.info('spawned http server');
    } catch (e) {
        Logger.error(`error while spawning http server ${e}`);
        process.exit(1);
    }

    try {
        url = await TunnelService.init(expressConfig);
        Logger.info(`spawned tunnel on url ${url}`);
    } catch (e) {
        Logger.error(`error while spawning tunnel - ${e}`);
        process.exit(1);
    }

    try {
        await SlackService.init(slackConfig, expressConfig, memeSettings.imageFolder, url, memeSettings.adminPassword);
        Logger.info(`initialized slack service`);
    } catch (e) {
        Logger.error(`error while initializing slack service - ${e}`);
        process.exit(1);
    }

    try {
        await MemeService.init(memeSettings);
        Logger.info(`initialized meme service`);
    } catch (e) {
        Logger.error(`error while initializing meme service - ${e}`);
        process.exit(1);
    }

    const disconnect = (): void => {
        TunnelService.disconnect();
    };

    process.on('SIGTERM', (code) => {
        disconnect();
        process.exit(0);
    });

    process.on('SIGINT', (code) => {
        disconnect();
        process.exit(0);
    });
})();

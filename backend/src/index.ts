import 'module-alias/register';
import config from 'config';
import { Logger } from '@home/core';
import { IExpressConfig, ILdapConfig } from './types';
import { ExpressService } from './core/services';

Logger.init();

(async (): Promise<void> => {
    const expressConfig: IExpressConfig = config.get<IExpressConfig>('express');
    const ldapConfig: ILdapConfig = config.get<ILdapConfig>('ldap');

    try {
        await ExpressService.init(expressConfig, ldapConfig);
        Logger.info('spawned http server');
    } catch (e) {
        Logger.error(`error while spawning http server ${e}`);
    }
})();

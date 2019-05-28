import 'module-alias/register';
import config from 'config';
import { Logger } from '@home/core';
import { IExpressConfig } from './types';
import { ExpressService } from './core/services';

Logger.init();

(async (): Promise<void> => {
    const expressConfig: IExpressConfig = config.get<IExpressConfig>('express');

    try {
        await ExpressService.init(expressConfig);
        Logger.info('spawned http server');
    } catch (e) {
        Logger.error(`error while spawning http server ${e}`);
    }
})();

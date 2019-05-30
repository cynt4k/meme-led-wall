import { SlackAdapter } from 'botbuilder-adapter-slack';
import { Botkit } from 'botkit';
import request from 'request';
import { ISlackConfig, IExpressConfig } from '@home/types';

export namespace SlackService {
    let config: ISlackConfig;
    export let controller: Botkit;
    export let adapter: SlackAdapter;

    export const init = (c: ISlackConfig, e: IExpressConfig, url: string): void => {
        config = c;
        const redirectUri = `${url}/${e.version}/slack`;

        adapter = new SlackAdapter({
            clientSigningSecret: config.clientSigningKey,
            botToken: config.botToken,
            redirectUri: redirectUri,
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            scopes: [ 'commands', 'bot' ]
        });
    };

    export const downloadImageFromSlack = (imageUrl: string): Promise<void> => new Promise<void>((resolve, reject) => {
        const options = {
            url: imageUrl,
            headers: {
                Authorization: `Bearer ${config.botToken}`
            }
        };
        request.get(options, (res) => {
            console.log(res);
            return resolve();
        });
    });
}

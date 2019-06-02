import localtunnel from 'localtunnel';
import { IExpressConfig } from '@home/types';
import { MemeWallError } from '@home/errors';

export namespace TunnelService {
    let tunnel: localtunnel.Tunnel;

    export const init = (s: IExpressConfig): Promise<string> => new Promise<string>((resolve, reject) => {

        const options: localtunnel.TunnelConfig = {
            subdomain: s.tunnelDomain
        };


        tunnel = localtunnel(s.port, options, (e, initialized) => {
            if (e) return reject(e);
            if (!initialized) return reject(new MemeWallError('tunnel not initialized'));
            return resolve(initialized.url);
        });
    });

    export const disconnect = (): void => {
        tunnel.close();
    };
}

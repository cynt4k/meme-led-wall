import express, { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import { IExpressConfig, ILdapConfig, ISettings } from '@home/types';
import { Logger } from '@home/core/utils';
import { I18n, ExpressHandler } from '@home/misc';
import lusca from 'lusca';
import passport from 'passport';
import { Passport } from '@home/core/services/auth';
import { AuthRoute } from '@home/routes/auth-route';
import { MemeRouter } from '@home/routes';
import { MemeController } from '@home/controller';


export namespace ExpressService {
    const app = express();
    let config: IExpressConfig;

    export const init = async (c: IExpressConfig, l: ILdapConfig, s: ISettings): Promise<void> => {
        config = c;

        await Passport.init(l);
        MemeController.init(s);

        app.set('port', config.port);
        app.use(compression());
        app.use(bodyParser.json({limit: '20mb'}));
        app.use(bodyParser.urlencoded({ extended: true, limit: '20mb' }));
        app.use(methodOverride());
        app.use(lusca.xssProtection(true));
        app.use(passport.initialize());
        app.use(passport.session());
        app.use(Logger.getExpressLogger());

        if (process.env.NODE_ENV === 'dev') {
            app.use((req: Request, res: Response, next: NextFunction) => {

                // Website you wish to allow to connect
                res.setHeader('Access-Control-Allow-Origin', '*');

                // Request methods you wish to allow
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

                // Request headers you wish to allow
                res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, x-access-token, authorization');

                // Set to true if you need the website to include cookies in the requests sent
                // to the API (e.g. in case you use sessions)
                res.setHeader('Access-Control-Allow-Credentials', '1');

                // Pass to next layer of middleware
                return next();
            });
        }

        app.get('/', (req: Request, res: Response, next: NextFunction) => {
            res.status(200).send(I18n.INFO_SUCCESS);
        });

        app.use(`/${c.version}/auth`, AuthRoute);
        app.use(`/${c.version}/meme`, MemeRouter);

        app.use('*', ExpressHandler.express);
        app.all('*', ExpressHandler.checkResponse);
        app.all('*', ExpressHandler.unkownRouteHandler);

        try {
            await app.listen(app.get('port'));
            return Promise.resolve();
        } catch (e) {
            return Promise.reject(e);
        }
    };
}

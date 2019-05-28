import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import config from 'config';
import passportLocal from 'passport-local';
import LdapStrategy from 'passport-ldapauth';
import jwt from 'jsonwebtoken';
import { IExpressConfig, ILdapConfig, IUserLdap } from '@home/types';
import { I18n } from '@home/misc';

const LocalStrategy = passportLocal.Strategy;

// passport.deserializeUser(async(id, done) => {
//     User.findById(id, (e: any, user: any) => {
//         done(e, user);
//     });
// });

declare global {
    namespace Express {
        interface Request {
            token?: string;
            user?: IUserLdap | any;
        }
    }
}


export namespace Passport {
    const expressConfig = config.get<IExpressConfig>('express');


    export const init = (c: ILdapConfig): Promise<void> => new Promise<void>((resolve, reject) => {
            const ldapConfig: LdapStrategy.Options = {
                server: {
                    url: c.host,
                    bindDN: c.bindDN,
                    bindCredentials: c.bindCredentials,
                    searchBase: c.searchBase || '',
                    searchFilter: c.searchFilter || '(uid={{username}})',
                    searchAttributes: c.searchAttributes
                },
                passReqToCallback: true
            };

            passport.serializeUser<any, any>((user, done) => {
                return done(undefined, user[c.uniqueAttribute]);
            });

            passport.use('login-ldap', new LdapStrategy(ldapConfig, async (req: any, user: IUserLdap, done) => {
                done(null, user);
            }));

            passport.authenticate('login-ldap', (e, user) => {
                if (e) return reject(e);
                return resolve();
            })({});
    });

    export const generateToken = (req: Request) => {
        let refreshObject: Object = { };
        if (!req.body.unlimited) {
            refreshObject = {
                expiresIn: '1h'
            };
        }

        req.token = jwt.sign({
            username: (req.user || { username: undefined}).username,
            id: (req.user || {id: undefined}).id
        }, expressConfig.token || '', refreshObject);
    };

    export const respondToken = (req: Request) => {
        return {
            user: (req.user || {username: undefined}).username,
            token: req.token
        };
    };

    export const respondManageToken = (req: Request) => {
        return {
            user: (req.user || { username: undefined} ).username,
            token: req.token
        };
    };
}

import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { IUser } from '@home/types/models/user';
import { Passport } from '@home/core/services/auth';
import { I18n, HttpCodes } from '@home/misc';


export namespace AuthController {

    export const postLoginLdap = (req: Request, res: Response, next: NextFunction) => {
        passport.authenticate('login-ldap', (e, user: IUser | boolean) => {
            if (e) return next(e);

            if (user === false) {
                res.data = {
                    code: HttpCodes.Unauthorized,
                    message: I18n.WARN_USER_PASSWORD_WRONG
                };
                return next();
            }

            req.login(user, (err) => {
                if (err) return next(err);
                Passport.generateToken(req);
                res.data = {
                    code: 200,
                    message: I18n.INFO_SUCCESS,
                    data: Passport.respondToken(req)
                };
                return next();
            });
        })(req);
    };
}

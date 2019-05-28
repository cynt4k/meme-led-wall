import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { validationResult } from 'express-validator/check';
import { IResponse } from '@home/types/core';
import { I18n, HttpCodes } from '@home/misc';
import { TypeError } from '@home/errors';

export namespace ExpressHandler {
    export const unkownRouteHandler = (req: Request, res: Response, next: NextFunction): void => {
        res.type('json');
        const message: IResponse = {
            code: HttpCodes.NotFound,
            status: I18n.INFO_SUCCESS,
            message: `${req.method} - ${req.path} not found`,
            data: undefined
        };
        res.status(HttpCodes.NotFound).send(JSON.stringify(message));
    };

    export const checkResponse = (req: Request, res: Response, next: NextFunction) => {
        const data = res.data;
        const responseMessage: IResponse = <IResponse> {};
        if (!data) return next();

        if (data.code >= 400) {
            responseMessage.status = 'error';
        } else {
            responseMessage.status = 'success';
        }
        responseMessage.code = data.code;
        responseMessage.message = data.message;
        responseMessage.data = data.data;

        res.type('json');
        res.status(data.code).send(JSON.stringify(responseMessage));
    };

    export const validateBody = (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(new TypeError(I18n.WARN_VAL_INVALID_PARAMS, errors.array()));
        }
        return next();
    };

    export const express: ErrorRequestHandler = (e: any, req: Request, res: Response, next: NextFunction) => {
        if (e instanceof TypeError) {
            res.data = {
                code: HttpCodes.NotAcceptable,
                message: e.message,
                data: e.params
            };
            return next();
        }
        if (e instanceof Error) {
            res.data = {
                code: HttpCodes.InternalServerError,
                message: e.message
            };
            return next();
        } else {
            res.data = {
                code: HttpCodes.InternalServerError,
                message: e
            };
            return next();
        }
    };
}

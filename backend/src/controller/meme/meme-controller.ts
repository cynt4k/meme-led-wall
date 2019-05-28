import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { ISettings } from '@home/types';
import { HttpCodes, I18n } from '@home/misc';
import { IApiMemeUpload } from '@home/types/core/api';

export namespace MemeController {
    let initialized = false;
    let config: ISettings;

    export const init = (s: ISettings): void => {
        config = s;
        initialized = true;
    };

    const isInitialized = (res: Response): boolean => {
        if (!initialized) {
            res.data = {
                code: HttpCodes.ServiceUnavailable,
                message: I18n.ERR_SERVICE_NOT_INITIALIZED
            };
            return false;
        }
        return true;
    };
    export const postUploadMeme = async (req: Request, res: Response, next: NextFunction) => {
        if (!isInitialized(res)) return next();

        const data: IApiMemeUpload = req.body;
        const filename = data.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const file = `${filename}${path.parse(req.file.originalname).ext}`;
        const filepath = `${config.imageFolder}/${file}`;

        try {
            if (!fs.existsSync(filepath)) {
                const writer = fs.createWriteStream(filepath);
                writer.on('finish', () => {
                    res.data = {
                        code: HttpCodes.OK,
                        message: I18n.INFO_SUCCESS
                    };
                    return next();
                });

                writer.on('error', (e) => {
                    return next(e);
                });

                writer.write(req.file.buffer);
                writer.end();
            } else {
                res.data = {
                    code: HttpCodes.BadRequest,
                    message: I18n.WARN_VAL_FILE_EXIST
                };
                return next();
            }
        } catch (e) {
            return next(e);
        }
        // TODO: Handle upload
    };
}

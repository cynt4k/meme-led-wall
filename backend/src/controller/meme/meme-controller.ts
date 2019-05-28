import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { ISettings } from '@home/types';
import { HttpCodes, I18n } from '@home/misc';
import { IApiMemeUpload, IApiShowMeme } from '@home/types/core/api';
import { Logger } from '@home/core';

export namespace MemeController {
    let initialized = false;
    let config: ISettings;
    let memeWall: ChildProcessWithoutNullStreams;

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
    };

    const memeWallClosed = () => new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
            return reject(new Error('Timeout quiting memewall'));
        }, 3000);

        memeWall.on('exit', (code, signal) => {
            clearTimeout(timer);
            return resolve();
        });
    });

    const spawnMemeWall = (file: string): ChildProcessWithoutNullStreams => {
        const child = spawn('ping', ['localhost']);
        return child;
    };

    export const postShowMeme = async (req: Request, res: Response, next: NextFunction) => {
        if (!isInitialized(res)) return next();

        const data: IApiShowMeme = req.body;
        const filepath = path.resolve(`${config.imageFolder}/${data.name}`);

        try {
            if (fs.existsSync(filepath)) {
                if (memeWall) {
                    memeWall.kill('SIGINT');
                    await memeWallClosed();
                }

                memeWall = spawnMemeWall(filepath);
                res.data = {
                    code: HttpCodes.OK,
                    message: I18n.INFO_SUCCESS
                };

                return next();
            } else {
                res.data = {
                    code: HttpCodes.BadRequest,
                    message: I18n.WARN_VAL_FILE_NOT_EXIST
                };
                return next();
            }
        } catch (e) {
            return next(e);
        }
    };
}

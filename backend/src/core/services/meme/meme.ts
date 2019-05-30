import { ISettings } from '@home/types';
import fs from 'fs';
import _ from 'lodash';
import path from 'path';
import request from 'request';
import fileType from 'file-type';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { MemeWallError } from '@home/errors';
import { I18n } from '@home/misc';
import { Logger } from '@home/core/utils';

export namespace MemeService {

    let initialized = false;
    let config: ISettings;
    let memeWall: ChildProcessWithoutNullStreams;

    export const init = (s: ISettings): void => {
        config = s;
        initialized = true;
    };

    const fileExist = (file: string): boolean => {
        const filepath = path.resolve(`${config.imageFolder}/${file}`);
        return fs.existsSync(filepath);
    };

    const memeWallClosed = () => new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
            return reject(new MemeWallError('Timeout quiting memewall'));
        }, 3000);

        memeWall.once('exit', (code, signal) => {
            clearTimeout(timer);
            return resolve();
        });
    });

    const spawnMemeWall = (file: string): ChildProcessWithoutNullStreams => {
        let task: ChildProcessWithoutNullStreams;
        if (process.env.NODE_ENV === 'dev') {
            task = spawn('ping', ['localhost']);
        } else {
            task = spawn('python3', [ config.memeScriptPath, file]);
        }

        task.on('error', (e) => {
            Logger.error(e.message);
        });

        task.on('exit', (code) => {
            Logger.debug(`Task exited with code - ${code}`);
            task.kill();
        });

        task.stderr.on('data', (data: Buffer) => {
            Logger.error(data.toString());
        });

        task.stdout.on('data', (data: Buffer) => {
            Logger.debug(data.toString());
        });

        return task;
    };

    export const updateMemeWall = async (fileName: string): Promise<void> => {
        const filepath = path.resolve(`${config.imageFolder}/${fileName}`);

        try {
            if (fs.existsSync(filepath)) {
                if (memeWall) {
                    memeWall.kill('SIGINT');
                    await memeWallClosed();
                }

                memeWall = spawnMemeWall(filepath);
                return Promise.resolve();
            } else {
                throw new MemeWallError(I18n.WARN_VAL_FILE_NOT_EXIST);
            }
        } catch (e) {
            return Promise.reject(e);
        }
    };

    const downloadFile = (url: string, fileName: string): Promise<void> => new Promise<void>((resolve, reject) => {
        const filepath = path.resolve(`${config.imageFolder}/${fileName}`);
        const file = fileName.split('.');
        let fileTypeChecked = false;

        if (fileExist(fileName)) {
            return reject(new MemeWallError(I18n.WARN_VAL_FILE_EXIST));
        }

        if (!file[1]) {
            return reject(new MemeWallError(I18n.WARN_VAL_WRONG_FILETYPE));
        }

        if (!_.includes(['jpeg', 'jpg', 'png', 'gif'], file[1])) {
            return reject(new MemeWallError(I18n.WARN_VAL_WRONG_FILETYPE));
        }

        const writer = fs.createWriteStream(filepath);
        const req = request.get(url);

        writer.on('finish', () => {
            return resolve();
        });

        writer.on('error', (e) => {
            fs.unlinkSync(filepath);
            return reject(e);
        });

        req.on('data', (res) => {
            if (!fileTypeChecked) {
                if (res instanceof String) {
                    return writer.emit('error', new MemeWallError(I18n.WARN_VAL_WRONG_FILETYPE));
                }

                const type = fileType(res as Buffer);

                if (!type) {
                    return writer.emit('error', new MemeWallError(I18n.WARN_VAL_WRONG_FILETYPE));
                }

                if (type.ext !== file[1]) {
                    return writer.emit('error', new MemeWallError(I18n.WARN_VAL_WRONG_FILETYPE));
                }
                fileTypeChecked = true;
            }
            writer.write(res);
        });

        req.on('complete', () => {
            writer.end();
        });

        req.on('error', (e) => {
            fs.unlinkSync(filepath);
            return reject(e);
        });
    });

    export const updateMemeWallUrl = async (url: string, fileName: string): Promise<void> => {
        try {
            await downloadFile(url, fileName);
            await updateMemeWall(fileName);
            return Promise.resolve();
        } catch (e) {
            return Promise.reject(e);
        }
    };
}

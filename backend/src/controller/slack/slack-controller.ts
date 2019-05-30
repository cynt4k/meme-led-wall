import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { ISettings } from '@home/types';
import { HttpCodes, I18n } from '@home/misc';
import { IApiMemeUpload, IApiShowMeme } from '@home/types/core/api';
import { Logger } from '@home/core';
import { SlackService, MemeService } from '@home/core/services';
import { MemeWallError } from '@home/errors';

export namespace SlackController {

    interface IFilesUpload {
        filetype: string;
        id: string;
        mimetype: string;
        name: string;
        pretty_type: string;
        url_private: string;
    }


    export const getInstall = (req: Request, res: Response, next: NextFunction) => {
        res.redirect(SlackService.adapter.getInstallLink());
    };

    export const postReceive = (req: Request, res: Response, next: NextFunction) => {
        SlackService.adapter.processActivity(req, res, async (context) => {
            const activity = context.activity;

            switch (activity.channelData.callback_id) {
                case 'meme_select':
                    const actions: any[] = activity.channelData.actions;
                    if (!actions) {
                        await context.sendActivity('No meme selected');
                        break;
                    }
                    if (actions.length > 1) {
                        await context.sendActivity('Select only one meme');
                    }
                    MemeService.updateMemeWall(actions[0].value);
                    await context.sendActivity('Meme changed');
                    break;
                default:
                    Logger.warn(`Unknown callback_id - ${activity.channelData.callback_id}`);
            }
        });
    };

    export const postMeme = (req: Request, res: Response, next: NextFunction) => {
        SlackService.adapter.processActivity(req, res, async (context) => {
            const activity = context.activity;
            const command = activity.text.split(' ');
            const helpMessage =
            'To use the Meme Wall you can do following things\n' +
            ' - Use an image url\n' +
            ' - Use an exisiting meme\n' +
            'to see all commands enter /memewall commands\n\n' +
            'See you later :woman-tipping-hand:';

            const helpCommandsMessage =
            'You can use following command syntax\n' +
            ' - /memewall url [url_to_the_image] [name]\n' +
            ' - /memewall show [image_name]\n' +
            ' - /memewall list\n';


            switch (command[0]) {
                case '':
                case 'help':
                    await context.sendActivity(helpMessage);
                    break;
                case 'commands':
                    await context.sendActivity(helpCommandsMessage);
                    break;
                // case 'upload':
                //     const files: IFilesUpload[] = activity.channelData.files;
                //     if (files.length > 1) {
                //         await context.sendActivity('Only one image allowed');
                //         break;
                //     }
                //     await SlackService.downloadImageFromSlack(files[0].url_private);
                //     break;
                case 'url':
                    const url = command[1];
                    const filename = command[2];
                    if (!url) {
                        await context.sendActivity('No url specified');
                        break;
                    }
                    if (!filename) {
                        await context.sendActivity('No filename specified');
                        break;
                    }
                    try {
                        await MemeService.updateMemeWallUrl(url, filename);
                        await context.sendActivity('Meme successful updated');
                    } catch (e) {
                        if (e instanceof MemeWallError) {
                            await context.sendActivity(e.message);
                            break;
                        }
                        await context.sendActivity('Unknown error');
                    }
                    break;
                case 'list':
                    const files = MemeService.getAllFiles();
                    await context.sendActivity(generateFileSelectMessage(files));
                    break;
                case 'show':
                    const file = command[1];
                    if (!file) {
                        await context.sendActivity('No filename specified');
                        break;
                    }
                    try {
                        await MemeService.updateMemeWall(file);
                        await context.sendActivity('Meme successful updated');
                    } catch (e) {
                        if (e instanceof MemeWallError) {
                            await context.sendActivity(e.message);
                            break;
                        }
                        await context.sendActivity('Unknown error');
                    }
                    break;
                default:
                    const message =
                    `Unknown command ${activity.text}`;
                    await context.sendActivities([{
                        type: 'message',
                        text: message
                    }, {
                        type: 'message',
                        text: helpCommandsMessage
                    }]);
            }
            // console.log(context);
            return;
        });
    };

    const generateFileSelectMessage = (files: string[]): any => {
        const message = {
            text: 'Select one of this memes',
            attachments: [{
                text: 'Select goddamit',
                contentType: 'string',
                fallback: 'Unable to choose meme',
                callback_id: 'meme_select',
                actions: [] as object[]
            }]
        };
        files.forEach((file) => {
            const action = {
                name: file,
                text: file,
                type: 'button',
                value: file
            };
            message.attachments[0].actions.push(action);
        });

        return message;
    };

    export const postEvent = (req: Request, res: Response, next: NextFunction) => {
        SlackService.adapter.processActivity(req, res, async (context) => {
            const activity = context.activity;
            // if (activity.type === 'message') {
            //     if (activity.channelData.subtype === 'file_share') {
            //         const files = activity.channelData.files as IFilesUpload[];
            //         if (files.length > 1) {
            //             await context.sendActivity('Only one image allowed');
            //             return;
            //         }
            //     }
            // }
            const message = {
                text: 'Jo',
                attachments: [{
                    text: 'asdf',
                    contentType: 'string',
                    fallback: 'Unable to choose meme',
                    callback_id: 'upload_meme',
                    actions: [{
                        name: 'test1',
                        text: 'test1',
                        type: 'button',
                        value: 'test1'
                    }, {
                        name: 'test2',
                        text: 'test2',
                        type: 'button',
                        value: 'test2'
                    }]
                }]
            };
            // await context.sendActivity(message);
        });
    };
}

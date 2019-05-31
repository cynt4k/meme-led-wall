import { SlackAdapter, SlackEventMiddleware, SlackMessageTypeMiddleware, SlackDialog } from 'botbuilder-adapter-slack';
import { Botkit, BotWorker, BotkitMessage } from 'botkit';
import request from 'request';
import { ISlackConfig, IExpressConfig, BotkitMessageSlackCommand, BotkitMessageBlockAction } from '@home/types';
import { ExpressService } from '../express';
import { MemeService } from '../meme';
import { MemeWallError } from '@home/errors';

export namespace SlackService {
    let config: ISlackConfig;
    let expressConfig: IExpressConfig;
    let dataPath: string;
    let apiUrl: string;
    export let controller: Botkit;
    export let adapter: SlackAdapter;

    export const init = (c: ISlackConfig, e: IExpressConfig, p: string, url: string): void => {
        config = c;
        expressConfig = e;
        apiUrl = url;
        dataPath = p;
        const redirectUri = `${url}/${e.version}/slack`;

        adapter = new SlackAdapter({
            clientSigningSecret: config.clientSigningKey,
            botToken: config.botToken,
            redirectUri: redirectUri,
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            scopes: [ 'commands', 'bot' ]
        });

        adapter.use(new SlackEventMiddleware());
        adapter.use(new SlackMessageTypeMiddleware());


        controller = new Botkit({
            adapter: adapter,
            disable_webserver: true
        });
        setupController();
    };

    const setupController = (): void => {
        controller.on('slash_command', handleSlashCommand);
        controller.on('interactive_message', handleInteractiveMessage);
        controller.on('dialog_submission', handleDialogSubmission);
        controller.on('block_actions', handleBlockActions);
    };

    const handleBlockActions = async (bot: BotWorker, entryMessage: BotkitMessage) => {
        const message = <BotkitMessageBlockAction> entryMessage;

        if (message.actions.length === 0) {
            await bot.reply(message, 'No action provided');
            return;
        }

        if (message.actions[0].block_id === 'meme_select') {
            const action = message.actions[0];
            await MemeService.updateMemeWall(action.value);
            await bot.reply(message, 'Meme updated');
            return;
        }
    };

    const handleSlashCommand = async (bot: BotWorker, entryMessage: BotkitMessage) => {
        const message = <BotkitMessageSlackCommand> entryMessage;
        switch (message.command) {
            case '/memewall': await handleMemeWall(bot, message); break;
            default: await bot.reply(message, 'Unknown slash command');
        }
    };

    const handleMemeWall = async (bot: BotWorker, message: BotkitMessageSlackCommand) => {
        const commands = message.text.split(' ');

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

        switch (commands[0]) {
            case '':
            case 'help':
                await bot.reply(message, helpMessage);
                break;
            case 'commands':
                await bot.reply(message, helpCommandsMessage);
                break;
            case 'url':
                const url = commands[1];
                const filename = commands[2];
                if (!url) {
                    await bot.reply(message, 'No url specified');
                    break;
                }
                if (!filename) {
                    await bot.reply(message, 'No filename specified');
                    break;
                }
                try {
                    await MemeService.updateMemeWallUrl(url, filename);
                    await bot.reply(message, 'Meme updated');
                } catch (e) {
                    if (e instanceof MemeWallError) {
                        await bot.reply(message, e.message);
                        break;
                    }
                    await bot.reply(message, e);
                }
                break;
            case 'list':
                const files = MemeService.getAllFiles();
                await bot.reply(message, 'This could take some time - don\'t panic');
                await bot.reply(message, generateFileSelectMessage(files));
                break;
            case 'show':
                const file = commands[1];
                if (!file) {
                    await bot.reply(message, 'No filename specified');
                    break;
                }
                try {
                    await MemeService.updateMemeWall(file);
                    await bot.reply(message, 'Meme updated');
                } catch (e) {
                    if (e instanceof MemeWallError) {
                        await bot.reply(message, e.message);
                        break;
                    }
                    await bot.reply(message, 'Unknown error');
                }
                break;
            default:
                await bot.reply(message, 'Unknown command');
                await bot.reply(message, helpCommandsMessage);
                break;
        }
    };

    const generateFileSelectMessage = (files: string[]): any => {
        const message = {
            blocks: [] as any[]
        };

        const numberMemes = files.length;

        message.blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `We found *${numberMemes}* memes in our fancy Database`
            }
        });

        message.blocks.push({
            type: 'divider'
        });

        files.forEach((file) => {
            const webUrl = `${apiUrl}/files/${file}`;
            const fileInfos = file.split('.');
            const fileType = fileInfos[1];
            const fileName = fileInfos[0];

            message.blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `Filename: *${fileName}*\nFiletype: *${fileType}*`
                },
                accessory: {
                    type: 'image',
                    image_url: webUrl,
                    alt_text: file
                }
            });
        });

        message.blocks.push({
            type: 'divider'
        });

        const buttons = {
            type: 'actions',
            block_id: 'meme_select',
            elements: [] as any[]
        };

        files.forEach((file) => {
            buttons.elements.push({
                type: 'button',
                text: {
                    type: 'plain_text',
                    emoji: true,
                    text: file
                },
                value: file
            });
        });

        message.blocks.push(buttons);

        return message;
    };

    const handleInteractiveMessage = async (bot: BotWorker, message: BotkitMessage) => {
        console.log(message);
        await bot.reply(message, 'interactive');
    };

    const handleDialogSubmission = async (bot: BotWorker, message: BotkitMessage) => {
        console.log(message);
        await bot.reply(message, 'dialogsumission');
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

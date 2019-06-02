import { SlackAdapter, SlackEventMiddleware, SlackMessageTypeMiddleware, SlackDialog, SlackBotWorker } from 'botbuilder-adapter-slack';
import { Botkit, BotWorker, BotkitMessage } from 'botkit';
import request from 'request';
import { exec } from 'child_process';
import { ISlackConfig, IExpressConfig, BotkitMessageSlackCommand, BotkitMessageBlockAction } from '@home/types';
import { MemeService } from '../meme';
import { MemeWallError } from '@home/errors';


export namespace SlackService {
    let config: ISlackConfig;
    let expressConfig: IExpressConfig;
    let dataPath: string;
    let apiUrl: string;
    let adminPassword: string;
    export let controller: Botkit;
    export let adapter: SlackAdapter;

    export const init = (c: ISlackConfig, e: IExpressConfig, p: string, url: string, ap: string): void => {
        config = c;
        expressConfig = e;
        apiUrl = url;
        dataPath = p;
        adminPassword = ap;
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

    const handleBlockActions = async (entryBot: BotWorker, entryMessage: BotkitMessage) => {
        const message = <BotkitMessageBlockAction> entryMessage;
        const bot = <SlackBotWorker> entryBot;

        if (message.actions.length === 0) {
            await bot.reply(message, 'No action provided :never-give-up:');
            return;
        }

        if (message.actions[0].block_id === 'meme_select') {
            const action = message.actions[0];
            await MemeService.updateMemeWall(action.value);
            return await bot.replyInteractive(message, 'Meme updated :bananadance:');
        }

        if (message.actions[0].block_id === 'meme_preview') {
            const action = message.actions[0];
            const selected = action.selected_option;
            if (!selected) {
                return await bot.reply(message, 'No valid file selected :never-give-up:');
            }
            const files = MemeService.getAllFiles();
            const newMessage = generateFilePreview(files, selected.value);
            return await bot.replyInteractive(message, newMessage);
        }
    };

    const handleSlashCommand = async (bot: BotWorker, entryMessage: BotkitMessage) => {
        const message = <BotkitMessageSlackCommand> entryMessage;
        switch (message.command) {
            case '/memewall': await handleMemeWall(bot, message); break;
            default: await bot.reply(message, 'Unknown slash command :never-give-up:');
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
        ' - /memewall list\n' +
        ' - /memewall preview [image_name]\n' +
        ' - /memewall stop\n' +
        ' - /memewall poweroff [password]\n' +
        ' - /memewall reboot [password]';

        let files: string[];
        let file: string;

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
                    await bot.reply(message, 'No url specified :never-give-up:');
                    break;
                }
                if (!filename) {
                    await bot.reply(message, 'No filename specified :never-give-up:');
                    break;
                }
                try {
                    await MemeService.updateMemeWallUrl(url, filename);
                    await bot.reply(message, 'Meme updated :bananadance:');
                } catch (e) {
                    if (e instanceof MemeWallError) {
                        await bot.reply(message, e.message);
                        break;
                    }
                    await bot.reply(message, e);
                }
                break;
            case 'list':
                files = MemeService.getAllFiles();
                await bot.reply(message, generateFilePreview(files));
                break;
            case 'preview':
                file = commands[1];
                if (!file) {
                    await bot.reply(message, 'No filename specified :never-give-up:');
                    break;
                }
                if (!MemeService.fileExist(file)) {
                    await bot.reply(message, 'File does not exist :never-give-up:');
                    break;
                }
                files = MemeService.getAllFiles();
                await bot.reply(message, generateFilePreview(files, file));
                break;
            case 'show':
                file = commands[1];
                if (!file) {
                    await bot.reply(message, 'No filename specified :never-give-up:');
                    break;
                }
                try {
                    await MemeService.updateMemeWall(file);
                    await bot.reply(message, 'Meme updated :bananadance:');
                } catch (e) {
                    if (e instanceof MemeWallError) {
                        await bot.reply(message, e.message);
                        break;
                    }
                    await bot.reply(message, 'Unknown error :never-give-up:');
                }
                break;
            case 'stop':
                try {
                    await MemeService.stopMemeWall();
                    await bot.reply(message, 'Meme killed :aaw-yeah:');
                } catch (e) {
                    if (e instanceof MemeWallError) {
                        await bot.reply(message, e.message);
                        break;
                    }
                    await bot.reply(message, 'Unkown error :never-give-up:');
                }
                break;
            case 'reboot':
            case 'poweroff':
                const password = commands[1];
                if (!password) {
                    await bot.reply(message, 'No password provided :never-give-up:');
                    break;
                }
                if (password !== adminPassword) {
                    await bot.reply(message, 'Wrong password :never-give-up:');
                    break;
                }
                await bot.reply(message, 'Shutdown/reboot now');
                await (async () => new Promise<void>((resolve, reject) => {
                    let command = 'shutdown';
                    if (commands[0] === 'reboot') {
                        command = 'reboot';
                    }
                    exec(command, async (err, stdout, stderr) => {
                        if (err) await bot.reply(message, 'Error while shutdown/reboot');
                        return resolve();
                    });
                }))();
                break;
            default:
                await bot.reply(message, 'Unknown command :never-give-up:');
                await bot.reply(message, helpCommandsMessage);
                break;
        }
    };

    const generateFilePreview = (files: string[], selected?: string): any => {
        const message = {
            blocks: [] as any[]
        };

        const select = {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: 'Pick a nice meme from the dropdown'
            },
            block_id: 'meme_preview',
            accessory: {
                type: 'static_select',
                placeholder: {
                    type: 'plain_text',
                    text: 'Select a meme',
                    emoji: true
                },
                options: [] as any[]
            }
        };

        files.forEach((file) => {
            select.accessory.options.push({
                text: {
                    type: 'plain_text',
                    text: file,
                    emoji: true
                },
                value: file
            });
        });

        message.blocks.push(select);

        if (selected) {
            message.blocks.push({
                type: 'divider'
            });

            const webUrl = `${apiUrl}/files/${selected}`;
            const fileInfos = selected.split('.');
            const fileName = fileInfos[0];
            const fileType = fileInfos[1];

            message.blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `Filename: ${fileName}\nFiletype: ${fileType}`
                },
                accessory: {
                    type: 'image',
                    image_url: webUrl,
                    alt_text: selected
                }
            });

            message.blocks.push({
                type: 'divider'
            });

            message.blocks.push({
                type: 'section',
                text: {
                    type: 'plain_text',
                    text: ' '
                },
                block_id: 'meme_select',
                accessory: {
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: 'Show this meme NOW :party-parrot:',
                        emoji: true
                    },
                    value: selected
                }
            });
        }

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

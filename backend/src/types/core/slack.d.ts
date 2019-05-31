import { BotkitMessage } from 'botkit';

interface BotkitMessageSlackCommand extends BotkitMessage {
    command: string;
    text: string;
}

interface BotkitMessageBlockAction extends BotkitMessage {
    actions: any[]
}
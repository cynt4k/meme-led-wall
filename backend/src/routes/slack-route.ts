import { Router } from 'express';
import { SlackService } from '@home/core/services';
import { SlackController } from '@home/controller/slack';

const router: Router = Router();

router.post('/receive', SlackController.postReceive);
router.post('/meme', SlackController.postMeme);
router.post('/event', SlackController.postEvent);

export const SlackRoute: Router = router;

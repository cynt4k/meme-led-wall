import { Router } from 'express';
import { CheckAuth } from '@home/core/services';

const router: Router = Router();

router.post('/upload', CheckAuth.isAuth);

export const MemeRouter: Router = router;

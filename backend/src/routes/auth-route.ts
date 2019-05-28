import { Router } from 'express';
import { AuthController } from '@home/controller/auth';

const router: Router = Router();

router.post('/login', AuthController.postLoginLdap);

export const AuthRoute: Router = router;

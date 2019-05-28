import { Router, Request } from 'express';
import multer from 'multer';
import path from 'path';
import { CheckAuth } from '@home/core/services';
import { MemeController } from '@home/controller';
import { HttpCodes, I18n } from '@home/misc';
import { MemeWallError } from '@home/errors';

const upload: multer.Instance = multer({
    fileFilter: function(req: Request, file, cb) {
        const filetypes = /jpeg|jpg|gif|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new MemeWallError(I18n.WARN_VAL_WRONG_FILETYPE), false);
    }
});
const router: Router = Router();

router.post('/upload', CheckAuth.isAuth, upload.single('meme'), MemeController.postUploadMeme);
router.post('/show', CheckAuth.isAuth, MemeController.postShowMeme);

export const MemeRouter: Router = router;

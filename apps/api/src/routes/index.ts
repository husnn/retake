import { NextFunction, Request, Response, Router } from 'express';

import AuthController from '../controllers/AuthController';
import VideoController from '../controllers/VideoController';
import WebhookController from '../controllers/WebhookController';
import initAuthRouter from './auth.routes';
import initVideoRouter from './video.routes';

export default function init(
  router: Router,
  authController: AuthController,
  videoController: VideoController,
  webhookController: WebhookController
) {
  router.use('/auth', initAuthRouter(authController));
  router.use('/videos', initVideoRouter(videoController));

  router.post('/webhook', (req: Request, res: Response, next: NextFunction) =>
    webhookController.handle(req, res, next)
  );
}

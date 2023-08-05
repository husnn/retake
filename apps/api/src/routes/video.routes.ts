import { NextFunction, Request, Response, Router } from 'express';
import { body } from 'express-validator';
import VideoController from '../controllers/VideoController';
import authMiddleware from '../middleware/authMiddleware';

export default function init(videoController: VideoController): Router {
  const router = Router();

  router.put(
    '/',
    body('title').trim(),
    body('fileName').trim(),
    body('fileType').trim(),
    body('fileSize').isInt({ min: 1 }),
    authMiddleware,
    (req: Request, res: Response, next: NextFunction) =>
      videoController.create(req, res, next)
  );

  router.post(
    '/:id/process',
    authMiddleware,
    (req: Request, res: Response, next: NextFunction) =>
      videoController.process(req, res, next)
  );

  router.get(
    '/jobs/:id',
    authMiddleware,
    (req: Request, res: Response, next: NextFunction) =>
      videoController.getJobStatus(req, res, next)
  );

  router.get(
    '/',
    authMiddleware,
    (req: Request, res: Response, next: NextFunction) =>
      videoController.list(req, res, next)
  );

  router.get(
    '/:id/clips',
    authMiddleware,
    (req: Request, res: Response, next: NextFunction) =>
      videoController.listClips(req, res, next)
  );

  return router;
}

import { VideoService } from '@retake/core';
import { WebhookRequest } from '@retake/shared';
import { NextFunction, Request, Response } from 'express';
import { HttpResponse } from '../http';

export class WebhookController {
  private videoService: VideoService;

  constructor(videoService: VideoService) {
    this.videoService = videoService;
  }

  async handle(req: Request, res: Response, next: NextFunction) {
    try {
      const body: WebhookRequest = req.body;

      console.log(JSON.stringify(body));

      switch (body.operation) {
        case 'process_video':
          await this.videoService.onJobCompleted(body.jobId, body.success);
      }

      return new HttpResponse(res);
    } catch (err) {
      next(err);
    }
  }
}

export default WebhookController;

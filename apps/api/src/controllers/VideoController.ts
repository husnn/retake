import { VideoService, WrappedError } from '@retake/core';
import {
  CreateVideoResponse,
  JobStatusResponse,
  ProcessVideoResponse
} from '@retake/shared';
import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { HttpResponse, ValidationError } from '../http';

class VideoController {
  private videoService: VideoService;

  constructor(videoService: VideoService) {
    this.videoService = videoService;
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new ValidationError();

      const { title, fileName, fileType, fileSize } = req.body;

      const result = await this.videoService.create(
        req.session.user,
        title,
        fileName,
        fileType,
        fileSize
      );
      if (!result.success) throw new Error('Error creating video.');

      return new HttpResponse<CreateVideoResponse>(res, {
        body: result.data
      });
    } catch (err) {
      next(err);
    }
  }

  async process(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new ValidationError();

      const { id } = req.params;

      const result = await this.videoService.process(req.session.user, id);
      if (!result.success)
        throw WrappedError.from(result.error, 'Error processing video.');

      return new HttpResponse<ProcessVideoResponse>(res);
    } catch (err) {
      next(err);
    }
  }

  async getJobStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new ValidationError();

      const { id } = req.params;

      const result = await this.videoService.getJobStatus(id);
      if (!result.success)
        throw WrappedError.from(result.error, 'Error getting job status.');

      return new HttpResponse<JobStatusResponse>(res, { body: result.data });
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      //
    } catch (err) {
      next(err);
    }
  }

  async listClips(req: Request, res: Response, next: NextFunction) {
    try {
      //
    } catch (err) {
      next(err);
    }
  }
}

export default VideoController;

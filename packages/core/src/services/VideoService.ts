import { Result, S3SignedURL, VideoState } from '@retake/shared';
import path from 'path';
import { WrappedError } from '../base';
import {
  ChangeReason,
  ComputeProvider,
  FileProvider,
  Job,
  JobType,
  Video
} from '../entities';
import { FileRepository, JobRepository, UserRepository } from '../repositories';
import VideoRepository from '../repositories/VideoRepository';
import BillingService from './BillingService';
import S3Service from './S3Service';
import SageService, { SageJob, VideoResult } from './SageService';

export class VideoService {
  private userRepository: UserRepository;
  private videoRepository: VideoRepository;
  private fileRepository: FileRepository;
  private jobRepository: JobRepository;
  private sageService: SageService;
  private billingService: BillingService;

  private s3: S3Service;

  constructor(
    userRepository: UserRepository,
    videoRepository: VideoRepository,
    fileRepository: FileRepository,
    jobRepository: JobRepository,
    sageService: SageService,
    billingService: BillingService,
    s3: S3Service
  ) {
    this.userRepository = userRepository;
    this.videoRepository = videoRepository;
    this.fileRepository = fileRepository;
    this.jobRepository = jobRepository;
    this.sageService = sageService;
    this.billingService = billingService;
    this.s3 = s3;
  }

  async create(
    userId: string,
    title: string,
    fileName: string,
    fileType: string,
    fileSize: number
  ): Promise<Result<{ id: string; uploadUrl: S3SignedURL }>> {
    const ext = path.extname(fileName);
    if (!ext) return Result.fail(new Error('Invalid file extension.'));

    // Max file size (5 GB)
    if (fileSize / 1024 / 1024 / 1024 > 5)
      return Result.fail(new Error('File too large'));

    const video: Video = await this.videoRepository.create({
      dateCreated: new Date(),
      userId,
      title,
      status: VideoState.Created
    });

    const s3Path = buildS3VideoPath(video.id, ext);

    const res = await this.s3.getSignedUploadUrl(s3Path, fileType, fileSize);
    if (!res.success) return Result.fail(res.error);

    // Create and assign file to video.
    const file = await this.fileRepository.create({
      dateCreated: new Date(),
      provider: FileProvider.S3,
      uri: this.s3.buildUri(s3Path),
      byteSize: fileSize.toString()
    });

    await this.videoRepository.update({ ...video, fileId: file.id });

    return Result.ok({ id: video.id, uploadUrl: res.data });
  }

  async process(userId: string, videoId: string): Promise<Result> {
    const video = await this.videoRepository.get(videoId);
    if (!video) return Result.fail(new Error('Video not found'));

    if (video.userId != userId) return Result.fail(new Error('Unauthorized'));

    await this.videoRepository.update({
      ...video,
      status: VideoState.Processing
    });

    if (!video.fileId) {
      return Result.fail(new Error('Missing video file.'));
    }

    const videoFile = await this.fileRepository.get(video.fileId);

    const s3Key = this.s3.extractKey(videoFile.uri);

    const videoInfo = await this.sageService.getVideoInfo(videoId, s3Key);
    if (!videoInfo.success)
      return Result.fail(
        WrappedError.from(videoInfo.error, 'Could not get video info.')
      );

    const creditsAvailable = await this.billingService.getAvailableCredits(
      video.userId
    );
    if (!creditsAvailable.success) {
      throw new WrappedError(
        creditsAvailable.error,
        'Could not get available credit balance.'
      );
    }

    const videoLengthMins = Math.round(videoInfo.data.duration_ms / 1000 / 60);

    if (videoLengthMins > creditsAvailable.data) {
      throw new Error('Insufficient credits.');
    }

    try {
      const remoteJob = await this.sageService.processVideo(
        videoId,
        s3Key,
        video.title
      );
      if (!remoteJob.success) {
        throw WrappedError.from(remoteJob.error, 'Error processing video.');
      }

      const job = await this.jobRepository.create({
        dateCreated: new Date(),
        type: JobType.ProcessVideo,
        provider: ComputeProvider.Modal,
        externalId: remoteJob.data.id,
        resourceId: video.id,
        cost: videoLengthMins,
        completed: false,
        successful: false
      });

      const balanceReserve = await this.billingService.reserve(
        video.userId,
        videoLengthMins,
        ChangeReason.VideoProcessingJob,
        job.id
      );
      if (!balanceReserve.success) {
        throw WrappedError.from(
          balanceReserve.error,
          'Could not reserve balance required.'
        );
      }
    } catch (err) {
      return Result.fail(err);
    }

    return Result.ok();
  }

  async onJobCompleted(externalId: string, success: boolean) {
    const job = await this.jobRepository.findOne({ externalId });
    if (job.completed) return; // Already finalised

    const video = await this.videoRepository.get(job.resourceId);

    const release = await this.billingService.release(
      video.userId,
      job.cost,
      ChangeReason.VideoProcessingJob,
      job.id
    );
    if (!release.success) {
      throw WrappedError.from(
        release.error,
        'Error releasing funds for video processing.'
      );
    }

    const jobStatus = await this.getJobStatus<VideoResult>(job.id, job);
    if (!jobStatus.success)
      return Result.fail(undefined, 'Error getting job status');

    if (!success) {
      await this.videoRepository.update({
        ...video,
        status: VideoState.Terminated
      });
    } else {
      await this.onVideoProcessed(job, video, jobStatus.data.result);
    }

    await this.jobRepository.update({
      ...job,
      completed: true,
      successful: success,
      result: jobStatus.data.result
    });
  }

  private async onVideoProcessed(job: Job, video: Video, result: VideoResult) {
    const debit = await this.billingService.debit(
      video.userId,
      job.cost,
      ChangeReason.VideoProcessingJob,
      job.id
    );
    if (!debit.success) {
      throw WrappedError.from(
        debit.error,
        'Error debiting funds for video processing.'
      );
    }

    // TODO: Create clips.

    await this.videoRepository.update({
      ...video,
      status: VideoState.Done
    });
  }

  async getJobStatus<T = unknown>(
    id: string,
    job?: Job
  ): Promise<Result<SageJob<T>>> {
    if (!job) job = await this.jobRepository.get(id);
    if (!job) return Result.fail();

    return this.sageService.getJobStatus<T>(job.externalId);
  }
}

const buildS3VideoPath = (id: string, ext: string): string => {
  return `videos/${id}/video${ext}`;
};

export default VideoService;

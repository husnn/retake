import { Result } from '@retake/shared';
import axios, { Axios } from 'axios';

type Source = {
  type: 'S3';
  uri: string;
};

type Video = {
  width: number;
  height: number;
  fps: number;
  duration_ms: number;
};

type ProcessRequest = {
  id: string;
  src: Source;
  title: string;
  webhook_endpoint?: string;
};

export type SageJob<T = undefined> = {
  id: string;
  call_id: string;
  result?: T;
  completed: boolean;
  created_at?: Date;
};

type Segment = {
  title: string;
  duration: number;
  timeranges: Array<[number, number]>;
};

type FaceData = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

type FrameData = {
  frame: number;
  time: number;
  faces: FaceData[];
};

type AlignedSegment = {
  start: number;
  end: number;
  text: string;
  words: object;
};

type Clip = Segment & {
  id: number;
  file: Source;
  preview_file: Source;
  frame_data: FrameData[];
  speech_data: AlignedSegment[];
};

enum FailureReason {
  TooLong = 'TOO_LONG'
}

export type VideoResult = {
  id: string;
  original_file: Source;
  clips: Clip[];
  failure_reason?: FailureReason;
};

type Response = {
  success: boolean;
  error?: string;
};

export class SageService {
  private client: Axios;
  private webhookUrl?: string;

  constructor(
    baseUrl: string = process.env.SAGE_API_URL,
    opts?: { webhookUrl?: string }
  ) {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 10 * 1000 * 60 // 10m
    });
    this.webhookUrl = opts?.webhookUrl;
  }

  async getVideoInfo(id: string, s3Key: string): Promise<Result<Video>> {
    try {
      const res = await this.client.post<Response & Video>('/api/video_info', {
        id,
        src: {
          type: 'S3',
          uri: s3Key
        }
      } as ProcessRequest);

      const { success, error, ...video } = res.data;
      if (!success) throw new Error(error);

      return Result.ok(video);
    } catch (err) {
      return Result.fail(err);
    }
  }

  async processVideo(
    id: string,
    s3Key: string,
    title: string
  ): Promise<Result<SageJob>> {
    try {
      const res = await this.client.post<Response & { job: SageJob }>(
        '/api/process',
        {
          id,
          src: {
            type: 'S3',
            uri: s3Key
          },
          title,
          webhook_endpoint: this.webhookUrl
        } as ProcessRequest
      );

      const { success, error, job } = res.data;
      if (!success) throw new Error(error);

      return Result.ok(job);
    } catch (err) {
      return Result.fail(err);
    }
  }

  async getJobStatus<T = unknown>(jobId: string): Promise<Result<SageJob<T>>> {
    try {
      const res = await this.client.get<Response & SageJob>(
        `/api/status/${jobId}`
      );

      const { success, error, ...job } = res.data;
      if (!success) throw new Error(error);

      return Result.ok(job);
    } catch (err) {
      return Result.fail(err);
    }
  }

  async getResult(videoId: string): Promise<Result<VideoResult>> {
    try {
      const res = await this.client.get<Response & VideoResult>(
        `/api/results/${videoId}`
      );

      const { success, error, ...result } = res.data;
      if (!success) throw new Error(error);

      return Result.ok(result);
    } catch (err) {
      return Result.fail(err);
    }
  }

  async onVideoProcessed(result: VideoResult): Promise<Result> {
    // TODO
    return Result.ok();
  }
}

export default SageService;

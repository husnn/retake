export type WebhookRequest<T = object> = {
  operation: 'process_video';
  success: boolean;
  jobId: string;
} & T;

export default WebhookRequest;

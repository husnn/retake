import { NotFound, PutObjectCommand, S3 } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Result, S3SignedURL } from '@retake/shared';

export class S3Service {
  bucketName: string;
  region: string;

  s3: S3;

  constructor(bucketName: string, region = 'eu-west-1') {
    this.bucketName = bucketName;
    this.region = region;

    this.s3 = new S3({ region });
  }

  async fileSize(key: string): Promise<Result<number>> {
    try {
      const res = await this.s3.headObject({
        Bucket: this.bucketName,
        Key: key
      });
      return Result.ok(res.ContentLength);
    } catch (err) {
      if (err instanceof NotFound) return Result.ok(0);
      return Result.fail(err);
    }
  }

  async getSignedUploadUrl(
    key: string,
    fileType: string,
    fileSize: number
  ): Promise<Result<S3SignedURL>> {
    let signed: string;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: fileType,
        ContentLength: fileSize
        // ACL: 'public-read'
      });

      signed = await getSignedUrl(this.s3, command, {
        expiresIn: 30
      });
    } catch (err) {
      console.log(err);
    }

    return signed
      ? Result.ok({
          signed,
          url: this.buildUrl(key)
        })
      : Result.fail();
  }

  buildUrl(key: string): string {
    if (key.charAt(0) == '/') key = key.slice(1);

    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  buildUri(key: string): string {
    if (key.charAt(0) == '/') key = key.slice(1);

    return `s3://${this.bucketName}/${key}`;
  }

  extractKey(uri: string): string {
    if (uri.startsWith('s3://')) {
      return uri.replace(`s3://${this.bucketName}/`, '');
    } else if (uri.startsWith('https://')) {
      // TODO
    }

    return uri;
  }
}

export default S3Service;

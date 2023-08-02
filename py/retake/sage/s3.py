import boto3
import tempfile

from botocore.errorfactory import ClientError

s3_client = boto3.client('s3')
s3 = boto3.resource('s3')


def download_file(bucket_name: str, key: str):
    f = tempfile.NamedTemporaryFile(mode="wb")
    s3_client.download_fileobj(bucket_name, key, f)
    f.flush()
    return f


def download_file_to_path(bucket_name: str, key: str, dst: str):
    s3_client.download_file(bucket_name, key, dst)


def upload_file(src: str, bucket_name: str, key: str, content_type = None):
    from .config import USE_S3_STORE

    if not USE_S3_STORE: return

    args = dict()

    if content_type is not None:
        args["ContentType"] = content_type

    s3_client.upload_file(
        Filename=src,
        Bucket=bucket_name,
        Key=key,
        ExtraArgs=args
    )

    return f"s3://{bucket_name}/{key}"


def file_exists(bucket_name: str, key: str):
    try:
        s3_client.head_object(
            Bucket=bucket_name,
            Key=key
        )
    except ClientError:
        return False

    return True

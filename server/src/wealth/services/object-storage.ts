import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ApiError } from "../errors.js";

export interface ObjectStorage {
  put(key: string, body: Buffer, mimeType: string): Promise<void>;
  signedReadUrl(key: string): Promise<string>;
  delete(key: string): Promise<void>;
}

export class S3CompatibleStorage implements ObjectStorage {
  private readonly bucket = process.env.STORAGE_BUCKET;
  private readonly client: S3Client | undefined;

  constructor() {
    if (process.env.STORAGE_ENDPOINT && process.env.STORAGE_ACCESS_KEY && process.env.STORAGE_SECRET_KEY && this.bucket) {
      this.client = new S3Client({
        endpoint: process.env.STORAGE_ENDPOINT,
        region: process.env.STORAGE_REGION ?? "auto",
        forcePathStyle: true,
        credentials: { accessKeyId: process.env.STORAGE_ACCESS_KEY, secretAccessKey: process.env.STORAGE_SECRET_KEY },
      });
    }
  }

  newKey(userId: string, transactionId: string, extension: string) {
    return `receipts/${userId}/${transactionId}/${randomUUID()}.${extension}`;
  }

  private getConfig() {
    if (!this.client || !this.bucket) throw new ApiError(503, "STORAGE_UNAVAILABLE", "Receipt storage is not configured");
    return { client: this.client, bucket: this.bucket };
  }

  async put(key: string, body: Buffer, mimeType: string) {
    const { client, bucket } = this.getConfig();
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: mimeType, ServerSideEncryption: "AES256" }));
  }

  async signedReadUrl(key: string) {
    const { client, bucket } = this.getConfig();
    return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 300 });
  }

  async delete(key: string) {
    const { client, bucket } = this.getConfig();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }
}
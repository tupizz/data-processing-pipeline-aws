import { GetObjectCommand, PutObjectCommand, PutObjectCommandInput, S3Client } from "@aws-sdk/client-s3";
import { inject, injectable } from "tsyringe";

export interface IS3ServiceAdapter {
  uploadObject(key: string, body: object | string): Promise<void>;
  getObject(key: string): Promise<string>;
}

@injectable()
export class S3ServiceAdapter implements IS3ServiceAdapter {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  
  constructor(@inject("BucketName") bucketName: string) {
    this.s3Client = new S3Client({ region: process.env.AWS_REGION });
    this.bucketName = bucketName;
  }

  async uploadObject(key: string, body: object | string): Promise<void> {
    const params: PutObjectCommandInput = {
      Bucket: this.bucketName,
      Key: key,
      Body: typeof body === "string" ? body : JSON.stringify(body),
      ContentType: "application/json",
      ACL: "public-read",
    };

    await this.s3Client.send(new PutObjectCommand(params));
  }

  async getObject(key: string): Promise<string> {
    const params = { Bucket: this.bucketName, Key: key };
    const response = await this.s3Client.send(new GetObjectCommand(params));
    return response.Body?.transformToString() || "";
  }
}

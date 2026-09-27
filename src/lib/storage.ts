import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { env } from "@/lib/env";

function configured() {
  const e = env();
  cloudinary.config({
    cloud_name: e.CLOUDINARY_CLOUD_NAME,
    api_key: e.CLOUDINARY_API_KEY,
    api_secret: e.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

export async function uploadFile(buffer: Buffer, folder: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = configured().uploader.upload_stream({ folder }, (error, result) => {
      if (error || !result) reject(error ?? new Error("Upload that bai"));
      else resolve(result.secure_url);
    });
    stream.end(buffer);
  });
}

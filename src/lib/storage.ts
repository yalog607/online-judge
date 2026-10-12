import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { env } from "@/lib/env";

function configuredCloudinary() {
  const e = env();
  cloudinary.config({
    cloud_name: e.CLOUDINARY_CLOUD_NAME,
    api_key: e.CLOUDINARY_API_KEY,
    api_secret: e.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

export async function uploadFile(
  buffer: Buffer,
  folder: string,
  originalName?: string
): Promise<string> {
  const cld = configuredCloudinary();

  const safeName = originalName
    ? `${Date.now()}_${originalName.replace(/[^\w.-]/g, "_")}`
    : `${Date.now()}_file`;

  const isImage = originalName && /\.(png|jpe?g|gif|webp|svg)$/i.test(originalName);
  const resourceType = isImage ? "image" : "raw";

  return new Promise<string>((resolve, reject) => {
    const stream = cld.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id: safeName,
      },
      (error, result) => {
        if (error || !result) reject(error ?? new Error("Upload lên Cloudinary thất bại"));
        else resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

export function extractCloudinaryPublicId(
  url: string
): { publicId: string; resourceType: "raw" | "image" } | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("cloudinary.com")) return null;

    const parts = parsed.pathname.split("/").filter(Boolean);
    const resourceType = (parts[1] === "image" ? "image" : "raw") as "raw" | "image";

    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex === -1 || uploadIndex >= parts.length - 1) return null;

    let subParts = parts.slice(uploadIndex + 1);
    if (subParts.length > 0 && /^v\d+$/.test(subParts[0])) {
      subParts = subParts.slice(1);
    }
    const publicId = decodeURIComponent(subParts.join("/"));
    return { publicId, resourceType };
  } catch {
    return null;
  }
}

export function getPrivateDownloadUrl(
  publicId: string,
  resourceType: "raw" | "image" = "raw"
): string {
  const cld = configuredCloudinary();
  return cld.utils.private_download_url(publicId, "", {
    resource_type: resourceType,
    type: "upload",
  });
}


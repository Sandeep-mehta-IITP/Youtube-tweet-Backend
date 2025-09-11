import { Worker } from "bullmq";
import IORedis from "ioredis";
import mongoose from "mongoose";
import { Video } from "../models/video.models.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { apiError } from "../utils/apiError.js";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found in env");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Worker connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error in worker:", err);
    process.exit(1);
  });

const connection = new IORedis(process.env.REDIS_URI, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

const worker = new Worker(
  "video-processing",
  async (job) => {
    const { videoId, videoFileLocalPath, thumbnailLocalPath } = job.data;

    try {
      // console.log("uploading to cloudinary");

      const [videoFile, thumbnail] = await Promise.all([
        uploadOnCloudinary(videoFileLocalPath),
        uploadOnCloudinary(thumbnailLocalPath),
      ]);

      // console.log("uploaded to cloudinary");
      if (!videoFile || !thumbnail) {
        throw new apiError(
          500,
          "Failed to upload video or thumbnail to Cloudinary"
        );
      }

      await Video.findByIdAndUpdate(
        videoId,
        {
          $set: {
            status: "published",
            isPublished: true,
            duration: videoFile.duration,
            videoFile: {
              url: videoFile.secure_url,
              public_id: videoFile.public_id,
            },
            thumbnail: {
              url: thumbnail.secure_url,
              public_id: thumbnail.public_id,
            },
          },
        },
        { new: true }
      );
    } catch (error) {
      console.error("Video processing failed:", error.message);
      await Promise.all([
        videoFile?.public_id ? deleteFromCloudinary(videoFile.public_id) : null,
        thumbnail?.public_id ? deleteFromCloudinary(thumbnail.public_id) : null,
      ]).catch(() => {});

      await Video.findByIdAndUpdate(videoId, {
        status: "failed",
        isPublished: false,
      });
    }
  },
  { connection, concurrency: 5 }
);

worker.on("completed", (job) => console.log(`Job completed: ${job.id}`));
worker.on("failed", (job, err) => console.error(`Job failed: ${job.id}`, err));

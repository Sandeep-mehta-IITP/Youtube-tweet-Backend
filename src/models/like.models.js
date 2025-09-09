import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
  {
    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    tweet: {
      type: Schema.Types.ObjectId,
      ref: "Tweet",
    },
  },
  {
    timestamps: true,
  }
);

// ek user ek video ko ek bar hi like kre , usko prevent krne ke liye.
likeSchema.index({ video: 1, likedBy: 1 }, { unique: true }); 
export const Like = mongoose.model("Like", likeSchema);

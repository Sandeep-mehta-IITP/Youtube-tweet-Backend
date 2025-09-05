import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    channel: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index (optional) -> ek subscriber ek hi channel ko baar-baar subscribe na kar sake
subscriptionSchema.index({ subscriber: 1, channel: 1 }, { unique: true });
export const Subscription = mongoose.model("Subscription", subscriptionSchema);

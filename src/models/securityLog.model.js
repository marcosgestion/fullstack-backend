import mongoose from "mongoose";

const securityLogSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      enum: ["rate_limit", "brute_force", "suspicious_request"],
      required: true,
    },
    ip: {
      type: String,
      required: true,
    },
    method: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      default: "",
    },
    userEmail: {
      type: String,
      default: "",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    details: {
      type: Object,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

const SecurityLog = mongoose.model("SecurityLog", securityLogSchema);

export default SecurityLog;
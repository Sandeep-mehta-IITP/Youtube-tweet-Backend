import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//TODO: build a healthcheck response that simply returns the OK status as json with a message
const healthcheck = asyncHandler(async (req, res) => {
  try {
    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          {
            message: "Everything is OKAY",
            uptime: process.uptime(),
            timestamp: new Date(),
          },
          "Okay"
        )
      );
  } catch (error) {
    throw new apiError(503, "Healthcheck failed", error.message);
  }
});

export { healthcheck };

import ApiError from "../utils/ApiError.js";

export const serverIdExtract = (req, res, next) => {
    const serverId = req.header("x-server-id");

    if (!serverId?.trim()) {
        return next(new ApiError(400, "x-server-id header is required"));
    }

    req.serverId = serverId.trim();
    return next();
};

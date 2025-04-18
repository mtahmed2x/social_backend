import Activity from "@models/activityModel";
import User from "@models/userModel";
import { Request, Response, NextFunction } from "express";
import createError from "http-errors";
import { StatusCodes } from "http-status-codes";

const attendActivity = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const userId = req.user.userId;
  const activity = await Activity.findById(req.body.id);
  if (!activity) throw createError(StatusCodes.NOT_FOUND, "Activity Not found!");

  if (activity.isPrivateActivity) activity.attendeesRequests.push(userId);
  else {
    activity.attendees++;
    activity.attendeesIds.push(userId);
  }
  await activity.save();
  return res.status(StatusCodes.OK).json({ success: true, message: "Success", data: {} });
};

const cancelAttendingActivity = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const userId = req.user.userId;
  const activity = await Activity.findById(req.body.id);

  if (!activity) throw createError(StatusCodes.NOT_FOUND, "Activity not found!");

  if (!activity.attendeesIds.map((id) => id.toString()).includes(userId.toString())) {
    throw createError(StatusCodes.BAD_REQUEST, "User is not attending this activity");
  }

  activity.attendeesIds = activity.attendeesIds.filter((attendeesId) => attendeesId.toString() !== userId.toString());
  activity.attendees = Math.max(activity.attendees - 1, 0);

  await activity.save();

  return res
    .status(StatusCodes.OK)
    .json({ success: true, message: "Successfully canceled attendance", data: activity });
};

const cancelRequest = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const activity = await Activity.findById(req.body.id);
  const userId = req.user.userId;

  if (!activity) throw createError(StatusCodes.NOT_FOUND, "Activity Not found!");

  if (!activity.attendeesRequests.map((id) => id.toString()).includes(userId.toString())) {
    throw createError(StatusCodes.BAD_REQUEST, "User is not attending this activity");
  }

  activity.attendeesRequests = activity.attendeesRequests.filter(
    (attendeesId) => attendeesId.toString() !== userId.toString()
  );
  await activity.save();

  return res.status(StatusCodes.OK).json({ success: true, message: "Success", data: {} });
};

const getActivityRequests = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const activity = await Activity.findById(req.body.id).populate("attendeesRequests");

  if (!activity) throw createError(StatusCodes.NOT_FOUND, "Activity Not found!");

  if (activity.host.toString() !== req.user.userId.toString())
    throw createError(StatusCodes.UNAUTHORIZED, "You are not authorized to do this");

  if (activity.attendeesRequests.length === 0)
    return res.status(StatusCodes.OK).json({ success: true, message: "No requests for the activity", data: {} });

  return res
    .status(StatusCodes.OK)
    .json({ success: true, message: "Success", data: { requests: activity.attendeesRequests } });
};

const activityRequestAction = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { userId, action, id } = req.body;
  if (action !== "accept" && action !== "reject") throw createError(StatusCodes.NOT_FOUND, "Invalid action!");

  let activity = await Activity.findById(id);
  if (!activity) throw createError(StatusCodes.NOT_FOUND, "Activity Not found!");

  if (activity.host.toString() !== req.user.userId.toString())
    throw createError(StatusCodes.UNAUTHORIZED, "You are not authorized to do this");

  const user = await User.findById(userId);
  if (!user) throw createError(StatusCodes.NOT_FOUND, "User Not found!");

  if (!activity.attendeesRequests.map((id) => id.toString()).includes(userId.toString()))
    throw createError(StatusCodes.BAD_REQUEST, "No request found by the user");

  if (action === "accept") activity.attendeesIds.push(userId);

  activity.attendeesRequests = activity.attendeesRequests.filter(
    (attendeesId) => attendeesId.toString() !== userId.toString()
  );

  await activity.save();

  return res.status(StatusCodes.OK).json({ success: true, message: "Success", data: {} });
};

const ActivityServices = {
  attendActivity,
  cancelAttendingActivity,
  cancelRequest,
  getActivityRequests,
  activityRequestAction,
};

export default ActivityServices;

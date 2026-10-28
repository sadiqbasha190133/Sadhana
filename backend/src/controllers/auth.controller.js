
import {
  signupUser,
  signinUser,
  getAuthenticatedUser
} from "../services/auth.service.js";

import {
  signupSchema,
  signinSchema
} from "../validators/auth.validator.js";

export async function signup(req, res, next) {
  try {
    const validation = signupSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid signup details.",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message
        }))
      });
    }

    const result = await signupUser(validation.data);

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export async function signin(req, res, next) {
  try {
    const validation = signinSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid signin details.",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message
        }))
      });
    }

    const result = await signinUser(validation.data);

    return res.status(200).json({
      success: true,
      message: "Signed in successfully.",
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await getAuthenticatedUser(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Authenticated user retrieved successfully.",
      data: { user }
    });
  } catch (error) {
    next(error);
  }
}

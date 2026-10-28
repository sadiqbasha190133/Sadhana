
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/User.js";

function createAccessToken(user) {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }

  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role
    },
    secret,
    {
      expiresIn: "1d",
      issuer: "sadhana-api",
      audience: "sadhana-client"
    }
  );
}

function formatUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt
  };
}

export async function signupUser({ name, email, password }) {
  if (Buffer.byteLength(password, "utf8") > 72) {
    const error = new Error(
      "Password must not exceed 72 bytes when encoded as UTF-8."
    );
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({
    email: normalizedEmail
  });

  if (existingUser) {
    const error = new Error("An account with this email already exists.");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword
    });

    return {
      user: formatUser(user),
      accessToken: createAccessToken(user)
    };
  } catch (error) {
    // Handle a duplicate email caused by simultaneous signup requests.
    if (error.code === 11000) {
      const duplicateError = new Error(
        "An account with this email already exists."
      );
      duplicateError.statusCode = 409;
      throw duplicateError;
    }

    throw error;
  }
}

export async function signinUser({ email, password }) {
  const user = await User.findOne({
    email: email.toLowerCase().trim()
  }).select("+password");

  // Use the same error message for an unknown email and a wrong password.
  if (!user || !(await bcrypt.compare(password, user.password))) {
    const error = new Error("Invalid email or password.");
    error.statusCode = 401;
    throw error;
  }

  return {
    user: formatUser(user),
    accessToken: createAccessToken(user)
  };
}

export async function getAuthenticatedUser(userId) {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User account not found.");
    error.statusCode = 401;
    throw error;
  }

  return formatUser(user);
}


import jwt from "jsonwebtoken";

export function authenticate(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please sign in."
    });
  }

  const token = authorization.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "sadhana-api",
      audience: "sadhana-client"
    });

    if (typeof payload === "string" || !payload.sub) {
      return res.status(401).json({
        success: false,
        message: "Invalid access token."
      });
    }

    req.user = {
      id: payload.sub,
      role: payload.role
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        error.name === "TokenExpiredError"
          ? "Access token has expired. Please sign in again."
          : "Invalid access token."
    });
  }
}

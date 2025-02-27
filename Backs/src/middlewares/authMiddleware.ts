import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { IUser } from "../interfaces/IUser";
import User from "../models/userModel";

export interface CustomRequest extends Request {
  user?: IUser;
  token?: string;
}

interface DecodedToken {
  _id: string;
}

export const auth = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    console.log("Token:", token);
    if (!token) {
      console.error("Authentication failed. Token missing.");
      throw new Error("Authentication failed. Token missing.");
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as DecodedToken;
    console.log("Decoded Token:", decoded);

    const user = await User.findOne({
      _id: decoded._id,
      "tokens.token": token,
    });
    console.log("User:", user);

    if (!user) {
      console.error("Authentication failed. User not found.");
      throw new Error("Authentication failed. User not found.");
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    if ((error as Error).name === "TokenExpiredError") {
      console.error("Authentication Error: Token expired.");
      res.status(401).send({ error: "Token expired. Please log in again." });
    } else {
      console.error("Authentication Error:", error); // Detailed error logging
      res.status(401).send({ error: "Authentication failed." });
    }
  }
};

export const admin = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    await auth(req, res, async () => {
      if (req.user && req.user.role === 0) {
        next();
      } else {
        res.status(403).send({ error: "Access denied. User is not an admin." });
      }
    });
  } catch (error) {
    res.status(401).send({ error: "Authentication failed." });
  }
};

export const moderator = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    await auth(req, res, async () => {
      if (req.user && req.user.role <= 1) {
        next();
      } else {
        res
          .status(403)
          .send({ error: "Access denied. User is not a moderator." });
      }
    });
  } catch (error) {
    res.status(401).send({ error: "Authentication failed." });
  }
};

export default auth;

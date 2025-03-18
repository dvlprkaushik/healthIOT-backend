import jwt from "jsonwebtoken";
import Patient from "../models/Patient.js";

export const verifyToken = async (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) {
    return res.status(401).json({ message: "Access denied, no token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await Patient.findById(decoded.userId).select("-password");
    next();
  } catch (error) {
    res.status(400).json({ message: "Invalid token" });
  }
};

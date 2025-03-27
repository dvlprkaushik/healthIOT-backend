import express from "express";
import { receiveSensorData } from "../controllers/iotController.js";

const router = express.Router();

router.post("/data", receiveSensorData);

export default router;

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { Server } from "socket.io";
import http from "http";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();
connectDB();

const app = express();
const port = 3900;
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }, // Allow all origins
});

app.use(express.json()); // Parse incoming JSON data
app.use(
  cors({
    origin: "*",
  })
);
// my auth route
app.use("/api/auth", authRoutes);

// **Initial Sensor Data**
let sensorData = {
  heartRate: null,
  spo2: null,
  temperatureC: null,
  fingerDetected: null,
};

// **ESP32 Wireless HTTP Endpoint**
app.post("/esp-data", (req, res) => {
  try {
    const { heartRate, spo2, temperatureC, status, fingerDetected } = req.body;

    // Update finger detection status
    if (fingerDetected !== undefined) {
      sensorData.fingerDetected = fingerDetected;
      // Emit event when finger is not detected
      io.emit("fingerNotDetected", !fingerDetected);
    }

    // Handle heart rate
    if (heartRate !== undefined) {
      // Check if heart rate is a valid number (not -10000)
      sensorData.heartRate = heartRate === -10000 ? null : heartRate;
      io.emit("heartRate", sensorData.heartRate);
    }

    // Handle SpO2
    if (spo2 !== undefined) {
      // Check if SpO2 is a valid number (not -10000)
      sensorData.spo2 = spo2 === -10000 ? null : spo2;
      io.emit("spo2", sensorData.spo2);
    }

    // Handle temperature
    if (temperatureC !== undefined) {
      sensorData.temperatureC = temperatureC;
      io.emit("temperature", temperatureC);
    }

    // Handle status
    if (status !== undefined) {
      sensorData.status = status;
      io.emit("status", status);
    }

    console.log("Received Wi-Fi Data:", req.body);
    console.log("Processed Sensor Data:", sensorData);

    res.status(200).send({ status: "Data received" , sensorData});
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// **WebSocket Connection for Frontend**
io.on("connection", (socket) => {
  console.log("Frontend connected via WebSocket");

  // Send initial values
  socket.emit("heartRate", sensorData.heartRate);
  socket.emit("spo2", sensorData.spo2);
  socket.emit("temperature", sensorData.temperatureC);
  socket.emit("status", sensorData.status);

  // Emit finger not detected status
  // Note: We're checking for null or false, depending on how you want to handle it
  socket.emit(
    "fingerNotDetected",
    sensorData.fingerDetected === false || sensorData.fingerDetected === null
  );

  socket.on("disconnect", () => {
    console.log("Frontend disconnected");
  });
});

// **Start Server**
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

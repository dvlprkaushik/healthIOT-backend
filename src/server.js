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
app.use(cors({
  origin : "*",
}))
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
    const { heartRate, spo2, temperatureC, fingerDetected } = req.body;

    if (fingerDetected !== undefined) {
      sensorData.fingerDetected = fingerDetected;
      io.emit("fingerNotDetected", fingerDetected === -10000);
    }

    if (heartRate !== undefined) {
      sensorData.heartRate = heartRate;
      io.emit("heartRate", heartRate);
    }

    if (spo2 !== undefined) {
      sensorData.spo2 = spo2;
      io.emit("spo2", spo2);
    }

    if (temperatureC !== undefined) {
      sensorData.temperatureC = temperatureC;
      io.emit("temperature", temperatureC);
    }

    console.log("Received Wi-Fi Data:", req.body);
    res.status(200).send({ status: "Data received" });
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
  socket.emit("fingerNotDetected", sensorData.fingerDetected === -10000);

  socket.on("disconnect", () => {
    console.log("Frontend disconnected");
  });
});

// **Start Server**
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

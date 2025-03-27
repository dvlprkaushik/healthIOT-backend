import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();
connectDB(); // MongoDB Connect

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);

// WebSocket Connection
io.on("connection", (socket) => {
  console.log(`⚡ Client connected: ${socket.id}`);

  // ✅ Auto-send random data every 2 sec for testing
  const interval = setInterval(() => {
    const heartRate = Math.floor(Math.random() * (120 - 60 + 1)) + 60; // 60-120 bpm
    const spo2 = Math.floor(Math.random() * (100 - 90 + 1)) + 90; // 90-100%
    const temperature = (Math.random() * (38 - 36) + 36).toFixed(1); // 36-38°C

    console.log("📡 Sending Random Test Data...");
    io.emit("updateHeartRate", { heartRate });
    io.emit("updateSpO2", { spo2 });
    io.emit("updateTemperature", { temperature });
  }, 2000); // Every 2 sec

  // Handle Disconnection
  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
    clearInterval(interval); // Stop sending data when client disconnects
  });
});

// Default Route
app.get("/", (req, res) => {
  res.send("Server is Running...");
});

// Start Server
const PORT = process.env.PORT || 3900;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

// Sensor data tracking with separate namespaces
const sensorNamespaces = {
  heartRate: io.of("/heart-rate"),
  spo2: io.of("/spo2"),
  temperature: io.of("/temperature"),
};

// Sensor data storage
const sensorDataStore = {
  heartRate: {
    latestData: null,
    historicalData: [],
  },
  spo2: {
    latestData: null,
    historicalData: [],
  },
  temperature: {
    latestData: null,
    historicalData: [],
  },
};

// WebSocket connection handler for each namespace
Object.entries(sensorNamespaces).forEach(([type, namespace]) => {
  namespace.on("connection", (socket) => {
    console.log(`${type} client connected:`, socket.id);

    // Send latest data to newly connected client
    const latestData = sensorDataStore[type].latestData;
    if (latestData) {
      socket.emit("latestData", latestData);
    }

    // Handle historical data request
    socket.on("requestHistoricalData", () => {
      socket.emit("historicalData", sensorDataStore[type].historicalData);
    });

    socket.on("disconnect", () => {
      console.log(`${type} client disconnected:`, socket.id);
    });
  });
});

// Main WebSocket for ESP32 data
io.on("connection", (socket) => {
  console.log("ESP32 device connected:", socket.id);

  socket.on("sensorData", (data) => {
    try {
      // Validate incoming data
      if (!data || typeof data !== "object") {
        console.error("Invalid sensor data received");
        return;
      }

      // Process and broadcast to specific namespaces
      processSensorData("heartRate", data.heartRate);
      processSensorData("spo2", data.spo2);
      processSensorData("temperature", data.temperature);

      console.log("Received Sensor Data:", data);
    } catch (error) {
      console.error("Error processing sensor data:", error);
    }
  });
});

// Function to process and store sensor data
function processSensorData(type, value) {
  const sensorData = {
    value: value,
    timestamp: Date.now(),
  };

  // Update latest data
  sensorDataStore[type].latestData = sensorData;

  // Store in historical data (limit to last 100 entries)
  sensorDataStore[type].historicalData.push(sensorData);
  if (sensorDataStore[type].historicalData.length > 100) {
    sensorDataStore[type].historicalData.shift();
  }

  // Emit to specific namespace
  sensorNamespaces[type].emit("updateData", sensorData);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready for sensor connections`);
});

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost", "http://127.0.0.1", "*"],
    methods: ["GET", "POST"],
    transports: ["websocket", "polling"],
    allowEIO3: true,
  },
});

app.use(
  cors({
    origin: ["http://localhost", "http://127.0.0.1", "*"],
    credentials: true,
  })
);
app.use(express.json());
app.use("/api/auth", authRoutes);

const vitalsNamespace = io.of("/vitals");

function setupSerialConnection() {
  SerialPort.list()
    .then((ports) => {
      console.log(
        "🔍 Detected Ports:",
        ports.map((port) => `${port.path} - ${port.manufacturer || "Unknown"}`)
      );

      // Dynamic port selection based on available ports
      const potentialPorts = ports
        .filter(
          (port) => port.path.includes("COM") || port.path.includes("/dev/tty")
        )
        .map((port) => port.path);

      if (potentialPorts.length === 0) {
        console.error("❌ No suitable serial ports found");
        setupSimulatedData();
        return;
      }

      potentialPorts.forEach((portPath) => {
        console.log(`🚀 Attempting to connect to port: ${portPath}`);

        const serialPort = new SerialPort({
          path: portPath,
          baudRate: 115200,
          autoOpen: true,
        });

        // Extensive error handling
        serialPort.on("error", (err) => {
          console.error(`🔥 Serial Port Error on ${portPath}:`, err);
        });

        // Raw data listener
        serialPort.on("data", (data) => {
          console.log(
            `📡 RAW Data from ${portPath}:`,
            data.toString("utf8").trim()
          );
        });

        // Create readline parser
        const parser = serialPort.pipe(
          new ReadlineParser({
            delimiter: "\r\n",
            encoding: "utf8",
          })
        );

        // Parser data handling
        parser.on("data", (data) => {
          console.log(`🌈 Parsed Data from ${portPath}:`, data);

          try {
            // Multiple parsing strategies
            let parsedData;

            // Try JSON parsing
            try {
              parsedData = JSON.parse(data);
            } catch (jsonError) {
              // Fallback parsing strategies
              console.warn("JSON Parsing Failed. Attempting alternatives.");

              // Try comma-separated
              const parts = data.split(",");
              if (parts.length >= 4) {
                parsedData = {
                  heartRate: parseInt(parts[0]),
                  spo2: parseInt(parts[1]),
                  temperatureC: parseFloat(parts[2]),
                  temperatureF: parseFloat(parts[3]),
                };
              }
            }

            if (parsedData) {
              console.log("✅ Successfully Parsed Data:", parsedData);
              vitalsNamespace.emit("vitalsUpdate", parsedData);
            } else {
              console.error("❌ Unable to parse data:", data);
            }
          } catch (error) {
            console.error("🚨 Data Processing Error:", error);
          }
        });

        // Parser error handling
        parser.on("error", (err) => {
          console.error("🔥 Parser Error:", err);
        });
      });
    })
    .catch((err) => {
      console.error("🚨 Serial Port Listing Error:", err);
      setupSimulatedData();
    });
}

function setupSimulatedData() {
  console.warn("⚠️ Using simulated vital signs data");

  const generateSimulatedData = () => {
    const simulatedData = {
      heartRate: Math.floor(Math.random() * 20) + 70,
      spo2: Math.floor(Math.random() * 3) + 97,
      temperatureC: (Math.random() * 0.5 + 36.5).toFixed(1),
      temperatureF: (Math.random() * 0.9 + 97.7).toFixed(1),
      status: "Simulated Data",
    };

    console.log("🎲 Simulated Data:", simulatedData);
    vitalsNamespace.emit("vitalsUpdate", simulatedData);
  };

  // Send simulated data every 5 seconds
  setInterval(generateSimulatedData, 5000);
}

vitalsNamespace.on("connection", (socket) => {
  console.log(`⚡ Client connected: ${socket.id}`);

  socket.on("healthData", (data) => {
    console.log("Received Manual Health Data:", data);
    vitalsNamespace.emit("vitalsUpdate", data);
  });

  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Attempt to setup serial connection on server start
setupSerialConnection();

app.get("/", (req, res) => {
  res.send("Server is Running...");
});

const PORT = process.env.PORT || 3900;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export default app;

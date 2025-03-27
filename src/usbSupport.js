import express from "express";
import { SerialPort, ReadlineParser } from "serialport";
import { Server } from "socket.io";
import http from "http";

const app = express();
const port = 3900;
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }, // Allow all origins
});

// SerialPort setup for ESP32
const serialPort = new SerialPort({
  path: "COM5", // ⚠️ Tumhara port
  baudRate: 115200,
});

const parser = serialPort.pipe(new ReadlineParser({ delimiter: "\r\n" }));

// **Initial Sensor Data**
let sensorData = {
  heartRate: null,
  spo2: null,
  temperatureC: null,
  fingerDetected: null,
};

// **Jab ESP32 se data aaye, usko parse karke alag-alag events pe bhejo**
parser.on("data", (data) => {
  try {
    const parsedData = JSON.parse(data);

    // Handle finger detection first
    if (parsedData.fingerDetected !== undefined) {
      sensorData.fingerDetected = parsedData.fingerDetected;

      // Emit finger detection status
      if (parsedData.fingerDetected === -10000) {
        io.emit("fingerNotDetected", true);
      } else {
        io.emit("fingerNotDetected", false);
      }
    }

    if (parsedData.heartRate !== undefined) {
      sensorData.heartRate = parsedData.heartRate;
      io.emit("heartRate", sensorData.heartRate);
    }

    if (parsedData.spo2 !== undefined) {
      sensorData.spo2 = parsedData.spo2;
      io.emit("spo2", sensorData.spo2);
    }

    if (parsedData.temperatureC !== undefined) {
      sensorData.temperatureC = parsedData.temperatureC;
      io.emit("temperature", sensorData.temperatureC);
    }

    // Log the full parsed data for debugging
    console.log("Received Data:", parsedData);
  } catch (err) {
    console.error("Parsing Error:", err.message);
  }
});

// **WebSocket Connection**
io.on("connection", (socket) => {
  console.log("Frontend connected via WebSocket");

  // Send initial values
  socket.emit("heartRate", sensorData.heartRate);
  socket.emit("spo2", sensorData.spo2);
  socket.emit("temperature", sensorData.temperatureC);

  // Send initial finger detection status
  socket.emit("fingerNotDetected", sensorData.fingerDetected === -10000);

  socket.on("disconnect", () => {
    console.log("Frontend disconnected");
  });
});

// **Start Server**
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

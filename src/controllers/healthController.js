export const handleHealthData = (io) => {
  io.on("connection", (socket) => {
    console.log("ESP32 Connected via WebSocket");

    socket.on("healthData", (data) => {
      console.log("Received Data:", data);
      console.log(data.heartRate);
      

      // Emit heart rate data
      io.emit("heartRateData", { heartRate: data.heartRate });

      // Emit SpO2 data
      io.emit("spo2Data", { spo2: data.spo2 });

      // Emit temperature data
      io.emit("temperatureData", {
        temperatureC: data.temperatureC,
        temperatureF: data.temperatureF,
      });
    });

    socket.on("disconnect", () => {
      console.log("ESP32 Disconnected");
    });
  });
};

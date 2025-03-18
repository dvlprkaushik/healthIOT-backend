import mqtt from "mqtt";
import "dotenv/config";
import Patient from "../models/Patient.js"; // Import Patient Model

// MQTT Broker URL (Use your broker or a public one)
const MQTT_BROKER = process.env.MQTT_BROKER || "mqtt://test.mosquitto.org";
const MQTT_TOPIC = "healthcare/sensors"; // Topic where devices send data

// Connect to MQTT Broker
const client = mqtt.connect(MQTT_BROKER);

client.on("connect", () => {
  console.log("✅ Connected to MQTT Broker!");
  client.subscribe(MQTT_TOPIC, (err) => {
    if (!err) {
      console.log(`📡 Subscribed to topic: ${MQTT_TOPIC}`);
    } else {
      console.error("❌ MQTT Subscription Failed:", err);
    }
  });
});

// Handle incoming sensor data
client.on("message", async (topic, message) => {
  try {
    const sensorData = JSON.parse(message.toString());

    console.log("📥 Received Sensor Data:", sensorData);

    // Store the data in MongoDB
    const newEntry = new Patient({
      heartRate: sensorData.heartRate,
      bloodPressure: sensorData.bloodPressure,
      spo2: sensorData.spo2,
      ecg: sensorData.ecg,
      timestamp: new Date(),
    });

    await newEntry.save();
    console.log("✅ Sensor Data Saved to DB");
  } catch (error) {
    console.error("❌ Error Processing MQTT Data:", error.message);
  }
});

export default client;

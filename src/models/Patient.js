import mongoose from "mongoose";

const patientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  gender: { type: String },
  age: { type: Number },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
}, {timestamps : true ,  collection : "patients"}); // Explicitly link to existing collection

const Patient = mongoose.model("patients", patientSchema);
export default Patient;

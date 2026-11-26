import dotenv from "dotenv";

// Imported first by server.js so that every module sees the .env values at
// import time (ES modules evaluate their imports before the importing body).
dotenv.config();

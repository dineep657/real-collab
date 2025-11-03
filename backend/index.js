import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import axios from "axios";
import authRoutes from "./routes/auth.js";
import db from "./config/database.js";

dotenv.config();

const app = express();

// Get allowed origins from environment variable or use defaults
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',') 
  : ["http://localhost:5173"];

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS policy violation'), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(new Error('CORS policy violation'), false);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST"],
    credentials: true
  },
});

// Rest of your code remains the same...
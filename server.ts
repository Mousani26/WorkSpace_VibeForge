import express from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { createServer as createViteServer } from "vite";
import { readDB, writeDB, DBState } from "./src/server/db.js";
import { askHRAssistant, getAIAttendanceAnalytics, getAILeaveInsights } from "./src/server/ai.js";
import { UserRole, HRNotification, HRActivity, Attendance, LeaveRequest, Payroll, Employee } from "./src/types.js";

const app = express();
const PORT = 3000;

// Security Middleware configurations
app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled to prevent blocking preview inside AI Studio iframes
    crossOriginEmbedderPolicy: false
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// In-Memory Secret Keys matching .env.example fallback
const JWT_SECRET = process.env.JWT_SECRET || "aistudio_secure_jwt_secret_token_change_in_production";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "aistudio_secure_jwt_refresh_token_secret_change_in_production";

// Store active refresh tokens securely
const activeRefreshTokens = new Set<string>();

// Dynamic JWT Utility Helpers
function generateToken(userId: string, role: string, employeeId: string): string {
  return jwt.sign({ userId, role, employeeId }, JWT_SECRET, { expiresIn: "1h" });
}

function generateRefreshToken(userId: string, role: string, employeeId: string): string {
  const token = jwt.sign({ userId, role, employeeId }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
  activeRefreshTokens.add(token);
  return token;
}

function verifyToken(token: string): { userId: string; role: string; employeeId?: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; role: string; employeeId?: string };
  } catch (err) {
    return null;
  }
}

// In-Memory Rate Limiter Middleware
const rateLimitWindowMs = 15 * 60 * 1000; // 15 minutes
const rateLimitMaxRequests = 500; // 500 requests per window
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();

function rateLimiter(req: any, res: any, next: any) {
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
  const now = Date.now();
  
  let record = rateLimitCache.get(ip);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + rateLimitWindowMs };
    rateLimitCache.set(ip, record);
  } else {
    record.count++;
  }
  
  if (record.count > rateLimitMaxRequests) {
    return res.status(429).json({ 
      error: "Too many requests from this IP, please try again after 15 minutes." 
    });
  }
  
  res.setHeader("X-RateLimit-Limit", rateLimitMaxRequests);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, rateLimitMaxRequests - record.count));
  next();
}

app.use("/api", rateLimiter);

// Auth Middleware
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  const verified = verifyToken(token);
  if (!verified) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }

  req.user = verified;
  next();
}

// Role-Based Authorization Middleware
function requireRole(role: UserRole) {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ error: `Forbidden: Requires role ${role}` });
    }
    next();
  };
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. SIGN UP
app.post("/api/auth/register", (req: any, res: any) => {
  const { email, password, role, name, jobTitle, department, phone, address } = req.body;

  if (!email || !password || !role || !name) {
    return res.status(400).json({ error: "All mandatory fields are required" });
  }

  // Password Security rules validation
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isMinLen = password.length >= 8;

  if (!isMinLen || !hasUpper || !hasLower || !hasDigit || !hasSpecial) {
    return res.status(400).json({ 
      error: "Password must be at least 8 characters long, contain an uppercase letter, lowercase letter, a number, and a special character." 
    });
  }

  const db = readDB();

  // Check duplicate email
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "Email already exists" });
  }

  // Generate unique employee ID
  const lastEmpNum = db.employees.reduce((max, emp) => {
    const num = parseInt(emp.id.replace("EMP-", ""));
    return num > max ? num : max;
  }, 0);
  const nextId = `EMP-${String(lastEmpNum + 1).padStart(3, "0")}`;
  const userId = `u-${Date.now()}`;

  const passwordHash = bcryptjs.hashSync(password, 10);
  const newUser = {
    id: userId,
    email,
    role: role === "HR" || role === "ADMIN" ? UserRole.ADMIN : UserRole.EMPLOYEE,
    employeeId: nextId,
    isEmailVerified: false,
    verificationCode: String(Math.floor(100000 + Math.random() * 900000)), // 6 digit code
    passwordHash,
    createdAt: new Date().toISOString()
  };

  const newEmployee: Employee = {
    id: nextId,
    userId,
    name,
    email,
    phone: phone || "",
    address: address || "",
    jobTitle: jobTitle || "Associate",
    department: department || "Operations",
    joinDate: new Date().toISOString().split("T")[0],
    status: "Onboarding",
    profilePicture: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    salaryStructure: { base: 4000, allowance: 400, deductions: 250 },
    documents: [],
    achievements: []
  };

  // Log activity
  const newActivity: HRActivity = {
    id: `act-${Date.now()}`,
    employeeId: nextId,
    employeeName: name,
    action: "Sign Up",
    details: `Registered as ${newUser.role} (Status: Onboarding). Email Verification Code: ${newUser.verificationCode}`,
    timestamp: new Date().toISOString()
  };

  db.users.push(newUser);
  db.employees.push(newEmployee);
  db.activities.unshift(newActivity);

  writeDB(db);

  res.status(201).json({
    message: "User registered successfully! Verification code sent.",
    verificationCode: newUser.verificationCode, // exposed for easy demo verification!
    userId: newUser.id,
    employeeId: nextId
  });
});

// 2. EMAIL VERIFICATION
app.post("/api/auth/verify-email", (req: any, res: any) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: "Email and verification code are required" });
  }

  const db = readDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (user.verificationCode !== code) {
    return res.status(400).json({ error: "Invalid verification code" });
  }

  user.isEmailVerified = true;
  delete user.verificationCode;

  // Log activity
  const employee = db.employees.find(e => e.id === user.employeeId);
  const newActivity: HRActivity = {
    id: `act-${Date.now()}`,
    employeeId: user.employeeId,
    employeeName: employee ? employee.name : "Unknown",
    action: "Email Verified",
    details: `Successfully verified email address: ${email}`,
    timestamp: new Date().toISOString()
  };
  db.activities.unshift(newActivity);

  writeDB(db);

  const token = generateToken(user.id, user.role, user.employeeId);
  const refreshToken = generateRefreshToken(user.id, user.role, user.employeeId);
  res.json({
    message: "Email verified successfully!",
    token,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId
    },
    employee
  });
});

// 3. SIGN IN
app.post("/api/auth/login", (req: any, res: any) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const db = readDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const passwordIsValid = user.passwordHash
    ? bcryptjs.compareSync(password, user.passwordHash)
    : password === "Password123!"; // Fallback for raw unmigrated entries if any

  if (!passwordIsValid) {
    return res.status(401).json({ error: "Invalid email or password. Hint: For all pre-loaded accounts, use 'Password123!'" });
  }

  if (!user.isEmailVerified) {
    // Generate a new code just in case
    user.verificationCode = user.verificationCode || "123456";
    writeDB(db);
    return res.status(403).json({ 
      error: "Email is not verified", 
      isUnverified: true,
      verificationCode: user.verificationCode // Pass so they can verify easily in demo
    });
  }

  const employee = db.employees.find(e => e.id === user.employeeId);
  const token = generateToken(user.id, user.role, user.employeeId);
  const refreshToken = generateRefreshToken(user.id, user.role, user.employeeId);

  // Log active check-in/activity
  const newActivity: HRActivity = {
    id: `act-${Date.now()}`,
    employeeId: user.employeeId,
    employeeName: employee ? employee.name : "Unknown",
    action: "Sign In",
    details: `Signed in from browser session`,
    timestamp: new Date().toISOString()
  };
  db.activities.unshift(newActivity);
  writeDB(db);

  res.json({
    token,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId
    },
    employee
  });
});

// 3b. REFRESH TOKEN ENDPOINT
app.post("/api/auth/refresh", (req: any, res: any) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required" });
  }

  if (!activeRefreshTokens.has(refreshToken)) {
    return res.status(403).json({ error: "Invalid or expired refresh token" });
  }

  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
    const db = readDB();
    const user = db.users.find(u => u.id === payload.userId);
    if (!user) {
      return res.status(403).json({ error: "User not found associated with this token" });
    }

    const newAccessToken = generateToken(user.id, user.role, user.employeeId);
    res.json({ token: newAccessToken });
  } catch (err) {
    return res.status(403).json({ error: "Invalid refresh token signature" });
  }
});

// 4. EMPLOYEE APIS
app.get("/api/employees", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  // Return all employees. If employee requests, they can view details of others too (directory lookup)
  res.json(db.employees);
});

app.get("/api/employees/:id", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  let employee;
  if (req.params.id === "me" || req.params.id === "undefined") {
    employee = db.employees.find(e => e.userId === req.user.userId);
  } else {
    employee = db.employees.find(e => e.id === req.params.id);
  }
  if (!employee) return res.status(404).json({ error: "Employee not found" });
  res.json(employee);
});

app.put("/api/employees/:id", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const employeeIndex = db.employees.findIndex(e => e.id === req.params.id);
  if (employeeIndex === -1) return res.status(404).json({ error: "Employee not found" });

  const currentEmployee = db.employees[employeeIndex];

  // Role Permissions: Employee can ONLY edit address, phone, profilePicture. Admin can edit anything.
  if (req.user.role === UserRole.EMPLOYEE) {
    const user = db.users.find(u => u.id === req.user.userId);
    if (!user || user.employeeId !== req.params.id) {
      return res.status(403).json({ error: "You are only permitted to update your own profile." });
    }

    const { phone, address, profilePicture } = req.body;
    db.employees[employeeIndex] = {
      ...currentEmployee,
      phone: phone !== undefined ? phone : currentEmployee.phone,
      address: address !== undefined ? address : currentEmployee.address,
      profilePicture: profilePicture !== undefined ? profilePicture : currentEmployee.profilePicture,
    };
  } else {
    // Admin / HR Officer updates everything
    const { name, phone, address, jobTitle, department, status, profilePicture, salaryStructure } = req.body;
    db.employees[employeeIndex] = {
      ...currentEmployee,
      name: name || currentEmployee.name,
      phone: phone !== undefined ? phone : currentEmployee.phone,
      address: address !== undefined ? address : currentEmployee.address,
      jobTitle: jobTitle || currentEmployee.jobTitle,
      department: department || currentEmployee.department,
      status: status || currentEmployee.status,
      profilePicture: profilePicture !== undefined ? profilePicture : currentEmployee.profilePicture,
      salaryStructure: salaryStructure ? { ...currentEmployee.salaryStructure, ...salaryStructure } : currentEmployee.salaryStructure
    };
  }

  // Create activity log
  const updater = db.employees.find(e => e.userId === req.user.userId);
  const newActivity: HRActivity = {
    id: `act-${Date.now()}`,
    employeeId: req.params.id,
    employeeName: db.employees[employeeIndex].name,
    action: "Profile Update",
    details: `Profile updated by ${updater ? updater.name : "System"}`,
    timestamp: new Date().toISOString()
  };
  db.activities.unshift(newActivity);

  writeDB(db);
  res.json({ message: "Profile updated successfully", employee: db.employees[employeeIndex] });
});

// Upload Document
app.post("/api/employees/:id/documents", authenticateToken, (req: any, res: any) => {
  const { name, url } = req.body;
  if (!name || name.trim() === "") return res.status(400).json({ error: "Document name is required" });

  const db = readDB();
  const employee = db.employees.find(e => e.id === req.params.id);
  if (!employee) return res.status(404).json({ error: "Employee not found" });

  if (!employee.documents) {
    employee.documents = [];
  }

  const newDoc = {
    id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    url: url || `data:text/plain;charset=utf-8,${encodeURIComponent("Attachment document: " + name)}`,
    uploadedAt: new Date().toISOString()
  };

  employee.documents.push(newDoc);

  const newActivity: HRActivity = {
    id: `act-${Date.now()}`,
    employeeId: employee.id,
    employeeName: employee.name,
    action: "Document Uploaded",
    details: `Uploaded document: ${name}`,
    timestamp: new Date().toISOString()
  };
  db.activities.unshift(newActivity);

  writeDB(db);
  res.json({ message: "Document uploaded successfully", document: newDoc });
});

// Delete Document
app.delete("/api/employees/:id/documents/:docId", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const employee = db.employees.find(e => e.id === req.params.id);
  if (!employee) return res.status(404).json({ error: "Employee not found" });

  if (!employee.documents) {
    employee.documents = [];
  }

  employee.documents = employee.documents.filter(d => d.id !== req.params.docId);

  const newActivity: HRActivity = {
    id: `act-${Date.now()}`,
    employeeId: employee.id,
    employeeName: employee.name,
    action: "Document Removed",
    details: `Removed document attachment`,
    timestamp: new Date().toISOString()
  };
  db.activities.unshift(newActivity);

  writeDB(db);
  res.json({ message: "Document deleted successfully", documents: employee.documents });
});

// Award Badge/Achievement (Admin Only)
app.post("/api/employees/:id/achievements", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Only admins are allowed to award achievements." });
  }

  const { badgeName, description, icon, points } = req.body;
  if (!badgeName || !description) {
    return res.status(400).json({ error: "Badge name and description are required." });
  }

  const db = readDB();
  const employee = db.employees.find(e => e.id === req.params.id);
  if (!employee) return res.status(404).json({ error: "Employee not found." });

  const newAchievement = {
    id: `ach-${Date.now()}`,
    badgeName,
    description,
    icon: icon || "Award",
    awardedAt: new Date().toISOString().split("T")[0],
    points: points || 100
  };

  if (!employee.achievements) {
    employee.achievements = [];
  }
  employee.achievements.push(newAchievement);

  // Add an activity record
  const newActivity = {
    id: `act-${Date.now()}`,
    employeeId: employee.id,
    employeeName: employee.name,
    action: "Awarded Badge",
    details: `Awarded '${badgeName}' badge (${points || 100} PTS) to ${employee.name}`,
    timestamp: new Date().toISOString()
  };
  db.activities.unshift(newActivity);

  // Add a notification for the employee
  const employeeUser = db.users.find(u => u.employeeId === employee.id);
  if (employeeUser) {
    db.notifications.unshift({
      id: `not-${Date.now()}`,
      userId: employeeUser.id,
      title: "New Achievement Awarded!",
      message: `Congratulations! You have been awarded the '${badgeName}' badge by HR.`,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  }

  writeDB(db);
  res.json({ message: "Achievement awarded successfully", achievement: newAchievement });
});

// 5. ATTENDANCE APIS
app.get("/api/attendance", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  if (req.user.role === UserRole.EMPLOYEE) {
    // Return only self attendance
    const user = db.users.find(u => u.id === req.user.userId);
    const selfAtt = db.attendance.filter(a => a.employeeId === user?.employeeId);
    return res.json(selfAtt);
  }
  // Admin sees all
  res.json(db.attendance);
});

app.post("/api/attendance/check-in", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const employee = db.employees.find(e => e.id === user.employeeId);
  if (!employee) return res.status(404).json({ error: "Employee record not found" });

  const todayStr = req.body.localDate || new Date().toISOString().split("T")[0];

  // Check if check-in already exists for today
  const existing = db.attendance.find(a => a.employeeId === user.employeeId && a.date === todayStr);
  if (existing) {
    return res.status(400).json({ error: "You have already checked-in for today." });
  }

  const nowTime = req.body.localTime || new Date().toLocaleTimeString("en-US", { hour12: false });

  const newAttendance: Attendance = {
    id: `att-${Date.now()}`,
    employeeId: user.employeeId,
    employeeName: employee.name,
    date: todayStr,
    checkIn: nowTime,
    status: "Present",
    isApproved: false
  };

  db.attendance.push(newAttendance);

  const newActivity: HRActivity = {
    id: `act-${Date.now()}`,
    employeeId: user.employeeId,
    employeeName: employee.name,
    action: "Check-In",
    details: `Checked in at ${nowTime} (Status: Present, Pending Approval)`,
    timestamp: new Date().toISOString()
  };
  db.activities.unshift(newActivity);

  // Notify HR of check-in approval request
  const hrs = db.users.filter(u => u.role === UserRole.ADMIN);
  hrs.forEach(hr => {
    db.notifications.push({
      id: `not-${Date.now()}-${Math.random()}`,
      userId: hr.id,
      title: "Attendance Approval Request",
      message: `${employee.name} checked in at ${nowTime} today. Please approve.`,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  });

  writeDB(db);
  res.json({ message: "Check-in successful!", attendance: newAttendance });
});

app.post("/api/attendance/check-out", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const employee = db.employees.find(e => e.id === user.employeeId);
  const todayStr = req.body.localDate || new Date().toISOString().split("T")[0];

  const attendance = db.attendance.find(a => a.employeeId === user.employeeId && a.date === todayStr);
  if (!attendance) {
    return res.status(400).json({ error: "No active check-in found for today. Please check-in first." });
  }

  if (attendance.checkOut) {
    return res.status(400).json({ error: "You have already checked-out for today." });
  }

  const nowTime = req.body.localTime || new Date().toLocaleTimeString("en-US", { hour12: false });
  attendance.checkOut = nowTime;

  const newActivity: HRActivity = {
    id: `act-${Date.now()}`,
    employeeId: user.employeeId,
    employeeName: employee ? employee.name : "Unknown",
    action: "Check-Out",
    details: `Checked out at ${nowTime}`,
    timestamp: new Date().toISOString()
  };
  db.activities.unshift(newActivity);

  writeDB(db);
  res.json({ message: "Check-out successful!", attendance });
});

app.post("/api/attendance/reset-today", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const todayStr = req.body.localDate || new Date().toISOString().split("T")[0];

  const originalLength = db.attendance.length;
  db.attendance = db.attendance.filter(a => !(a.employeeId === user.employeeId && a.date === todayStr));

  if (db.attendance.length !== originalLength) {
    writeDB(db);
    return res.json({ message: "Today's attendance log reset successfully." });
  }

  res.json({ message: "No attendance log found for today to reset." });
});

app.post("/api/attendance/approve/:id", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "HR/Admin privileges required" });
  }

  const db = readDB();
  const attendance = db.attendance.find(a => a.id === req.params.id);
  if (!attendance) return res.status(404).json({ error: "Attendance log not found" });

  attendance.isApproved = true;

  // Badge Logic: Check if employee has 5 consecutive Present records to award Perfect Attendance badge
  const employeeId = attendance.employeeId;
  const empAtts = db.attendance.filter(a => a.employeeId === employeeId && a.status === "Present" && a.isApproved);
  const employee = db.employees.find(e => e.id === employeeId);

  if (empAtts.length >= 5 && employee && !employee.achievements.some(a => a.badgeName === "Perfect Attendance")) {
    const badge = {
      id: `ach-${Date.now()}`,
      badgeName: "Perfect Attendance",
      description: "Successfully approved present records for 5+ operational days",
      icon: "CalendarCheck",
      awardedAt: new Date().toISOString().split("T")[0]
    };
    employee.achievements.push(badge);
    db.activities.unshift({
      id: `act-${Date.now()}`,
      employeeId,
      employeeName: employee.name,
      action: "Badge Earned",
      details: "Earned badge: 'Perfect Attendance' for consistent approved logs",
      timestamp: new Date().toISOString()
    });

    // Notify employee of badge
    db.notifications.push({
      id: `not-${Date.now()}`,
      userId: employee.userId,
      title: "Badges & Achievement Earned!",
      message: "Congratulations! You have been awarded the 'Perfect Attendance' badge.",
      isRead: false,
      createdAt: new Date().toISOString()
    });
  }

  writeDB(db);
  res.json({ message: "Attendance approved", attendance });
});

// 6. LEAVE APIS
app.get("/api/leave", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  if (req.user.role === UserRole.EMPLOYEE) {
    const user = db.users.find(u => u.id === req.user.userId);
    const selfLeaves = db.leaveRequests.filter(l => l.employeeId === user?.employeeId);
    return res.json(selfLeaves);
  }
  res.json(db.leaveRequests);
});

app.post("/api/leave", authenticateToken, (req: any, res: any) => {
  const { leaveType, startDate, endDate, remarks, employeeId, employeeName } = req.body;
  if (!leaveType || !startDate || !endDate || !remarks) {
    return res.status(400).json({ error: "All leave request fields are mandatory." });
  }

  const db = readDB();
  let employee;
  if (employeeId) {
    employee = db.employees.find(e => e.id === employeeId);
  }
  if (!employee && employeeName) {
    employee = db.employees.find(e => e.name.toLowerCase() === employeeName.toLowerCase());
  }
  if (!employee) {
    const user = db.users.find(u => u.id === req.user.userId);
    employee = db.employees.find(e => e.id === user?.employeeId);
  }
  if (!employee) return res.status(404).json({ error: "Employee record not found" });

  const newRequest: LeaveRequest = {
    id: `leave-${Date.now()}`,
    employeeId: employee.id,
    employeeName: employee.name,
    leaveType,
    startDate,
    endDate,
    remarks,
    status: "Pending",
    createdAt: new Date().toISOString()
  };

  db.leaveRequests.push(newRequest);

  db.activities.unshift({
    id: `act-${Date.now()}`,
    employeeId: employee.id,
    employeeName: employee.name,
    action: "Applied Leave",
    details: `Applied for ${leaveType} from ${startDate} to ${endDate}`,
    timestamp: new Date().toISOString()
  });

  // Notify HR
  const hrs = db.users.filter(u => u.role === UserRole.ADMIN);
  hrs.forEach(hr => {
    db.notifications.push({
      id: `not-${Date.now()}-${Math.random()}`,
      userId: hr.id,
      title: "New Leave Application",
      message: `${employee.name} applied for ${leaveType} (${startDate} to ${endDate}).`,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  });

  writeDB(db);
  res.status(201).json({ message: "Leave request submitted successfully", request: newRequest });
});

app.post("/api/leave/:id/approve", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "HR/Admin privileges required" });
  }

  const { adminComments } = req.body;
  const db = readDB();
  const request = db.leaveRequests.find(l => l.id === req.params.id);
  if (!request) return res.status(404).json({ error: "Leave request not found" });

  request.status = "Approved";
  request.adminComments = adminComments || "Approved by HR.";

  // Push to attendance calendar as approved Leave status for all days within range
  const start = new Date(request.startDate);
  const end = new Date(request.endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    // Avoid double logging
    const existing = db.attendance.find(a => a.employeeId === request.employeeId && a.date === dateStr);
    if (!existing) {
      db.attendance.push({
        id: `att-leave-${Date.now()}-${Math.random()}`,
        employeeId: request.employeeId,
        employeeName: request.employeeName,
        date: dateStr,
        status: "Leave",
        note: request.leaveType,
        isApproved: true
      });
    } else {
      existing.status = "Leave";
      existing.note = request.leaveType;
      existing.isApproved = true;
    }
  }

  // Create activity
  const approver = db.employees.find(e => e.userId === req.user.userId);
  db.activities.unshift({
    id: `act-${Date.now()}`,
    employeeId: request.employeeId,
    employeeName: request.employeeName,
    action: "Leave Approved",
    details: `Leave approved by ${approver ? approver.name : "HR"} (${request.startDate} to ${request.endDate})`,
    timestamp: new Date().toISOString()
  });

  // Notify employee
  const targetUser = db.users.find(u => u.employeeId === request.employeeId);
  if (targetUser) {
    db.notifications.push({
      id: `not-${Date.now()}`,
      userId: targetUser.id,
      title: "Leave Request Approved!",
      message: `Your request for ${request.leaveType} (${request.startDate} to ${request.endDate}) was approved. Comments: ${request.adminComments}`,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  }

  writeDB(db);
  res.json({ message: "Leave approved successfully", request });
});

app.post("/api/leave/:id/reject", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "HR/Admin privileges required" });
  }

  const { adminComments } = req.body;
  const db = readDB();
  const request = db.leaveRequests.find(l => l.id === req.params.id);
  if (!request) return res.status(404).json({ error: "Leave request not found" });

  request.status = "Rejected";
  request.adminComments = adminComments || "Rejected based on project demands.";

  const approver = db.employees.find(e => e.userId === req.user.userId);
  db.activities.unshift({
    id: `act-${Date.now()}`,
    employeeId: request.employeeId,
    employeeName: request.employeeName,
    action: "Leave Rejected",
    details: `Leave rejected by ${approver ? approver.name : "HR"} (${request.startDate} to ${request.endDate})`,
    timestamp: new Date().toISOString()
  });

  // Notify employee
  const targetUser = db.users.find(u => u.employeeId === request.employeeId);
  if (targetUser) {
    db.notifications.push({
      id: `not-${Date.now()}`,
      userId: targetUser.id,
      title: "Leave Request Rejected",
      message: `Your request for ${request.leaveType} has been rejected. Comments: ${request.adminComments}`,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  }

  writeDB(db);
  res.json({ message: "Leave request rejected", request });
});

// 6.5 SUPPORT DESK APIS
app.get("/api/support", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const tickets = db.supportTickets || [];

  const queryEmpId = req.query.employeeId as string;
  const activeRoleHeader = req.headers["x-active-role"];

  if (queryEmpId && activeRoleHeader === "EMPLOYEE") {
    const emp = db.employees.find(e => e.id === queryEmpId);
    const selfTickets = tickets.filter(t => 
      t.employeeId === queryEmpId || 
      (emp && t.employeeName.toLowerCase() === emp.name.toLowerCase())
    );
    return res.json(selfTickets);
  }

  if (req.user.role === UserRole.ADMIN && activeRoleHeader !== "EMPLOYEE") {
    return res.json(tickets);
  }

  const user = db.users.find(u => u.id === req.user.userId);
  const emp = db.employees.find(e => e.id === user?.employeeId);
  const selfTickets = tickets.filter(t => t.employeeId === user?.employeeId || (emp && t.employeeName.toLowerCase() === emp.name.toLowerCase()));
  res.json(selfTickets);
});

app.post("/api/support", authenticateToken, (req: any, res: any) => {
  const { topic, priority, description, employeeId, employeeName, department } = req.body;
  if (!topic || !description) {
    return res.status(400).json({ error: "Topic and description are required" });
  }

  const db = readDB();
  let emp;
  if (employeeId) {
    emp = db.employees.find(e => e.id === employeeId);
  }
  if (!emp && employeeName) {
    emp = db.employees.find(e => e.name.toLowerCase() === employeeName.toLowerCase());
  }
  if (!emp) {
    const user = db.users.find(u => u.id === req.user.userId);
    emp = db.employees.find(e => e.id === user?.employeeId);
  }

  const newTicket = {
    id: `TCK-${Math.floor(1000 + Math.random() * 9000)}`,
    employeeId: emp ? emp.id : (employeeId || "EMP-002"),
    employeeName: emp ? emp.name : (employeeName || "Aarav Patel"),
    department: emp ? emp.department : (department || "Engineering"),
    topic,
    priority: priority || "Normal",
    description,
    status: "Open" as const,
    createdAt: new Date().toISOString()
  };

  if (!db.supportTickets) db.supportTickets = [];
  db.supportTickets.unshift(newTicket);

  // Notify Admin of new support ticket
  db.notifications.push({
    id: `not-${Date.now()}`,
    userId: "u-001",
    title: "New Support Ticket",
    message: `${newTicket.employeeName} filed a ${newTicket.priority} ticket: ${newTicket.topic}`,
    isRead: false,
    createdAt: new Date().toISOString()
  });

  writeDB(db);
  res.status(201).json({ message: "Support ticket filed successfully", ticket: newTicket });
});

app.patch("/api/support/:id", authenticateToken, (req: any, res: any) => {
  const { status, adminResolution } = req.body;
  const db = readDB();
  if (!db.supportTickets) db.supportTickets = [];

  const ticket = db.supportTickets.find(t => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  if (status) ticket.status = status;
  if (adminResolution !== undefined) ticket.adminResolution = adminResolution;
  if (status === "Resolved" && !ticket.resolvedAt) {
    ticket.resolvedAt = new Date().toISOString();
  }

  // Notify employee if resolved/updated
  const targetEmp = db.employees.find(e => e.id === ticket.employeeId || e.name === ticket.employeeName);
  const targetUser = targetEmp ? db.users.find(u => u.employeeId === targetEmp.id) : null;
  if (targetUser && req.user.role === UserRole.ADMIN) {
    db.notifications.push({
      id: `not-${Date.now()}`,
      userId: targetUser.id,
      title: "Support Ticket Updated",
      message: `Your support ticket '${ticket.topic}' status is now: ${ticket.status}. ${adminResolution ? 'Note: ' + adminResolution : ''}`,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  }

  writeDB(db);
  res.json({ message: "Ticket updated successfully", ticket });
});

app.delete("/api/support/:id", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  if (!db.supportTickets) db.supportTickets = [];

  const index = db.supportTickets.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Ticket not found" });

  db.supportTickets.splice(index, 1);
  writeDB(db);
  res.json({ message: "Ticket deleted successfully" });
});

// 7. PAYROLL APIS
app.get("/api/payroll", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  if (req.user.role === UserRole.EMPLOYEE) {
    const user = db.users.find(u => u.id === req.user.userId);
    const selfPay = db.payrollList.filter(p => p.employeeId === user?.employeeId);
    return res.json(selfPay);
  }
  res.json(db.payrollList);
});

// Admin updates salary structure for an employee
app.put("/api/payroll/structure/:employeeId", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "HR/Admin privileges required" });
  }

  const { base, allowance, deductions } = req.body;
  if (base === undefined || allowance === undefined || deductions === undefined) {
    return res.status(400).json({ error: "Base, allowance, and deductions are required" });
  }

  const db = readDB();
  const employee = db.employees.find(e => e.id === req.params.employeeId);
  if (!employee) return res.status(404).json({ error: "Employee not found" });

  employee.salaryStructure = {
    base: Number(base),
    allowance: Number(allowance),
    deductions: Number(deductions)
  };

  // Generate or update current month draft payroll
  const monthStr = "July 2026";
  const existingPayIndex = db.payrollList.findIndex(p => p.employeeId === employee.id && p.month === monthStr);
  const netSalary = Number(base) + Number(allowance) - Number(deductions);

  if (existingPayIndex !== -1) {
    db.payrollList[existingPayIndex] = {
      ...db.payrollList[existingPayIndex],
      baseSalary: Number(base),
      allowances: Number(allowance),
      deductions: Number(deductions),
      netSalary
    };
  } else {
    db.payrollList.push({
      id: `pay-${Date.now()}`,
      employeeId: employee.id,
      employeeName: employee.name,
      month: monthStr,
      baseSalary: Number(base),
      allowances: Number(allowance),
      deductions: Number(deductions),
      netSalary,
      status: "Draft"
    });
  }

  db.activities.unshift({
    id: `act-${Date.now()}`,
    employeeId: employee.id,
    employeeName: employee.name,
    action: "Salary Adjusted",
    details: `HR updated salary structure (Base: $${base}, Net: $${netSalary})`,
    timestamp: new Date().toISOString()
  });

  writeDB(db);
  res.json({ message: "Salary structure and draft payroll updated successfully", employee });
});

// Admin pays payroll
app.post("/api/payroll/:id/pay", authenticateToken, (req: any, res: any) => {
  if (req.user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "HR/Admin privileges required" });
  }

  const db = readDB();
  const payroll = db.payrollList.find(p => p.id === req.params.id);
  if (!payroll) return res.status(404).json({ error: "Payroll slip not found" });

  payroll.status = "Paid";
  payroll.paidAt = new Date().toISOString();

  // Notify employee
  const targetUser = db.users.find(u => u.employeeId === payroll.employeeId);
  if (targetUser) {
    db.notifications.push({
      id: `not-${Date.now()}`,
      userId: targetUser.id,
      title: "Salary Paid!",
      message: `Your salary slip for ${payroll.month} of $${payroll.netSalary} has been credited.`,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  }

  writeDB(db);
  res.json({ message: "Payroll processed successfully", payroll });
});

// 8. NOTIFICATIONS & ACTIVITIES
app.get("/api/notifications", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const userNotifs = db.notifications.filter(n => n.userId === req.user.userId);
  res.json(userNotifs);
});

app.post("/api/notifications/:id/read", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const notif = db.notifications.find(n => n.id === req.params.id && n.userId === req.user.userId);
  if (notif) {
    notif.isRead = true;
    writeDB(db);
  }
  res.json({ success: true });
});

app.get("/api/activities", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  // Return all activities
  res.json(db.activities);
});

// 9. GENERAL DASHBOARD SUMMARY
app.get("/api/dashboard/summary", authenticateToken, (req: any, res: any) => {
  const db = readDB();
  const todayStr = new Date().toISOString().split("T")[0];

  if (req.user.role === UserRole.EMPLOYEE) {
    const user = db.users.find(u => u.id === req.user.userId);
    const employee = db.employees.find(e => e.id === user?.employeeId);
    
    const selfAtt = db.attendance.filter(a => a.employeeId === user?.employeeId);
    const selfLeaves = db.leaveRequests.filter(l => l.employeeId === user?.employeeId);

    const checkInToday = selfAtt.find(a => a.date === todayStr);

    res.json({
      employee,
      stats: {
        presentCount: selfAtt.filter(a => a.status === "Present" && a.isApproved).length,
        pendingLeavesCount: selfLeaves.filter(l => l.status === "Pending").length,
        leaveBalance: 12 - selfLeaves.filter(l => l.status === "Approved").length // 12 standard days per year
      },
      checkInToday,
      recentActivities: db.activities.filter(a => a.employeeId === user?.employeeId).slice(0, 5),
      upcomingHolidays: [
        { date: "Friday, May 1, 2026", name: "Labour Day" },
        { date: "Saturday, Aug 15, 2026", name: "Independence Day" },
        { date: "Friday, Oct 2, 2026", name: "Gandhi Jayanti" },
        { date: "Thursday, Nov 26, 2026", name: "Thanksgiving Day" },
        { date: "Friday, Dec 25, 2026", name: "Christmas Day" }
      ]
    });
  } else {
    // Admin dashboard summary
    const pendingLeaves = db.leaveRequests.filter(l => l.status === "Pending");
    const activeStaff = db.employees.filter(e => e.status === "Active").length;
    const todayAttendance = db.attendance.filter(a => a.date === todayStr);

    res.json({
      stats: {
        totalEmployees: db.employees.length,
        activeStaff,
        pendingLeavesCount: pendingLeaves.length,
        todayPresents: todayAttendance.filter(a => a.status === "Present" || a.status === "Half-day").length,
        todayAbsents: todayAttendance.filter(a => a.status === "Absent").length
      },
      pendingLeaves,
      recentActivities: db.activities.slice(0, 8),
      attendanceChartData: todayAttendance,
      upcomingHolidays: [
        { date: "Friday, May 1, 2026", name: "Labour Day" },
        { date: "Saturday, Aug 15, 2026", name: "Independence Day" },
        { date: "Friday, Oct 2, 2026", name: "Gandhi Jayanti" },
        { date: "Thursday, Nov 26, 2026", name: "Thanksgiving Day" },
        { date: "Friday, Dec 25, 2026", name: "Christmas Day" }
      ]
    });
  }
});

// 10. AI ASSISTANT & INSIGHTS
app.post("/api/ai/chat", authenticateToken, async (req: any, res: any) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: "Question is required" });

  try {
    const answer = await askHRAssistant(question);
    res.json({ answer });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to query HR assistant" });
  }
});

app.get("/api/ai/analytics/attendance", authenticateToken, async (req: any, res: any) => {
  try {
    const analysis = await getAIAttendanceAnalytics();
    res.json({ analysis });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to generate attendance analytics" });
  }
});

app.get("/api/ai/insights/leave", authenticateToken, async (req: any, res: any) => {
  try {
    const insights = await getAILeaveInsights();
    res.json({ insights });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to generate leave insights" });
  }
});

// ----------------------------------------------------
// VITE DEV SERVER & STATIC FILES HANDLERS
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Aura full-stack server running securely on port http://localhost:${PORT}`);
  });
}

startServer();

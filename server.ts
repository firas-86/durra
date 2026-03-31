import express from "express";
console.log("SERVER TS IS RUNNING");
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logStream = fs.createWriteStream(path.join(__dirname, 'server.log'), {flags: 'a'});
const logger = (message: string) => {
  logStream.write(`${new Date().toISOString()} - ${message}\n`);
};
const consoleLog = (message: string) => {
  console.log(message);
  logger(message);
};

const db = new Database("database.sqlite");
consoleLog("Database initialized.");
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-durra-app";

// Initialize Database
// إعداد قاعدة البيانات والجداول الأساسية
try {
  consoleLog("Starting database table creation...");
  db.exec(`
    -- جدول العمال: يحتوي على كافة البيانات الشخصية والمهنية للموظفين
    CREATE TABLE IF NOT EXISTS workers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      alt_phone TEXT,
      address TEXT,
      skills TEXT,
      last_workplace TEXT,
      current_job TEXT,
      salary REAL,
      has_social_security INTEGER DEFAULT 0,
      national_id TEXT,
      age INTEGER,
      notes TEXT
    );

    -- جدول المهام: تعريف المهام والكميات المستهدفة لكل مهمة
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      target_quantity INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1
    );

    -- جدول التقييمات اليومية: السجل الرئيسي لتقييم الموظف في يوم محدد
    CREATE TABLE IF NOT EXISTS daily_evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      total_score REAL NOT NULL,
      FOREIGN KEY (worker_id) REFERENCES workers(id)
    );

    -- تفاصيل المهام في التقييم: تفصيل كل مهمة قام بها الموظف ودرجتها
    CREATE TABLE IF NOT EXISTS task_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      evaluation_id INTEGER NOT NULL,
      task_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      score REAL NOT NULL,
      FOREIGN KEY (evaluation_id) REFERENCES daily_evaluations(id),
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    -- جدول المستخدمين: إدارة الدخول والصلاحيات للنظام
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      role TEXT NOT NULL DEFAULT 'user',
      permissions TEXT NOT NULL DEFAULT '[]',
      worker_id INTEGER,
      FOREIGN KEY (worker_id) REFERENCES workers(id)
    );

    -- المعاملات المالية: سجل الرواتب، المكافآت، والخصومات
    CREATE TABLE IF NOT EXISTS worker_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'salary', 'bonus', 'deduction', 'payment'
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      description TEXT,
      FOREIGN KEY (worker_id) REFERENCES workers(id)
    );

    -- سجل العمليات (Audit Logs): تتبع كافة العمليات الحساسة في النظام
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      details TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- جدول الحضور والغياب: تسجيل وقت الدخول والخروج والملاحظات اليومية
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      check_in TEXT,
      check_out TEXT,
      notes TEXT,
      FOREIGN KEY (worker_id) REFERENCES workers(id)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_worker_date ON attendance(worker_id, date);

    -- جدول المغادرات: تتبع خروج الموظفين أثناء الدوام الرسمي
    CREATE TABLE IF NOT EXISTS departures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      notes TEXT,
      FOREIGN KEY (worker_id) REFERENCES workers(id)
    );

    -- جدول الوظائف النظامية: لتتبع تنفيذ العمليات المجدولة
    CREATE TABLE IF NOT EXISTS system_jobs (
      job_name TEXT PRIMARY KEY,
      last_run_date TEXT
    );

    -- جدول الإعدادات العامة
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    
    -- جدول الطبالي (الإنتاج): تسجيل الطبالي المنتجة
    CREATE TABLE IF NOT EXISTS pallets (
      id TEXT PRIMARY KEY, -- الكود الخاص بالطبلية
      parent_pallet_id TEXT, -- الكود الخاص بالطبلية الأصلية (إذا كانت مشتقة)
      type TEXT NOT NULL, -- نوع المنتج (بندورة، كاتشب، مايونيز، إلخ)
      details TEXT,
      status TEXT DEFAULT 'produced', -- 'produced', 'supervisor_signed', 'quality_signed', 'sent_to_packaging', 'packaging_received', 'packaging_started', 'packaging_certificate_created', 'packaging_quality_signed', 'sent_to_warehouse', 'packaging_quality_signed_warehouse', 'warehouse_signed', 'in_production_stock'
      quality_score REAL, -- نتيجة الجودة
      measurements TEXT, -- المقاييس
      certificate_data TEXT, -- بيانات شهادة الطبلية (JSON)
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_pallet_id) REFERENCES pallets(id)
    );

    -- جدول توقيعات الطبالي: تتبع المراحل والتوقيعات
    CREATE TABLE IF NOT EXISTS pallet_signatures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pallet_id TEXT NOT NULL,
      stage TEXT NOT NULL, -- المرحلة (supervisor_sign, quality_sign, etc.)
      user_id INTEGER NOT NULL,
      signed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pallet_id) REFERENCES pallets(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- جدول المستودع: تتبع أماكن الطبالي
    CREATE TABLE IF NOT EXISTS warehouse_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pallet_id TEXT NOT NULL,
      location TEXT NOT NULL, -- 'internal_production', 'internal_raw_materials', 'external'
      added_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pallet_id) REFERENCES pallets(id)
    );

    -- جدول طلبات المستودع
    CREATE TABLE IF NOT EXISTS warehouse_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pallet_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending', -- 'pending', 'completed'
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pallet_id) REFERENCES pallets(id)
    );

    -- جدول سجلات الشحن
    CREATE TABLE IF NOT EXISTS shipping_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pallet_id TEXT NOT NULL,
      shipping_date TEXT,
      destination TEXT,
      driver_name TEXT,
      truck_number TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pallet_id) REFERENCES pallets(id)
    );
    
    -- جدول الطلبيات
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone_name TEXT NOT NULL,
      country TEXT NOT NULL,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      weight REAL NOT NULL,
      order_number TEXT NOT NULL UNIQUE,
      general_specs TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    -- إدراج القيم الافتراضية للإعدادات إذا لم تكن موجودة
    INSERT OR IGNORE INTO app_settings (key, value) VALUES 
      ('official_start_time', '08:00'),
      ('official_end_time', '16:00'),
      ('break_start_time', '12:00'),
      ('break_end_time', '12:30'),
      ('has_break', '1'),
      ('overtime_rate', '1.25');
  `);
  consoleLog("Database tables initialized successfully.");
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  consoleLog("Tables in database: " + JSON.stringify(tables));
} catch (e) {
  consoleLog("Database initialization failed: " + e);
}

// Add columns if they don't exist (for existing databases)
try { db.exec("ALTER TABLE workers ADD COLUMN national_id TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE workers ADD COLUMN age INTEGER"); } catch (e) {}
try { db.exec("ALTER TABLE workers ADD COLUMN notes TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE workers ADD COLUMN social_security_amount REAL DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN is_active INTEGER DEFAULT 1"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN worker_id INTEGER"); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN last_password_update TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE task_entries ADD COLUMN target_quantity INTEGER"); } catch (e) {}
try { db.exec("ALTER TABLE pallets ADD COLUMN packaging_certificate_data TEXT"); } catch (e) {}

// Helper to get settings
function getSettings() {
  const settings = db.prepare("SELECT key, value FROM app_settings").all() as {key: string, value: string}[];
  return settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {
    official_start_time: '08:00',
    official_end_time: '16:00',
    break_start_time: '12:00',
    break_end_time: '12:30',
    has_break: '1',
    overtime_rate: '1.25'
  });
}

// Helper to calculate salary per hour (assuming 30 days, 8 hours/day)
function calculateHourlyRate(salary: number) {
  return salary / (30 * 8);
}

// وظيفة تطبيق خصم الضمان الاجتماعي الشهري
// ملاحظة: هذه الوظيفة تعمل عند تشغيل السيرفر. في بيئة الإنتاج الحقيقية، يفضل استخدام cron job لجدولتها.
function applyMonthlySocialSecurity() {
  try {
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM
    const firstOfMonth = `${currentMonth}-01`;
    
    // جلب كافة العمال الذين لديهم مبلغ ضمان اجتماعي
    const workers = db.prepare("SELECT id, social_security_amount FROM workers WHERE social_security_amount > 0").all() as any[];
    
    const transaction = db.transaction(() => {
      let appliedCount = 0;
      for (const worker of workers) {
        const description = `خصم الضمان الاجتماعي - شهر ${currentMonth}`;
        // التحقق مما إذا كان الخصم قد تم تطبيقه مسبقاً لهذا العامل في هذا الشهر
        const existing = db.prepare("SELECT id FROM worker_transactions WHERE worker_id = ? AND description = ?").get(worker.id, description);
        
        if (!existing) {
          db.prepare(`
            INSERT INTO worker_transactions (worker_id, type, amount, date, description)
            VALUES (?, 'deduction', ?, ?, ?)
          `).run(worker.id, worker.social_security_amount, firstOfMonth, description);
          appliedCount++;
        }
      }
      
      // تحديث سجل الوظائف النظامية
      const job = db.prepare("SELECT last_run_date FROM system_jobs WHERE job_name = 'social_security_deduction'").get() as any;
      if (!job) {
        db.prepare("INSERT INTO system_jobs (job_name, last_run_date) VALUES ('social_security_deduction', ?)").run(currentMonth);
      } else {
        db.prepare("UPDATE system_jobs SET last_run_date = ? WHERE job_name = 'social_security_deduction'").run(currentMonth);
      }
      return appliedCount;
    });
    
    const count = transaction();
    if (count > 0) {
      console.log(`Applied social security deductions for ${count} workers for ${currentMonth}`);
    }
  } catch (err) {
    console.error("Failed to apply monthly social security:", err);
  }
}

// تنفيذ الخصم عند تشغيل السيرفر
// applyMonthlySocialSecurity();

// Create default admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
const hashedAdmin = bcrypt.hashSync("Durra@2026", 10);

if (!adminExists) {
  db.prepare("INSERT INTO users (username, email, password, status, role, permissions) VALUES (?, ?, ?, ?, ?, ?)").run(
    "admin", 
    "admin@example.com",
    hashedAdmin, 
    "approved", 
    "admin", 
    JSON.stringify(["manage_workers", "manage_tasks", "add_evaluation", "edit_evaluation", "delete_evaluation", "view_evaluations", "view_reports", "manage_users", "view_audit_logs"])
  );
} else {
  // Force update password and email to a stronger one to avoid browser warnings
  db.prepare("UPDATE users SET password = ?, email = ? WHERE username = 'admin'").run(hashedAdmin, "admin@example.com");
  
  // Update admin permissions to include view_audit_logs if missing
  try {
    const adminUser = adminExists as any;
    const perms = JSON.parse(adminUser.permissions || '[]');
    if (!perms.includes('view_audit_logs')) {
      perms.push('view_audit_logs');
      db.prepare("UPDATE users SET permissions = ? WHERE id = ?").run(JSON.stringify(perms), adminUser.id);
    }
  } catch (e) {}
}

// Helper for logging
const logAction = (req: any, action: string, entityType?: string, entityId?: number, details?: string) => {
  try {
    const userId = req.user ? req.user.id : null;
    const username = req.user ? req.user.username : 'system';
    db.prepare("INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)").run(
      userId, username, action, entityType, entityId, details
    );
  } catch (e) {
    console.error("Failed to log action:", e);
  }
};

// MIGRATION: Add certificate_data column to pallets table if not exists
try {
  const tableInfo = db.prepare("PRAGMA table_info(pallets)").all() as any[];
  const hasCertData = tableInfo.some(col => col.name === 'certificate_data');
  if (!hasCertData) {
    db.prepare("ALTER TABLE pallets ADD COLUMN certificate_data TEXT").run();
  }
  const hasPkgCertData = tableInfo.some(col => col.name === 'packaging_certificate_data');
  if (!hasPkgCertData) {
    db.prepare("ALTER TABLE pallets ADD COLUMN packaging_certificate_data TEXT").run();
  }
} catch (e) {
  console.error("Migration failed:", e);
}

// MIGRATION: Recalculate all daily evaluation scores to be SUM instead of AVG
try {
  const evals = db.prepare("SELECT id FROM daily_evaluations").all() as any[];
  const updateEval = db.prepare("UPDATE daily_evaluations SET total_score = ? WHERE id = ?");
  const getEntries = db.prepare("SELECT quantity, task_id FROM task_entries WHERE evaluation_id = ?");
  const getTask = db.prepare("SELECT target_quantity FROM tasks WHERE id = ?");

  const migrateTransaction = db.transaction(() => {
    for (const ev of evals) {
      const entries = getEntries.all(ev.id) as any[];
      let totalScore = 0;
      for (const entry of entries) {
        const task = getTask.get(entry.task_id) as any;
        if (task && task.target_quantity > 0) {
          totalScore += (entry.quantity / task.target_quantity) * 100;
        }
      }
      updateEval.run(totalScore, ev.id);
    }
  });
  
  migrateTransaction();
  console.log("Migration: Recalculated daily evaluation scores (SUM logic).");
} catch (err) {
  console.error("Migration failed:", err);
}

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  logger("DEBUG: authenticateToken called for: " + req.url);
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    logger("DEBUG: No token found");
    return res.status(401).json({ error: "Unauthorized" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      logger("DEBUG: Token verification failed: " + err);
      return res.status(403).json({ error: "Forbidden" });
    }
    logger("DEBUG: Token verified for user: " + user.id);
    req.user = user;
    next();
  });
};

const requirePermission = (permission: string) => {
  return (req: any, res: any, next: any) => {
    logger(`DEBUG: requirePermission called for ${permission}, user: ${req.user?.id}, role: ${req.user?.role}`);
    if (!req.user) {
      logger("DEBUG: req.user is undefined in requirePermission");
      return res.status(403).json({ error: "Access denied: No user" });
    }
    if (req.user.role === 'admin') {
      logger("DEBUG: User is admin, granting permission");
      return next();
    }
    let perms = [];
    logger("DEBUG: req.user.permissions raw: " + JSON.stringify(req.user.permissions));
    if (req.user.permissions) {
      if (Array.isArray(req.user.permissions)) {
        perms = req.user.permissions;
      } else if (typeof req.user.permissions === 'string') {
        try {
          perms = JSON.parse(req.user.permissions);
        } catch (e) {
          logger("DEBUG: Error parsing permissions: " + e);
        }
      }
    }
    logger("DEBUG: perms array: " + JSON.stringify(perms) + " required: " + permission);
    if (perms.includes(permission)) {
      logger("DEBUG: Permission granted");
      return next();
    }
    logger(`DEBUG: Permission denied. User ${req.user.id} does not have ${permission}`);
    res.status(403).json({ error: "Access denied" });
  };
};

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  
  // Security Middlewares
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled for Vite dev server compatibility
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cors());
  
  // Rate Limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: { error: "Too many requests from this IP, please try again later." }
  });
  app.use('/api/', limiter);

  app.use((req, res, next) => {
    logger(`DEBUG: ${req.method} ${req.url}`);
    next();
  });
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---
  app.get("/api/debug/tables", (req, res) => {
    try {
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      res.json({ tables });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.get("/api/debug/permissions", authenticateToken, (req, res) => {
    const user = db.prepare("SELECT permissions FROM users WHERE id = ?").get((req as any).user.id) as any;
    res.json({
      tokenPermissions: (req as any).user.permissions,
      dbPermissions: JSON.parse(user.permissions || '[]')
    });
  });

  app.get("/api/debug/permissions/:username", (req, res) => {
    const { username } = req.params;
    const user = db.prepare("SELECT permissions FROM users WHERE username = ?").get(username) as any;
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({
      username: username,
      dbPermissions: JSON.parse(user.permissions || '[]')
    });
  });

  // Settings Routes
  app.get("/api/settings", authenticateToken, (req, res) => {
    try {
      const settings = getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings", authenticateToken, requirePermission("manage_users"), (req, res) => {
    const { official_start_time, official_end_time, break_start_time, break_end_time, has_break, overtime_rate } = req.body;
    try {
      const update = db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)");
      const transaction = db.transaction(() => {
        if (official_start_time) update.run('official_start_time', official_start_time);
        if (official_end_time) update.run('official_end_time', official_end_time);
        if (break_start_time) update.run('break_start_time', break_start_time);
        if (break_end_time) update.run('break_end_time', break_end_time);
        if (has_break !== undefined) update.run('has_break', has_break ? '1' : '0');
        if (overtime_rate) update.run('overtime_rate', overtime_rate.toString());
      });
      transaction();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Auth
  app.post("/api/auth/signup", (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: "Username, email, and password are required" });
    
    try {
      const hashed = bcrypt.hashSync(password, 10);
      // New users start with no permissions
      const defaultPermissions = JSON.stringify([]);
      
      db.prepare("INSERT INTO users (username, email, password, permissions) VALUES (?, ?, ?, ?)").run(username, email, hashed, defaultPermissions);
      
      const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, permissions: user.permissions },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        message: "Account created successfully.",
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
          permissions: JSON.parse(user.permissions)
        }
      });
    } catch (err) {
      res.status(400).json({ error: "Username or email already exists" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = req.body;
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      
      if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (user.status === 'rejected') {
        return res.status(403).json({ error: "Your account has been rejected." });
      }

      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role, 
          permissions: JSON.parse(user.permissions || '[]'), 
          worker_id: user.worker_id 
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      // Log login
      logAction({ user }, "LOGIN", "user", user.id, "تم تسجيل دخول المستخدم");

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
          permissions: JSON.parse(user.permissions || '[]'),
          worker_id: user.worker_id
        }
      });
    } catch (err) {
      console.error("Login route error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/auth/me", authenticateToken, (req: any, res) => {
    const user = db.prepare("SELECT id, username, email, role, permissions, status, worker_id FROM users WHERE id = ?").get(req.user.id) as any;
    if (!user) return res.status(404).json({ error: "User not found" });
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: JSON.parse(user.permissions || '[]'),
      status: user.status,
      worker_id: user.worker_id
    });
  });

  // Update Profile (Email)
  app.put("/api/auth/profile", authenticateToken, (req: any, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    
    try {
      const user = db.prepare("SELECT email FROM users WHERE id = ?").get(req.user.id) as any;
      if (user.email === email) {
        return res.json({ success: true, message: "No changes made" });
      }

      // Check if email is taken by another user
      const existing = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(email, req.user.id);
      if (existing) return res.status(400).json({ error: "Email already in use" });

      db.prepare("UPDATE users SET email = ? WHERE id = ?").run(email, req.user.id);
      logAction(req, "UPDATE_PROFILE", "user", req.user.id, `تم تحديث البريد الإلكتروني إلى ${email}`);
      res.json({ success: true, message: "Profile updated successfully" });
    } catch (err) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Update Password
  app.put("/api/auth/password", authenticateToken, (req: any, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Current and new password are required" });

    try {
      const user = db.prepare("SELECT password FROM users WHERE id = ?").get(req.user.id) as any;
      if (!bcrypt.compareSync(currentPassword, user.password)) {
        return res.status(400).json({ error: "Incorrect current password" });
      }

      const hashed = bcrypt.hashSync(newPassword, 10);
      const now = new Date().toISOString();
      db.prepare("UPDATE users SET password = ?, last_password_update = ? WHERE id = ?").run(hashed, now, req.user.id);
      logAction(req, "UPDATE_PASSWORD", "user", req.user.id, "تم تحديث كلمة المرور");
      res.json({ success: true, message: "Password updated successfully" });
    } catch (err) {
      res.status(500).json({ error: "Failed to update password" });
    }
  });

  // Admin Users Management
  app.get("/api/admin/audit-logs", authenticateToken, requirePermission("view_audit_logs"), (req, res) => {
    try {
      const logs = db.prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500").all();
      res.json(logs);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  app.get("/api/admin/users", authenticateToken, requirePermission("manage_users"), (req, res) => {
    const users = db.prepare("SELECT id, username, email, status, role, permissions FROM users WHERE role != 'admin'").all();
    res.json(users.map((u: any) => ({ ...u, permissions: JSON.parse(u.permissions || '[]') })));
  });

  app.put("/api/admin/users/:id/permissions", authenticateToken, requirePermission("manage_users"), (req, res) => {
    const { id } = req.params;
    const { permissions } = req.body; // Array of strings
    console.log("DEBUG: Updating permissions for user:", id, "permissions:", permissions);
    try {
      db.prepare("UPDATE users SET permissions = ? WHERE id = ?").run(JSON.stringify(permissions || []), id);
      logAction(req, "UPDATE_PERMISSIONS", "user", parseInt(id), `تم تحديث الصلاحيات: ${permissions ? permissions.join(", ") : "لا يوجد"}`);
      res.json({ success: true });
    } catch (err) {
      console.error("DEBUG: Error updating permissions:", err);
      res.status(500).json({ error: "Failed to update permissions" });
    }
  });

  // Orders API
  app.get("/api/orders", authenticateToken, (req, res) => {
    try {
      const orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
      res.json(orders);
    } catch (err) {
      console.error("Error fetching orders:", err);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", authenticateToken, (req, res) => {
    const { zone_name, country, item_name, quantity, weight, order_number, general_specs } = req.body;
    try {
      const result = db.prepare(`
        INSERT INTO orders (zone_name, country, item_name, quantity, weight, order_number, general_specs)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(zone_name, country, item_name, quantity, weight, order_number, general_specs);
      
      logAction(req, "CREATE_ORDER", "order", Number(result.lastInsertRowid), `تم إنشاء طلبية جديدة: ${order_number}`);
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (err: any) {
      console.error("Error creating order:", err);
      if (err.message && err.message.includes("UNIQUE constraint failed")) {
        res.status(400).json({ error: "رقم الطلبية موجود مسبقاً" });
      } else {
        res.status(500).json({ error: "Failed to create order" });
      }
    }
  });

  app.put("/api/orders/:id", authenticateToken, (req, res) => {
    const { id } = req.params;
    const { zone_name, country, item_name, quantity, weight, order_number, general_specs, status } = req.body;
    try {
      db.prepare(`
        UPDATE orders 
        SET zone_name = ?, country = ?, item_name = ?, quantity = ?, weight = ?, order_number = ?, general_specs = ?, status = ?
        WHERE id = ?
      `).run(zone_name, country, item_name, quantity, weight, order_number, general_specs, status || 'pending', id);
      
      logAction(req, "UPDATE_ORDER", "order", parseInt(id), `تم تحديث الطلبية: ${order_number}`);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error updating order:", err);
      if (err.message && err.message.includes("UNIQUE constraint failed")) {
        res.status(400).json({ error: "رقم الطلبية موجود مسبقاً" });
      } else {
        res.status(500).json({ error: "Failed to update order" });
      }
    }
  });

  app.delete("/api/orders/:id", authenticateToken, (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM orders WHERE id = ?").run(id);
      logAction(req, "DELETE_ORDER", "order", parseInt(id), `تم حذف الطلبية`);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting order:", err);
      res.status(500).json({ error: "Failed to delete order" });
    }
  });

  // إنشاء شهادة التغليف
  app.post("/api/production/pallets/:id/packaging-certificate", authenticateToken, (req, res) => {
    const { id } = req.params;
    const { packaging_certificate_data } = req.body;
    
    if (!packaging_certificate_data) return res.status(400).json({ error: "Packaging certificate data is required" });

    try {
      db.transaction(() => {
        // تحديث بيانات شهادة التغليف وتحديث الحالة
        db.prepare("UPDATE pallets SET packaging_certificate_data = ?, status = 'packaging_certificate_created' WHERE id = ?")
          .run(JSON.stringify(packaging_certificate_data), id);
      })();
      
      logAction(req, "CREATE_PACKAGING_CERT", "pallet", 0, `تم إنشاء شهادة التغليف للطبلية ${id}`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to create packaging certificate" });
    }
  });

  // توقيع مراحل الطبلية
  app.post("/api/production/pallets/:id/sign", authenticateToken, (req, res) => {
    const { id } = req.params;
    const { stage, next_status } = req.body;
    const userId = (req as any).user.id;

    if (!stage || !next_status) return res.status(400).json({ error: "Stage and next status are required" });

    try {
      db.transaction(() => {
        // تسجيل التوقيع
        db.prepare("INSERT INTO pallet_signatures (pallet_id, stage, user_id) VALUES (?, ?, ?)").run(id, stage, userId);
        // تحديث الحالة
        db.prepare("UPDATE pallets SET status = ? WHERE id = ?").run(next_status, id);
      })();
      
      logAction(req, "SIGN_PALLET", "pallet", 0, `تم توقيع الطبلية ${id} في مرحلة ${stage} وتحديث الحالة إلى ${next_status}`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to sign pallet" });
    }
  });

  app.put("/api/production/pallets/:id/status", authenticateToken, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      db.prepare("UPDATE pallets SET status = ? WHERE id = ?").run(status, id);
      logAction(req, "UPDATE_PALLET_STATUS", "pallet", 0, `تم تحديث حالة الطبلية ${id} إلى ${status}`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Production & Warehouse
  app.get("/api/production/pallets", authenticateToken, (req, res) => {
    const { type, status } = req.query;
    try {
      let pallets;
      let query = "SELECT * FROM pallets";
      const params: any[] = [];
      const conditions: string[] = [];

      if (type && type !== 'all') {
        conditions.push("type = ?");
        params.push(type);
      }
      if (status) {
        conditions.push("status = ?");
        params.push(status);
      }

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }
      query += " ORDER BY created_at DESC";

      pallets = db.prepare(query).all(...params);
      res.json(pallets);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch pallets" });
    }
  });

  app.post("/api/production/pallets", authenticateToken, (req, res) => {
    const { id, type, details, certificate_data, location, status } = req.body;
    if (!id || !type) return res.status(400).json({ error: "ID and type are required" });
    try {
      db.transaction(() => {
        db.prepare("INSERT INTO pallets (id, type, details, certificate_data, status) VALUES (?, ?, ?, ?, ?)").run(id, type, details, JSON.stringify(certificate_data), status || 'produced');
        if (location) {
          db.prepare("INSERT INTO warehouse_stock (pallet_id, location) VALUES (?, ?)").run(id, location);
        }
      })();
      logAction(req, "ADD_PALLET", "pallet", 0, `تم إضافة طبلية ${id} من نوع ${type}`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to add pallet" });
    }
  });

  app.put("/api/production/pallets/:id", authenticateToken, (req, res) => {
    const { id } = req.params;
    const { certificate_data, packaging_certificate_data, status, details, type } = req.body;

    try {
      console.log(`DEBUG: Updating pallet ${id}, user role: ${(req as any).user.role}, body: ${JSON.stringify(req.body)}`);
      const pallet = db.prepare("SELECT * FROM pallets WHERE id = ?").get(id) as any;
      if (!pallet) return res.status(404).json({ error: "Pallet not found" });

      // Check permissions for general editing
      const canEdit = (req as any).user.role === 'admin' || 
                      ((req as any).user.permissions && (req as any).user.permissions.includes('edit_production'));

      // Check if quality officer has already signed
      if (!canEdit && pallet.certificate_data) {
        try {
          const currentCertData = JSON.parse(pallet.certificate_data);
          if (currentCertData?.signatures?.quality_officer?.signed) {
             // Allow update only if we are not modifying certificate_data content (excluding signatures)
             if (certificate_data) {
                 const newCertData = certificate_data;
                 // Create copies without signatures to compare content
                 const { signatures: oldSigs, ...oldContent } = currentCertData;
                 const { signatures: newSigs, ...newContent } = newCertData;
                 
                 if (JSON.stringify(oldContent) !== JSON.stringify(newContent)) {
                     return res.status(403).json({ error: "Cannot edit certificate details after Quality Officer signature" });
                 }
             }
             // Also prevent updating details if they are different
             if (req.body.details && req.body.details !== pallet.details) {
                 return res.status(403).json({ error: "Cannot edit pallet details after Quality Officer signature" });
             }
          }
        } catch (e) {
          // ignore parse error
        }
      }

      if (certificate_data) {
        const currentCertData = pallet.certificate_data ? JSON.parse(pallet.certificate_data) : {};
        const newCertData = typeof certificate_data === 'string' ? JSON.parse(certificate_data) : certificate_data;
        
        // Merge signatures from current data into new data
        const mergedCertData = {
          ...newCertData,
          signatures: {
            ...(currentCertData.signatures || {}),
            ...(newCertData.signatures || {})
          }
        };
        
        const certDataToSave = JSON.stringify(mergedCertData);
        db.prepare("UPDATE pallets SET certificate_data = ? WHERE id = ?").run(certDataToSave, id);
        logAction(req, "UPDATE_PALLET_CERT", "pallet", 0, `تم تحديث بيانات الشهادة للطبلية ${id}`);
      }

      if (packaging_certificate_data) {
        const currentPkgCertData = pallet.packaging_certificate_data ? JSON.parse(pallet.packaging_certificate_data) : {};
        const newPkgCertData = typeof packaging_certificate_data === 'string' ? JSON.parse(packaging_certificate_data) : packaging_certificate_data;
        
        // Merge signatures from current data into new data
        const mergedPkgCertData = {
          ...newPkgCertData,
          signatures: {
            ...(currentPkgCertData.signatures || {}),
            ...(newPkgCertData.signatures || {})
          }
        };
        
        const pkgCertDataToSave = JSON.stringify(mergedPkgCertData);
        db.prepare("UPDATE pallets SET packaging_certificate_data = ? WHERE id = ?").run(pkgCertDataToSave, id);
        logAction(req, "UPDATE_PACKAGING_CERT", "pallet", 0, `تم تحديث بيانات شهادة التغليف للطبلية ${id}`);
      }
      
      if (status) {
        console.log(`DEBUG: Updating status for pallet ${id} to ${status}`);
        db.prepare("UPDATE pallets SET status = ? WHERE id = ?").run(status, id);
        logAction(req, "UPDATE_PALLET_STATUS", "pallet", 0, `تم تحديث حالة الطبلية ${id} إلى ${status}`);
      }

      if (details && canEdit) {
        db.prepare("UPDATE pallets SET details = ? WHERE id = ?").run(details, id);
        logAction(req, "UPDATE_PALLET_DETAILS", "pallet", 0, `تم تحديث تفاصيل الطبلية ${id}`);
      }

      if (type && canEdit) {
        db.prepare("UPDATE pallets SET type = ? WHERE id = ?").run(type, id);
        logAction(req, "UPDATE_PALLET_TYPE", "pallet", 0, `تم تحديث نوع الطبلية ${id} إلى ${type}`);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/production/pallets/:id", authenticateToken, requirePermission("delete_production"), (req, res) => {
    const { id } = req.params;
    try {
      const pallet = db.prepare("SELECT * FROM pallets WHERE id = ?").get(id) as any;
      if (!pallet) return res.status(404).json({ error: "Pallet not found" });

      const transaction = db.transaction(() => {
        db.prepare("DELETE FROM warehouse_stock WHERE pallet_id = ?").run(id);
        db.prepare("DELETE FROM warehouse_requests WHERE pallet_id = ?").run(id);
        db.prepare("DELETE FROM pallets WHERE id = ?").run(id);
      });
      transaction();
      
      logAction(req, "DELETE_PALLET", "pallet", 0, `تم حذف الطبلية ${id}`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete pallet" });
    }
  });

  app.post("/api/warehouse/transfer", authenticateToken, (req, res) => {
    const { pallet_id, location } = req.body;
    if (!pallet_id || !location) return res.status(400).json({ error: "Pallet ID and location are required" });
    try {
      db.prepare("UPDATE pallets SET status = 'in_warehouse' WHERE id = ?").run(pallet_id);
      db.prepare("INSERT INTO warehouse_stock (pallet_id, location) VALUES (?, ?)").run(pallet_id, location);
      logAction(req, "TRANSFER_PALLET", "pallet", 0, `تم نقل الطبلية ${pallet_id} إلى ${location}`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to transfer pallet" });
    }
  });

  app.post("/api/warehouse/ship", authenticateToken, (req, res) => {
    const { pallet_ids, shipping_details } = req.body;
    if (!pallet_ids || !Array.isArray(pallet_ids) || pallet_ids.length === 0) {
      return res.status(400).json({ error: "Pallet IDs are required" });
    }
    try {
      const transaction = db.transaction(() => {
        for (const pallet_id of pallet_ids) {
          db.prepare("UPDATE pallets SET status = 'shipped' WHERE id = ?").run(pallet_id);
          db.prepare("UPDATE warehouse_stock SET location = 'external' WHERE pallet_id = ?").run(pallet_id);
          // Optionally store shipping details in a new table or log
          db.prepare("INSERT INTO shipping_logs (pallet_id, shipping_date, destination, driver_name, truck_number, notes) VALUES (?, ?, ?, ?, ?, ?)").run(
            pallet_id, 
            shipping_details?.shipping_date, 
            shipping_details?.destination, 
            shipping_details?.driver_name, 
            shipping_details?.truck_number, 
            shipping_details?.notes
          );
        }
      });
      transaction();
      logAction(req, "SHIP_PALLETS", "pallet", 0, `تم شحن الطبالي: ${pallet_ids.join(", ")} إلى ${shipping_details?.destination || 'غير محدد'}`);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error shipping pallets:", err);
      res.status(500).json({ error: "Failed to ship pallets" });
    }
  });

  app.get("/api/warehouse/shipments", authenticateToken, (req, res) => {
    try {
      const logs = db.prepare(`
        SELECT 
          sl.shipping_date, sl.destination, sl.driver_name, sl.truck_number, sl.notes, sl.created_at,
          p.id as pallet_id, p.type, p.details, p.certificate_data, p.packaging_certificate_data
        FROM shipping_logs sl
        JOIN pallets p ON sl.pallet_id = p.id
        ORDER BY sl.created_at DESC
      `).all();

      // Group by shipment details
      const shipmentsMap = new Map();
      
      logs.forEach((log: any) => {
        // Create a unique key for the shipment
        const key = `${log.shipping_date}-${log.destination}-${log.driver_name}-${log.truck_number}-${log.created_at}`;
        
        if (!shipmentsMap.has(key)) {
          shipmentsMap.set(key, {
            id: key,
            shipping_details: {
              shipping_date: log.shipping_date,
              destination: log.destination,
              driver_name: log.driver_name,
              truck_number: log.truck_number,
              notes: log.notes
            },
            created_at: log.created_at,
            pallet_ids: [],
            pallets: []
          });
        }
        
        const shipment = shipmentsMap.get(key);
        shipment.pallet_ids.push(log.pallet_id);
        
        // Parse certificate data
        let prodCert = null;
        let pkgCert = null;
        try { prodCert = log.certificate_data ? JSON.parse(log.certificate_data) : null; } catch (e) {}
        try { pkgCert = log.packaging_certificate_data ? JSON.parse(log.packaging_certificate_data) : null; } catch (e) {}
        
        shipment.pallets.push({
          id: log.pallet_id,
          type: log.type,
          details: log.details,
          production_certificate_data: prodCert,
          packaging_certificate_data: pkgCert
        });
      });

      const shipments = Array.from(shipmentsMap.values());
      res.json(shipments);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Warehouse Requests
  app.get("/api/warehouse/requests", authenticateToken, (req, res) => {
    try {
      const requests = db.prepare(`
        SELECT r.*, p.details as pallet_details, p.certificate_data, p.packaging_certificate_data, p.status as pallet_status
        FROM warehouse_requests r 
        LEFT JOIN pallets p ON r.pallet_id = p.id 
        ORDER BY r.created_at DESC
      `).all();
      res.json(requests);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  app.get("/api/warehouse/stock", authenticateToken, (req, res) => {
    try {
      const stock = db.prepare(`
        SELECT w.id, w.pallet_id, w.location, w.added_at, p.details, p.type, p.certificate_data, p.packaging_certificate_data 
        FROM warehouse_stock w 
        LEFT JOIN pallets p ON w.pallet_id = p.id 
        
        UNION ALL
        
        SELECT NULL as id, p.id as pallet_id, 'internal_production' as location, p.created_at as added_at, p.details, p.type, p.certificate_data, p.packaging_certificate_data
        FROM pallets p
        WHERE p.status = 'in_warehouse' AND p.id NOT IN (SELECT pallet_id FROM warehouse_stock)
        
        ORDER BY added_at DESC
      `).all();
      res.json(stock);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch stock" });
    }
  });

  app.post("/api/warehouse/requests", authenticateToken, (req, res) => {
    const { pallet_id, status } = req.body;
    if (!pallet_id) return res.status(400).json({ error: "Pallet ID is required" });
    try {
      const existing = db.prepare("SELECT id FROM warehouse_requests WHERE pallet_id = ?").get(pallet_id);
      if (existing) {
        res.json({ success: true, message: "Request already exists" });
        return;
      }
      db.prepare("INSERT INTO warehouse_requests (pallet_id, status) VALUES (?, ?)").run(pallet_id, status || 'pending');
      logAction(req, "CREATE_WAREHOUSE_REQUEST", "pallet", 0, `تم إنشاء طلب مستودع للطبلية ${pallet_id}`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create request" });
    }
  });

  app.put("/api/warehouse/requests/:id", authenticateToken, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      db.prepare("UPDATE warehouse_requests SET status = ? WHERE id = ?").run(status, id);
      logAction(req, "UPDATE_WAREHOUSE_REQUEST", "pallet", parseInt(id), `تم تحديث حالة طلب المستودع إلى ${status}`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to update request" });
    }
  });

  // Packaging Department Routes
  app.get("/api/packaging/incoming", authenticateToken, (req, res) => {
    try {
      // Show pallets that are sent to packaging
      // For Tomato: status 'sent_to_packaging' (after QC sign)
      // For others: keep existing logic if needed, or just rely on status
      const pallets = db.prepare("SELECT * FROM pallets WHERE status IN ('produced', 'sent_to_packaging') ORDER BY created_at DESC").all();
      
      const readyPallets = pallets.filter((p: any) => {
        try {
          const cert = JSON.parse(p.certificate_data || '{}');
          
          if (p.status === 'sent_to_packaging') {
            return true;
          }

          // Legacy logic (if any pallets are still 'produced' but fully signed)
          return cert?.signatures?.qc?.signed === true && cert?.signatures?.quality_officer?.signed === true;
        } catch (e) {
          return false;
        }
      });
      
      res.json(readyPallets);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch incoming pallets" });
    }
  });

  app.get("/api/packaging/stock", authenticateToken, (req, res) => {
    try {
      const pallets = db.prepare("SELECT * FROM pallets WHERE status = 'in_packaging_stock' ORDER BY created_at DESC").all();
      res.json(pallets);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch packaging stock" });
    }
  });

  app.get("/api/packaging/processing", authenticateToken, (req, res) => {
    try {
      const pallets = db.prepare("SELECT * FROM pallets WHERE status IN ('packaging_in_progress', 'awaiting_packaging_supervisor', 'packaging_done', 'packaging_qc_approved') ORDER BY created_at DESC").all();
      res.json(pallets);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch processing pallets" });
    }
  });

  app.put("/api/packaging/receive/:id", authenticateToken, (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("UPDATE pallets SET status = 'in_packaging_stock' WHERE id = ?").run(id);
      logAction(req, "RECEIVE_PALLET", "pallet", 0, `تم استلام الطبلية ${id} في مخزون التغليف`);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to receive pallet" });
    }
  });

  app.put("/api/packaging/start/:id", authenticateToken, (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("UPDATE pallets SET status = 'packaging_in_progress' WHERE id = ?").run(id);
      logAction(req, "START_PACKAGING", "pallet", 0, `بدء عملية التغليف للطبلية ${id}`);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to start packaging" });
    }
  });

  app.put("/api/packaging/finish/:id", authenticateToken, (req, res) => {
    const { id } = req.params;
    const { packaging_certificate_data } = req.body;
    try {
      db.prepare("UPDATE pallets SET status = 'packaging_done', packaging_certificate_data = ? WHERE id = ?").run(JSON.stringify(packaging_certificate_data), id);
      logAction(req, "FINISH_PACKAGING", "pallet", 0, `تم الانتهاء من تغليف الطبلية ${id}`);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to finish packaging" });
    }
  });

  app.put("/api/packaging/quality/:id", authenticateToken, requirePermission("edit_task"), (req, res) => {
    const { id } = req.params;
    const { packaging_certificate_data } = req.body;
    try {
      if (packaging_certificate_data) {
         db.prepare("UPDATE pallets SET status = 'packaging_qc_approved', packaging_certificate_data = ? WHERE id = ?").run(JSON.stringify(packaging_certificate_data), id);
      } else {
         db.prepare("UPDATE pallets SET status = 'packaging_qc_approved' WHERE id = ?").run(id);
      }
      logAction(req, "QUALITY_CHECK", "pallet", 0, `تم اجتياز فحص جودة التغليف للطبلية ${id}`);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update quality check" });
    }
  });

  app.put("/api/packaging/warehouse/:id", authenticateToken, (req, res) => {
    const { id } = req.params;
    try {
      // Instead of sending directly to warehouse, send to Quality Officer first
      db.prepare("UPDATE pallets SET status = 'awaiting_quality_officer' WHERE id = ?").run(id);
      logAction(req, "SEND_TO_QUALITY_OFFICER", "pallet", 0, `تم إرسال الطبلية ${id} لضابط الجودة (من التغليف)`);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to send to Quality Officer" });
    }
  });

  app.delete("/api/admin/users/:id", authenticateToken, requirePermission("manage_users"), (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM users WHERE id = ?").run(id);
      logAction(req, "DELETE_USER", "user", parseInt(id), "تم حذف المستخدم");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // --- مسارات العمال (Workers) ---
  // جلب كافة العمال
  app.get("/api/workers", authenticateToken, requirePermission("view_workers"), (req, res) => {
    const workers = db.prepare("SELECT * FROM workers").all();
    res.json(workers);
  });

  // إضافة عامل جديد
  app.post("/api/workers", authenticateToken, requirePermission("add_worker"), (req, res) => {
    const { name, phone, alt_phone, address, national_id, age, last_workplace, current_job, salary, has_social_security, social_security_amount, notes } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    try {
      const info = db.prepare(`
        INSERT INTO workers (name, phone, alt_phone, address, national_id, age, last_workplace, current_job, salary, has_social_security, social_security_amount, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        name, 
        phone || null, 
        alt_phone || null, 
        address || null, 
        national_id || null,
        age || null,
        last_workplace || null, 
        current_job || null, 
        salary || null, 
        has_social_security ? 1 : 0,
        social_security_amount || 0,
        notes || null
      );
      logAction(req, "CREATE_WORKER", "worker", Number(info.lastInsertRowid), `تم إضافة عامل جديد: ${name}`);
      res.json({ id: info.lastInsertRowid, name, phone, alt_phone, address, national_id, age, last_workplace, current_job, salary, has_social_security, social_security_amount, notes });
    } catch (err: any) {
      console.error("Failed to create worker:", err);
      logger(`ERROR: Failed to create worker: ${err.message}`);
      res.status(400).json({ error: err.message || "Worker already exists or invalid data" });
    }
  });

  app.put("/api/workers/:id", authenticateToken, requirePermission("edit_worker"), (req, res) => {
    const { id } = req.params;
    const { name, phone, alt_phone, address, national_id, age, last_workplace, current_job, salary, has_social_security, social_security_amount, notes } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    try {
      const oldWorker = db.prepare("SELECT * FROM workers WHERE id = ?").get(id) as any;
      if (oldWorker) {
        const hasChanges = 
          oldWorker.name !== name ||
          oldWorker.phone !== (phone || null) ||
          oldWorker.alt_phone !== (alt_phone || null) ||
          oldWorker.address !== (address || null) ||
          oldWorker.national_id !== (national_id || null) ||
          oldWorker.age !== (age || null) ||
          oldWorker.last_workplace !== (last_workplace || null) ||
          oldWorker.current_job !== (current_job || null) ||
          oldWorker.salary !== (salary || null) ||
          oldWorker.has_social_security !== (has_social_security ? 1 : 0) ||
          oldWorker.social_security_amount !== (social_security_amount || 0) ||
          oldWorker.notes !== (notes || null);
        
        if (!hasChanges) {
          return res.json({ success: true, message: "No changes made" });
        }
      }

      db.prepare(`
        UPDATE workers 
        SET name = ?, phone = ?, alt_phone = ?, address = ?, national_id = ?, age = ?, last_workplace = ?, current_job = ?, salary = ?, has_social_security = ?, social_security_amount = ?, notes = ?
        WHERE id = ?
      `).run(
        name, 
        phone || null, 
        alt_phone || null, 
        address || null, 
        national_id || null,
        age || null,
        last_workplace || null, 
        current_job || null, 
        salary || null, 
        has_social_security ? 1 : 0,
        social_security_amount || 0,
        notes || null,
        id
      );
      logAction(req, "UPDATE_WORKER", "worker", parseInt(id), `تم تحديث بيانات العامل: ${name}`);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Failed to update worker:", err);
      logger(`ERROR: Failed to update worker: ${err.message}`);
      res.status(400).json({ error: err.message || "Failed to update worker" });
    }
  });

  app.delete("/api/workers/:id", authenticateToken, requirePermission("delete_worker"), (req, res) => {
    const { id } = req.params;
    
    const transaction = db.transaction(() => {
      // Find all evaluations for this worker
      const evals = db.prepare("SELECT id FROM daily_evaluations WHERE worker_id = ?").all(id) as any[];
      
      // Delete task entries for those evaluations
      for (const ev of evals) {
        db.prepare("DELETE FROM task_entries WHERE evaluation_id = ?").run(ev.id);
      }
      
      // Delete evaluations
      db.prepare("DELETE FROM daily_evaluations WHERE worker_id = ?").run(id);
      
      // Delete transactions
      db.prepare("DELETE FROM worker_transactions WHERE worker_id = ?").run(id);

      // Delete attendance records
      db.prepare("DELETE FROM attendance WHERE worker_id = ?").run(id);

      // Delete departures records
      db.prepare("DELETE FROM departures WHERE worker_id = ?").run(id);

      // Delete user account associated with worker
      db.prepare("DELETE FROM users WHERE worker_id = ?").run(id);

      // Delete worker
      db.prepare("DELETE FROM workers WHERE id = ?").run(id);
    });

    try {
      transaction();
      logAction(req, "DELETE_WORKER", "worker", parseInt(id), "تم حذف العامل والبيانات المتعلقة به");
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to delete worker:", err);
      res.status(500).json({ error: "Failed to delete worker" });
    }
  });

  // Worker Transactions
  app.get("/api/workers/:id/transactions", authenticateToken, requirePermission("view_account_statements"), (req, res) => {
    const { id } = req.params;
    const { month } = req.query; // format: YYYY-MM
    
    // التأكد من تطبيق خصم الضمان الاجتماعي قبل جلب الحركات
    applyMonthlySocialSecurity();

    let query = "SELECT * FROM worker_transactions WHERE worker_id = ?";
    const params: any[] = [id];
    
    if (month) {
      query += " AND date LIKE ?";
      params.push(`${month}%`);
    }
    
    query += " ORDER BY date DESC, id DESC";
    
    try {
      const transactions = db.prepare(query).all(...params);
      res.json(transactions);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/workers/:id/transactions", authenticateToken, requirePermission("add_transaction"), (req, res) => {
    const { id } = req.params;
    const { type, amount, date, description } = req.body;
    
    if (!type || amount === undefined || !date) {
      return res.status(400).json({ error: "Type, amount, and date are required" });
    }
    
    try {
      const info = db.prepare(`
        INSERT INTO worker_transactions (worker_id, type, amount, date, description)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, type, amount, date, description || null);
      
      logAction(req, "CREATE_TRANSACTION", "transaction", Number(info.lastInsertRowid), `تم إضافة ${type} بمبلغ ${amount} للعامل ${id}`);

      res.json({ 
        id: info.lastInsertRowid, 
        worker_id: parseInt(id), 
        type, 
        amount, 
        date, 
        description 
      });
    } catch (err) {
      console.error("Failed to add transaction:", err);
      res.status(500).json({ error: "Failed to add transaction" });
    }
  });

  app.delete("/api/transactions/:id", authenticateToken, requirePermission("delete_transaction"), (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM worker_transactions WHERE id = ?").run(id);
      logAction(req, "DELETE_TRANSACTION", "transaction", parseInt(id), "تم حذف الحركة المالية");
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to delete transaction:", err);
      res.status(500).json({ error: "Failed to delete transaction" });
    }
  });

  // Tasks
  app.get("/api/tasks", authenticateToken, requirePermission("view_tasks"), (req, res) => {
    const { active_only } = req.query;
    let query = "SELECT * FROM tasks";
    if (active_only === 'true') {
      query += " WHERE is_active = 1";
    }
    const tasks = db.prepare(query).all();
    res.json(tasks);
  });

  app.post("/api/tasks", authenticateToken, requirePermission("add_task"), (req, res) => {
    const { name, target_quantity } = req.body;
    if (!name || !target_quantity) return res.status(400).json({ error: "Name and target_quantity are required" });
    
    try {
      // Check if task exists (including inactive ones)
      const existingTask = db.prepare("SELECT * FROM tasks WHERE name = ?").get(name) as any;
      
      if (existingTask) {
        if (existingTask.is_active === 0) {
          // Reactivate task
          db.prepare("UPDATE tasks SET is_active = 1, target_quantity = ? WHERE id = ?").run(target_quantity, existingTask.id);
          logAction(req, "REACTIVATE_TASK", "task", existingTask.id, `تم إعادة تفعيل المهمة: ${name}`);
          return res.json({ id: existingTask.id, name, target_quantity });
        } else {
          return res.status(400).json({ error: "Task already exists" });
        }
      }

      const info = db.prepare("INSERT INTO tasks (name, target_quantity) VALUES (?, ?)").run(name, target_quantity);
      logAction(req, "CREATE_TASK", "task", Number(info.lastInsertRowid), `تم إنشاء مهمة جديدة: ${name}`);
      res.json({ id: info.lastInsertRowid, name, target_quantity });
    } catch (err: any) {
      console.error("Failed to create task:", err);
      logger(`ERROR: Failed to create task: ${err.message}`);
      res.status(400).json({ error: err.message || "Task already exists or invalid data" });
    }
  });

  app.put("/api/tasks/:id", authenticateToken, requirePermission("edit_task"), (req, res) => {
    const { id } = req.params;
    const { name, target_quantity } = req.body;
    if (!name || !target_quantity) return res.status(400).json({ error: "Name and target_quantity are required" });
    try {
      db.prepare("UPDATE tasks SET name = ?, target_quantity = ? WHERE id = ?").run(name, target_quantity, id);
      logAction(req, "UPDATE_TASK", "task", parseInt(id), `تم تحديث المهمة: ${name}`);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Failed to update task:", err);
      logger(`ERROR: Failed to update task: ${err.message}`);
      res.status(400).json({ error: err.message || "Failed to update task or name already exists" });
    }
  });

  app.delete("/api/tasks/:id", authenticateToken, requirePermission("delete_task"), (req, res) => {
    const { id } = req.params;
    
    try {
      // Check if task has entries
      const hasEntries = db.prepare("SELECT id FROM task_entries WHERE task_id = ? LIMIT 1").get(id);
      
      if (hasEntries) {
        // Soft delete: just mark as inactive
        db.prepare("UPDATE tasks SET is_active = 0 WHERE id = ?").run(id);
        logAction(req, "SOFT_DELETE_TASK", "task", parseInt(id), "تم تعطيل المهمة لوجود سجلات مرتبطة بها");
        return res.json({ success: true, message: "Task marked as inactive because it has history" });
      } else {
        // Hard delete: safe to remove
        db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
        logAction(req, "DELETE_TASK", "task", parseInt(id), "تم حذف المهمة نهائياً");
        return res.json({ success: true });
      }
    } catch (err) {
      console.error("Failed to delete task:", err);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Evaluations
  app.post("/api/evaluations", authenticateToken, requirePermission("add_evaluation"), (req, res) => {
    logger("DEBUG: POST /api/evaluations body: " + JSON.stringify(req.body));
    const { worker_id, date, entries } = req.body;
    if (!worker_id || !date || !entries || !entries.length) {
      logger("DEBUG: Missing fields in POST /api/evaluations");
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if evaluation already exists for this worker on this date
    const existing = db.prepare("SELECT id FROM daily_evaluations WHERE worker_id = ? AND date = ?").get(worker_id, date);
    if (existing) {
      return res.status(400).json({ error: "Evaluation already exists for this worker on this date" });
    }

    const tasks = db.prepare("SELECT * FROM tasks").all() as any[];
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    let totalScoreSum = 0;
    const processedEntries = [];

    for (const entry of entries) {
      // Find the task object from the map using the task_id
      const task = taskMap.get(parseInt(entry.task_id));
      if (!task) return res.status(400).json({ error: `Task ID ${entry.task_id} not found` });
      
      // Use provided target_quantity or fallback to task default
      const targetQuantity = entry.target_quantity ? parseInt(entry.target_quantity) : task.target_quantity;
      
      const score = (entry.quantity / targetQuantity) * 100;
      totalScoreSum += score;
      processedEntries.push({ 
        task_id: parseInt(entry.task_id), 
        quantity: parseInt(entry.quantity), 
        score, 
        target_quantity: targetQuantity 
      });
    }

    // Sum of scores for the day based on tasks performed
    const dailyTotalScore = totalScoreSum;

    const insertEval = db.prepare("INSERT INTO daily_evaluations (worker_id, date, total_score) VALUES (?, ?, ?)");
    const insertEntry = db.prepare("INSERT INTO task_entries (evaluation_id, task_id, quantity, score, target_quantity) VALUES (?, ?, ?, ?, ?)");

    const transaction = db.transaction(() => {
      const evalInfo = insertEval.run(worker_id, date, dailyTotalScore);
      const evalId = evalInfo.lastInsertRowid;
      for (const entry of processedEntries) {
        insertEntry.run(evalId, entry.task_id, entry.quantity, entry.score, entry.target_quantity);
      }
      return evalId;
    });

    try {
      const newEvalId = transaction();
      logAction(req, "CREATE_EVALUATION", "evaluation", Number(newEvalId), `تم إنشاء تقييم للعامل ${worker_id} بتاريخ ${date}`);
      res.json({ success: true, evaluation_id: newEvalId, daily_score: dailyTotalScore });
    } catch (err) {
      logger("DEBUG: Error in POST /api/evaluations: " + err);
      res.status(500).json({ error: "Failed to save evaluation" });
    }
  });

  // --- مسارات التقييمات (Evaluations) ---
  // جلب التقييمات لشهر محدد
  app.get("/api/evaluations", authenticateToken, requirePermission("view_evaluations"), (req, res) => {
    const { month } = req.query; // format: YYYY-MM
    let query = `
      SELECT e.*, w.name as worker_name 
      FROM daily_evaluations e
      JOIN workers w ON e.worker_id = w.id
    `;
    let params: any[] = [];

    if (month) {
      query += " WHERE e.date LIKE ?";
      params.push(`${month}-%`);
    }

    query += " ORDER BY e.date DESC";

    const evaluations = db.prepare(query).all(...params);
    res.json(evaluations);
  });

  app.get("/api/workers/:id/evaluations", authenticateToken, requirePermission("view_evaluations"), (req, res) => {
    const { id } = req.params;
    const { month } = req.query; // format: YYYY-MM
    
    let query = "SELECT * FROM daily_evaluations WHERE worker_id = ?";
    const params: any[] = [id];

    if (month) {
      query += " AND date LIKE ?";
      params.push(`${month}-%`);
    }
    
    query += " ORDER BY date DESC";
    
    const evaluations = db.prepare(query).all(...params) as any[];
    
    // For each evaluation, get the entries
    const result = evaluations.map(ev => {
      const entries = db.prepare(`
        SELECT te.*, t.name as task_name, t.target_quantity as task_default_target
        FROM task_entries te
        JOIN tasks t ON te.task_id = t.id
        WHERE te.evaluation_id = ?
      `).all(ev.id);
      return { ...ev, entries };
    });

    res.json(result);
  });

  app.get("/api/evaluations/:id", authenticateToken, requirePermission("view_evaluations"), (req, res) => {
    const { id } = req.params;
    const evaluation = db.prepare(`
      SELECT e.*, w.name as worker_name 
      FROM daily_evaluations e
      JOIN workers w ON e.worker_id = w.id
      WHERE e.id = ?
    `).get(id);

    if (!evaluation) return res.status(404).json({ error: "Not found" });

    const entries = db.prepare(`
      SELECT te.*, t.name as task_name, t.target_quantity as task_default_target
      FROM task_entries te
      JOIN tasks t ON te.task_id = t.id
      WHERE te.evaluation_id = ?
    `).all(id);

    res.json({ ...evaluation, entries });
  });

  app.delete("/api/evaluations/:id", authenticateToken, requirePermission("delete_evaluation"), (req, res) => {
    const { id } = req.params;
    
    const transaction = db.transaction(() => {
      db.prepare("DELETE FROM task_entries WHERE evaluation_id = ?").run(id);
      db.prepare("DELETE FROM daily_evaluations WHERE id = ?").run(id);
    });

    try {
      transaction();
      logAction(req, "DELETE_EVALUATION", "evaluation", parseInt(id), "تم حذف التقييم");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete evaluation" });
    }
  });

  app.put("/api/evaluations/:id", authenticateToken, requirePermission("edit_evaluation"), (req, res) => {
    const { id } = req.params;
    const { entries } = req.body;
    
    if (!entries || !entries.length) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const tasks = db.prepare("SELECT * FROM tasks").all() as any[];
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    let totalScoreSum = 0;
    const processedEntries = [];

    for (const entry of entries) {
      const task = taskMap.get(parseInt(entry.task_id));
      if (!task) return res.status(400).json({ error: `Task ID ${entry.task_id} not found` });
      
      // Use provided target_quantity or fallback to task default
      const targetQuantity = entry.target_quantity ? parseInt(entry.target_quantity) : task.target_quantity;
      
      const score = (entry.quantity / targetQuantity) * 100;
      totalScoreSum += score;
      processedEntries.push({ 
        task_id: parseInt(entry.task_id), 
        quantity: parseInt(entry.quantity), 
        score, 
        target_quantity: targetQuantity 
      });
    }

    // Sum of scores for the day based on tasks performed
    const dailyTotalScore = totalScoreSum;

    const transaction = db.transaction(() => {
      db.prepare("UPDATE daily_evaluations SET total_score = ? WHERE id = ?").run(dailyTotalScore, id);
      db.prepare("DELETE FROM task_entries WHERE evaluation_id = ?").run(id);
      
      const insertEntry = db.prepare("INSERT INTO task_entries (evaluation_id, task_id, quantity, score, target_quantity) VALUES (?, ?, ?, ?, ?)");
      for (const entry of processedEntries) {
        insertEntry.run(id, entry.task_id, entry.quantity, entry.score, entry.target_quantity);
      }
    });

    try {
      transaction();
      logAction(req, "UPDATE_EVALUATION", "evaluation", parseInt(id), "تم تحديث التقييم");
      res.json({ success: true, daily_score: dailyTotalScore });
    } catch (err) {
      res.status(500).json({ error: "Failed to update evaluation" });
    }
  });

  app.get("/api/reports/monthly", authenticateToken, requirePermission("view_reports"), (req, res) => {
    const { month } = req.query; // format: YYYY-MM
    if (!month) return res.status(400).json({ error: "Month is required (YYYY-MM)" });

    const report = db.prepare(`
      SELECT 
        w.id as worker_id,
        w.name as worker_name,
        COUNT(e.id) as days_worked,
        AVG(e.total_score) as average_score
      FROM workers w
      LEFT JOIN daily_evaluations e ON w.id = e.worker_id AND e.date LIKE ?
      GROUP BY w.id
    `).all(`${month}-%`);

    res.json(report);
  });

  // Attendance Routes
  // --- مسارات الحضور والغياب (Attendance) ---
  // جلب سجلات الحضور
  app.get("/api/attendance", authenticateToken, requirePermission("view_attendance"), (req, res) => {
    const { date, start_date, end_date } = req.query;

    try {
      if (date) {
        const records = db.prepare(`
          SELECT 
            w.id as worker_id, 
            w.name as worker_name, 
            a.id as attendance_id, 
            a.status, 
            a.date,
            a.check_in, 
            a.check_out, 
            a.notes
          FROM workers w
          LEFT JOIN attendance a ON w.id = a.worker_id AND a.date = ?
          ORDER BY w.name
        `).all(date);
        res.json(records);
      } else if (start_date && end_date) {
        const records = db.prepare(`
          SELECT 
            a.worker_id, 
            w.name as worker_name, 
            a.id as attendance_id, 
            a.status, 
            a.date,
            a.check_in, 
            a.check_out, 
            a.notes
          FROM attendance a
          JOIN workers w ON a.worker_id = w.id
          WHERE a.date BETWEEN ? AND ?
          ORDER BY a.date DESC
        `).all(start_date, end_date);
        res.json(records);
      } else {
        res.status(400).json({ error: "Date or date range (start_date & end_date) is required" });
      }
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // تسجيل الحضور والغياب
  app.post("/api/attendance", authenticateToken, requirePermission("manage_attendance"), (req, res) => {
    const { worker_id, date, status, check_in, check_out, notes } = req.body;
    
    if (!worker_id || !date || !status) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const settings = getSettings();
      const worker = db.prepare("SELECT salary FROM workers WHERE id = ?").get(worker_id) as any;
      
      const transaction = db.transaction(() => {
        // 1. حفظ سجل الحضور (Save Attendance)
        const existing = db.prepare("SELECT id FROM attendance WHERE worker_id = ? AND date = ?").get(worker_id, date) as any;
        
        let finalNotes = notes || "";
        let overtimeAmount = 0;

        // حساب العمل الإضافي (Overtime)
        // يتم احتساب العمل الإضافي إذا كان وقت الخروج بعد وقت نهاية الدوام الرسمي
        if (status === 'present' && check_out && settings.official_end_time) {
          const [outH, outM] = check_out.split(':').map(Number);
          const [endH, endM] = settings.official_end_time.split(':').map(Number);
          
          const outMinutes = outH * 60 + outM;
          const endMinutes = endH * 60 + endM;
          
          if (outMinutes > endMinutes) {
            const extraMinutes = outMinutes - endMinutes;
            const extraHours = extraMinutes / 60;
            
            // حساب قيمة العمل الإضافي
            if (worker && worker.salary) {
              const hourlyRate = calculateHourlyRate(worker.salary);
              const rateMultiplier = parseFloat(settings.overtime_rate) || 1.0;
              overtimeAmount = hourlyRate * extraHours * rateMultiplier;
              
              finalNotes += ` | عمل إضافي: ${Math.floor(extraHours)}س ${extraMinutes % 60}د`;
            }
          }
        }

        // 4. حساب خصم التأخير (Late Arrival Calculation)
        let lateArrivalAmount = 0;
        let lateArrivalDesc = `خصم تأخير - ${date}`;

        if (status === 'present' && check_in && settings.official_start_time) {
          const [inH, inM] = check_in.split(':').map(Number);
          const [startH, startM] = settings.official_start_time.split(':').map(Number);
          
          const inMinutes = inH * 60 + inM;
          const startMinutes = startH * 60 + startM;

          if (inMinutes > startMinutes) {
            const lateMinutes = inMinutes - startMinutes;
            
            if (worker && worker.salary) {
                // Calculate hourly rate based on actual work hours
                const [endH, endM] = (settings.official_end_time || "17:00").split(':').map(Number);
                const endMinutes = endH * 60 + endM;
                
                let breakDurationMinutes = 0;
                if (settings.has_break === '1' && settings.break_start_time && settings.break_end_time) {
                    const [bStartH, bStartM] = settings.break_start_time.split(':').map(Number);
                    const [bEndH, bEndM] = settings.break_end_time.split(':').map(Number);
                    breakDurationMinutes = (bEndH * 60 + bEndM) - (bStartH * 60 + bStartM);
                    if (breakDurationMinutes < 0) breakDurationMinutes = 0;
                }

                const totalWorkMinutes = (endMinutes - startMinutes) - breakDurationMinutes;
                
                if (totalWorkMinutes > 0) {
                    const dailyWage = worker.salary / 30;
                    const workHours = totalWorkMinutes / 60;
                    const hourlyRate = dailyWage / workHours;
                    
                    const lateHours = lateMinutes / 60;
                    lateArrivalAmount = Number((lateHours * hourlyRate).toFixed(2));
                    
                    const h = Math.floor(lateMinutes / 60);
                    const m = lateMinutes % 60;
                    const durationStr = h > 0 ? `${h}س ${m}د` : `${m}د`;
                    
                    lateArrivalDesc += ` (${durationStr})`;
                    finalNotes += ` | تأخير: ${durationStr}`;
                }
            }
          }
        }

        if (existing) {
          db.prepare(`
            UPDATE attendance 
            SET status = ?, check_in = ?, check_out = ?, notes = ?
            WHERE id = ?
          `).run(status, check_in || null, check_out || null, finalNotes, existing.id);
        } else {
          db.prepare(`
            INSERT INTO attendance (worker_id, date, status, check_in, check_out, notes)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(worker_id, date, status, check_in || null, check_out || null, finalNotes);
        }

        // 2. إضافة معاملة العمل الإضافي (Add Overtime Transaction)
        if (overtimeAmount > 0) {
          const desc = `عمل إضافي - ${date}`;
          // التحقق من عدم وجود تكرار للمعاملة
          const existingTrans = db.prepare("SELECT id FROM worker_transactions WHERE worker_id = ? AND date = ? AND type = 'bonus' AND description LIKE 'عمل إضافي%'").get(worker_id, date) as any;
          
          if (existingTrans) {
            db.prepare("UPDATE worker_transactions SET amount = ? WHERE id = ?").run(overtimeAmount, existingTrans.id);
          } else {
            db.prepare(`
              INSERT INTO worker_transactions (worker_id, type, amount, date, description)
              VALUES (?, 'bonus', ?, ?, ?)
            `).run(worker_id, overtimeAmount, date, desc);
          }
        }

        // 3. معالجة خصم الخروج المبكر (Early Departure Deduction)
        // يتم الخصم إذا خرج الموظف قبل نهاية الدوام الرسمي، مع مراعاة وقت الاستراحة إذا كان مفعلاً
        let earlyDepartureAmount = 0;
        let earlyDepartureDesc = `خصم خروج مبكر - ${date}`;

        if (status === 'present' && check_out && settings.official_end_time && settings.official_start_time) {
          const [outH, outM] = check_out.split(':').map(Number);
          const [endH, endM] = settings.official_end_time.split(':').map(Number);
          const [startH, startM] = settings.official_start_time.split(':').map(Number);

          const outMinutes = outH * 60 + outM;
          const endMinutes = endH * 60 + endM;
          const startMinutes = startH * 60 + startM;

          // حساب مدة الاستراحة (Break Duration)
          let breakDurationMinutes = 0;
          if (settings.has_break === '1' && settings.break_start_time && settings.break_end_time) {
              const [bStartH, bStartM] = settings.break_start_time.split(':').map(Number);
              const [bEndH, bEndM] = settings.break_end_time.split(':').map(Number);
              breakDurationMinutes = (bEndH * 60 + bEndM) - (bStartH * 60 + bStartM);
              if (breakDurationMinutes < 0) breakDurationMinutes = 0;
          }

          // حساب إجمالي دقائق العمل الرسمية (بعد خصم الاستراحة)
          const totalWorkMinutes = (endMinutes - startMinutes) - breakDurationMinutes;

          if (outMinutes < endMinutes && totalWorkMinutes > 0) {
            const earlyMinutes = endMinutes - outMinutes;
            
            // حساب قيمة الخصم بناءً على الراتب وساعات العمل الفعلية
            // الراتب اليومي = الراتب الشهري / 30
            // سعر الساعة = الراتب اليومي / (دقائق العمل اليومية / 60)
            if (worker && worker.salary) {
                const dailyWage = worker.salary / 30;
                const workHours = totalWorkMinutes / 60;
                const hourlyRate = dailyWage / workHours;
                
                const earlyHours = earlyMinutes / 60;
                earlyDepartureAmount = Number((earlyHours * hourlyRate).toFixed(2));
                
                // إضافة المدة للوصف
                const h = Math.floor(earlyMinutes / 60);
                const m = earlyMinutes % 60;
                const durationStr = h > 0 ? `${h}س ${m}د` : `${m}د`;
                earlyDepartureDesc += ` (${durationStr})`;
            }
          }
        }

        // تحديث أو إضافة أو حذف معاملة الخصم للخروج المبكر
        const existingEarlyTrans = db.prepare("SELECT id FROM worker_transactions WHERE worker_id = ? AND date = ? AND type = 'deduction' AND description LIKE 'خصم خروج مبكر%'").get(worker_id, date) as any;

        if (earlyDepartureAmount > 0) {
            if (existingEarlyTrans) {
                db.prepare("UPDATE worker_transactions SET amount = ?, description = ? WHERE id = ?").run(earlyDepartureAmount, earlyDepartureDesc, existingEarlyTrans.id);
            } else {
                db.prepare(`
                    INSERT INTO worker_transactions (worker_id, type, amount, date, description)
                    VALUES (?, 'deduction', ?, ?, ?)
                `).run(worker_id, earlyDepartureAmount, date, earlyDepartureDesc);
            }
        } else {
            // إذا لم يعد هناك خروج مبكر (تم تعديل الوقت)، يتم حذف المعاملة السابقة
            if (existingEarlyTrans) {
                db.prepare("DELETE FROM worker_transactions WHERE id = ?").run(existingEarlyTrans.id);
            }
        }

        // تحديث أو إضافة أو حذف معاملة الخصم للتأخير
        const existingLateTrans = db.prepare("SELECT id FROM worker_transactions WHERE worker_id = ? AND date = ? AND type = 'deduction' AND description LIKE 'خصم تأخير%'").get(worker_id, date) as any;

        if (lateArrivalAmount > 0) {
            if (existingLateTrans) {
                db.prepare("UPDATE worker_transactions SET amount = ?, description = ? WHERE id = ?").run(lateArrivalAmount, lateArrivalDesc, existingLateTrans.id);
            } else {
                db.prepare(`
                    INSERT INTO worker_transactions (worker_id, type, amount, date, description)
                    VALUES (?, 'deduction', ?, ?, ?)
                `).run(worker_id, lateArrivalAmount, date, lateArrivalDesc);
            }
        } else {
            // إذا لم يعد هناك تأخير (تم تعديل الوقت)، يتم حذف المعاملة السابقة
            if (existingLateTrans) {
                db.prepare("DELETE FROM worker_transactions WHERE id = ?").run(existingLateTrans.id);
            }
        }

        // معالجة خصم الغياب (Absence Deduction)
        const salary = worker?.salary || 0;
        const deductionAmount = salary > 0 ? Number((salary / 30).toFixed(2)) : 0;
        const description = `غياب - ${date}`;

        if (status === 'absent') {
          if (deductionAmount > 0) {
            // Check if transaction already exists
            const existingTrans = db.prepare("SELECT id FROM worker_transactions WHERE worker_id = ? AND description = ?").get(worker_id, description);
            if (!existingTrans) {
              db.prepare(`
                INSERT INTO worker_transactions (worker_id, type, amount, date, description)
                VALUES (?, 'deduction', ?, ?, ?)
              `).run(worker_id, deductionAmount, date, description);
            }
          }
        } else {
          // If status changed from absent to something else, remove the deduction
          db.prepare("DELETE FROM worker_transactions WHERE worker_id = ? AND description = ?").run(worker_id, description);
        }
      });

      transaction();
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to save attendance:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Departures Routes
  app.get("/api/departures", authenticateToken, requirePermission("view_attendance"), (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "Date is required" });

    try {
      const records = db.prepare(`
        SELECT 
          d.*, 
          w.name as worker_name
        FROM departures d
        JOIN workers w ON d.worker_id = w.id
        WHERE d.date = ?
        ORDER BY d.start_time
      `).all(date);
      res.json(records);
    } catch (error) {
      console.error("Failed to fetch departures:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/departures", authenticateToken, requirePermission("manage_attendance"), (req, res) => {
    const { worker_id, date, type, start_time, end_time, notes } = req.body;
    if (!worker_id || !date || !type || !start_time) return res.status(400).json({ error: "Missing fields" });

    const transaction = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO departures (worker_id, date, type, start_time, end_time, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(worker_id, date, type, start_time, end_time || null, notes || null);

      let durationHours = 0;

      if (start_time && end_time) {
        const [h1, m1] = start_time.split(':').map(Number);
        const [h2, m2] = end_time.split(':').map(Number);
        let diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diffMinutes < 0) diffMinutes += 24 * 60;
        
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        durationHours = diffMinutes / 60;
        
        let durationStr = "مغادرة: ";
        if (hours > 0) durationStr += `${hours} ساعة `;
        if (mins > 0) durationStr += `${mins} دقيقة`;

        // Calculate Deduction Amount for Note
        const worker = db.prepare("SELECT salary FROM workers WHERE id = ?").get(worker_id) as any;
        let deductionAmount = 0;
        let costStr = "";

        if (worker && worker.salary && durationHours > 0) {
          const hourlyRate = calculateHourlyRate(worker.salary);
          deductionAmount = hourlyRate * durationHours;
          costStr = ` (قيمة الوقت: ${deductionAmount.toFixed(2)})`;
        }
        
        // Combine for Attendance Note
        // Format: "Departure: 2 hours (Cost: 50) - User Note"
        const noteContent = `${durationStr}${costStr}${notes ? ` - ${notes}` : ''}`;
        
        // Update attendance notes
        const existingAttendance = db.prepare("SELECT id, notes FROM attendance WHERE worker_id = ? AND date = ?").get(worker_id, date) as any;
        
        if (existingAttendance) {
          // Avoid duplicating if already exists (simple check)
          const newNotes = existingAttendance.notes 
            ? `${existingAttendance.notes} | ${noteContent}`
            : noteContent;
          
          db.prepare("UPDATE attendance SET notes = ? WHERE id = ?").run(newNotes, existingAttendance.id);
        } else {
          db.prepare(`
            INSERT INTO attendance (worker_id, date, status, notes)
            VALUES (?, ?, 'present', ?)
          `).run(worker_id, date, noteContent);
        }

        // Add Deduction Transaction
        // Only deduct if NOT 'work' type (assuming 'work' is paid mission)
        if (type !== 'work' && deductionAmount > 0) {
           const desc = `خصم مغادرة - ${date} (${type === 'early' ? 'خروج مبكر' : type}) - ${durationStr} ${notes ? `- ${notes}` : ''}`;
           
           // Check for existing similar transaction to avoid duplicates?
           // For now, just insert. Or maybe check if we are editing? 
           // This endpoint is POST (create). PUT is separate?
           // The code shows app.post. If editing, it might be a different endpoint or handled here?
           // The frontend calls POST for new, PUT for edit.
           // This block is inside POST.
           
           db.prepare(`
            INSERT INTO worker_transactions (worker_id, type, amount, date, description)
            VALUES (?, 'deduction', ?, ?, ?)
          `).run(worker_id, deductionAmount, date, desc);
        }
      }

      return info.lastInsertRowid;
    });

    try {
      const id = transaction();
      res.json({ success: true, id });
    } catch (error) {
      console.error("Failed to add departure:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/departures/:id", authenticateToken, requirePermission("manage_attendance"), (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM departures WHERE id = ?").run(id);
      // logAudit(req.user.id, req.user.username, "DELETE", "departure", id, `Deleted departure ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete departure:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/departures/:id", authenticateToken, requirePermission("manage_attendance"), (req, res) => {
    const { id } = req.params;
    const { worker_id, date, type, start_time, end_time, notes } = req.body;
    if (!worker_id || !date || !type || !start_time) return res.status(400).json({ error: "Missing fields" });

    try {
      db.prepare(`
        UPDATE departures 
        SET worker_id = ?, date = ?, type = ?, start_time = ?, end_time = ?, notes = ?
        WHERE id = ?
      `).run(worker_id, date, type, start_time, end_time || null, notes || null, id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to update departure:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- Worker Specific Routes ---

  // Get worker account details (Admin only)
  app.get("/api/admin/worker-account/:workerId", authenticateToken, requirePermission("manage_users"), (req, res) => {
    const { workerId } = req.params;
    try {
      const user = db.prepare("SELECT id, username, email, last_password_update FROM users WHERE worker_id = ?").get(workerId);
      if (!user) return res.status(404).json({ error: "No account found for this worker" });
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch worker account" });
    }
  });

  // Update worker account (Admin only)
  app.put("/api/admin/worker-account/:workerId", authenticateToken, requirePermission("manage_users"), (req, res) => {
    const { workerId } = req.params;
    const { username, email, password } = req.body;

    if (!username || !email) {
      return res.status(400).json({ error: "Username and email are required" });
    }

    try {
      const user = db.prepare("SELECT id FROM users WHERE worker_id = ?").get(workerId) as any;
      if (!user) return res.status(404).json({ error: "No account found for this worker" });

      // Check uniqueness for username and email (excluding current user)
      const existingEmail = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(email, user.id);
      if (existingEmail) return res.status(400).json({ error: "Email already in use" });

      const existingUsername = db.prepare("SELECT id FROM users WHERE username = ? AND id != ?").get(username, user.id);
      if (existingUsername) return res.status(400).json({ error: "Username already in use" });

      if (password) {
        const hashed = bcrypt.hashSync(password, 10);
        const now = new Date().toISOString();
        db.prepare("UPDATE users SET username = ?, email = ?, password = ?, last_password_update = ? WHERE id = ?").run(username, email, hashed, now, user.id);
      } else {
        db.prepare("UPDATE users SET username = ?, email = ? WHERE id = ?").run(username, email, user.id);
      }

      logAction(req, "UPDATE_WORKER_ACCOUNT", "user", user.id, `تم تحديث حساب العامل ${workerId}`);
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to update worker account:", err);
      res.status(500).json({ error: "Failed to update worker account" });
    }
  });

  // Create account for worker (Admin only)
  app.post("/api/admin/create-worker-account", authenticateToken, requirePermission("manage_users"), (req, res) => {
    const { worker_id, username, password, email } = req.body;
    
    if (!worker_id || !username || !password || !email) {
      return res.status(400).json({ error: "Worker ID, username, password, and email are required" });
    }

    try {
      const worker = db.prepare("SELECT * FROM workers WHERE id = ?").get(worker_id);
      if (!worker) return res.status(404).json({ error: "Worker not found" });

      const existingUser = db.prepare("SELECT id FROM users WHERE worker_id = ?").get(worker_id);
      if (existingUser) return res.status(400).json({ error: "User account already exists for this worker" });

      const existingEmail = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
      if (existingEmail) return res.status(400).json({ error: "Email already in use" });

      const existingUsername = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
      if (existingUsername) return res.status(400).json({ error: "Username already in use" });

      const hashed = bcrypt.hashSync(password, 10);

      db.prepare(`
        INSERT INTO users (username, email, password, role, permissions, worker_id, status)
        VALUES (?, ?, ?, 'worker', '[]', ?, 'approved')
      `).run(username, email, hashed, worker_id);

      logAction(req, "CREATE_WORKER_ACCOUNT", "user", worker_id, `تم إنشاء حساب للعامل ${worker_id}`);
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to create worker account:", err);
      res.status(500).json({ error: "Failed to create worker account" });
    }
  });

  // Get worker's own stats
  app.get("/api/worker/my-stats", authenticateToken, (req: any, res) => {
    const workerId = req.user.worker_id;
    if (!workerId) return res.status(403).json({ error: "Not a worker account" });

    const { month } = req.query; // YYYY-MM
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    try {
      const worker = db.prepare("SELECT * FROM workers WHERE id = ?").get(workerId) as any;
      
      // Transactions
      const transactions = db.prepare(`
        SELECT * FROM worker_transactions 
        WHERE worker_id = ? AND date LIKE ? 
        ORDER BY date DESC
      `).all(workerId, `${targetMonth}%`);

      // Attendance
      const attendance = db.prepare(`
        SELECT * FROM attendance 
        WHERE worker_id = ? AND date LIKE ?
        ORDER BY date DESC
      `).all(workerId, `${targetMonth}%`);

      // Absences
      const absences = attendance.filter((a: any) => a.status === 'absent');

      // Calculate totals
      let totalSalary = worker.salary || 0;
      let totalDeductions = 0;
      let totalBonuses = 0;
      let totalPayments = 0;

      transactions.forEach((t: any) => {
        if (t.type === 'deduction') totalDeductions += t.amount;
        if (t.type === 'bonus') totalBonuses += t.amount;
        if (t.type === 'payment') totalPayments += t.amount;
      });

      const netSalary = totalSalary + totalBonuses - totalDeductions - totalPayments;

      res.json({
        worker,
        stats: {
          month: targetMonth,
          baseSalary: totalSalary,
          totalDeductions,
          totalBonuses,
          totalPayments,
          netSalary,
          attendanceCount: attendance.filter((a: any) => a.status === 'present').length,
          absenceCount: absences.length,
        },
        transactions,
        attendance,
        absences
      });

    } catch (err) {
      console.error("Failed to fetch worker stats:", err);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
      root: path.resolve(__dirname, "frontend"),
      configFile: path.resolve(__dirname, "frontend", "vite.config.ts"),
    });
    app.use(async (req, res, next) => {
      if (req.method === 'GET' && req.headers.accept?.includes('text/html')) {
        const url = req.originalUrl;
        consoleLog(`DEBUG: SPA fallback for ${url}`);
        try {
          let template = fs.readFileSync(path.resolve(__dirname, "frontend", "index.html"), "utf-8");
          template = await vite.transformIndexHtml(url, template);
          return res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } catch (e) {
          vite.ssrFixStacktrace(e as Error);
          return next(e);
        }
      }
      next();
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "frontend", "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
    });
  }

  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Global error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  app.listen(PORT, '0.0.0.0', () => {
    consoleLog(`Server running on port ${PORT}`);
  });
}

startServer().catch(err => consoleLog(`Server start failed: ${err}`));

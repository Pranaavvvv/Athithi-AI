require("dotenv").config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const express = require("express")
const http = require("http");
const path = require("path");
const app = express()
const cors = require('cors');
const cookieParser = require("cookie-parser");
const passport = require("./config/passport");

app.use(express.json());
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

app.use(passport.initialize());

// Routes
app.use("/", require("./routes/index"))
app.use("/users", require("./routes/users"))
app.use("/auth", require("./routes/auth"))
app.use("/", require("./routes/publicLinks"))

app.use("/ema", require("./routes/ema"));

// Guest Management (Constructive Merge)
app.use("/uploads", express.static(path.join(__dirname, "guest_management", "uploads")));
app.use("/gm/guests", require("./guest_management/routes/guests"));
app.use("/gm/rsvp", require("./guest_management/routes/rsvp"));
app.use("/gm/headcount", require("./guest_management/routes/headcount"));
const wsManager = require("./guest_management/websocket/wsManager");

// Live Ops (Kitchen Intelligence Board + DJ Vibe-Sync Dashboard)
app.use("/live", require("./routes/live"));

// Start background EMA Automator
const emaAutomator = require('./services/emaAutomator');
emaAutomator.start();

const PORT = process.env.PORT || 5555;
const server = http.createServer(app);
wsManager.init(server);
server.listen(PORT, () => console.log(`Server and WebSockets running on port ${PORT}`));

const jwt = require('jsonwebtoken');

function checkAuthenticated(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ message: "Invalid token" });
    }
}

function checkNotAuthenticated(req, res, next) {
    const token = req.cookies.token;
    if (token) {
        try {
            jwt.verify(token, process.env.JWT_SECRET || 'secret');
            return res.status(403).json({ message: "Already authenticated" });
        } catch (err) {
            // Token invalid, so they are not authenticated, proceed
            next();
        }
    } else {
        next();
    }
}

module.exports = {
    checkAuthenticated,
    checkNotAuthenticated
};
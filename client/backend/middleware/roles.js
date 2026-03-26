const { checkAuthenticated } = require("./auth");

/**
 * Middleware to check if the user has one of the allowed roles.
 * Usage: router.get('/some-route', checkAuthenticated, authorizeRoles('admin', 'event_manager'), ...)
 */
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ message: "Access denied. No role assigned." });
        }

        // Admin has full access to everything
        if (req.user.role === 'admin') {
            return next();
        }

        if (allowedRoles.includes(req.user.role)) {
            return next();
        } else {
            return res.status(403).json({ message: "Access denied. Insufficient permissions." });
        }
    };
};

/**
 * Specific middleware per the requirements:
 * 1. Admin: Full access (handled automatically by authorizeRoles)
 * 2. Event Manager: Blocked from Finance dashboard, payment confirmation
 * 3. Finance Manager: Blocked from Inquiry creation, GRE scanner. Only role with access to confirmation toggle
 * 4. GRE: Access to Scanner page, live headcount only. Blocked from everything else
 */

// Applies to Finance Dashboard or Payment Confirmation routes
const restrictFromEventManager = (req, res, next) => {
    if (req.user && req.user.role === 'event_manager') {
        return res.status(403).json({ message: "Event Managers are blocked from finance actions." });
    }
    next();
};

// Only Finance Manager (and Admin) has access to confirmation toggle
const requireConfirmationToggleAccess = authorizeRoles('finance_manager');

// Applies to Inquiry creation or GRE scanner routes
const restrictFromFinanceManager = (req, res, next) => {
    if (req.user && req.user.role === 'finance_manager') {
        return res.status(403).json({ message: "Finance Managers are blocked from this action." });
    }
    next();
};

// Applies to GRE Scanner and Live Headcount routes
// Only GRE (and Admin) can access
const requireGREAccess = authorizeRoles('gre');

// General block for GRE on any other routes
const restrictFromGRE = (req, res, next) => {
    if (req.user && req.user.role === 'gre') {
        return res.status(403).json({ message: "GRE role is blocked from this action." });
    }
    next();
};

module.exports = {
    authorizeRoles,
    restrictFromEventManager,
    requireConfirmationToggleAccess,
    restrictFromFinanceManager,
    requireGREAccess,
    restrictFromGRE
};

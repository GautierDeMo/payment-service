const AppError = require("../utils/AppError");
const { verifyToken } = require("../utils/token");

function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return next(new AppError("Token manquant", 401));
    }

    const [type, token] = authHeader.split(" ");
    if (type !== "Bearer" || !token) {
        return next(new AppError("Format du token invalide", 401));
    }

    try {
        const decoded = verifyToken(token);
        req.user = {
            id: decoded.sub,
            name: decoded.name,
            email: decoded.email,
        };

        next();
    } catch (error) {
        return next(new AppError("Token invalide ou expire", 401));
    }
}

module.exports = requireAuth;

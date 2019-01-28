const jwt = require('jsonwebtoken');

module.exports = (rogue, config) => {
    if (!config.enabled)
        return;

    function getProfile(profile) {
        if (!profile)
            return config.profiles.default;

        return config.profiles[profile];
    }

    function getTokenFromAuthHeader(authorization) {
        try {
            if (authorization.indexOf(' ') > -1) {
                return authorization.split(' ')[1];
            }
            return authorization;
        } catch (err) {
            return '';
        }
    }

    //TODO: valutare generazione certificati invece di secret
    rogue.jwt = {
        generate: (payload, profile) => {
            profile = getProfile(profile);

            //TODO: check if profile is a valid object

            const date = Math.floor(Date.now() / 1000);

            return jwt.sign(
                Object.assign({ exp: date + profile.expiration }, payload),
                profile.secret
            );
        },
        verify: (token, profile) => {
            profile = getProfile(profile);

            try {
                return jwt.verify(token, profile.secret);
            } catch(err) {
                return false;
            }
        },

        middlewares: {
            JWTAuth: (profile) => {
                return function(req, res, next) {
                    // TODO: use Auth Bearer + improve error messages
                    let token   = getTokenFromAuthHeader(req.headers.authorization);
                    let payload = rogue.jwt.verify(token, profile);
                    if (payload) {
                        req.jwt_token   = token;
                        req.jwt_payload = payload;
                        next();
                    } else {
                        res.status(401).json({error: "Invalid token"});
                    }
                }
            },
            JWTRole: (role, profile) => {
                return function(req, res, next) {
                    if (role && !Array.isArray(role)) {
                        role = [role];
                    }
                    // TODO: use Auth Bearer + improve error messages
                    let token   = getTokenFromAuthHeader(req.headers.authorization);
                    let payload = rogue.jwt.verify(token, profile);
                    if (payload && (!role || role.includes(payload.role))) {
                        req.jwt_token   = token;
                        req.jwt_payload = payload;
                        next();
                    } else {
                        res.status(401).json({error: "Invalid token"});
                    }
                }
            }

        }
    }
};
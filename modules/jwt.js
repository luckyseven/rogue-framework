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

    rogue.jwt = {
        generate: (payload, profile) => {
            profile = getProfile(profile);

            //TODO: check if profile is a valid object

            return jwt.sign(
                Object.assign({ exp: profile.expiration }, payload),
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
            JWTAuth: (profile, role) => {
                return function(req, res, next) {
                    // TODO: use Auth Bearer + improve error messages
                    let token   = getTokenFromAuthHeader(req.headers.authorization);
                    let payload = rogue.jwt.verify(token, profile);
                    if (payload && (!role || role === payload.role)) {
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
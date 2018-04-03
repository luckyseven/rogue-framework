const jwt = require('jsonwebtoken');



module.exports = (rogue, config) => {
    if (!config.enabled)
        return;

    function getProfile(profile) {
        if (!profile)
            return config.profiles.default;

        return config.profiles['profile'];
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
            JWTAuth: (profile) => {
                const profile = getProfile(profile);
                return function(req, res, next) {
                    // TODO: use Auth Bearer + improve error messages
                    if (this.verify(req.headers.jwt_token, profile)) {
                        next();
                    } else {
                        res.status(500).json({error: "Invalid token"});
                    }
                }
            }

        }
    }
};
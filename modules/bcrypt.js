const bcrypt = require('bcrypt');

module.exports = (rogue, config) => {

    rogue.bcrypt = bcrypt;

    if (config.enabled) {
        if (!config.saltRounds)
            config.saltRounds = 10;
        rogue.bcrypt.encrypt = (pwd)       => bcrypt.hashSync(pwd, config.saltRounds);
        rogue.bcrypt.decrypt = (pwd, hash) => bcrypt.compareSync(pwd, hash);
    }

    //TODO: throw error message
};
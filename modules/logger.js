const morgan            = require('morgan');
const fs                = require('fs');
const rfs               = require('rotating-file-stream');
const path              = require('path');

module.exports = (rogue, config) => {
    if (!config.enabled)
        return;

    if (typeof config.options !== 'object')
        config.options = {};

    if (config.format !== 'dev' && config.filename && config.stream === undefined) {
        let accessLogStream;
        const logDir = path.join(rogue.getRootDir(), 'logs');
        fs.existsSync(logDir) || fs.mkdirSync(logDir);

        if (config.interval) {
            accessLogStream = rfs(config.filename, {
                interval: config.interval,
                path: logDir
            });
        } else {
            accessLogStream = fs.createWriteStream(path.join(logDir, config.filename), {flags: 'a'})
        }

        config.options.stream = accessLogStream;
    }

    rogue.expressApp.use(morgan(config.format, config.options));
};
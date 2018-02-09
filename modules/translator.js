const yaml = require('js-yaml');
const path = require('path');
const fs   = require('fs');

module.exports = (rogue, config) => {
    const messagesPath  = path.join(rogue.getRootDir(), '/messages');
    let messages        = {};

    try {
        fs.readdirSync(messagesPath).forEach(message => {
            messages[message.replace('.yaml', '')] = yaml.safeLoad(fs.readFileSync(path.join(messagesPath, message), 'utf8'));
        });
        rogue.messages = messages;
        rogue.trans = (language, message) => {
            let result = rogue.messages[language];
            try {
                let parts = message.split('.');
                parts.forEach(key => {
                    result = result[key];
                });
            } catch (e) {
                result = '';
            }

            return result;
        };
    } catch (e) {
        console.log("Translator module loading error");
    }

};
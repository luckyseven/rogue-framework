const mongoose   = require('mongoose');
const requireAll = require('require-all');
mongoose.Promise = require('bluebird');

module.exports = (rogue, config) => {

    rogue.mongoose   = mongoose;
    rogue.models     = {};

    if (config.enabled) {
        mongoose.connect('mongodb://' + config.host + '/' + config.db_name, { useMongoClient: true });
    }

    const models = requireAll({
        dirname : rogue.getRootDir() + '/schemas',
        resolve : schema => schema(rogue),
        map     : (name, path) => (name.charAt(0).toUpperCase() + name.slice(1)).replace(/_([a-z])/g, (m, c) => c.toUpperCase())
    });

    for (let model in models) {
        rogue.models[model] = mongoose.model(model, models[model]);
    }

};
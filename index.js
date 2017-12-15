const express           = require('express');
const fs                = require('fs');
const path              = require('path');
const requireAll        = require('require-all');

module.exports = class Rogue {
    constructor(config) {
        this.config     = config;
        this.express    = express;
        this.expressApp = express();

        this.loadControllers();
        this.loadModules();
        this.loadRoutes();
    }

    loadControllers() {
        const controllersPath = path.join(this.getRootDir(), '/controllers');
        if (!fs.existsSync(controllersPath))
            throw new Error("Directory 'controllers' doesn't exists in the project root.");
        this.controllers = requireAll({
            dirname : controllersPath,
            resolve : controller => controller(this)
        });
    }

    loadModules() {
        for (let module in this.config.modules) {
            let modulePath = '/modules/' + module + '.js';
            if (fs.existsSync(path.join(__dirname, modulePath))) {
                require(path.join(__dirname, modulePath))(this, this.config.modules[module]);
            } else if (fs.existsSync(path.join(this.getRootDir(), modulePath))) {
                require(path.join(this.getRootDir(), modulePath))(this, this.config.modules[module]);
            }
        }
    }

    loadRoutes() {
        const routesPath = path.join(this.getRootDir(), '/routes');
        if (!fs.existsSync(routesPath))
            throw new Error("Directory 'routes' doesn't exists in the project root.");
        const routes = requireAll({
            dirname     :  routesPath
        });
        for (let route in this.config.routes) {
            this.expressApp.use(route, routes[this.config.routes[route]](this));
        }
    }

    action(controller, action) {
        return this.controllers[controller][action];
    }

    getRootDir() {
        return path.dirname(require.main.filename || process.mainModule.filename);
    }

    listen(port, callback) {
        return this.expressApp.listen.apply(this.expressApp, arguments);
    }
};
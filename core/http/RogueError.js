module.exports = class RogueError {
    constructor(response, status) {
        this.response = response;
        this.status = status ? status : 500;
    }
    complete(res) {
        res.status(this.status).json(this.response);
    }
};
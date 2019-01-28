module.exports = class RogueResponse {
    constructor(response, status) {
        this.response = response;
        this.status = status ? status : 200;
    }
    complete(res) {
        res.status(this.status).json(this.response);
    }
};
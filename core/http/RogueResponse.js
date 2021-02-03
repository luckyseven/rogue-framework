module.exports = class RogueResponse {
    constructor(data, status) {
        this.data = data;
        this.status = status ? status : 200;
        this.response();
    }

    getData() {
        return this.data;
    }

    setData(data) {
        this.data = data;
        return this;
    }

    getStatus() {
        return this.status;
    }

    setStatus(status) {
        this.status = status;
        return this;
    }

    response() {}

    complete(res) {
        res.status(this.status).json(this.data);
    }
};
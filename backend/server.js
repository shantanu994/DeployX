
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.status(200).send(
        "DeployX backend placeholder - Sharva will replace this with real API logic."
    );
});

app.get("/health", (req, res) => {
    res.status(200).type("text/plain").send("OK");
});

if (require.main === module) {
    app.listen(port, "0.0.0.0", () => {
        console.log(`DeployX backend listening on port ${port}`);
    });
}

module.exports = app;
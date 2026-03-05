require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[ticoautos-backend] Server run in http://localhost:${PORT}`);
});

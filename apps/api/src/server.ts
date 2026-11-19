import "dotenv/config";
import app from "./app/app.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});

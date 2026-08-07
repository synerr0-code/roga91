const express = require('express')
const cors = require('cors')
const path = require('path')
const paymentRoutes = require("./routes/paymentRoute.js");

const app = express()
app.use(cors())
app.use(express.json())



app.use("/api/payment", paymentRoutes);
app.use(express.static(path.join(__dirname, '..', 'Frontend')));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

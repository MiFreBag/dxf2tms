const express = require('express');
const cors = require('cors'); // Optional: Falls Frontend und Backend auf unterschiedlichen Ports laufen
const jobRoutes = require('./routes/jobRoutes');

const app = express();
const PORT = process.env.PORT || 3001; // Beispiel-Port für das Backend

app.use(cors()); // Erlaube Cross-Origin Requests (ggf. spezifischer konfigurieren)
app.use(express.json());

// API-Routen für Jobs
app.use('/api/jobs', jobRoutes);

// Einfache Root-Route
app.get('/', (req, res) => {
  res.send('DXF2TMS Backend is running!');
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
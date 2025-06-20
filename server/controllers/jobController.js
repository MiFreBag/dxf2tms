const { v4: uuidv4 } = require('uuid'); // Für eindeutige Job-IDs

// In-memory Job-Liste (für Demo-Zwecke)
// In einer echten Anwendung würdest du hier eine Datenbank verwenden
let jobs = [];

// Hilfsfunktion zur Simulation von Job-Verarbeitung
const processJob = (job) => {
    console.log(`Starting job ${job.id} (${job.type})...`);
    job.status = 'running';
    job.createdAt = new Date().toISOString();
    job.completedAt = null;
    job.error = null;
    job.progress = 0;

    const duration = Math.random() * 10000 + 2000; // 2-12 Sekunden
    const interval = setInterval(() => {
        job.progress = Math.min(job.progress + Math.random() * 10, 100);
        if (job.progress >= 100) {
            clearInterval(interval);
            const isSuccess = Math.random() > 0.2; // 80% Erfolg
            job.status = isSuccess ? 'completed' : 'failed';
            job.completedAt = new Date().toISOString();
            job.progress = isSuccess ? 100 : undefined; // Fortschritt bei Fehler zurücksetzen
            job.error = isSuccess ? null : `Simulierter Fehler bei der Verarbeitung.`;
            
            if (isSuccess) {
                 // Simulierte Artefakte erstellen
                 job.artifacts = [{
                    name: `output_${job.id.slice(0, 8)}.${job.type === 'convert' ? 'pdf' : job.type === 'tms' ? 'zip' : 'txt'}`,
                    type: job.type === 'convert' ? 'application/pdf' : job.type === 'tms' ? 'application/zip' : 'text/plain',
                    size: Math.floor(Math.random() * 5000000) + 100000, // 100KB - 5MB
                    url: `/api/jobs/${job.id}/artifacts/output`, // Beispiel-URL
                    viewable: job.type === 'convert' // Nur PDF ist "viewable" im Browser
                 }];
            } else {
                job.artifacts = [];
            }

            console.log(`Job ${job.id} finished with status: ${job.status}`);
        }
    }, duration / 10); // Update Fortschritt 10 mal

    // Speichere den Interval-ID, um ihn bei Abbruch zu löschen
    job._intervalId = interval;
};

// Initial einige Mock-Jobs erstellen, wenn das Backend startet
const generateInitialJobs = () => {
    const jobTypes = ['upload', 'convert', 'tms'];
    const initialJobs = [];
    for (let i = 0; i < 5; i++) {
        const type = jobTypes[Math.floor(Math.random() * jobTypes.length)];
        const id = uuidv4();
        const job = {
            id: id,
            name: `${type.charAt(0).toUpperCase() + type.slice(1)} Job ${i + 1}`,
            type: type,
            status: 'queued',
            createdAt: new Date().toISOString(),
            inputFile: {
                name: `initial_file_${i + 1}.${type === 'upload' ? 'dxf' : type === 'convert' ? 'dxf' : 'pdf'}`,
                size: Math.floor(Math.random() * 10000000) + 500000
            },
            parameters: type === 'convert'
                ? { pageSize: 'A4', dpi: 300 }
                : type === 'tms'
                ? { maxzoom: 18, format: 'png' }
                : {},
            artifacts: [],
            error: null,
            _intervalId: null // Zum Speichern des Simulations-Intervals
        };
        initialJobs.push(job);
    }
    jobs = initialJobs;
    // Starte die Verarbeitung für die initialen Jobs (simuliert)
    jobs.forEach(job => processJob(job));
};

// Beim ersten Laden des Controllers initiale Jobs generieren
generateInitialJobs();

// Controller-Funktionen

// Alle Jobs abrufen
exports.getJobs = (req, res) => {
    // Rückgabe einer Kopie, um direkte Modifikationen von außen zu verhindern
    res.json(jobs.map(({ _intervalId, ...job }) => job)); // _intervalId nicht zurückgeben
};

// Job abbrechen
exports.cancelJob = (req, res) => {
    const jobId = req.params.id;
    const job = jobs.find(j => j.id === jobId);

    if (!job) {
        return res.status(404).json({ message: 'Job not found' });
    }

    if (['running', 'processing', 'queued', 'pending'].includes(job.status)) {
        job.status = 'cancelled';
        job.completedAt = new Date().toISOString();
        job.error = 'Job wurde abgebrochen.';
        job.progress = undefined;
        if (job._intervalId) {
            clearInterval(job._intervalId);
        }
        console.log(`Job ${jobId} cancelled.`);
        // Rückgabe des aktualisierten Jobs (ohne _intervalId)
        const { _intervalId, ...updatedJob } = job;
        res.json(updatedJob);
    } else {
        res.status(400).json({ message: `Job cannot be cancelled in status: ${job.status}` });
    }
};

// Job wiederholen
exports.retryJob = (req, res) => {
    const jobId = req.params.id;
    const job = jobs.find(j => j.id === jobId);

    if (!job) {
        return res.status(404).json({ message: 'Job not found' });
    }

    if (['failed', 'error', 'cancelled'].includes(job.status)) {
        console.log(`Retrying job ${jobId}...`);
        // Setze Job-Status zurück und starte die Verarbeitung neu
        job.status = 'queued';
        job.completedAt = null;
        job.error = null;
        job.artifacts = [];
        job.progress = undefined; // Fortschritt zurücksetzen
        
        // Simulierte Verzögerung vor dem Neustart
        setTimeout(() => {
             processJob(job); // Starte die simulierte Verarbeitung neu
        }, 1000); // 1 Sekunde warten, bevor die Verarbeitung beginnt

        // Rückgabe des aktualisierten Jobs (ohne _intervalId)
        const { _intervalId, ...updatedJob } = job;
        res.json(updatedJob);

    } else {
        res.status(400).json({ message: `Job cannot be retried in status: ${job.status}` });
    }
};

// Job löschen
exports.deleteJob = (req, res) => {
    const jobId = req.params.id;
    const initialLength = jobs.length;
    
    // Stoppe die Simulation, falls der Job läuft
    const jobToDelete = jobs.find(j => j.id === jobId);
    if (jobToDelete && jobToDelete._intervalId) {
        clearInterval(jobToDelete._intervalId);
    }

    jobs = jobs.filter(j => j.id !== jobId);

    if (jobs.length < initialLength) {
        console.log(`Job ${jobId} deleted.`);
        res.status(204).send(); // 204 No Content bei erfolgreichem Löschen
    } else {
        res.status(404).json({ message: 'Job not found' });
    }
};

// Beispiel-Route für Artefakt-Download (simuliert)
// In einer echten Anwendung würdest du hier die Datei vom Speicherort ausliefern
router.get('/:id/artifacts/:artifactName', (req, res) => {
    const jobId = req.params.id;
    const artifactName = req.params.artifactName;
    const job = jobs.find(j => j.id === jobId);

    if (!job || !job.artifacts) {
        return res.status(404).json({ message: 'Job or artifacts not found' });
    }

    const artifact = job.artifacts.find(a => a.name.includes(artifactName)); // Einfache Namensprüfung

    if (!artifact) {
        return res.status(404).json({ message: 'Artifact not found' });
    }

    // Simulierte Dateiausgabe
    res.setHeader('Content-Type', artifact.type);
    res.setHeader('Content-Disposition', `attachment; filename="${artifact.name}"`);
    // Sende einfach einen Dummy-Text als Dateiinhalt
    res.send(`Simulierter Inhalt für Artefakt: ${artifact.name} von Job ${jobId}`);
});

// Füge die Artefakt-Route zum Router hinzu
router.get('/:id/artifacts/:artifactName', exports.downloadArtifact);

// Exportiere auch die Download-Funktion, falls sie direkt benötigt wird (optional)
exports.downloadArtifact = (req, res) => {
    // Diese Funktion wird jetzt von der Router-Definition oben verwendet
    // Der Code wurde in die Router-Definition verschoben, um den Kontext zu haben
    // Du könntest die Logik auch hier belassen und im Router aufrufen:
    // router.get('/:id/artifacts/:artifactName', (req, res) => exports.downloadArtifact(req, res));
    // Aber die direkte Implementierung im Router ist hier einfacher.
    // Belassen wir den Export für Konsistenz, auch wenn er im aktuellen Setup nicht direkt von außen aufgerufen wird.
};
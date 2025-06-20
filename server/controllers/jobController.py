import uuid
import datetime
import time
import random
import threading # Für die simulierte Job-Verarbeitung im Hintergrund

# In-memory Job-Liste (für Demo-Zwecke)
# In einer echten Anwendung würdest du hier eine Datenbank verwenden
jobs_db = {} # Dictionary, um Jobs per ID zu speichern
job_processing_threads = {} # Um laufende Simulations-Threads zu verwalten

def process_job_simulation(job_id):
    """Simuliert die Verarbeitung eines Jobs."""
    job = jobs_db.get(job_id)
    if not job:
        return

    print(f"Starting job {job['id']} ({job['type']})...")
    job['status'] = 'running'
    job['progress'] = 0
    
    # Simulierter Fehler nach einer gewissen Zeit für manche Jobs
    # fail_after_seconds = random.randint(5, 15) if random.random() < 0.3 else float('inf')
    # start_time = time.time()

    duration = random.uniform(2, 12)  # 2-12 Sekunden
    steps = 10
    step_duration = duration / steps

    for i in range(steps):
        if job_id not in job_processing_threads or not job_processing_threads[job_id].is_alive():
            print(f"Job {job_id} processing was externally stopped or thread died.")
            # Status könnte hier auf 'cancelled' oder 'failed' gesetzt werden, je nach Grund
            return # Beende die Simulation, wenn der Thread nicht mehr aktiv sein soll

        time.sleep(step_duration)
        job['progress'] = min(job['progress'] + (100 / steps), 100)
        
        # Prüfen, ob der Job abgebrochen wurde
        if job['status'] == 'cancelled':
            print(f"Job {job_id} was cancelled during processing.")
            job['completedAt'] = datetime.datetime.now().isoformat()
            job['error'] = 'Job wurde während der Verarbeitung abgebrochen.'
            job['progress'] = None # Fortschritt bei Abbruch zurücksetzen
            if job_id in job_processing_threads:
                 del job_processing_threads[job_id]
            return

    # Job-Abschluss
    is_success = random.random() > 0.2  # 80% Erfolg
    job['status'] = 'completed' if is_success else 'failed'
    job['completedAt'] = datetime.datetime.now().isoformat()
    job['progress'] = 100 if is_success else None
    job['error'] = None if is_success else f"Simulierter Fehler bei der Verarbeitung von Job {job_id}."

    if is_success:
        job['artifacts'] = [{
            'name': f"output_{job['id'][:8]}.{job['type'] == 'convert' and 'pdf' or job['type'] == 'tms' and 'zip' or 'txt'}",
            'type': job['type'] == 'convert' and 'application/pdf' or job['type'] == 'tms' and 'application/zip' or 'text/plain',
            'size': random.randint(100000, 5000000), # 100KB - 5MB
            'url': f"/api/jobs/{job['id']}/artifacts/output", # Beispiel-URL
            'viewable': job['type'] == 'convert'
        }]
    else:
        job['artifacts'] = []
    
    print(f"Job {job['id']} finished with status: {job['status']}")
    if job_id in job_processing_threads:
        del job_processing_threads[job_id]


def get_all_jobs():
    return list(jobs_db.values())

def create_initial_jobs():
    """Erstellt einige initiale Mock-Jobs beim Start."""
    if jobs_db: # Nur erstellen, wenn die DB leer ist (verhindert Duplikate bei Hot Reload)
        return

    job_types = ['upload', 'convert', 'tms']
    for i in range(5):
        job_type = random.choice(job_types)
        job_id = str(uuid.uuid4())
        created_at = datetime.datetime.now() - datetime.timedelta(minutes=random.randint(1, 60))
        
        job = {
            'id': job_id,
            'name': f"{job_type.capitalize()} Job {i + 1}",
            'type': job_type,
            'status': 'queued', # Startet als 'queued'
            'createdAt': created_at.isoformat(),
            'completedAt': None,
            'inputFile': {
                'name': f"initial_file_{i+1}.{job_type == 'upload' and 'dxf' or job_type == 'convert' and 'dxf' or 'pdf'}",
                'size': random.randint(500000, 10000000)
            },
            'parameters': {'pageSize': 'A4', 'dpi': 300} if job_type == 'convert' else \
                          {'maxzoom': 18, 'format': 'png'} if job_type == 'tms' else {},
            'artifacts': [],
            'error': None,
            'progress': None
        }
        jobs_db[job_id] = job
        # Starte die Simulation für diesen Job in einem neuen Thread
        thread = threading.Thread(target=process_job_simulation, args=(job_id,))
        job_processing_threads[job_id] = thread
        thread.start()

def cancel_job_by_id(job_id):
    job = jobs_db.get(job_id)
    if not job:
        return None, "Job not found"

    if job['status'] in ['running', 'processing', 'queued', 'pending']:
        job['status'] = 'cancelled'
        job['completedAt'] = datetime.datetime.now().isoformat()
        job['error'] = 'Job wurde abgebrochen.'
        job['progress'] = None
        
        # Signalisiere dem Simulations-Thread, dass er stoppen soll (falls er läuft)
        # Der Thread selbst prüft den Status und beendet sich.
        # Wenn der Thread noch nicht gestartet wurde (queued), wird er nicht starten.
        if job_id in job_processing_threads:
            # Der Thread wird sich selbst beenden, wenn er den 'cancelled' Status sieht.
            # Wir entfernen ihn hier nicht direkt, da er noch Aufräumarbeiten machen könnte.
            pass
        print(f"Job {job_id} cancelled.")
        return job, None
    else:
        return None, f"Job cannot be cancelled in status: {job['status']}"

def retry_job_by_id(job_id):
    job = jobs_db.get(job_id)
    if not job:
        return None, "Job not found"

    if job['status'] in ['failed', 'error', 'cancelled']:
        print(f"Retrying job {job_id}...")
        # Setze Job-Status zurück und starte die Verarbeitung neu
        job['status'] = 'queued'
        job['completedAt'] = None
        job['error'] = None
        job['artifacts'] = []
        job['progress'] = None
        job['createdAt'] = datetime.datetime.now().isoformat() # Update Erstellungszeit für Retry

        # Starte die Simulation für diesen Job in einem neuen Thread
        # Stelle sicher, dass kein alter Thread für diesen Job mehr läuft
        if job_id in job_processing_threads and job_processing_threads[job_id].is_alive():
             print(f"Warning: Previous processing thread for job {job_id} might still be running.")
             # Hier könntest du versuchen, den alten Thread zu stoppen, falls nötig.
             # Für die Simulation reicht es, einen neuen zu starten.
        
        thread = threading.Thread(target=process_job_simulation, args=(job_id,))
        job_processing_threads[job_id] = thread
        thread.start()
        return job, None
    else:
        return None, f"Job cannot be retried in status: {job['status']}"

def delete_job_by_id(job_id):
    if job_id in jobs_db:
        # Signalisiere dem Simulations-Thread, dass er stoppen soll (falls er läuft)
        job = jobs_db[job_id]
        job['status'] = 'cancelled' # Um den Thread zu stoppen, falls er läuft
        
        # Warte kurz, damit der Thread ggf. reagieren kann (optional, je nach Implementierung)
        # time.sleep(0.1) 

        if job_id in job_processing_threads:
            # Hier könntest du versuchen, den Thread explizit zu joinen, wenn er nicht daemonized ist.
            # Da unsere Simulation den Status prüft, sollte das reichen.
            del job_processing_threads[job_id]

        del jobs_db[job_id]
        print(f"Job {job_id} deleted.")
        return True
    return False

def get_job_artifact(job_id, artifact_name_part):
    job = jobs_db.get(job_id)
    if not job or not job.get('artifacts'):
        return None, "Job or artifacts not found"

    for artifact in job['artifacts']:
        # Einfache Namensprüfung, da wir nur 'output' als Teil erwarten
        if artifact_name_part in artifact['name']:
            return artifact, None
    
    return None, "Artifact not found"

# Erstelle initiale Jobs beim ersten Import des Moduls
create_initial_jobs()

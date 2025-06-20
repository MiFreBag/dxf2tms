import uuid
import datetime
import time
import random
import threading # Für die simulierte Job-Verarbeitung im Hintergrund
import logging

# Logging-Konfiguration
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# In-memory Job-Liste (für Demo-Zwecke)
# In einer echten Anwendung würdest du hier eine Datenbank verwenden
jobs_db = {} # Dictionary, um Jobs per ID zu speichern
job_processing_threads = {} # Um laufende Simulations-Threads zu verwalten {job_id: thread_object}
thread_lock = threading.Lock() # Lock für den Zugriff auf job_processing_threads

def process_job_simulation(job_id):
    """Simuliert die Verarbeitung eines Jobs."""
    job = jobs_db.get(job_id)
    if not job:
        return

    logging.info(f"Starting job {job['id']} ({job['type']})...")
    job['status'] = 'running'
    job['progress'] = 0
    
    # Simulierter Fehler nach einer gewissen Zeit für manche Jobs
    # fail_after_seconds = random.randint(5, 15) if random.random() < 0.3 else float('inf')
    # start_time = time.time()

    duration = random.uniform(2, 12)  # 2-12 Sekunden
    steps = 10
    step_duration = duration / steps

    for i in range(steps):
        with thread_lock:
            # Überprüfen, ob der Thread noch aktiv sein soll oder der Job abgebrochen wurde
            if job_id not in job_processing_threads or \
               threading.current_thread() != job_processing_threads.get(job_id) or \
               job.get('status') == 'cancelled':
                logging.info(f"Job {job_id} processing was stopped or cancelled.")
                # Wenn abgebrochen, setze den Status und die Endzeit, falls nicht schon geschehen
                if job.get('status') == 'cancelled' and not job.get('completedAt'):
                    job['completedAt'] = datetime.datetime.now().isoformat()
                    job['error'] = job.get('error', 'Job wurde während der Verarbeitung abgebrochen.')
                    job['progress'] = None
                # Entferne den Thread nur, wenn er der aktuelle ist und abgebrochen wurde
                if job_id in job_processing_threads and threading.current_thread() == job_processing_threads.get(job_id):
                    del job_processing_threads[job_id]
                return

        time.sleep(step_duration)
        # Stelle sicher, dass der Job noch existiert und nicht während des Sleeps gelöscht wurde
        if job_id not in jobs_db:
            logging.warning(f"Job {job_id} disappeared during processing sleep.")
            return
        job['progress'] = min(job.get('progress', 0) + (100 / steps), 100)

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
    
    logging.info(f"Job {job['id']} finished with status: {job['status']}")
    with thread_lock:
        if job_id in job_processing_threads and threading.current_thread() == job_processing_threads.get(job_id):
            del job_processing_threads[job_id]


def get_all_jobs():
    return list(jobs_db.values())

def create_initial_jobs():
    """Erstellt einige initiale Mock-Jobs beim Start."""
    # Diese Funktion sollte nur einmal ausgeführt werden, z.B. beim App-Start.
    if jobs_db or job_processing_threads: # Nur erstellen, wenn alles leer ist
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
        with thread_lock:
            thread = threading.Thread(target=process_job_simulation, args=(job_id,))
            job_processing_threads[job_id] = thread
            thread.start()

def cancel_job_by_id(job_id):
    job = jobs_db.get(job_id)
    if not job:
        return None, "Job not found"

    if job['status'] in ['running', 'processing', 'queued', 'pending']:
        with thread_lock:
            job['status'] = 'cancelled'
            if not job.get('completedAt'): # Setze nur, wenn nicht schon gesetzt (z.B. durch Thread selbst)
                job['completedAt'] = datetime.datetime.now().isoformat()
            job['error'] = job.get('error', 'Job wurde abgebrochen.')
            job['progress'] = None
            
            # Der laufende Thread für diesen Job wird dies beim nächsten Check bemerken
            # und sich selbst beenden und aus job_processing_threads entfernen.
            # Wenn der Job 'queued' war und der Thread noch nicht gestartet ist,
            # wird er beim Start den 'cancelled' Status sehen.
            
        logging.info(f"Job {job_id} marked as cancelled.")
        return job, None # Rückgabe des Jobs, damit der Aufrufer den aktualisierten Status hat
    else:
        return None, f"Job cannot be cancelled in status: {job['status']}"

def retry_job_by_id(job_id):
    job = jobs_db.get(job_id)
    if not job:
        return None, "Job not found"

    if job['status'] in ['failed', 'error', 'cancelled']:
        logging.info(f"Retrying job {job_id}...")
        # Setze Job-Status zurück und starte die Verarbeitung neu
        job['status'] = 'queued'
        job['completedAt'] = None
        job['error'] = None
        job['artifacts'] = []
        job['progress'] = None
        job['createdAt'] = datetime.datetime.now().isoformat() # Update Erstellungszeit für Retry

        # Starte die Simulation für diesen Job in einem neuen Thread
        with thread_lock:
            # Stelle sicher, dass kein alter Thread für diesen Job mehr läuft oder registriert ist
            if job_id in job_processing_threads:
                old_thread = job_processing_threads.get(job_id)
                if old_thread and old_thread.is_alive():
                    logging.warning(f"Previous processing thread for job {job_id} was still alive during retry. This might lead to issues if not handled by the thread itself.")
                    # In einer robusten Implementierung müsste man hier den alten Thread sauber beenden.
                    # Für diese Simulation setzen wir darauf, dass der alte Thread den geänderten Job-Status erkennt.
                del job_processing_threads[job_id] # Entferne alte Referenz
            
            thread = threading.Thread(target=process_job_simulation, args=(job_id,))
            job_processing_threads[job_id] = thread
            thread.start()
        return job, None
    else:
        return None, f"Job cannot be retried in status: {job['status']}"

def delete_job_by_id(job_id):
    if job_id in jobs_db:
        with thread_lock:
            job_to_delete = jobs_db.get(job_id)
            if job_to_delete:
                # Markiere den Job als 'cancelled', um den laufenden Thread (falls vorhanden) zu informieren
                job_to_delete['status'] = 'cancelled' 
                # Der Thread wird sich selbst aus job_processing_threads entfernen.
                # Wenn der Thread nicht läuft, passiert nichts Schlimmes.

            # Entferne den Job aus der Datenbank
            if job_id in jobs_db:
                 del jobs_db[job_id]
            # Der Thread, falls er noch in job_processing_threads war, wird beim nächsten Check bemerken,
            # dass der Job weg ist oder 'cancelled' und sich beenden.
        logging.info(f"Job {job_id} deleted.")
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

# create_initial_jobs() # Wird nun von app.py aufgerufen, um mehr Kontrolle zu haben
                        # oder kann hier bleiben, wenn das Modul nur einmal importiert wird.
                        # Für Flask mit `debug=True` (Auto-Reload) ist es besser, dies von app.py zu steuern.

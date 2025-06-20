from flask import Blueprint, jsonify, request, send_file
import io # Für send_file mit BytesIO

from job_controller import (
    get_all_jobs,
    cancel_job_by_id,
    retry_job_by_id,
    delete_job_by_id,
    get_job_artifact
)

job_bp = Blueprint('job_bp', __name__)

@job_bp.route('/', methods=['GET'])
def get_jobs_route():
    jobs = get_all_jobs()
    return jsonify(jobs)

@job_bp.route('/<job_id>/cancel', methods=['POST'])
def cancel_job_route(job_id):
    updated_job, error = cancel_job_by_id(job_id)
    if error:
        return jsonify({'message': error}), 400 if error != "Job not found" else 404
    return jsonify(updated_job)

@job_bp.route('/<job_id>/retry', methods=['POST'])
def retry_job_route(job_id):
    updated_job, error = retry_job_by_id(job_id)
    if error:
        return jsonify({'message': error}), 400 if error != "Job not found" else 404
    return jsonify(updated_job)

@job_bp.route('/<job_id>', methods=['DELETE'])
def delete_job_route(job_id):
    if delete_job_by_id(job_id):
        return '', 204  # No Content
    else:
        return jsonify({'message': 'Job not found'}), 404

@job_bp.route('/<job_id>/artifacts/<path:artifact_name>', methods=['GET'])
def download_artifact_route(job_id, artifact_name):
    # In einer echten Anwendung würde artifact_name den genauen Dateinamen oder Pfad enthalten.
    # Für die Simulation verwenden wir einen Teil des Namens.
    artifact_data, error = get_job_artifact(job_id, artifact_name)

    if error:
        return jsonify({'message': error}), 404
    
    # Simulierte Dateiausgabe
    # In einer echten Anwendung würdest du hier die Datei vom Speicherort laden
    # und mit send_file und mimetype korrekt ausliefern.
    
    # Beispiel: Dummy-Textdatei
    dummy_content = f"Simulierter Inhalt für Artefakt: {artifact_data['name']} von Job {job_id}"
    file_stream = io.BytesIO(dummy_content.encode('utf-8'))
    
    return send_file(
        file_stream,
        mimetype=artifact_data.get('type', 'application/octet-stream'),
        as_attachment=True,
        download_name=artifact_data.get('name', 'downloaded_artifact')
    )

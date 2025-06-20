from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import JSONResponse, StreamingResponse
import io
from controllers.jobController import (
    get_all_jobs,
    cancel_job_by_id,
    retry_job_by_id,
    delete_job_by_id,
    get_job_artifact
)

router = APIRouter()

@router.get("/", response_model=None)
def get_jobs_route():
    jobs = get_all_jobs()
    return jobs

@router.post("/{job_id}/cancel")
def cancel_job_route(job_id: str):
    updated_job, error = cancel_job_by_id(job_id)
    if error:
        raise HTTPException(status_code=400 if error != "Job not found" else 404, detail=error)
    return updated_job

@router.post("/{job_id}/retry")
def retry_job_route(job_id: str):
    updated_job, error = retry_job_by_id(job_id)
    if error:
        raise HTTPException(status_code=400 if error != "Job not found" else 404, detail=error)
    return updated_job

@router.delete("/{job_id}")
def delete_job_route(job_id: str):
    if delete_job_by_id(job_id):
        return Response(status_code=204)
    else:
        raise HTTPException(status_code=404, detail="Job not found")

@router.get("/{job_id}/artifacts/{artifact_name}")
def download_artifact_route(job_id: str, artifact_name: str):
    artifact_data, error = get_job_artifact(job_id, artifact_name)
    if error:
        raise HTTPException(status_code=404, detail=error)
    dummy_content = f"Simulierter Inhalt für Artefakt: {artifact_data['name']} von Job {job_id}"
    file_stream = io.BytesIO(dummy_content.encode('utf-8'))
    return StreamingResponse(
        file_stream,
        media_type=artifact_data.get('type', 'application/octet-stream'),
        headers={
            'Content-Disposition': f'attachment; filename="{artifact_data.get('name', 'downloaded_artifact')}"'
        }
    )

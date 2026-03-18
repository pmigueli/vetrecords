from datetime import datetime

from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: str
    filename: str
    content_type: str
    file_size: str | None = None
    detected_language: str = "unknown"
    status: str
    error_message: str | None = None
    pet_id: str | None = None
    visit_count: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentUploadResponse(BaseModel):
    id: str
    filename: str
    status: str
    message: str

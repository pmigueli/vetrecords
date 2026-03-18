"""Initial schema — documents, pets, visits

Revision ID: 001
Revises:
Create Date: 2025-03-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "documents",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("filename", sa.String(), nullable=False),
        sa.Column("file_path", sa.String(), nullable=False),
        sa.Column("content_type", sa.String(), nullable=False),
        sa.Column("file_size", sa.String(), nullable=True),
        sa.Column("extracted_text", sa.Text(), nullable=True),
        sa.Column("detected_language", sa.String(), server_default="unknown"),
        sa.Column("status", sa.String(), server_default="uploading"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("pet_id", sa.String(), nullable=True),
        sa.Column("visit_count", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "pets",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("document_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("species", sa.String(), nullable=True),
        sa.Column("breed", sa.String(), nullable=True),
        sa.Column("date_of_birth", sa.String(), nullable=True),
        sa.Column("sex", sa.String(), nullable=True),
        sa.Column("microchip_id", sa.String(), nullable=True),
        sa.Column("coat", sa.String(), nullable=True),
        sa.Column("owner_name", sa.String(), nullable=True),
        sa.Column("owner_phone", sa.String(), nullable=True),
        sa.Column("owner_address", sa.String(), nullable=True),
        sa.Column("owner_email", sa.String(), nullable=True),
        sa.Column("clinic_name", sa.String(), nullable=True),
        sa.Column("clinic_address", sa.String(), nullable=True),
        sa.Column("status", sa.String(), server_default="draft"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "visits",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("pet_id", sa.String(), nullable=False),
        sa.Column("document_id", sa.String(), nullable=False),
        sa.Column("date", sa.String(), nullable=True),
        sa.Column("time", sa.String(), nullable=True),
        sa.Column("visit_type", sa.String(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("examination", sa.Text(), nullable=True),
        sa.Column("vital_signs", sa.JSON(), nullable=True),
        sa.Column("diagnosis", sa.JSON(), nullable=True),
        sa.Column("treatment", sa.JSON(), nullable=True),
        sa.Column("lab_results", sa.JSON(), nullable=True),
        sa.Column("vaccinations", sa.JSON(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("veterinarian", sa.String(), nullable=True),
        sa.Column("raw_text", sa.Text(), nullable=True),
        sa.Column("edited", sa.Boolean(), server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("visits")
    op.drop_table("pets")
    op.drop_table("documents")

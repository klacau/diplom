"""add image_url to recipes

Revision ID: 1542918b3519
Revises: 2714ecbcd087
Create Date: 2026-04-06 11:50:52.304200

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1542918b3519'
down_revision: Union[str, None] = '2714ecbcd087'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("recipes", sa.Column("image_url", sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("recipes", "image_url")


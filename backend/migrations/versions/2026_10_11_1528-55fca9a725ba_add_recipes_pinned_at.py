"""Add recipes.pinned_at

Revision ID: 55fca9a725ba
Revises: f9e81a5676ed
Create Date: 2026-10-11 15:28:00.760799

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '55fca9a725ba'
down_revision: Union[str, Sequence[str], None] = 'f9e81a5676ed'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Nullable, so the previous image keeps working against the migrated table.
    with op.batch_alter_table('recipes', schema=None) as batch_op:
        batch_op.add_column(sa.Column('pinned_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('recipes', schema=None) as batch_op:
        batch_op.drop_column('pinned_at')

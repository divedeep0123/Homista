"""Add home profile details to projects."""

from alembic import op
import sqlalchemy as sa

revision = "0003_project_profile"
down_revision = "0002_projects"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("home_type", sa.String(length=24), nullable=True))
    op.add_column("projects", sa.Column("plot_area_sqft", sa.Integer(), nullable=True))
    op.add_column("projects", sa.Column("built_up_area_sqft", sa.Integer(), nullable=True))
    op.add_column("projects", sa.Column("floors", sa.Integer(), nullable=True))
    op.add_column("projects", sa.Column("construction_quality", sa.String(length=24), nullable=True))


def downgrade() -> None:
    op.drop_column("projects", "construction_quality")
    op.drop_column("projects", "floors")
    op.drop_column("projects", "built_up_area_sqft")
    op.drop_column("projects", "plot_area_sqft")
    op.drop_column("projects", "home_type")

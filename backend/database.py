from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Database URL - Update with your MySQL password
DATABASE_URL = "mysql+pymysql://root:Tejas%40777@localhost:3306/lms_study_planner"

# Create database engine
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# Create session local for database operations
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, ForeignKey, Date, Time, Boolean, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import enum

# Enum for task priority
class PriorityEnum(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"

# Enum for task status
class StatusEnum(str, enum.Enum):
    PENDING = "Pending"
    COMPLETED = "Completed"
    IN_PROGRESS = "In Progress"
    OVERDUE = "Overdue"

# Add new enum for task completion quality
class CompletionQualityEnum(str, enum.Enum):
    EXCELLENT = "Excellent"
    GOOD = "Good"
    AVERAGE = "Average"
    POOR = "Poor"

# User model
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Password reset fields
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime, nullable=True)
    
    # Profile fields
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    timezone = Column(String(50), default="UTC")
    notification_enabled = Column(Boolean, default=True)
    
    # Learning statistics
    total_study_hours = Column(Float, default=0.0)
    total_points = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_activity_date = Column(Date, nullable=True)
    
    # Relationships
    courses = relationship("Course", back_populates="user", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    study_planners = relationship("StudyPlanner", back_populates="user", cascade="all, delete-orphan")
    task_completions = relationship("TaskCompletion", back_populates="user", cascade="all, delete-orphan")

# Course model
class Course(Base):
    __tablename__ = "courses"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_name = Column(String(200), nullable=False)
    description = Column(Text)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Course progress tracking
    progress_percentage = Column(Float, default=0.0)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="courses")
    tasks = relationship("Task", back_populates="course", cascade="all, delete-orphan")

# Task model
class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    priority = Column(String(50), default="Medium")
    deadline = Column(DateTime, nullable=False)
    status = Column(String(50), default="Pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Task completion tracking
    estimated_hours = Column(Float, default=0.0)
    actual_hours = Column(Float, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    points_earned = Column(Integer, default=0)
    
    # Relationships
    user = relationship("User", back_populates="tasks")
    course = relationship("Course", back_populates="tasks")
    study_planners = relationship("StudyPlanner", back_populates="task", cascade="all, delete-orphan")
    completion_record = relationship("TaskCompletion", back_populates="task", uselist=False, cascade="all, delete-orphan")

# Task Completion model for detailed tracking
class TaskCompletion(Base):
    __tablename__ = "task_completions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, unique=True)
    completed_at = Column(DateTime, server_default=func.now())
    time_spent_hours = Column(Float, nullable=False)
    quality_rating = Column(Enum(CompletionQualityEnum), default=CompletionQualityEnum.GOOD)
    notes = Column(Text, nullable=True)
    points_earned = Column(Integer, default=0)
    
    # Relationships
    user = relationship("User", back_populates="task_completions")
    task = relationship("Task", back_populates="completion_record")

# Study Planner model
class StudyPlanner(Base):
    __tablename__ = "study_planner"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    study_date = Column(Date, nullable=False)
    time_slot = Column(Time, nullable=False)
    duration_hours = Column(Float, default=1.0)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="study_planners")
    task = relationship("Task", back_populates="study_planners")
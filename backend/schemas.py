from pydantic import BaseModel, EmailStr, validator, Field
from datetime import date, datetime, time
from typing import Optional, List
from enum import Enum

# Enums for validation
class PriorityEnum(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"

class StatusEnum(str, Enum):
    PENDING = "Pending"
    COMPLETED = "Completed"
    IN_PROGRESS = "In Progress"
    OVERDUE = "Overdue"

class CompletionQualityEnum(str, Enum):
    EXCELLENT = "Excellent"
    GOOD = "Good"
    AVERAGE = "Average"
    POOR = "Poor"

# User schemas
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    confirm_password: str
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime
    last_login: Optional[datetime] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    timezone: Optional[str] = None
    notification_enabled: Optional[bool] = None
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Course schemas
class CourseCreate(BaseModel):
    course_name: str
    description: Optional[str] = None
    start_date: date
    end_date: date

class CourseResponse(BaseModel):
    id: int
    user_id: int
    course_name: str
    description: Optional[str]
    start_date: date
    end_date: date
    created_at: datetime
    progress_percentage: Optional[float] = None
    is_completed: Optional[bool] = None
    
    class Config:
        from_attributes = True

# Task schemas
class TaskCreate(BaseModel):
    course_id: int
    title: str
    description: Optional[str] = None
    priority: PriorityEnum
    deadline: datetime
    estimated_hours: Optional[float] = 0.0

class TaskUpdate(BaseModel):
    status: Optional[StatusEnum] = None
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[PriorityEnum] = None
    deadline: Optional[datetime] = None
    estimated_hours: Optional[float] = None

class TaskCompleteRequest(BaseModel):
    time_spent_hours: float = Field(..., ge=0, le=24, description="Time spent in hours (0-24)")
    quality_rating: CompletionQualityEnum = CompletionQualityEnum.GOOD
    notes: Optional[str] = None

class TaskResponse(BaseModel):
    id: int
    user_id: int
    course_id: int
    title: str
    description: Optional[str]
    priority: PriorityEnum
    deadline: datetime
    status: StatusEnum
    created_at: datetime
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    completed_at: Optional[datetime] = None
    points_earned: Optional[int] = None
    
    class Config:
        from_attributes = True

# Dashboard schemas
class DashboardResponse(BaseModel):
    total_courses: int
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    in_progress_tasks: Optional[int] = None
    overdue_tasks: Optional[int] = None
    completion_rate: Optional[float] = None

# Learning Stats Schemas
class LearningStatsResponse(BaseModel):
    total_courses: int
    completed_courses: int
    in_progress_courses: int
    course_completion_rate: float
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    in_progress_tasks: int
    overdue_tasks: int
    task_completion_rate: float
    total_study_hours: float
    estimated_vs_actual_hours: dict
    average_quality_rating: str
    total_points: int
    current_streak: int
    longest_streak: int
    tasks_by_priority: dict
    completion_by_priority: dict

# Study Planner schemas
class StudyPlannerCreate(BaseModel):
    task_id: int
    study_date: date
    time_slot: time
    duration_hours: Optional[float] = 1.0

class StudyPlannerResponse(BaseModel):
    id: int
    user_id: int
    task_id: int
    study_date: date
    time_slot: time
    duration_hours: float
    completed: bool
    created_at: datetime
    task_title: Optional[str] = None
    priority: Optional[PriorityEnum] = None
    
    class Config:
        from_attributes = True

class TodayPlannerResponse(BaseModel):
    task_id: int
    task_title: str
    priority: PriorityEnum
    time_slot: time
    study_date: date
    duration_hours: float
    status: Optional[StatusEnum] = None

# Password Reset Schemas
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class PasswordResetResponse(BaseModel):
    message: str
    success: bool

# Profile Schemas
class ProfileResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime
    last_login: Optional[datetime] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    timezone: Optional[str] = None
    notification_enabled: Optional[bool] = None
    total_courses: Optional[int] = None
    completed_tasks: Optional[int] = None
    total_study_hours: Optional[float] = None
    total_points: Optional[int] = None
    current_streak: Optional[int] = None
    
    class Config:
        from_attributes = True

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    timezone: Optional[str] = None
    notification_enabled: Optional[bool] = None

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_new_password: str
    
    @validator('confirm_new_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('New passwords do not match')
        return v
    
    @validator('new_password')
    def validate_password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        return v

class DeleteAccountRequest(BaseModel):
    password: str
    confirmation_text: str
    
    @validator('confirmation_text')
    def validate_confirmation(cls, v):
        if v != "DELETE MY ACCOUNT":
            raise ValueError('Please type "DELETE MY ACCOUNT" to confirm')
        return v

class ApiResponse(BaseModel):
    message: str
    success: bool
    data: Optional[dict] = None

class TaskCompletionResponse(BaseModel):
    task_id: int
    task_title: str
    completed_at: datetime
    time_spent_hours: float
    quality_rating: CompletionQualityEnum
    points_earned: int
    message: str
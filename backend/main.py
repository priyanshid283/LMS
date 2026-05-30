from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import date, datetime, timedelta
import math

from database import engine, get_db, Base
from models import User, Course, Task, StudyPlanner, PriorityEnum, StatusEnum, TaskCompletion, CompletionQualityEnum
from schemas import (
    UserCreate, UserLogin, Token, CourseCreate, CourseResponse,
    TaskCreate, TaskResponse, DashboardResponse, StudyPlannerCreate,
    StudyPlannerResponse, TodayPlannerResponse,
    ForgotPasswordRequest, ResetPasswordRequest, PasswordResetResponse,
    ProfileResponse, ProfileUpdate, PasswordChangeRequest,
    DeleteAccountRequest, ApiResponse, TaskCompleteRequest, 
    TaskCompletionResponse, LearningStatsResponse, TaskUpdate
)
from auth import (
    get_password_hash, authenticate_user, create_access_token, 
    get_current_user, verify_password
)
from utils import create_password_reset_token, reset_password, validate_reset_token

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="AI-Based Learning Platform API",
    description="Backend API for Learning Management System with Smart Study Planner",
    version="2.0.0"
)

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== AUTHENTICATION ROUTES ====================

@app.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password=hashed_password,
        bio="",
        timezone="UTC",
        notification_enabled=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = create_access_token(data={"sub": new_user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Login user"""
    user = authenticate_user(db, user_data.email, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user.last_login = datetime.utcnow()
    db.commit()
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# ==================== PASSWORD RESET ROUTES ====================

@app.post("/forgot-password", response_model=PasswordResetResponse)
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Request password reset"""
    user = db.query(User).filter(User.email == request.email).first()
    
    if user:
        create_password_reset_token(db, request.email)
    
    return PasswordResetResponse(
        message="If an account exists with this email, you will receive a password reset link.",
        success=True
    )

@app.post("/reset-password", response_model=PasswordResetResponse)
def reset_password_endpoint(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using token"""
    if not validate_reset_token(db, request.token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    user = reset_password(db, request.token, request.new_password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    return PasswordResetResponse(
        message="Password has been reset successfully. You can now login with your new password.",
        success=True
    )

@app.get("/verify-reset-token/{token}")
def verify_reset_token(token: str, db: Session = Depends(get_db)):
    """Verify if reset token is valid"""
    is_valid = validate_reset_token(db, token)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    return {"valid": True, "message": "Token is valid"}

# ==================== PROFILE MANAGEMENT ROUTES ====================

@app.get("/profile", response_model=ProfileResponse)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get user profile with learning statistics"""
    total_courses = db.query(Course).filter(Course.user_id == current_user.id).count()
    completed_tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status == StatusEnum.COMPLETED
    ).count()
    
    return ProfileResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        created_at=current_user.created_at,
        last_login=current_user.last_login,
        bio=current_user.bio,
        avatar_url=current_user.avatar_url,
        timezone=current_user.timezone,
        notification_enabled=current_user.notification_enabled,
        total_courses=total_courses,
        completed_tasks=completed_tasks,
        total_study_hours=current_user.total_study_hours or 0,
        total_points=current_user.total_points or 0,
        current_streak=current_user.current_streak or 0
    )

@app.put("/profile", response_model=ProfileResponse)
def update_profile(
    profile_data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile"""
    if profile_data.email and profile_data.email != current_user.email:
        existing_user = db.query(User).filter(User.email == profile_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered by another user"
            )
        current_user.email = profile_data.email
    
    if profile_data.name:
        current_user.name = profile_data.name
    if profile_data.bio is not None:
        current_user.bio = profile_data.bio
    if profile_data.avatar_url is not None:
        current_user.avatar_url = profile_data.avatar_url
    if profile_data.timezone:
        current_user.timezone = profile_data.timezone
    if profile_data.notification_enabled is not None:
        current_user.notification_enabled = profile_data.notification_enabled
    
    db.commit()
    db.refresh(current_user)
    
    total_courses = db.query(Course).filter(Course.user_id == current_user.id).count()
    completed_tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status == StatusEnum.COMPLETED
    ).count()
    
    return ProfileResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        created_at=current_user.created_at,
        last_login=current_user.last_login,
        bio=current_user.bio,
        avatar_url=current_user.avatar_url,
        timezone=current_user.timezone,
        notification_enabled=current_user.notification_enabled,
        total_courses=total_courses,
        completed_tasks=completed_tasks,
        total_study_hours=current_user.total_study_hours or 0,
        total_points=current_user.total_points or 0,
        current_streak=current_user.current_streak or 0
    )

@app.put("/profile/bio", response_model=ApiResponse)
def update_bio(
    bio: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user bio only"""
    current_user.bio = bio
    db.commit()
    
    return ApiResponse(
        message="Bio updated successfully",
        success=True,
        data={"bio": bio}
    )

@app.post("/profile/change-password", response_model=ApiResponse)
def change_password(
    password_data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    if not verify_password(password_data.current_password, current_user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )
    
    current_user.password = get_password_hash(password_data.new_password)
    db.commit()
    
    return ApiResponse(
        message="Password changed successfully",
        success=True
    )

@app.delete("/profile/delete-account", response_model=ApiResponse)
def delete_account(
    delete_data: DeleteAccountRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete user account permanently"""
    if not verify_password(delete_data.password, current_user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password is incorrect"
        )
    
    db.delete(current_user)
    db.commit()
    
    return ApiResponse(
        message="Account deleted successfully",
        success=True
    )

# ==================== DASHBOARD ROUTES ====================

@app.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get dashboard statistics"""
    total_courses = db.query(Course).filter(Course.user_id == current_user.id).count()
    total_tasks = db.query(Task).filter(Task.user_id == current_user.id).count()
    completed_tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status == StatusEnum.COMPLETED
    ).count()
    pending_tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status == StatusEnum.PENDING
    ).count()
    in_progress_tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status == StatusEnum.IN_PROGRESS
    ).count()
    overdue_tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status == StatusEnum.OVERDUE
    ).count()
    
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    return DashboardResponse(
        total_courses=total_courses,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        pending_tasks=pending_tasks,
        in_progress_tasks=in_progress_tasks,
        overdue_tasks=overdue_tasks,
        completion_rate=round(completion_rate, 2)
    )

# ==================== COURSE ROUTES ====================

@app.get("/courses", response_model=List[CourseResponse])
def get_courses(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all courses for logged-in user"""
    courses = db.query(Course).filter(Course.user_id == current_user.id).all()
    return courses

@app.post("/courses", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(
    course_data: CourseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new course"""
    if course_data.start_date > course_data.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date cannot be after end date"
        )
    
    new_course = Course(
        user_id=current_user.id,
        course_name=course_data.course_name,
        description=course_data.description,
        start_date=course_data.start_date,
        end_date=course_data.end_date
    )
    
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return new_course

@app.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a course"""
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.user_id == current_user.id
    ).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    db.delete(course)
    db.commit()
    return None

# ==================== TASK ROUTES ====================

@app.get("/tasks", response_model=List[TaskResponse])
def get_tasks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all tasks for logged-in user"""
    tasks = db.query(Task).filter(Task.user_id == current_user.id).all()
    return tasks

@app.get("/tasks/completed", response_model=List[TaskResponse])
def get_completed_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50,
    offset: int = 0
):
    """Get all completed tasks"""
    completed_tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status == StatusEnum.COMPLETED
    ).order_by(Task.completed_at.desc()).limit(limit).offset(offset).all()
    
    return completed_tasks

@app.get("/tasks/pending", response_model=List[TaskResponse])
def get_pending_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all pending tasks"""
    now = datetime.utcnow()
    
    overdue_tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status == StatusEnum.PENDING,
        Task.deadline < now
    ).all()
    
    for task in overdue_tasks:
        task.status = StatusEnum.OVERDUE
    
    db.commit()
    
    pending_tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status.in_([StatusEnum.PENDING, StatusEnum.IN_PROGRESS])
    ).order_by(Task.deadline.asc()).all()
    
    return pending_tasks

@app.post("/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new task"""
    course = db.query(Course).filter(
        Course.id == task_data.course_id,
        Course.user_id == current_user.id
    ).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    new_task = Task(
        user_id=current_user.id,
        course_id=task_data.course_id,
        title=task_data.title,
        description=task_data.description,
        priority=task_data.priority,
        deadline=task_data.deadline,
        estimated_hours=task_data.estimated_hours,
        status=StatusEnum.PENDING
    )
    
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

@app.put("/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a task"""
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    if task_data.title is not None:
        task.title = task_data.title
    if task_data.description is not None:
        task.description = task_data.description
    if task_data.priority is not None:
        task.priority = task_data.priority
    if task_data.deadline is not None:
        task.deadline = task_data.deadline
    if task_data.estimated_hours is not None:
        task.estimated_hours = task_data.estimated_hours
    if task_data.status is not None:
        task.status = task_data.status
    
    db.commit()
    db.refresh(task)
    return task

@app.post("/tasks/{task_id}/start", response_model=ApiResponse)
def start_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a task as in progress"""
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    if task.status == StatusEnum.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task is already completed"
        )
    
    task.status = StatusEnum.IN_PROGRESS
    db.commit()
    
    return ApiResponse(
        message="Task marked as in progress",
        success=True
    )

@app.put("/tasks/{task_id}/complete", response_model=TaskCompletionResponse)
def complete_task(
    task_id: int,
    completion_data: TaskCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Complete a task with detailed tracking"""
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    if task.status == StatusEnum.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task is already completed"
        )
    
    # Calculate points
    points_multiplier = {
        PriorityEnum.HIGH: 10,
        PriorityEnum.MEDIUM: 5,
        PriorityEnum.LOW: 2
    }
    
    quality_multiplier = {
        CompletionQualityEnum.EXCELLENT: 1.5,
        CompletionQualityEnum.GOOD: 1.0,
        CompletionQualityEnum.AVERAGE: 0.7,
        CompletionQualityEnum.POOR: 0.3
    }
    
    base_points = points_multiplier[task.priority]
    points_earned = int(base_points * quality_multiplier[completion_data.quality_rating])
    
    # Create completion record
    task_completion = TaskCompletion(
        user_id=current_user.id,
        task_id=task.id,
        time_spent_hours=completion_data.time_spent_hours,
        quality_rating=completion_data.quality_rating,
        notes=completion_data.notes,
        points_earned=points_earned
    )
    
    # Update task
    task.status = StatusEnum.COMPLETED
    task.actual_hours = completion_data.time_spent_hours
    task.completed_at = datetime.utcnow()
    task.points_earned = points_earned
    
    # Update user statistics
    current_user.total_points += points_earned
    current_user.total_study_hours += completion_data.time_spent_hours
    
    # Update streak
    today = date.today()
    if current_user.last_activity_date:
        day_diff = (today - current_user.last_activity_date).days
        if day_diff == 1:
            current_user.current_streak += 1
        elif day_diff > 1:
            current_user.current_streak = 1
    else:
        current_user.current_streak = 1
    
    if current_user.current_streak > current_user.longest_streak:
        current_user.longest_streak = current_user.current_streak
    
    current_user.last_activity_date = today
    
    # Update course progress
    course = db.query(Course).filter(Course.id == task.course_id).first()
    if course:
        total_course_tasks = db.query(Task).filter(
            Task.course_id == course.id,
            Task.user_id == current_user.id
        ).count()
        
        completed_course_tasks = db.query(Task).filter(
            Task.course_id == course.id,
            Task.user_id == current_user.id,
            Task.status == StatusEnum.COMPLETED
        ).count()
        
        course.progress_percentage = (completed_course_tasks / total_course_tasks * 100) if total_course_tasks > 0 else 0
        
        if course.progress_percentage == 100 and not course.is_completed:
            course.is_completed = True
            course.completed_at = datetime.utcnow()
    
    db.add(task_completion)
    db.commit()
    
    return TaskCompletionResponse(
        task_id=task.id,
        task_title=task.title,
        completed_at=task.completed_at,
        time_spent_hours=completion_data.time_spent_hours,
        quality_rating=completion_data.quality_rating,
        points_earned=points_earned,
        message=f"Task completed! You earned {points_earned} points!"
    )

# ✅ DELETE TASK ENDPOINT - Fixes the 405 error
@app.delete("/tasks/{task_id}", response_model=ApiResponse)
def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a task
    - Only the task owner can delete it
    - Also removes associated study planner entries (due to cascade)
    """
    # Find the task
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found or you don't have permission to delete it"
        )
    
    # Store task title for response message
    task_title = task.title
    
    # Delete the task (study planner entries will be deleted automatically due to cascade)
    db.delete(task)
    db.commit()
    
    return ApiResponse(
        message=f"Task '{task_title}' deleted successfully",
        success=True,
        data={"task_id": task_id, "task_title": task_title}
    )

# Optional: Bulk delete all completed tasks
@app.delete("/tasks/completed/clear-all", response_model=ApiResponse)
def clear_all_completed_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete all completed tasks for the logged-in user
    - Useful for cleaning up old completed tasks
    """
    # Find all completed tasks
    completed_tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status == StatusEnum.COMPLETED
    ).all()
    
    if not completed_tasks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No completed tasks found to delete"
        )
    
    task_count = len(completed_tasks)
    
    # Delete all completed tasks
    for task in completed_tasks:
        db.delete(task)
    
    db.commit()
    
    return ApiResponse(
        message=f"Successfully deleted {task_count} completed task(s)",
        success=True,
        data={"deleted_count": task_count}
    )

# Delete tasks by course
@app.delete("/courses/{course_id}/tasks", response_model=ApiResponse)
def delete_course_tasks(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete all tasks for a specific course
    """
    # Verify course belongs to user
    course = db.query(Course).filter(
        Course.id == course_id,
        Course.user_id == current_user.id
    ).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Find all tasks for this course
    tasks = db.query(Task).filter(
        Task.course_id == course_id,
        Task.user_id == current_user.id
    ).all()
    
    task_count = len(tasks)
    
    # Delete all tasks
    for task in tasks:
        db.delete(task)
    
    db.commit()
    
    return ApiResponse(
        message=f"Successfully deleted {task_count} task(s) from course '{course.course_name}'",
        success=True,
        data={"deleted_count": task_count, "course_id": course_id}
    )

# ==================== LEARNING STATS ROUTES ====================

@app.get("/learning-stats", response_model=LearningStatsResponse)
def get_learning_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive learning statistics"""
    # Course statistics
    total_courses = db.query(Course).filter(Course.user_id == current_user.id).count()
    completed_courses = db.query(Course).filter(
        Course.user_id == current_user.id,
        Course.is_completed == True
    ).count()
    in_progress_courses = total_courses - completed_courses
    course_completion_rate = (completed_courses / total_courses * 100) if total_courses > 0 else 0
    
    # Task statistics
    total_tasks = db.query(Task).filter(Task.user_id == current_user.id).count()
    completed_tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status == StatusEnum.COMPLETED
    ).count()
    pending_tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status == StatusEnum.PENDING
    ).count()
    in_progress_tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status == StatusEnum.IN_PROGRESS
    ).count()
    overdue_tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status == StatusEnum.OVERDUE
    ).count()
    task_completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    # Time statistics
    estimated_hours = db.query(func.sum(Task.estimated_hours)).filter(
        Task.user_id == current_user.id
    ).scalar() or 0
    
    actual_hours = db.query(func.sum(Task.actual_hours)).filter(
        Task.user_id == current_user.id
    ).scalar() or 0
    
    # Performance statistics
    avg_quality = db.query(func.avg(
        func.case(
            (TaskCompletion.quality_rating == CompletionQualityEnum.EXCELLENT, 4),
            (TaskCompletion.quality_rating == CompletionQualityEnum.GOOD, 3),
            (TaskCompletion.quality_rating == CompletionQualityEnum.AVERAGE, 2),
            (TaskCompletion.quality_rating == CompletionQualityEnum.POOR, 1)
        )
    )).filter(TaskCompletion.user_id == current_user.id).scalar()
    
    if avg_quality:
        if avg_quality >= 3.5:
            avg_quality_text = "Excellent"
        elif avg_quality >= 2.5:
            avg_quality_text = "Good"
        elif avg_quality >= 1.5:
            avg_quality_text = "Average"
        else:
            avg_quality_text = "Poor"
    else:
        avg_quality_text = "No data"
    
    # Tasks by priority
    high_priority_tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.priority == PriorityEnum.HIGH
    ).count()
    medium_priority_tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.priority == PriorityEnum.MEDIUM
    ).count()
    low_priority_tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.priority == PriorityEnum.LOW
    ).count()
    
    # Completion by priority
    high_completed = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.priority == PriorityEnum.HIGH,
        Task.status == StatusEnum.COMPLETED
    ).count()
    medium_completed = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.priority == PriorityEnum.MEDIUM,
        Task.status == StatusEnum.COMPLETED
    ).count()
    low_completed = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.priority == PriorityEnum.LOW,
        Task.status == StatusEnum.COMPLETED
    ).count()
    
    return LearningStatsResponse(
        total_courses=total_courses,
        completed_courses=completed_courses,
        in_progress_courses=in_progress_courses,
        course_completion_rate=round(course_completion_rate, 2),
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        pending_tasks=pending_tasks,
        in_progress_tasks=in_progress_tasks,
        overdue_tasks=overdue_tasks,
        task_completion_rate=round(task_completion_rate, 2),
        total_study_hours=round(current_user.total_study_hours or 0, 2),
        estimated_vs_actual_hours={
            "estimated": round(estimated_hours, 2),
            "actual": round(actual_hours, 2),
            "difference": round(actual_hours - estimated_hours, 2)
        },
        average_quality_rating=avg_quality_text,
        total_points=current_user.total_points or 0,
        current_streak=current_user.current_streak or 0,
        longest_streak=current_user.longest_streak or 0,
        tasks_by_priority={
            "high": high_priority_tasks,
            "medium": medium_priority_tasks,
            "low": low_priority_tasks
        },
        completion_by_priority={
            "high": high_completed,
            "medium": medium_completed,
            "low": low_completed
        }
    )

@app.get("/learning-stats/weekly")
def get_weekly_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get weekly learning statistics"""
    today = date.today()
    weekly_stats = []
    
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        
        tasks_completed = db.query(Task).filter(
            Task.user_id == current_user.id,
            func.date(Task.completed_at) == day
        ).count()
        
        study_hours = db.query(func.sum(TaskCompletion.time_spent_hours)).filter(
            TaskCompletion.user_id == current_user.id,
            func.date(TaskCompletion.completed_at) == day
        ).scalar() or 0
        
        points_earned = db.query(func.sum(TaskCompletion.points_earned)).filter(
            TaskCompletion.user_id == current_user.id,
            func.date(TaskCompletion.completed_at) == day
        ).scalar() or 0
        
        weekly_stats.append({
            "date": day.isoformat(),
            "day_name": day.strftime("%A"),
            "tasks_completed": tasks_completed,
            "study_hours": round(study_hours, 2),
            "points_earned": points_earned
        })
    
    return {
        "weekly_stats": weekly_stats,
        "total_week_hours": round(sum(stat["study_hours"] for stat in weekly_stats), 2),
        "total_week_tasks": sum(stat["tasks_completed"] for stat in weekly_stats),
        "total_week_points": sum(stat["points_earned"] for stat in weekly_stats)
    }

# ==================== STUDY PLANNER ROUTES ====================

@app.get("/planner/today", response_model=List[TodayPlannerResponse])
def get_today_planner(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get today's study planner"""
    today = date.today()
    
    planner_items = db.query(StudyPlanner, Task).join(
        Task, StudyPlanner.task_id == Task.id
    ).filter(
        StudyPlanner.user_id == current_user.id,
        StudyPlanner.study_date == today
    ).all()
    
    return [
        TodayPlannerResponse(
            task_id=planner.task_id,
            task_title=planner.task.title,
            priority=planner.task.priority,
            time_slot=planner.time_slot,
            study_date=planner.study_date,
            duration_hours=planner.duration_hours,
            status=planner.task.status
        )
        for planner, task in planner_items
    ]

@app.post("/planner", response_model=StudyPlannerResponse, status_code=status.HTTP_201_CREATED)
def create_planner_entry(
    planner_data: StudyPlannerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new study planner entry"""
    task = db.query(Task).filter(
        Task.id == planner_data.task_id,
        Task.user_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    existing_entry = db.query(StudyPlanner).filter(
        StudyPlanner.user_id == current_user.id,
        StudyPlanner.task_id == planner_data.task_id,
        StudyPlanner.study_date == planner_data.study_date,
        StudyPlanner.time_slot == planner_data.time_slot
    ).first()
    
    if existing_entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Planner entry already exists"
        )
    
    new_planner = StudyPlanner(
        user_id=current_user.id,
        task_id=planner_data.task_id,
        study_date=planner_data.study_date,
        time_slot=planner_data.time_slot,
        duration_hours=planner_data.duration_hours or 1.0
    )
    
    db.add(new_planner)
    db.commit()
    db.refresh(new_planner)
    
    return StudyPlannerResponse(
        id=new_planner.id,
        user_id=new_planner.user_id,
        task_id=new_planner.task_id,
        study_date=new_planner.study_date,
        time_slot=new_planner.time_slot,
        duration_hours=new_planner.duration_hours,
        completed=new_planner.completed,
        created_at=new_planner.created_at,
        task_title=task.title,
        priority=task.priority
    )

# ==================== HEALTH CHECK ====================

@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "Welcome to AI-Based Learning Platform API",
        "status": "running",
        "docs_url": "/docs",
        "version": "2.0.0"
    }

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint"""
    try:
        db.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")
# Business Requirement Document

## Learning Platform with Smart Study Planner (LMS)

## 1. Project Title

**Learning Platform with Smart Study Planner (LMS)**

## 2. Project Overview

The Learning Platform with Smart Study Planner is a web-based application designed to help students manage their courses, study tasks, deadlines, and learning progress. The system allows users to add courses, create tasks, plan daily study schedules, track progress, and view analytics through a dashboard.

This project helps students organize their academic work and improve time management by providing a smart and structured study planning system.

## 3. Business Objective

The main objective of this project is to provide a digital platform where students can manage their learning activities in one place.

### Objectives:

* To help students manage courses and study tasks.
* To create daily study plans.
* To track learning progress.
* To remind students about deadlines.
* To provide analytics through dashboard charts.
* To improve student productivity and time management.

## 4. Problem Statement

Many students face difficulty in managing multiple subjects, assignments, deadlines, and exam preparation. They often forget important tasks or fail to plan their study schedule properly.

A manual study plan is difficult to maintain and does not provide progress tracking. Therefore, a smart LMS system is required to manage study activities digitally.

## 5. Proposed Solution

The proposed system is a web-based LMS that allows students to create courses, add tasks, set deadlines, and generate a daily study planner. The system also provides progress tracking and analytics dashboard to help students understand their performance.

## 6. Scope of the Project

### In Scope:

* User registration and login
* Course management
* Task management
* Daily study planner
* Deadline reminders
* Progress tracking
* Analytics dashboard
* REST API integration
* Responsive frontend interface

### Out of Scope:

* Live video classes
* Online payment system
* AI-based tutor chatbot
* Mobile application
* Certificate generation

## 7. Stakeholders

| Stakeholder       | Role                                        |
| ----------------- | ------------------------------------------- |
| Student/User      | Uses the system to manage study plans       |
| Admin             | Manages users and system data               |
| Developer         | Develops and maintains the system           |
| College/Institute | Can use the system for student productivity |

## 8. Functional Requirements

### 8.1 User Management

* User can register.
* User can login.
* User can update profile.
* User can logout.

### 8.2 Course Management

* User can add new courses.
* User can view all courses.
* User can update course details.
* User can delete courses.

### 8.3 Task Management

* User can add study tasks.
* User can set task priority.
* User can set task deadline.
* User can mark task as completed.
* User can edit or delete tasks.

### 8.4 Daily Planner

* User can view today’s study plan.
* System can organize tasks based on deadline and priority.
* User can update task status.

### 8.5 Progress Tracking

* System shows completed and pending tasks.
* System calculates course-wise progress.
* User can view overall learning progress.

### 8.6 Deadline Reminder

* System shows upcoming deadlines.
* User can view overdue tasks.
* User gets reminder notifications on dashboard.

### 8.7 Analytics Dashboard

* Dashboard shows total courses.
* Dashboard shows total tasks.
* Dashboard shows completed tasks.
* Dashboard shows pending tasks.
* Dashboard shows progress using charts.

## 9. Non-Functional Requirements

| Requirement     | Description                                  |
| --------------- | -------------------------------------------- |
| Performance     | System should load pages quickly             |
| Security        | User data should be protected                |
| Usability       | Interface should be simple and user-friendly |
| Reliability     | System should work without frequent errors   |
| Scalability     | System should support more users in future   |
| Maintainability | Code should be easy to update and maintain   |

## 10. Technology Stack

| Layer          | Technology          |
| -------------- | ------------------- |
| Frontend       | React.js            |
| Backend        | FastAPI / Flask     |
| Database       | MySQL / PostgreSQL  |
| API            | RESTful API         |
| Authentication | JWT Authentication  |
| Charts         | Chart.js / Recharts |
| Testing Tool   | Postman             |
| Code Editor    | VS Code             |

## 11. Why These Technologies Are Used

### React.js

React.js is used for building a fast, responsive, and component-based user interface. It is suitable for dashboards, forms, and dynamic web pages.

### FastAPI / Flask

FastAPI or Flask is used to create backend REST APIs. These frameworks are lightweight, fast, and easy to connect with databases.

### RESTful API

RESTful API is used to connect frontend and backend. It allows smooth communication between React.js and backend services.

### Database

MySQL or PostgreSQL is used to store user data, course details, tasks, deadlines, and progress records.

### JWT Authentication

JWT is used to secure user login and protect private user data.

## 12. Business Benefits

* Saves student time.
* Improves study planning.
* Reduces missed deadlines.
* Helps track academic progress.
* Provides a modern digital learning management system.
* Useful for students and educational institutions.

## 13. Assumptions

* User has internet access.
* User has basic knowledge of web application usage.
* User will enter correct course and task details.
* System will be used mainly by students.

## 14. Constraints

* System requires internet connection.
* Reminder feature depends on system notification logic.
* Initial version is web-based only.
* Advanced AI planning is not included in first version.

## 15. Success Criteria

The project will be considered successful if:

* User can register and login successfully.
* User can manage courses and tasks.
* User can view daily study plan.
* User can track progress.
* Dashboard displays correct analytics.
* System works smoothly without major errors.

## 16. Conclusion

The Learning Platform with Smart Study Planner is a useful web application for students to manage their study activities. It provides course management, task planning, deadline reminders, progress tracking, and analytics dashboard. This system helps students become more organized and productive in their academic life.

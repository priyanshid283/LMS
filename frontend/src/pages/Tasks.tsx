import { useState, useEffect } from 'react';
import api from '../api/api';

type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Overdue';

interface Course {
  id: number;
  course_name: string;
}

interface Task {
  id: number;
  course_id: number;
  title: string;
  description: string;
  priority: string;
  deadline: string;
  status: TaskStatus;
  is_completed?: boolean;
}

// Shape of a single Pydantic validation error item
interface PydanticError {
  type: string;
  loc: string[];
  msg: string;
  input: unknown;
  ctx?: unknown;
}

const STATUS_OPTIONS: TaskStatus[] = ['Pending', 'In Progress', 'Completed', 'Overdue'];

const STATUS_META: Record<TaskStatus, { color: string; bg: string; border: string; icon: string; stripe: string }> = {
  Pending:       { color: '#2b6cb0', bg: '#ebf8ff', border: '#bee3f8', icon: '⏳', stripe: '#3182ce' },
  'In Progress': { color: '#744210', bg: '#fffbeb', border: '#f6e05e', icon: '🔄', stripe: '#d69e2e' },
  Completed:     { color: '#276749', bg: '#f0fff4', border: '#9ae6b4', icon: '✅', stripe: '#38a169' },
  Overdue:       { color: '#c53030', bg: '#fff5f5', border: '#fed7d7', icon: '🚨', stripe: '#e53e3e' },
};

const PRIORITY_META: Record<string, { color: string; bg: string; border: string }> = {
  high:   { color: '#c53030', bg: '#fff5f5', border: '#fed7d7' },
  medium: { color: '#b7791f', bg: '#fffbeb', border: '#fef3c7' },
  low:    { color: '#276749', bg: '#f0fff4', border: '#c6f6d5' },
};

const emptyForm = {
  course_id: '',
  title: '',
  description: '',
  priority: '',
  deadline: '',
  status: '' as TaskStatus,
};

// Safely converts any API error detail into a readable string
function parseApiError(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { detail?: unknown } } };
  const detail = e?.response?.data?.detail;

  if (Array.isArray(detail)) {
    // Pydantic validation error: array of {type, loc, msg, input, ctx}
    return (detail as PydanticError[])
      .map((d) => {
        const field = d.loc?.slice(1).join(' → ') ?? 'field';
        return `${field}: ${d.msg}`;
      })
      .join(' | ');
  }

  if (typeof detail === 'string') return detail;

  return fallback;
}

function deriveStatus(task: Omit<Task, 'status'> & { status?: TaskStatus }): TaskStatus {
  if (task.status) return task.status;
  if (task.is_completed) return 'Completed';
  if (task.deadline && new Date(task.deadline) < new Date()) return 'Overdue';
  return 'Pending';
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [filter, setFilter] = useState<'All' | TaskStatus>('All');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [tasksRes, coursesRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/courses'),
      ]);
      const normalized: Task[] = (tasksRes.data as Task[]).map((t) => ({
        ...t,
        status: deriveStatus(t),
      }));
      setTasks(normalized);
      setCourses(coursesRes.data);
    } catch {
      setError('Failed to load tasks. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* POST /tasks */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await api.post('/tasks', {
        course_id: Number(form.course_id),
        title: form.title,
        description: form.description,
        priority: form.priority,
        deadline: form.deadline,
        status: form.status,
      });
      setSuccess('Task added successfully!');
      setForm(emptyForm);
      setShowForm(false);
      fetchData();
    } catch (err: unknown) {
      setFormError(parseApiError(err, 'Failed to add task.'));
    } finally {
      setSubmitting(false);
    }
  };

  /* PUT /tasks/{id}/status */
  const handleStatusChange = async (taskId: number, newStatus: TaskStatus) => {
    setUpdatingStatus(taskId);
    try {
      if (newStatus === 'Completed') {
        await api.put(`/tasks/${taskId}/complete`, {
          time_spent_hours: 1,
          quality_rating: 'Good',
          notes: 'Completed from frontend',
        });
      } else {
        await api.put(`/tasks/${taskId}`, {
          status: newStatus,
        });
      }
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
      setSuccess(`Task marked as "${newStatus}".`);
      setTimeout(() => setSuccess(''), 2500);
    } catch (err: unknown) {
      alert(parseApiError(err, 'Failed to update task status.'));
    } finally {
      setUpdatingStatus(null);
    }
  };

  /* DELETE /tasks/{id} */
  const handleDelete = async (taskId: number) => {
    if (!confirm('Delete this task permanently?')) return;
    setDeleting(taskId);
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err: unknown) {
      alert(parseApiError(err, 'Failed to delete task.'));
    } finally {
      setDeleting(null);
    }
  };

  const courseNameById = (id: number) =>
    courses.find((c) => c.id === id)?.course_name || '—';

  const counts = {
    All: tasks.length,
    Pending: tasks.filter((t) => t.status === 'Pending').length,
    'In Progress': tasks.filter((t) => t.status === 'In Progress').length,
    Completed: tasks.filter((t) => t.status === 'Completed').length,
    Overdue: tasks.filter((t) => t.status === 'Overdue').length,
  };

  const filtered = filter === 'All' ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Tasks</h1>
        <p className="page-subtitle">Track your assignments and to-dos</p>
      </div>

      {success && <div className="success-msg">{success}</div>}

      {/* Status filter chips */}
      <div className="task-summary-row">
        {(['All', ...STATUS_OPTIONS] as const).map((s) => {
          const meta = s === 'All' ? null : STATUS_META[s];
          return (
            <button
              key={s}
              className={`task-filter-chip ${filter === s ? 'active' : ''}`}
              style={filter === s && meta
                ? { background: meta.stripe, borderColor: meta.stripe, color: '#fff' }
                : {}}
              onClick={() => setFilter(s)}
            >
              {meta && <span>{meta.icon}</span>}
              {s}
              <span className="chip-count">{counts[s]}</span>
            </button>
          );
        })}
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn-secondary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add Task'}
          </button>
        </div>
      </div>

      {/* Add task form */}
      {showForm && (
        <div className="form-panel">
          <h2>Add New Task</h2>
          {formError && (
  <div className="error-msg">
    {String(formError)}
  </div>
)}
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Course</label>
                <select name="course_id" value={form.course_id} onChange={handleChange} required>
                  <option value="">Select a course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.course_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Title</label>
                <input
                  name="title"
                  placeholder="Task title"
                  value={form.title}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                placeholder="Task details..."
                value={form.description}
                onChange={handleChange}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Priority</label>
                <select
                      name="priority"
                       value={form.priority}
                        onChange={handleChange}
                       >
  <option value="Low">Low</option>
  <option value="Medium">Medium</option>
  <option value="High">High</option>
</select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select name="status" value={form.status} onChange={handleChange}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{STATUS_META[s].icon} {s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Deadline</label>
              <input
                type="date"
                name="deadline"
                value={form.deadline}
                onChange={handleChange}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ background: '#718096' }}
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-secondary" disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Task'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Task list */}
      <div className="card">
        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
            <span className="loading-text">Loading tasks...</span>
          </div>
        ) : error ? (
          <div className="error-msg">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>{filter === 'All' ? 'No tasks yet. Add your first task!' : `No "${filter}" tasks.`}</p>
          </div>
        ) : (
          filtered.map((task) => {
            const sm = STATUS_META[task.status];
            const pm = PRIORITY_META[task.priority] || PRIORITY_META.medium;
            return (
              <div
                key={task.id}
                className={`task-item ${task.status === 'Completed' ? 'completed' : ''}`}
              >
                {/* Priority stripe */}
                <div className="task-stripe" style={{ background: sm.stripe }} />

                <div className="task-info">
                  <h3 style={{ textDecoration: task.status === 'Completed' ? 'line-through' : 'none' }}>
                    {task.title}
                  </h3>
                  {task.description && <p>{task.description}</p>}
                  <div className="task-meta">
                    <span className="badge badge-course">{courseNameById(task.course_id)}</span>
                    <span
                      className="badge"
                      style={{ background: pm.bg, color: pm.color, border: `1px solid ${pm.border}` }}
                    >
                      {task.priority}
                    </span>
                    <span
                      className="badge"
                      style={{ background: sm.bg, color: sm.color, border: `1px solid ${sm.border}` }}
                    >
                      {sm.icon} {task.status}
                    </span>
                    <span className="task-deadline">📅 {task.deadline}</span>
                  </div>
                </div>

                <div className="task-actions">
                  {task.status !== 'Completed' && (
                    <div className="status-dropdown-wrap">
                      <select
                        className="status-select"
                        value={task.status}
                        disabled={updatingStatus === task.id}
                        onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{STATUS_META[s].icon} {s}</option>
                        ))}
                      </select>
                      {updatingStatus === task.id && (
                        <span
                          className="btn-spinner"
                          style={{ position: 'absolute', right: 28, top: '50%', transform: 'translateY(-50%)' }}
                        />
                      )}
                    </div>
                  )}

                  {task.status !== 'Completed' && (
                    <button
                      className="btn-done"
                      onClick={() => handleStatusChange(task.id, 'Completed')}
                      disabled={updatingStatus === task.id}
                      title="Mark as completed"
                    >
                      {updatingStatus === task.id
                        ? <span className="btn-spinner" />
                        : <><span className="done-icon">✓</span> Done</>
                      }
                    </button>
                  )}

                  <button
                    className="btn-danger"
                    onClick={() => handleDelete(task.id)}
                    disabled={deleting === task.id}
                    title="Delete task"
                  >
                    {deleting === task.id ? '...' : '🗑'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import api from '../api/api';

interface Task {
  id: number;
  title: string;
}

interface PlanItem {
  id: number;
  task_id: number;
  study_date: string;
  time_slot: string;
  task_title?: string;
}

const emptyForm = { task_id: '', study_date: '', time_slot: '' };

export default function Planner() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [plansRes, tasksRes] = await Promise.all([api.get('/planner/today'), api.get('/tasks')]);
      setPlans(plansRes.data);
      setTasks(tasksRes.data);
    } catch {
      setError('Failed to load study plans. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await api.post('/planner', { ...form, task_id: Number(form.task_id) });
      setSuccess('Study session added successfully!');
      setForm(emptyForm);
      setShowForm(false);
      fetchData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setFormError(error.response?.data?.detail || 'Failed to add plan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (planId: number) => {
    if (!confirm('Delete this study session?')) return;
    setDeleting(planId);
    try {
      await api.delete(`/planner/${planId}`);
      setPlans((prev) => prev.filter((p) => p.id !== planId));
    } catch {
      alert('Failed to delete session.');
    } finally {
      setDeleting(null);
    }
  };

  const taskTitleById = (id: number) => tasks.find((t) => t.id === id)?.title || '—';

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Study Planner</h1>
        <p className="page-subtitle">Today's study schedule — {today}</p>
      </div>

      {success && <div className="success-msg">{success}</div>}

      <div className="card">
        <div className="card-header">
          <h2>Today's Plan ({plans.length} sessions)</h2>
          <button className="btn-secondary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add Session'}
          </button>
        </div>

        {showForm && (
          <div className="form-panel" style={{ marginBottom: '1rem' }}>
            <h2>Add Study Session</h2>
            {formError && <div className="error-msg">{formError}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Task</label>
                <select name="task_id" value={form.task_id} onChange={handleChange} required>
                  <option value="">Select a task</option>
                  {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Study Date</label>
                  <input type="date" name="study_date" value={form.study_date} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Time Slot</label>
                  <input type="text" name="time_slot" placeholder="e.g. 09:00 - 11:00" value={form.time_slot} onChange={handleChange} required />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" style={{ background: '#718096' }} onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-secondary" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Session'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="loading-container"><div className="spinner" /><span className="loading-text">Loading today's plan...</span></div>
        ) : error ? (
          <div className="error-msg">{error}</div>
        ) : plans.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📅</div><p>No study sessions scheduled for today. Add one!</p></div>
        ) : (
          plans.map((plan) => (
            <div key={plan.id} className="plan-item">
              <div className="plan-time">{plan.time_slot}</div>
              <div className="plan-info" style={{ flex: 1 }}>
                <h3>{plan.task_title || taskTitleById(plan.task_id)}</h3>
                <p>Study Date: {plan.study_date}</p>
              </div>
              <button
                className="btn-danger"
                onClick={() => handleDelete(plan.id)}
                disabled={deleting === plan.id}
                style={{ flexShrink: 0 }}
              >
                {deleting === plan.id ? '...' : 'Delete'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

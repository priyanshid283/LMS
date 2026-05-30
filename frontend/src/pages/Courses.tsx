import { useState, useEffect } from 'react';
import api from '../api/api';

interface Course {
  id: number;
  course_name: string;
  description: string;
  start_date: string;
  end_date: string;
}

const emptyForm = { course_name: '', description: '', start_date: '', end_date: '' };

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchCourses = () => {
    setLoading(true);
    setError('');
    api.get('/courses')
      .then((res) => setCourses(res.data))
      .catch(() => setError('Failed to load courses. Make sure the backend is running.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCourses(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await api.post('/courses', form);
      setSuccess('Course added successfully!');
      setForm(emptyForm);
      setShowForm(false);
      fetchCourses();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setFormError(error.response?.data?.detail || 'Failed to add course.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this course?')) return;
    try {
      await api.delete(`/courses/${id}`);
      setCourses((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert('Failed to delete course.');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Courses</h1>
        <p className="page-subtitle">Manage your enrolled courses</p>
      </div>

      {success && <div className="success-msg">{success}</div>}

      <div className="card">
        <div className="card-header">
          <h2>All Courses ({courses.length})</h2>
          <button className="btn-secondary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add Course'}
          </button>
        </div>

        {showForm && (
          <div className="form-panel" style={{ marginBottom: '1rem' }}>
            <h2>Add New Course</h2>
          {formError && (
  <div className="error-msg">
    {String(formError)}
  </div>
)}
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Course Name</label>
                  <input
                    name="course_name"
                    placeholder="e.g. Introduction to Python"
                    value={form.course_name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input
                    name="description"
                    placeholder="Brief description"
                    value={form.description}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" name="start_date" value={form.start_date} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input type="date" name="end_date" value={form.end_date} onChange={handleChange} required />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" style={{ background: '#718096' }} onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-secondary" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Course'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="loading-container"><div className="spinner" /><span className="loading-text">Loading courses...</span></div>
        ) : error ? (
          <div className="error-msg">{error}</div>
        ) : courses.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📚</div><p>No courses yet. Add your first course!</p></div>
        ) : (
          courses.map((course) => (
            <div key={course.id} className="course-item">
              <div className="course-info">
                <h3>{course.course_name}</h3>
                {course.description && <p>{course.description}</p>}
                <p className="course-dates">{course.start_date} → {course.end_date}</p>
              </div>
              <button className="btn-danger" onClick={() => handleDelete(course.id)}>Delete</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

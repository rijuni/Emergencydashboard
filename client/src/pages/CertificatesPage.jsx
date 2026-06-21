import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineDownload, HiOutlineTrash, HiOutlineX, HiOutlineDocumentText } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';

export default function CertificatesPage() {
  const { user } = useAuth();
  const canDelete = user?.role === 'super_admin';
  const [certificates, setCertificates] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ staff_id: '', certificate_type: '', certificate_number: '', issuing_authority: '', issue_date: '', expiry_date: '' });
  const [file, setFile] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [certRes, staffRes] = await Promise.all([
        api.get('/certificates'),
        api.get('/staff?is_active=true')
      ]);
      setCertificates(certRes.data.certificates);
      setStaff(staffRes.data.staff);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.staff_id || !form.certificate_type) { toast.error('Staff and certificate type are required'); return; }
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => { if (val) formData.append(key, val); });
      if (file) formData.append('file', file);
      await api.post('/certificates', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Certificate uploaded');
      setShowModal(false);
      setForm({ staff_id: '', certificate_type: '', certificate_number: '', issuing_authority: '', issue_date: '', expiry_date: '' });
      setFile(null);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Upload failed'); }
  };

  const handleDownload = async (id) => {
    try {
      const res = await api.get(`/certificates/${id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'certificate';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) { toast.error('Download failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this certificate?')) return;
    try {
      await api.delete(`/certificates/${id}`);
      toast.success('Certificate deleted');
      fetchData();
    } catch (err) { toast.error('Delete failed'); }
  };

  const getExpiryStatus = (date) => {
    if (!date) return 'unknown';
    const d = new Date(date);
    const now = new Date();
    const diff = (d - now) / (1000 * 60 * 60 * 24);
    if (diff < 0) return 'expired';
    if (diff < 30) return 'expiring';
    return 'valid';
  };

  const statusConfig = {
    valid:    { label: 'Valid',         className: 'status-active',  dot: '#22C55E' },
    expiring: { label: 'Expiring Soon', className: 'status-warning', dot: '#F97316' },
    expired:  { label: 'Expired',       className: 'status-expired', dot: '#EF4444' },
    unknown:  { label: 'No Expiry',     className: '',               dot: '#64748B' },
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">Certificates</h1>
          <p className="text-text-muted text-sm mt-1">Manage staff licenses and certificates</p>
        </div>
        <button onClick={() => setShowModal(true)} id="upload-cert-btn" className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold">
          <HiOutlinePlus className="w-4 h-4" /> Upload Certificate
        </button>
      </div>

      {/* Certificates Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 border-3 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'rgba(20,184,166,0.2)', borderTopColor: '#14B8A6' }}></div>
            <p className="text-text-muted text-sm">Loading certificates...</p>
          </div>
        </div>
      ) : certificates.length === 0 ? (
        <div className="glass-card rounded-xl p-16 text-center animate-fade-in-up">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(20,184,166,0.08)' }}>
            <HiOutlineDocumentText className="w-8 h-8 text-text-muted" />
          </div>
          <p className="text-text-muted text-sm">No certificates uploaded yet</p>
          <p className="text-text-muted/50 text-xs mt-1">Click "Upload Certificate" to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {certificates.map((cert, i) => {
            const status = getExpiryStatus(cert.expiry_date);
            const config = statusConfig[status];
            return (
              <div key={cert.id}
                   className="glass-card rounded-xl p-5 group animate-stagger-in"
                   style={{ animationDelay: `${i * 60}ms` }}>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: config.dot }}></div>
                      <h3 className="text-text-primary text-sm font-semibold truncate">{cert.certificate_type}</h3>
                    </div>
                    <p className="text-text-muted text-xs">{cert.staff_name} • {cert.category_name}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full shrink-0 ml-2 font-medium ${config.className}`}
                        style={status === 'unknown' ? { background: 'rgba(100,116,139,0.1)', color: '#94A3B8' } : {}}>
                    {config.label}
                  </span>
                </div>

                {/* Details */}
                {cert.certificate_number && (
                  <p className="text-text-secondary text-xs font-mono mb-1" style={{ color: '#94A3B8' }}>#{cert.certificate_number}</p>
                )}
                {cert.issuing_authority && (
                  <p className="text-text-muted text-xs mb-2">{cert.issuing_authority}</p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                  <div className="text-xs text-text-muted">
                    {cert.expiry_date ? `Expires: ${new Date(cert.expiry_date).toLocaleDateString()}` : 'No expiry date'}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                    {cert.file_path && (
                      <button onClick={() => handleDownload(cert.id)} className="p-2 rounded-lg text-text-muted hover:text-primary-light hover:bg-primary/10 transition-all duration-200" title="Download">
                        <HiOutlineDownload className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(cert.id)} className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-all duration-200" title="Delete">
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4" onClick={() => setShowModal(false)}>
          <div className="glass-strong rounded-2xl w-full max-w-lg p-6 animate-scale-in" onClick={e => e.stopPropagation()}
               style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-display font-semibold text-text-primary">Upload Certificate</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-card transition-all duration-200">
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1.5 font-medium">Staff Member *</label>
                <select value={form.staff_id} onChange={e => setForm({...form, staff_id: e.target.value})} className="w-full bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm" required>
                  <option value="">Select staff</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.category_name})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5 font-medium">Type *</label>
                  <input type="text" value={form.certificate_type} onChange={e => setForm({...form, certificate_type: e.target.value})} placeholder="e.g. Medical License" className="w-full bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm placeholder-text-muted/50" required />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5 font-medium">Number</label>
                  <input type="text" value={form.certificate_number} onChange={e => setForm({...form, certificate_number: e.target.value})} className="w-full bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1.5 font-medium">Issuing Authority</label>
                <input type="text" value={form.issuing_authority} onChange={e => setForm({...form, issuing_authority: e.target.value})} placeholder="e.g. Medical Council of India" className="w-full bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm placeholder-text-muted/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5 font-medium">Issue Date</label>
                  <input type="date" value={form.issue_date} onChange={e => setForm({...form, issue_date: e.target.value})} className="w-full bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5 font-medium">Expiry Date</label>
                  <input type="date" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})} className="w-full bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1.5 font-medium">File (PDF, JPG, PNG — max 5MB)</label>
                <div className="relative">
                  <input type="file" onChange={e => setFile(e.target.files[0])} accept=".pdf,.jpg,.jpeg,.png"
                         className="w-full bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:cursor-pointer"
                         style={{ '--tw-file-bg': 'rgba(20,184,166,0.15)', '--tw-file-text': '#14B8A6' }} />
                </div>
              </div>
              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary py-2.5 rounded-xl text-sm font-medium">Cancel</button>
                <button type="submit" className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-semibold">Upload</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineDownload, HiOutlineDocumentText, HiOutlineTrash } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';

export default function FileArchivesPage() {
  const { user } = useAuth();
  const canDelete = user?.role === 'super_admin';
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/files');
      setFiles(res.data.files || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load file archives');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file) => {
    try {
      const res = await api.get(`/files/download/${file.id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Download failed');
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm(`Are you sure you want to delete the file "${file.original_name}" from history?`)) return;
    try {
      await api.delete(`/files/${file.id}`);
      toast.success('File deleted successfully');
      fetchFiles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">File Archives</h1>
          <p className="text-text-muted text-sm mt-1">History of all uploaded Excel sheets and documents</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-3 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'rgba(20,184,166,0.2)', borderTopColor: '#14B8A6' }}></div>
              <p className="text-text-muted text-sm">Loading archives...</p>
            </div>
          </div>
        ) : files.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(20,184,166,0.08)' }}>
              <HiOutlineDocumentText className="w-8 h-8 text-text-muted" />
            </div>
            <p className="text-text-muted text-sm">No files uploaded yet</p>
            <p className="text-text-muted/50 text-xs mt-1">Upload a schedule or import file to see it here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/50 bg-bg-surface/50">
                  <th className="py-4 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider">Date & Time</th>
                  <th className="py-4 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider">File Name</th>
                  <th className="py-4 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider">Type</th>
                  <th className="py-4 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider">Uploaded By</th>
                  <th className="py-4 px-6 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-bg-surface/30 transition-colors">
                    <td className="py-4 px-6 text-sm text-text-muted whitespace-nowrap">
                      {formatDate(file.uploaded_at)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E' }}>
                          <HiOutlineDocumentText className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-text-primary break-all">{file.original_name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full" style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}>
                        {file.upload_type}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-text-muted">
                      {file.uploaded_by_name || 'System'}
                    </td>
                    <td className="py-4 px-6 text-right space-x-1">
                      <button
                        onClick={() => handleDownload(file)}
                        className="p-2 rounded-lg text-text-muted hover:text-primary-light hover:bg-primary/10 transition-all duration-200 inline-flex"
                        title="Download"
                      >
                        <HiOutlineDownload className="w-5 h-5" />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(file)}
                          className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-all duration-200 inline-flex"
                          title="Delete Archive File"
                        >
                          <HiOutlineTrash className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

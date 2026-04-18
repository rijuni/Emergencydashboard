import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch, HiOutlineX } from 'react-icons/hi';

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [form, setForm] = useState({ full_name: '', category_id: '', designation: '', registration_number: '', phone: '', email: '' });

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { fetchStaff(); }, [search, filterCategory]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/staff/categories');
      setCategories(res.data.categories);
    } catch (err) { console.error(err); }
  };

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterCategory) params.append('category_id', filterCategory);
      const res = await api.get(`/staff?${params}`);
      setStaff(res.data.staff);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const openModal = (staffMember = null) => {
    if (staffMember) {
      setEditingStaff(staffMember);
      setForm({
        full_name: staffMember.full_name,
        category_id: staffMember.category_id,
        designation: staffMember.designation || '',
        registration_number: staffMember.registration_number || '',
        phone: staffMember.phone || '',
        email: staffMember.email || ''
      });
    } else {
      setEditingStaff(null);
      setForm({ full_name: '', category_id: categories[0]?.id || '', designation: '', registration_number: '', phone: '', email: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.category_id) { toast.error('Name and category are required'); return; }
    try {
      if (editingStaff) {
        await api.put(`/staff/${editingStaff.id}`, form);
        toast.success('Staff updated');
      } else {
        await api.post('/staff', form);
        toast.success('Staff added');
      }
      setShowModal(false);
      fetchStaff();
    } catch (err) { toast.error(err.response?.data?.message || 'Error saving staff'); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Deactivate ${name}?`)) return;
    try {
      await api.delete(`/staff/${id}`);
      toast.success('Staff deactivated');
      fetchStaff();
    } catch (err) { toast.error('Error deactivating staff'); }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">Staff Management</h1>
          <p className="text-text-muted text-sm mt-1">Manage doctors, nurses, and other staff</p>
        </div>
        <button onClick={() => openModal()} id="add-staff-btn" className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold">
          <HiOutlinePlus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div className="relative flex-1 min-w-[200px] max-w-md group">
          <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary-light transition-colors" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff..." className="w-full bg-bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-text-primary text-sm placeholder-text-muted/50" />
        </div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-bg-surface border border-border rounded-xl px-3 py-2.5 text-text-primary text-sm min-w-[160px]">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Staff Table */}
      <div className="glass rounded-xl overflow-hidden animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <div className="overflow-x-auto">
          <table className="w-full table-premium">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-text-muted text-xs font-semibold uppercase tracking-wider">Name</th>
                <th className="text-left p-4 text-text-muted text-xs font-semibold uppercase tracking-wider">Category</th>
                <th className="text-left p-4 text-text-muted text-xs font-semibold uppercase tracking-wider hidden md:table-cell">Designation</th>
                <th className="text-left p-4 text-text-muted text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">Reg. Number</th>
                <th className="text-left p-4 text-text-muted text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">Phone</th>
                <th className="text-left p-4 text-text-muted text-xs font-semibold uppercase tracking-wider">Status</th>
                <th className="text-right p-4 text-text-muted text-xs font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-16">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(20,184,166,0.2)', borderTopColor: '#14B8A6' }}></div>
                    <span className="text-text-muted text-sm">Loading staff...</span>
                  </div>
                </td></tr>
              ) : staff.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-text-muted text-sm">No staff found. Add your first staff member.</td></tr>
              ) : (
                staff.map((s, i) => (
                  <tr key={s.id} className="border-b border-border/30 hover:bg-bg-card/40 transition-all duration-200 animate-stagger-in" style={{ animationDelay: `${i * 40}ms` }}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-semibold shrink-0"
                             style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.15), rgba(20,184,166,0.05))', color: '#14B8A6' }}>
                          {s.full_name.charAt(0)}
                        </div>
                        <span className="text-text-primary text-sm font-medium">{s.full_name}</span>
                      </div>
                    </td>
                    <td className="p-4"><span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(59,130,246,0.1)', color: '#93C5FD' }}>{s.category_name}</span></td>
                    <td className="p-4 text-text-secondary text-sm hidden md:table-cell">{s.designation || '—'}</td>
                    <td className="p-4 text-text-muted text-sm font-mono hidden lg:table-cell">{s.registration_number || '—'}</td>
                    <td className="p-4 text-text-secondary text-sm hidden lg:table-cell">{s.phone || '—'}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full ${s.is_active ? 'status-active' : 'status-inactive'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openModal(s)} className="p-2 rounded-lg text-text-muted hover:text-primary-light hover:bg-primary/10 transition-all duration-200" title="Edit">
                          <HiOutlinePencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(s.id, s.full_name)} className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-all duration-200" title="Deactivate">
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4" onClick={() => setShowModal(false)}>
          <div className="glass-strong rounded-2xl w-full max-w-lg p-6 animate-scale-in" onClick={e => e.stopPropagation()}
               style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-display font-semibold text-text-primary">{editingStaff ? 'Edit Staff' : 'Add New Staff'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-card transition-all duration-200">
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-text-secondary mb-1.5 font-medium">Full Name *</label>
                  <input type="text" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="w-full bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm" required />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5 font-medium">Category *</label>
                  <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} className="w-full bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm" required>
                    <option value="">Select</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5 font-medium">Designation</label>
                  <input type="text" value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} placeholder="e.g. Senior Resident" className="w-full bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm placeholder-text-muted/50" />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5 font-medium">Registration No.</label>
                  <input type="text" value={form.registration_number} onChange={e => setForm({...form, registration_number: e.target.value})} className="w-full bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5 font-medium">Phone</label>
                  <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-text-secondary mb-1.5 font-medium">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-bg-dark border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary py-2.5 rounded-xl text-sm font-medium">Cancel</button>
                <button type="submit" className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-semibold">
                  {editingStaff ? 'Update' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

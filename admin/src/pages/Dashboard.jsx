import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Users, MessageSquare, Activity, LogOut, Power, Ban, CheckCircle, Trash2, Edit2, X, Save } from 'lucide-react';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, connectedSessions: 0, totalMessages: 0 });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null);

    const fetchData = async () => {
        try {
            const [statsRes, usersRes] = await Promise.all([
                api.get('/admin/stats'),
                api.get('/admin/users')
            ]);
            setStats(statsRes.data.data);
            setUsers(usersRes.data.data);
        } catch (error) {
            console.error('Failed to fetch data', error);
            if (error.response?.status === 401) logout();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const toggleSuspension = async (userId, currentStatus) => {
        try {
            await api.patch(`/admin/users/${userId}/suspend`, { isActive: !currentStatus });
            setUsers(users.map(u => u._id === userId ? { ...u, isActive: !currentStatus } : u));
        } catch (error) {
            alert('Failed to update status');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
        try {
            await api.delete(`/admin/users/${userId}`);
            setUsers(users.filter(u => u._id !== userId));
            // Update stats vaguely or refetch
            fetchData();
        } catch (error) {
            console.error('Delete failed', error);
            alert('Failed to delete user');
        }
    };

    const handleEditClick = (user) => {
        setEditingUser({ ...user });
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        try {
            const { _id, name, email, credits } = editingUser;
            const res = await api.put(`/admin/users/${_id}`, { name, email, credits: Number(credits) });

            // Update local state
            setUsers(users.map(u => u._id === _id ? res.data.data : u));
            setEditingUser(null);
            alert('User updated successfully');
        } catch (error) {
            console.error('Update failed', error);
            alert('Failed to update user');
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Activity className="text-blue-600" />
                    <h1 className="text-xl font-bold text-gray-800">RainCRM Admin</h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">Welcome, Admin</span>
                    <button onClick={logout} className="p-2 hover:bg-gray-100 rounded-full text-red-500" title="Logout">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <main className="flex-1 p-6 max-w-7xl w-full mx-auto relative">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <StatCard icon={<Users />} title="Total Clients" value={stats.totalUsers} color="blue" />
                    <StatCard icon={<CheckCircle />} title="Active Clients" value={stats.activeUsers} color="green" />
                    <StatCard icon={<Activity />} title="Active WhatsApp" value={stats.connectedSessions} color="purple" />
                    <StatCard icon={<MessageSquare />} title="Messages Processed" value={stats.totalMessages} color="orange" />
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b">
                        <h2 className="text-lg font-semibold text-gray-800">Client Management</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WhatsApp</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map(user => (
                                    <tr key={user._id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">{user.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                                            {user.credits || 0}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.whatsappConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {user.whatsappConnected ? 'Connected' : 'Disconnected'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {user.isActive ? 'Active' : 'Suspended'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                                            <button
                                                onClick={() => handleEditClick(user)}
                                                className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => toggleSuspension(user._id, user.isActive)}
                                                className={`p-1 rounded ${user.isActive ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                                                title={user.isActive ? "Suspend" : "Activate"}
                                            >
                                                {user.isActive ? <Ban size={16} /> : <Power size={16} />}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user._id)}
                                                className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Edit Modal */}
                {editingUser && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-full m-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-gray-900">Edit User</h3>
                                <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSaveUser}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input
                                        type="text"
                                        value={editingUser.name}
                                        onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                        className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={editingUser.email}
                                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                        className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Credits</label>
                                    <input
                                        type="number"
                                        value={editingUser.credits}
                                        onChange={(e) => setEditingUser({ ...editingUser, credits: e.target.value })}
                                        className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Credits are used for AI responses.</p>
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setEditingUser(null)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 flex items-center gap-2"
                                    >
                                        <Save size={16} /> Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

const StatCard = ({ icon, title, value, color }) => {
    const colorClasses = {
        blue: 'text-blue-600 bg-blue-100',
        green: 'text-green-600 bg-green-100',
        purple: 'text-purple-600 bg-purple-100',
        orange: 'text-orange-600 bg-orange-100',
    };

    return (
        <div className="bg-white rounded-lg shadow p-6 flex items-center gap-4">
            <div className={`p-3 rounded-full ${colorClasses[color] || 'bg-gray-100'}`}>
                {React.cloneElement(icon, { size: 24 })}
            </div>
            <div>
                <p className="text-gray-500 text-sm">{title}</p>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    );
};

export default Dashboard;


import { useEffect, useState } from 'react';
import { User, fetchUsers, updateUser } from '../lib/loaders';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/buttons';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import EditUserModal from '../components/EditUserModal';
import ConfirmModal from '../components/ConfirmModal';

export default function Dashboard() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const { user } = useAuth();
    const navigate = useNavigate();
    const [confirmBanModalOpen, setConfirmBanModalOpen] = useState(false);
    const [userToBan, setUserToBan] = useState<User | null>(null);

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const data = await fetchUsers();
                setUsers(data);
            } catch (err) {
                setError('Erreur lors du chargement des utilisateurs');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadUsers();
    }, []);

    if (!user?.roles?.includes('ROLE_ADMIN')) {
        navigate('/');
        return null;
    }

    const handleEdit = (user: User) => {
        setEditingUser(user);
    };

    const handleSave = async (updatedUser: User) => {
        try {
            const savedUser = await updateUser(updatedUser.id, updatedUser);
            setUsers(users.map(user =>
                user.id === savedUser.id ? savedUser : user
            ));
            localStorage.setItem('user', JSON.stringify(savedUser));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        }
    };

    const handleBan = async (user: User) => {
        setUserToBan(user);
        setConfirmBanModalOpen(true);
    };

    const confirmBan = async () => {
        if (!userToBan) return;

        try {
            const updatedUsers = users.map(u =>
                u.id === userToBan.id
                    ? { ...u, isbanned: !u.isbanned }
                    : u
            );
            setUsers(updatedUsers);

            const response = await fetch(`http://localhost:8080/users/${userToBan.id}/ban`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
            });

            if (!response.ok) {
                // Revert local state if API call fails
                setUsers(users);
                setError('Erreur lors du changement de statut de ban');
            }
        } catch (error) {
            setUsers(users);
            setError('Erreur de réseau');
        } finally {
            setUserToBan(null);
        }
    };

    return (
        <div className="flex min-h-screen bg-white">
            <Sidebar />
            <div className="flex-1 lg:ml-64">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* En-tête mobile */}
                    <div className="sticky top-0 bg-white z-10 border-b border-gray-200 lg:hidden">
                        <div className="p-4 flex items-center justify-center">
                            <h1 className="text-xl font-bold">Dashboard - Admin</h1>
                        </div>
                    </div>

                    {/* En-tête desktop */}
                    <div className="hidden lg:block border-b border-gray-200 sticky top-0 bg-white z-10">
                        <div className="p-4">
                            <h1 className="text-xl font-bold">Dashboard - Admin</h1>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F05E1D]"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-500 p-4">{error}</div>
                    ) : (
                        <div className="mt-8">
                            {/* Version mobile et tablette */}
                            <div className="lg:hidden flex flex-col items-center space-y-6">
                                {users.map((user) => (
                                    <div key={user.id} className={`bg-white rounded-lg shadow p-6 border ${user.isbanned ? 'border-red-500' : 'border-[#F05E1D]'} w-full max-w-md`}>
                                        <div className="flex items-center space-x-4">
                                            <img
                                                src={user.avatar || '/default_pp.webp'}
                                                alt={user.name || 'Avatar par défaut'}
                                                className="h-16 w-16 rounded-full object-cover"
                                            />
                                            <div className="flex-1">
                                                <h2 className="text-lg font-semibold">{user.name}</h2>
                                                <p className="text-gray-500">@{user.mention}</p>
                                                <p className="text-sm text-gray-500">{user.email}</p>
                                                {user.isbanned && (
                                                    <span className="text-red-500 text-sm font-bold">Banni</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-4 flex justify-start space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleEdit(user)}
                                            >
                                                Modifier
                                            </Button>
                                            {!(user.roles ?? []).includes('ROLE_ADMIN') && (
                                                <button
                                                    onClick={() => handleBan(user)}
                                                    className="text-red-500 hover:text-red-700 cursor-pointer"
                                                    title={user.isbanned ? 'Dé-bannir' : 'Bannir'}
                                                >
                                                    {user.isbanned ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <circle cx="12" cy="12" r="10" fill="red" fillOpacity="0.2" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" stroke="red" />
                                                        </svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <circle cx="12" cy="12" r="10" fill="green" fillOpacity="0.2" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" stroke="green" />
                                                        </svg>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Version desktop */}
                            <div className="hidden lg:block bg-white rounded-lg shadow-lg overflow-hidden border border-[#F05E1D]">
                                <table className="min-w-full">
                                    <thead className="bg-gray-100 border-b border-[#F05E1D]">
                                        <tr>
                                            <th className="px-8 py-4 text-left text-sm font-semibold text-gray-700">ID</th>
                                            <th className="px-8 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                                            <th className="px-8 py-4 text-left text-sm font-semibold text-gray-700">Nom</th>
                                            <th className="px-8 py-4 text-left text-sm font-semibold text-gray-700">Mention</th>
                                            <th className="px-8 py-4 text-left text-sm font-semibold text-gray-700">Avatar</th>
                                            <th className="px-8 py-4 text-left text-sm font-semibold text-gray-700">Statut</th>
                                            <th className="px-8 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {users.map((user) => (
                                            <tr key={user.id} className={`hover:bg-gray-50 ${user.isbanned ? 'bg-red-50' : ''}`}>
                                                <td className="px-8 py-4 text-sm text-gray-900">{user.id}</td>
                                                <td className="px-8 py-4 text-sm text-gray-900">{user.email}</td>
                                                <td className="px-8 py-4 text-sm text-gray-900">{user.name}</td>
                                                <td className="px-8 py-4 text-sm text-gray-900">@{user.mention}</td>
                                                <td className="px-8 py-4">
                                                    <img
                                                        src={user.avatar || '/default_pp.webp'}
                                                        alt={user.name || 'Avatar par défaut'}
                                                        className="h-10 w-10 rounded-full object-cover"
                                                    />
                                                </td>
                                                <td className="px-8 py-4">
                                                    {user.isbanned ? (
                                                        <span className="text-red-500 font-bold">Banni</span>
                                                    ) : (
                                                        <span className="text-green-500">Actif</span>
                                                    )}
                                                </td>
                                                <td className="px-8 py-4 flex space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEdit(user)}
                                                    >
                                                        Modifier
                                                    </Button>
                                                    {!(user.roles ?? []).includes('ROLE_ADMIN') && (
                                                        <button
                                                            onClick={() => handleBan(user)}
                                                            className="text-red-500 hover:text-red-700"
                                                            title={user.isbanned ? 'Dé-bannir' : 'Bannir'}
                                                        >
                                                            {user.isbanned ? (
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <circle cx="12" cy="12" r="10" fill="red" fillOpacity="0.2" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" stroke="red" />
                                                                </svg>
                                                            ) : (
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <circle cx="12" cy="12" r="10" fill="green" fillOpacity="0.2" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" stroke="green" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    isOpen={!!editingUser}
                    onClose={() => setEditingUser(null)}
                    onSave={handleSave}
                />
            )}

            <ConfirmModal
                isOpen={confirmBanModalOpen}
                onClose={() => setConfirmBanModalOpen(false)}
                onConfirm={confirmBan}
                title={`${userToBan?.isbanned ? 'Débannir' : 'Bannir'} l'utilisateur`}
                message={`Êtes-vous sûr de vouloir ${userToBan?.isbanned ? 'débannir' : 'bannir'} cet utilisateur ?`}
                confirmText={userToBan?.isbanned ? 'Débannir' : 'Bannir'}
                variant="full"
            />
        </div>
    );
}

import { useEffect, useState } from 'react';
import { User, fetchUsers, updateUser } from '../lib/loaders';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/buttons';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';

export default function Dashboard() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const { user } = useAuth();
    const navigate = useNavigate();

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

    const handleSave = async () => {
        if (!editingUser) return;

        try {
            const updatedUser = await updateUser(editingUser.id, editingUser);
            setUsers(users.map(user =>
                user.id === updatedUser.id ? updatedUser : user
            ));
            setEditingUser(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        }
    };

    const handleCancel = () => {
        setEditingUser(null);
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
                                    <div key={user.id} className="bg-white rounded-lg shadow p-6 border border-[#F05E1D] w-full max-w-md">
                                        <div className="flex items-center space-x-4">
                                            <img
                                                src={user.avatar || '/default_pp.webp'}
                                                alt={user.name || 'Avatar par défaut'}
                                                className="h-16 w-16 rounded-full object-cover"
                                            />
                                            <div className="flex-1">
                                                {editingUser?.id === user.id ? (
                                                    <>
                                                        <input
                                                            type="text"
                                                            value={editingUser.name || ''}
                                                            onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                                            className="w-full p-2 border rounded mb-2"
                                                            placeholder="Nom"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={editingUser.mention || ''}
                                                            onChange={(e) => setEditingUser({ ...editingUser, mention: e.target.value })}
                                                            className="w-full p-2 border rounded mb-2"
                                                            placeholder="Mention"
                                                        />
                                                        <input
                                                            type="email"
                                                            value={editingUser.email || ''}
                                                            onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                                            className="w-full p-2 border rounded"
                                                            placeholder="Email"
                                                        />
                                                    </>
                                                ) : (
                                                    <>
                                                        <h2 className="text-lg font-semibold">{user.name}</h2>
                                                        <p className="text-gray-500">@{user.mention}</p>
                                                        <p className="text-sm text-gray-500">{user.email}</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-4 flex justify-start space-x-2">
                                            {editingUser?.id === user.id ? (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleSave}
                                                    >
                                                        Sauvegarder
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleCancel}
                                                    >
                                                        Annuler
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEdit(user)}
                                                >
                                                    Modifier
                                                </Button>
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
                                            <th className="px-8 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {users.map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50">
                                                <td className="px-8 py-4 text-sm text-gray-900">{user.id}</td>
                                                <td className="px-8 py-4 text-sm text-gray-900">
                                                    {editingUser?.id === user.id ? (
                                                        <input
                                                            type="email"
                                                            value={editingUser.email || ''}
                                                            onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                                            className="w-full p-2 border rounded"
                                                        />
                                                    ) : (
                                                        user.email
                                                    )}
                                                </td>
                                                <td className="px-8 py-4 text-sm text-gray-900">
                                                    {editingUser?.id === user.id ? (
                                                        <input
                                                            type="text"
                                                            value={editingUser.name || ''}
                                                            onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                                            className="w-full p-2 border rounded"
                                                        />
                                                    ) : (
                                                        user.name
                                                    )}
                                                </td>
                                                <td className="px-8 py-4 text-sm text-gray-900">
                                                    {editingUser?.id === user.id ? (
                                                        <input
                                                            type="text"
                                                            value={editingUser.mention || ''}
                                                            onChange={(e) => setEditingUser({ ...editingUser, mention: e.target.value })}
                                                            className="w-full p-2 border rounded"
                                                        />
                                                    ) : (
                                                        `@${user.mention}`
                                                    )}
                                                </td>
                                                <td className="px-8 py-4">
                                                    <img
                                                        src={user.avatar || '/default_pp.webp'}
                                                        alt={user.name || 'Avatar par défaut'}
                                                        className="h-10 w-10 rounded-full object-cover"
                                                    />
                                                </td>
                                                <td className="px-8 py-4">
                                                    {editingUser?.id === user.id ? (
                                                        <div className="flex space-x-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={handleSave}
                                                            >
                                                                Sauvegarder
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={handleCancel}
                                                            >
                                                                Annuler
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEdit(user)}
                                                        >
                                                            Modifier
                                                        </Button>
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
        </div>
    );
}

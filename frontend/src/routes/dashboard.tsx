import { useEffect, useState } from 'react';
import { User, fetchUsers, updateUser } from '../lib/loaders';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/buttons';
import ProtectedRoute from '../components/ProtectedRoute';

export default function Dashboard() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const data = await fetchUsers();
                setUsers(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Une erreur est survenue');
            } finally {
                setLoading(false);
            }
        };

        loadUsers();
    }, []);

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

    if (loading) {
        return (
            <ProtectedRoute>
                <div className="flex justify-center items-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            </ProtectedRoute>
        );
    }

    if (error) {
        return (
            <ProtectedRoute>
                <div className="flex flex-col items-center justify-center h-screen">
                    <div className="text-red-500 mb-4">{error}</div>
                    <Button variant="outline" onClick={() => navigate('/')}>
                        Retour à l'accueil
                    </Button>
                </div>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Tableau de bord</h1>
                    <Button variant="outline" onClick={() => navigate('/')}>
                        Retour à l'accueil
                    </Button>
                </div>
                <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
                    <table className="min-w-full">
                        <thead className="bg-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">ID</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Nom</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Mention</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Avatar</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-150">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {editingUser?.id === user.id ? (
                                            <input
                                                type="text"
                                                value={editingUser.name || ''}
                                                onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                                className="border rounded px-2 py-1 text-sm"
                                            />
                                        ) : (
                                            user.name || '-'
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {editingUser?.id === user.id ? (
                                            <input
                                                type="text"
                                                value={editingUser.mention || ''}
                                                onChange={(e) => setEditingUser({ ...editingUser, mention: e.target.value })}
                                                className="border rounded px-2 py-1 text-sm"
                                            />
                                        ) : (
                                            user.mention || '-'
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {editingUser?.id === user.id ? (
                                            <input
                                                type="text"
                                                value={editingUser.avatar || ''}
                                                onChange={(e) => setEditingUser({ ...editingUser, avatar: e.target.value })}
                                                className="border rounded px-2 py-1 text-sm"
                                            />
                                        ) : (
                                            user.avatar ? (
                                                <img src={user.avatar} alt="Avatar" className="h-12 w-12 rounded-full object-cover border-2 border-gray-200" />
                                            ) : (
                                                '-'
                                            )
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {editingUser?.id === user.id ? (
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={handleSave}>
                                                    Sauvegarder
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={handleCancel}>
                                                    Annuler
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button variant="outline" size="sm" onClick={() => handleEdit(user)}>
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
        </ProtectedRoute>
    );
}

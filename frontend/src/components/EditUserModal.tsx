import { useState } from 'react';
import Button from '../ui/buttons';
import { User } from '../lib/loaders';

interface EditUserModalProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
    onSave: (user: User) => void;
}

export default function EditUserModal({ user, isOpen, onClose, onSave }: EditUserModalProps) {
    const [editedUser, setEditedUser] = useState<User>({ ...user });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(editedUser);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#F8F9FA] rounded-lg p-6 w-full max-w-md border border-orange">
                <h2 className="text-xl font-bold mb-4 text-gray-900">Modifier l'utilisateur</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            value={editedUser.email}
                            onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                            className="mt-1 block w-full rounded-md border border-orange shadow-sm focus:border-orange focus:ring-orange bg-white"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nom</label>
                        <input
                            type="text"
                            value={editedUser.name || ''}
                            onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                            className="mt-1 block w-full rounded-md border border-orange shadow-sm focus:border-orange focus:ring-orange bg-white"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Mention</label>
                        <input
                            type="text"
                            value={editedUser.mention || ''}
                            onChange={(e) => setEditedUser({ ...editedUser, mention: e.target.value })}
                            className="mt-1 block w-full rounded-md border border-orange shadow-sm focus:border-orange focus:ring-orange bg-white"
                            required
                        />
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            variant="full"
                        >
                            Sauvegarder
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
} 
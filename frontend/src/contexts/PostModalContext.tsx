import { createContext, useContext, useState, ReactNode } from 'react';
import { Tweet } from '../lib/loaders';
import EditPostModal from '../components/PostModal';

interface PostModalContextType {
    openPostModal: () => void;
    closePostModal: () => void;
    onTweetPublished: (tweet: Tweet) => void;
}

const PostModalContext = createContext<PostModalContextType | undefined>(undefined);

export function PostModalProvider({ children, onTweetPublished }: { children: ReactNode; onTweetPublished: (tweet: Tweet) => void }) {
    const [isOpen, setIsOpen] = useState(false);

    const openPostModal = () => setIsOpen(true);
    const closePostModal = () => setIsOpen(false);

    return (
        <PostModalContext.Provider value={{ openPostModal, closePostModal, onTweetPublished }}>
            {children}
            <EditPostModal
                isOpen={isOpen}
                onClose={closePostModal}
                mode="create"
                onTweetPublished={(tweet) => {
                    onTweetPublished(tweet);
                    closePostModal();
                }}
            />
        </PostModalContext.Provider>
    );
}

export function usePostModal() {
    const context = useContext(PostModalContext);
    if (context === undefined) {
        throw new Error('usePostModal must be used within a PostModalProvider');
    }
    return context;
} 
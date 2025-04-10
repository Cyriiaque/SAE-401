import { ReactNode } from 'react';
import NotificationBell from '../ui/NotificationBell';

interface HeaderProps {
    title: string;
    children?: ReactNode;
}

export default function Header({ title, children }: HeaderProps) {
    return (
        <>
            {/* En-tête mobile */}
            <div className="sticky top-0 bg-white z-10 border-b border-gray-200 lg:hidden">
                <div className="p-4 flex items-center justify-between">
                    <div className="flex-1 text-center">
                        <h2 className="text-xl font-bold">{title}</h2>
                    </div>
                    <div className="flex items-center space-x-2">
                        <NotificationBell />
                        {children}
                    </div>
                </div>
            </div>

            {/* En-tête desktop */}
            <div className="hidden lg:block sticky top-0 bg-white z-10 border-b border-gray-200">
                <div className="p-4 flex items-center justify-between">
                    <div className="flex-1 pl-4">
                        <h2 className="text-xl font-bold">{title}</h2>
                    </div>
                    <div className="flex items-center space-x-3">
                        <NotificationBell />
                        {children}
                    </div>
                </div>
            </div>
        </>
    );
} 
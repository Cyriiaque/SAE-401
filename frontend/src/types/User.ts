export interface User {
    id: number;
    email: string;
    name: string;
    mention: string;
    avatar?: string;
    roles?: string[];
} 